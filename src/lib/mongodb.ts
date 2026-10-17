import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { getTenantConfig, buildMongoUriForDb, MASTER_CLUSTER_BASE } from './tenant-config';

export const MASTER_MONGODB_URI =
  process.env.MONGODB_MASTER_URI ||
  process.env.MONGODB_URI ||
  'mongodb+srv://bigmansale2_db_user:LQBnps6DkzVpKe84@cluster0.o9kuvob.mongodb.net/webstore?retryWrites=true&w=majority&appName=Cluster0';

const resolvedMasterUri = MASTER_MONGODB_URI.includes('{DB_NAME}')
  ? MASTER_MONGODB_URI.replace('{DB_NAME}', 'webstore')
  : MASTER_MONGODB_URI;

interface ExtendedGlobal {
  mongooseCache?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    embeddedInstance: any | null;
    activeUri: string | null;
  };
  masterDbConnection?: mongoose.Connection;
  masterDbPromise?: Promise<mongoose.Connection> | null;
}

const globalScope = global as unknown as ExtendedGlobal;

// 1. MASTER DB CONNECTION (Isolated instance via createConnection - NEVER calls mongoose.connect())
if (!globalScope.masterDbConnection) {
  globalScope.masterDbConnection = mongoose.createConnection(resolvedMasterUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    bufferCommands: false,
  });

  globalScope.masterDbConnection.on('connected', () => {
    console.log('✅ Master DB connected');
  });

  globalScope.masterDbConnection.on('error', (err: any) => {
    console.error('❌ Master DB error:', err.message);
  });
}

export const masterDbConnection = globalScope.masterDbConnection;

/**
 * Get or wait for Master DB connection with 5-second safe timeout
 */
export async function getMasterDbConnection(): Promise<mongoose.Connection> {
  if (masterDbConnection.readyState === 1) {
    return masterDbConnection;
  }

  if (!globalScope.masterDbPromise) {
    globalScope.masterDbPromise = Promise.race([
      masterDbConnection.asPromise(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Master DB connection timeout (5000ms)')), 5000)
      ),
    ])
      .then(() => masterDbConnection)
      .catch((err) => {
        globalScope.masterDbPromise = null;
        console.warn('⚠️ [Master DB] Kết nối Master DB thất bại hoặc quá thời gian:', err.message);
        throw err;
      });
  }

  return globalScope.masterDbPromise;
}

/**
 * Backwards-compatible connectToMasterDatabase
 * Uses isolated masterDbConnection without touching default mongoose connection
 */
export async function connectToMasterDatabase(): Promise<any> {
  try {
    return await getMasterDbConnection();
  } catch (err: any) {
    console.warn('⚠️ [Master DB Connect Fallback]:', err.message);
    return masterDbConnection;
  }
}

// 2. SHOP DB CONNECTION (Uses default connection solely for shop tenant data)
let cached = globalScope.mongooseCache || {
  conn: null,
  promise: null,
  embeddedInstance: null,
  activeUri: null,
};

if (!globalScope.mongooseCache) {
  globalScope.mongooseCache = cached;
}

export const shopDbConnection = mongoose.connection;

shopDbConnection.on('connected', () => {
  console.log('✅ Shop DB connected');
});

shopDbConnection.on('error', (err: any) => {
  console.error('❌ Shop DB error:', err.message);
});

/**
 * Reset / Switch active MongoDB connection to a new target URI
 */
export async function switchDatabaseConnection(newUri: string): Promise<typeof mongoose> {
  if (cached.conn) {
    try {
      await mongoose.disconnect();
    } catch (e) {}
  }
  cached.conn = null;
  cached.promise = null;
  cached.activeUri = newUri;

  console.log('🔄 [DB Switch] Đang kết nối tới CSDL khách hàng mới:', newUri.replace(/:([^:@]+)@/, ':****@'));
  const conn = await mongoose.connect(newUri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });
  cached.conn = conn;
  return conn;
}

/**
 * Get or spawn a self-contained persistent embedded MongoDB instance (Local Development Only)
 */
async function getEmbeddedMongoUri(): Promise<string> {
  if (cached.embeddedInstance) {
    return cached.embeddedInstance.getUri();
  }

  const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    throw new Error('Embedded MongoDB cannot run in Serverless environment. Please use Cloud MongoDB Atlas.');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  let dbDir = path.join(process.cwd(), 'data', 'db');

  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (e) {
    dbDir = path.join('/tmp', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  console.log('🚀 [Embedded DB] Đang khởi động cơ sở dữ liệu nhúng tại:', dbDir);

  const mongod = await MongoMemoryServer.create({
    instance: {
      dbPath: dbDir,
      storageEngine: 'wiredTiger',
    },
  });

  cached.embeddedInstance = mongod;
  const uri = mongod.getUri();
  console.log('✅ [Embedded DB] CSDL nhúng đã sẵn sàng (Persistent Storage):', uri);
  return uri;
}

/**
 * Connect to Shop Tenant Database
 */
async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      // 1. Check if client has a dedicated tenant database configured
      let tenant = getTenantConfig();
      let targetUri = tenant?.mongoUri || process.env.SHOP_DB_URI?.trim() || process.env.MONGODB_URI?.trim();

      // If no local tenant config, auto-resolve active tenant from Cloud Master DB with safe timeout
      if (!targetUri || targetUri === 'auto' || !tenant?.dbName) {
        try {
          const { findActiveTenantFromCloud } = await import('./license-manager');
          const cloudTenant = await Promise.race([
            findActiveTenantFromCloud(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          if (cloudTenant && cloudTenant.mongoUri) {
            targetUri = cloudTenant.mongoUri;
            tenant = getTenantConfig();
          }
        } catch (e) {
          console.warn('Could not auto-resolve tenant from cloud:', e);
        }
      }

      // If user provided or resolved a custom/tenant URI
      if (targetUri && targetUri !== 'auto' && targetUri !== 'local' && targetUri !== 'embedded') {
        try {
          console.log('🌐 [DB Connect] Đang kết nối CSDL:', targetUri.replace(/:([^:@]+)@/, ':****@'));
          const conn = await mongoose.connect(targetUri, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
          });
          cached.activeUri = targetUri;
          console.log('✅ [DB Connect] Đã kết nối thành công tới Database!');
          return conn;
        } catch (err: any) {
          console.warn('⚠️ [DB Fallback] Không thể kết nối tới CSDL cấu hình:', err.message);
        }
      }

      // 2. If running on Vercel / Cloud or Master Cluster is available: use Cloud Atlas cluster
      const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
      if (isServerless || (MASTER_CLUSTER_BASE && MASTER_CLUSTER_BASE.includes('mongodb+srv://'))) {
        const fallbackDb = tenant?.dbName || 'shop_led3d';
        const cloudUri = buildMongoUriForDb(fallbackDb);
        console.log('☁️ [Cloud Atlas Connect] Đang kết nối CSDL Cloud:', cloudUri.replace(/:([^:@]+)@/, ':****@'));
        const conn = await mongoose.connect(cloudUri, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 5000,
        });
        cached.activeUri = cloudUri;
        return conn;
      }

      // 3. Default Local Development Only: Run Embedded MongoDB
      try {
        const embeddedUri = await getEmbeddedMongoUri();
        const conn = await mongoose.connect(embeddedUri, {
          bufferCommands: false,
        });
        cached.activeUri = embeddedUri;
        return conn;
      } catch (embErr: any) {
        console.warn('⚠️ [Embedded DB Error]:', embErr.message);
        const cloudUri = buildMongoUriForDb('webstore');
        const conn = await mongoose.connect(cloudUri, {
          bufferCommands: false,
        });
        cached.activeUri = cloudUri;
        return conn;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export { connectToDatabase };
export default connectToDatabase;
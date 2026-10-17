import fs from 'fs';
import path from 'path';

export const MASTER_CLUSTER_BASE =
  process.env.MONGODB_MASTER_URI ||
  process.env.MONGODB_URI ||
  'mongodb+srv://bigmansale2_db_user:LQBnps6DkzVpKe84@cluster0.o9kuvob.mongodb.net/{DB_NAME}?retryWrites=true&w=majority&appName=Cluster0';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'tenant_config.json');
const TMP_CONFIG_FILE = path.join('/tmp', 'tenant_config.json');

declare global {
  var activeTenantConfig: TenantConfig | null | undefined;
}

export interface TenantConfig {
  shopName: string;
  dbName: string;
  mongoUri: string;
  createdAt: string;
  licenseKey?: string;
}

export function getTenantConfig(): TenantConfig | null {
  // 1. In-memory global cache
  if (global.activeTenantConfig) {
    return global.activeTenantConfig;
  }

  // 2. Environment Variables
  if (process.env.TENANT_DB_NAME || process.env.LICENSE_KEY) {
    const dbName = process.env.TENANT_DB_NAME || 'shop_primary';
    const config: TenantConfig = {
      shopName: process.env.SHOP_NAME || 'Cửa Hàng',
      dbName: dbName,
      mongoUri: buildMongoUriForDb(dbName),
      createdAt: new Date().toISOString(),
      licenseKey: process.env.LICENSE_KEY,
    };
    global.activeTenantConfig = config;
    return config;
  }

  // 3. Local data/tenant_config.json (VPS / Local)
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dbName) {
        global.activeTenantConfig = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  // 4. /tmp/tenant_config.json (Vercel Serverless)
  try {
    if (fs.existsSync(TMP_CONFIG_FILE)) {
      const raw = fs.readFileSync(TMP_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dbName) {
        global.activeTenantConfig = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  // 5. Default Fallback Configuration (LED 3D Store)
  const defaultFallback: TenantConfig = {
    shopName: 'LED 3D Store',
    dbName: 'shop_led3d',
    mongoUri: process.env.MONGODB_URI || 'mongodb+srv://led3d:ED7DSqiUdsXASaRg@cluster0.9oqu5tv.mongodb.net/shop_led3d?retryWrites=true&w=majority&appName=Cluster0',
    createdAt: '2026-10-17T02:14:00.000Z',
    licenseKey: 'AFF-DK8I-YP1D-WMH2',
  };
  global.activeTenantConfig = defaultFallback;
  return defaultFallback;
}

export function saveTenantConfig(config: TenantConfig): void {
  global.activeTenantConfig = config;

  // Try saving to data/tenant_config.json (Local / VPS)
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    // Expected on Vercel / read-only filesystem
  }

  // Try saving to /tmp/tenant_config.json (Vercel Serverless)
  try {
    fs.writeFileSync(TMP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    // Ignore on systems where /tmp doesn't exist
  }
}

export function generateDbName(shopName: string): string {
  const clean = (shopName || 'cuahang')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const baseName = clean ? `shop_${clean}` : 'shop';
  return `${baseName}_${randomSuffix}`.substring(0, 38);
}

export function buildMongoUriForDb(dbName: string): string {
  if (MASTER_CLUSTER_BASE.includes('{DB_NAME}')) {
    return MASTER_CLUSTER_BASE.replace('{DB_NAME}', dbName);
  }

  if (MASTER_CLUSTER_BASE.includes('.mongodb.net/')) {
    return MASTER_CLUSTER_BASE.replace(/\.mongodb\.net\/([^?]+)/, `.mongodb.net/${dbName}`);
  }

  return `${MASTER_CLUSTER_BASE}/${dbName}`;
}


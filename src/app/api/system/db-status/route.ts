import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import { getTenantConfig, saveTenantConfig, buildMongoUriForDb, MASTER_CLUSTER_BASE } from '@/lib/tenant-config';
import { checkLicenseStatus, findLicenseByHostOrKey, LicenseCheckResult } from '@/lib/license-manager';
import { autoSeedIfNeeded } from '@/lib/auto-seed';
import User from '@/models/User';
import Product from '@/models/Product';
import Category from '@/models/Category';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceFresh = searchParams.get('fresh') === '1';
  const keyParam = searchParams.get('key') || searchParams.get('licenseKey') || '';
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || '';

  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  let tenant = getTenantConfig();

  // Auto-resolve tenant from Cloud Master DB if local config is absent (Vercel Serverless cold start)
  if (!tenant?.dbName) {
    try {
      const activeLicense = await findLicenseByHostOrKey(host, keyParam);
      if (activeLicense && activeLicense.assignedDb) {
        const dbName = activeLicense.assignedDb;
        saveTenantConfig({
          shopName: activeLicense.shopName || '',
          dbName: dbName,
          mongoUri: buildMongoUriForDb(dbName),
          createdAt: activeLicense.createdAt ? new Date(activeLicense.createdAt).toISOString() : new Date().toISOString(),
          licenseKey: activeLicense.licenseKey,
        });
        tenant = getTenantConfig();
        console.log(`☁️ [Cloud Rehydrate] Đã tự động khôi phục cấu hình CSDL "${dbName}" cho host "${host}"`);
      }
    } catch (resolveErr) {
      console.warn('Auto-resolve tenant from cloud master DB skipped:', resolveErr);
    }
  }

  const hasUriConfigured = Boolean(
    tenant?.mongoUri || (process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== '')
  );

  let isConnected = false;
  let isSeeded = false;
  let isLocked = false;
  let isRevoked = false;
  let licenseStatus: string = 'unknown';
  let licenseCheck: LicenseCheckResult | null = null;
  let errorMessage: string | null = null;
  let stats = {
    users: 0,
    products: 0,
    categories: 0,
  };

  // 1. Status indicators (never lock store)
  isLocked = false;
  isRevoked = false;
  licenseStatus = 'active';

  // 2. Database Connection Check
  if (!isLocked) {
    try {
      const conn = await connectToDatabase();
      if (conn && mongoose.connection.readyState === 1) {
        isConnected = true;
        try {
          stats.users = await User.countDocuments();

          // Auto-seed admin user & theme if tenant is configured but DB is not seeded yet
          if (stats.users === 0 && tenant) {
            await autoSeedIfNeeded({ shopName: tenant.shopName });
            stats.users = await User.countDocuments();
          }

          stats.products = await Product.countDocuments();
          stats.categories = await Category.countDocuments();
          isSeeded = stats.users > 0 || Boolean(tenant?.licenseKey);
        } catch (err: any) {
          console.warn('Error reading stats:', err.message);
          isSeeded = Boolean(tenant?.licenseKey);
        }
      }
    } catch (error: any) {
      isConnected = false;
      errorMessage = error.message || 'Không thể kết nối tới cơ sở dữ liệu';
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      isVercel,
      hasUriConfigured,
      hasMasterCluster: Boolean(MASTER_CLUSTER_BASE && MASTER_CLUSTER_BASE.includes('mongodb')),
      tenant,
      isConnected,
      isSeeded,
      isLocked,
      isRevoked,
      licenseStatus,
      licenseCheck,
      stats,
      errorMessage,
      environment: isVercel ? 'vercel' : (process.env.NODE_ENV || 'development'),
    },
  });
}


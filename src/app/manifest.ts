import type { MetadataRoute } from 'next';
import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = 'Minh Phương Công Nghệ - LED 3D';
  let short_name = 'Minh Phương';
  let description = 'Thế giới đèn LED & Decor 3D cao cấp';

  try {
    await connectToDatabase();
    const setting = await Setting.findOne({ key: 'theme_settings' }).lean();
    const pageTitles = (setting as any)?.value?.pageTitles || {};
    if (pageTitles.siteTitle) name = pageTitles.siteTitle;
    if (pageTitles.logoText) short_name = pageTitles.logoText;
    if (pageTitles.metaDescription) description = pageTitles.metaDescription;
  } catch (e) {
    // fallback to defaults
  }

  return {
    name,
    short_name,
    description,
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#090a0f',
    theme_color: '#3b82f6',
    prefer_related_applications: false,
    categories: ['shopping', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png?v=2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

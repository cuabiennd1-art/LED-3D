import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    await connectToDatabase();
    const setting = await Setting.findOne({ key: 'theme_settings' }).lean();
    const themeConfig = (setting as any)?.value || {};
    const pageTitles = themeConfig?.pageTitles || {};

    const title = pageTitles.siteTitle || 'Trải nghiệm mua sắm thời trang trực tuyến thời thượng,Miễn phí giao hàng nhanh chóng toàn quốc.';
    const description = pageTitles.metaDescription || 'Trải nghiệm mua sắm trực tuyến cao cấp, giao hàng nhanh chóng toàn quốc.';
    const rawFavicon = pageTitles.faviconUrl?.trim();
    const rawLogo = pageTitles.logoUrl?.trim();
    const faviconUrl = rawFavicon || rawLogo || '/favicon.ico';

    return {
      title,
      description,
      appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: pageTitles.logoText || 'ShopBig',
      },
      icons: {
        icon: [
          { url: faviconUrl },
          { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: [faviconUrl],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
      },
    };
  } catch (error) {
    return {
      title: 'Trải nghiệm mua sắm thời trang trực tuyến thời thượng,Miễn phí giao hàng nhanh chóng toàn quốc.',
      description: 'Trải nghiệm mua sắm trực tuyến cao cấp, giao hàng nhanh chóng toàn quốc.',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'ShopBig',
      },
      icons: {
        icon: [
          { url: '/favicon.ico' },
          { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: ['/favicon.ico'],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
      },
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={jakarta.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ee4d2d" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ShopBig" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__pwaDeferredPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                console.log('%c[PWA Early Catch]%c beforeinstallprompt captured early!', 'background: #10b981; color: #fff; padding: 2px 4px;', 'color: #10b981;');
                e.preventDefault();
                window.__pwaDeferredPrompt = e;
                window.dispatchEvent(new Event('pwa-deferred-ready'));
              });
            `,
          }}
        />
      </head>
      <body className={jakarta.className}>
        <ThemeProvider>
          <ServiceWorkerRegister />
          <CustomerAuthProvider>
            <CartProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#13161f',
                    color: '#f8fafc',
                    border: '1px solid #232838',
                    borderRadius: '8px',
                    fontSize: '14px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#13161f',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#13161f',
                    },
                  },
                }}
              />
            </CartProvider>
          </CustomerAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
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
  const defaultTitle = 'Minh Phương công nghệ - Thế Giới Đèn LED & Decor 3D';
  const defaultDesc = 'Cửa hàng đèn LED 3D decor và công nghệ chiếu sáng thông minh';
  const defaultLogoText = 'Minh Phương công nghệ';

  try {
    await connectToDatabase();
    const setting = await Setting.findOne({ key: 'theme_settings' }).lean();
    const themeConfig = (setting as any)?.value || {};
    const pageTitles = themeConfig?.pageTitles || {};

    const title = pageTitles.siteTitle || defaultTitle;
    const description = pageTitles.metaDescription || defaultDesc;
    const rawFavicon = pageTitles.faviconUrl?.trim();
    const rawLogo = pageTitles.logoUrl?.trim();
    const faviconUrl = rawFavicon || rawLogo || '/favicon.ico';
    const logoText = pageTitles.logoText || defaultLogoText;

    // Build icon URL with cache buster query string
    const dynamicIconUrl = faviconUrl.includes('?') ? faviconUrl : `${faviconUrl}?v=2`;

    return {
      title,
      description,
      appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: logoText,
      },
      icons: {
        icon: [
          { url: dynamicIconUrl },
          { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
          { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
          { url: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: [dynamicIconUrl],
        apple: [{ url: '/apple-touch-icon.png?v=2', sizes: '180x180' }],
      },
    };
  } catch (error) {
    return {
      title: defaultTitle,
      description: defaultDesc,
      appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: defaultLogoText,
      },
      icons: {
        icon: [
          { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
          { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
          { url: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: ['/favicon.ico?v=2'],
        apple: [{ url: '/apple-touch-icon.png?v=2', sizes: '180x180' }],
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
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
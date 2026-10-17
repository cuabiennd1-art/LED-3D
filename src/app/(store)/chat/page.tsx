'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

export default function StoreChatRedirect() {
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    const cleanZaloPhone = (theme?.socialLinks?.zaloPhone || '').replace(/[^0-9]/g, '');
    if (cleanZaloPhone) {
      window.location.href = `https://zalo.me/${cleanZaloPhone}`;
    } else {
      router.replace('/');
    }
  }, [theme, router]);

  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
      Đang chuyển đến Zalo chat...
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Chuyển hướng về Cài đặt giao diện (nơi quản lý Zalo 1:1) do tính năng chat nội bộ và chatbot đã chuyển sang Zalo
    router.replace('/admin/settings');
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
      Đang chuyển hướng đến Cài đặt Zalo...
    </div>
  );
}

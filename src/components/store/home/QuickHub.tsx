'use client';

import React, { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import {
  QuickIconFreeship,
  QuickIconFlashSale,
  QuickIconBestSeller,
  QuickIconMall,
  QuickIconCheap,
  QuickIconShockDeal,
  QuickIconTracking,
  QuickIconConsult,
} from '@/components/store/QuickHubIcons';
import styles from '@/app/(store)/demo/page.module.css';

interface QuickHubProps {
  onScrollToFlashSale: () => void;
  onSelectQuickFilter: (filterIndex: number, isAsc?: boolean) => void;
  onNavigateToProducts: () => void;
}

const QuickHubComponent: React.FC<QuickHubProps> = ({
  onScrollToFlashSale,
  onSelectQuickFilter,
  onNavigateToProducts,
}) => {
  const router = useRouter();
  const { theme } = useTheme();

  const cleanZaloPhone = useMemo(() => {
    return (theme?.socialLinks?.zaloPhone || '').replace(/[^0-9]/g, '');
  }, [theme?.socialLinks?.zaloPhone]);

  return (
    <div className={styles.quickHubGrid}>
      <button
        type="button"
        className={styles.quickHubItem}
        onClick={() => onSelectQuickFilter(1, false)}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconFreeship />
        </div>
        <span className={styles.quickHubLabel}>Freeship 0Đ</span>
      </button>

      <button
        type="button"
        className={styles.quickHubItem}
        onClick={onScrollToFlashSale}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconFlashSale />
        </div>
        <span className={styles.quickHubLabel}>Flash Sale</span>
      </button>

      <button
        type="button"
        className={styles.quickHubItem}
        onClick={() => onSelectQuickFilter(2, false)}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconBestSeller />
        </div>
        <span className={styles.quickHubLabel}>Bán Chạy</span>
      </button>

      <button
        type="button"
        className={styles.quickHubItem}
        onClick={onNavigateToProducts}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconMall />
        </div>
        <span className={styles.quickHubLabel}>Shopee Mall</span>
      </button>

      <button
        type="button"
        className={styles.quickHubItem}
        onClick={() => onSelectQuickFilter(4, true)}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconCheap />
        </div>
        <span className={styles.quickHubLabel}>Gì Cũng Rẻ</span>
      </button>

      <button
        type="button"
        className={styles.quickHubItem}
        onClick={() => onSelectQuickFilter(4, true)}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconShockDeal />
        </div>
        <span className={styles.quickHubLabel}>Deal sốc</span>
      </button>

      <button
        type="button"
        className={styles.quickHubItem}
        onClick={() => router.push('/tracking')}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconTracking />
        </div>
        <span className={styles.quickHubLabel}>Tra Cứu Đơn</span>
      </button>

      <button
        type="button"
        className={styles.quickHubItem}
        onClick={() => {
          if (cleanZaloPhone) {
            window.open(`https://zalo.me/${cleanZaloPhone}`, '_blank', 'noopener,noreferrer');
          } else {
            router.push('/chat');
          }
        }}
      >
        <div className={`${styles.quickIconWrap} ${styles.iconTransparent}`}>
          <QuickIconConsult />
        </div>
        <span className={styles.quickHubLabel}>Tư Vấn Zalo</span>
      </button>
    </div>
  );
};

export const QuickHub = memo(QuickHubComponent);
export default QuickHub;

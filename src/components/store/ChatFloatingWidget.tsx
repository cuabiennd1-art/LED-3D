'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ZaloIcon from '@/components/ui/ZaloIcon';
import toast from 'react-hot-toast';
import styles from './ChatFloatingWidget.module.css';

export default function ChatFloatingWidget() {
  const pathname = usePathname();
  const { theme } = useTheme();

  // Position & Dragging State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
  });

  // Clean Zalo phone configured by admin in Settings
  const cleanZaloPhone = useMemo(() => {
    return (theme?.socialLinks?.zaloPhone || '').replace(/[^0-9]/g, '');
  }, [theme?.socialLinks?.zaloPhone]);

  // Compute default bottom-right position inside viewport (exact 48px circle like original)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const computeDefaultPosition = () => {
      const isMobile = window.innerWidth < 768;
      const btnWidth = 48;
      const btnHeight = 48;

      const defaultX = window.innerWidth - btnWidth - (isMobile ? 16 : 24);
      const defaultY = window.innerHeight - btnHeight - (isMobile ? 96 : 30);

      setPosition((prev) => {
        if (prev === null) {
          return { x: Math.max(8, defaultX), y: Math.max(20, defaultY) };
        }
        const clampedX = Math.max(8, Math.min(prev.x, window.innerWidth - btnWidth - 8));
        const clampedY = Math.max(20, Math.min(prev.y, window.innerHeight - btnHeight - (isMobile ? 80 : 20)));
        return { x: clampedX, y: clampedY };
      });
    };

    computeDefaultPosition();
    window.addEventListener('resize', computeDefaultPosition);
    return () => window.removeEventListener('resize', computeDefaultPosition);
  }, []);

  // Drag Handlers
  const startDrag = (clientX: number, clientY: number) => {
    if (!position) return;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false,
    };
    setIsDragging(true);

    const onMove = (e: MouseEvent | TouchEvent) => {
      const curX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const curY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const dx = curX - dragStartRef.current.startX;
      const dy = curY - dragStartRef.current.startY;

      if (!dragStartRef.current.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragStartRef.current.hasMoved = true;
      }

      if (dragStartRef.current.hasMoved) {
        const nextX = dragStartRef.current.initialX + dx;
        const nextY = dragStartRef.current.initialY + dy;

        const isMobile = window.innerWidth < 768;
        const btnWidth = 48;
        const btnHeight = 48;
        const clampedX = Math.max(8, Math.min(nextX, window.innerWidth - btnWidth - 8));
        const clampedY = Math.max(20, Math.min(nextY, window.innerHeight - btnHeight - (isMobile ? 80 : 20)));

        setPosition({ x: clampedX, y: clampedY });
      }
    };

    const onEnd = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  const handleOpenZalo = () => {
    // If dragged significantly, don't trigger click
    if (dragStartRef.current.hasMoved) return;

    if (cleanZaloPhone) {
      window.open(`https://zalo.me/${cleanZaloPhone}`, '_blank', 'noopener,noreferrer');
    } else {
      toast('Vui lòng cài đặt Số điện thoại Zalo trong Admin > Cài đặt giao diện', {
        icon: '💬',
        duration: 3500,
      });
    }
  };

  // Don't show in admin area
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className={`${styles.floatingWrapper} ${isDragging ? styles.dragging : ''}`}
      style={{
        transform: position
          ? `translate3d(${position.x}px, ${position.y}px, 0)`
          : undefined,
        opacity: position ? 1 : 0,
        visibility: position ? 'visible' : 'hidden',
        transition: isDragging ? 'none' : 'opacity 0.2s ease',
      }}
    >
      <button
        ref={btnRef}
        type="button"
        className={styles.floatingBtn}
        onClick={handleOpenZalo}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            startDrag(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        aria-label="Chat Zalo"
        title={cleanZaloPhone ? `Chat Zalo (${cleanZaloPhone})` : 'Chat Zalo với Shop'}
      >
        <span className={styles.floatingIcon}>
          <ZaloIcon size={48} />
        </span>
      </button>
    </div>
  );
}

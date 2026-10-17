'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiImage,
  FiLink,
  FiEye,
  FiEdit3,
  FiCode,
  FiUploadCloud,
  FiMinus,
  FiCheckCircle,
  FiHelpCircle,
  FiTrash2,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiSmile,
  FiGrid,
  FiBox,
  FiDroplet,
  FiType,
  FiTag,
  FiRotateCcw,
  FiMaximize2,
  FiVideo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';
import styles from './ProductDescriptionEditor.module.css';

interface ProductDescriptionEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

// 18 Curated E-commerce Text Colors
const TEXT_COLORS = [
  { label: 'Đỏ cam Shopee', color: '#ee4d2d' },
  { label: 'Đỏ tươi rực rỡ', color: '#ef4444' },
  { label: 'Cam nhiệt đới', color: '#f97316' },
  { label: 'Vàng kim hoàng gia', color: '#f59e0b' },
  { label: 'Vàng chanh', color: '#eab308' },
  { label: 'Xanh chanh tươi', color: '#84cc16' },
  { label: 'Xanh ngọc lục bảo', color: '#10b981' },
  { label: 'Xanh bạc hà mint', color: '#14b8a6' },
  { label: 'Xanh ngọc cyan', color: '#06b6d4' },
  { label: 'Xanh lam công nghệ', color: '#3b82f6' },
  { label: 'Xanh chàm indigo', color: '#6366f1' },
  { label: 'Tím violet', color: '#8b5cf6' },
  { label: 'Tím hồng fuchsia', color: '#d946ef' },
  { label: 'Hồng sen ngọt ngào', color: '#ec4899' },
  { label: 'Hồng phấn neon', color: '#f43f5e' },
  { label: 'Trắng tinh khiết', color: '#ffffff' },
  { label: 'Xám khói sáng', color: '#94a3b8' },
  { label: 'Màu chữ mặc định', color: 'inherit' },
];

// 8 Fluorescent / Pastel Highlight Colors
const HIGHLIGHT_COLORS = [
  { label: 'Vàng dạ quang', color: '#fef08a' },
  { label: 'Cam pastel sữa', color: '#fed7aa' },
  { label: 'Xanh cốm non dạ quang', color: '#bbf7d0' },
  { label: 'Xanh baby blue', color: '#bfdbfe' },
  { label: 'Hồng phấn dạ quang', color: '#fbcfe8' },
  { label: 'Tím lavender pastel', color: '#e9d5ff' },
  { label: 'Vàng chanh neon', color: '#fef9c3' },
  { label: 'Bỏ tô sáng (Highlight)', color: 'transparent' },
];

// 10 Hot E-Commerce Sales Badges (Pill Tags)
const SALES_BADGES = [
  { text: 'SIÊU GIẢM GIÁ', icon: '🔥', bg: 'linear-gradient(135deg, #ee4d2d, #ef4444)' },
  { text: 'GIAO HỎA TỐC 2H', icon: '⚡', bg: 'linear-gradient(135deg, #f59e0b, #f97316)' },
  { text: 'CHÍNH HÃNG 100%', icon: '🛡️', bg: 'linear-gradient(135deg, #10b981, #059669)' },
  { text: 'BẢO HÀNH 1 ĐỔI 1', icon: '✅', bg: 'linear-gradient(135deg, #06b6d4, #0284c7)' },
  { text: 'BẢN CAO CẤP VIP', icon: '💎', bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)' },
  { text: 'TẶNG KÈM QUÀ', icon: '🎁', bg: 'linear-gradient(135deg, #ec4899, #d946ef)' },
  { text: 'MIỄN PHÍ SHIP', icon: '📦', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { text: 'BÁN CHẠY TOP 1', icon: '👑', bg: 'linear-gradient(135deg, #d97706, #f59e0b)' },
  { text: 'MÃ GIẢM 50K', icon: '🏷️', bg: 'linear-gradient(135deg, #f43f5e, #e11d48)' },
  { text: 'ĐÁNH GIÁ 5 SAO', icon: '⭐', bg: 'linear-gradient(135deg, #eab308, #ca8a04)' },
];

// 36 E-commerce Hot Emojis
const HOT_EMOJIS = [
  '⭐', '🌟', '🔥', '💥', '⚡', '💯',
  '💎', '✅', '📦', '🚀', '🎁', '🏷️',
  '💬', '👍', '👑', '📢', '🎯', '❤️',
  '🏆', '🛒', '✨', '📌', '⏳', '🛍️',
  '💰', '💵', '🚚', '⏰', '👉', '👇',
  '😍', '🎉', '🛡️', '📞', '🥇', '💯',
];

// Convert legacy plain text into standard HTML paragraphs
function normalizeToHtml(content: string): string {
  if (!content) return '';
  const trimmed = content.trim();
  if (!trimmed) return '';

  const hasHtmlTags = /<\/?(p|div|br|img|video|source|iframe|h[1-6]|ul|ol|li|span|strong|b|em|i|s|blockquote|table|figure|hr)\b/i.test(trimmed);
  if (hasHtmlTags) {
    return trimmed;
  }

  const paragraphs = trimmed.split(/\n\s*\n/);
  return paragraphs
    .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export default function ProductDescriptionEditor({
  value,
  onChange,
  placeholder = 'Nhập mô tả sản phẩm chi tiết, chèn ảnh xen kẽ giữa các đoạn văn...',
}: ProductDescriptionEditorProps) {
  const [mode, setMode] = useState<'visual' | 'preview' | 'html'>('visual');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlMediaType, setUrlMediaType] = useState<'image' | 'video' | 'youtube' | 'tiktok'>('image');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');

  // Selected image state for floating toolbar (Size, Align, Radius, Delete)
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [deleteBtnPos, setDeleteBtnPos] = useState<{ top: number; left: number } | null>(null);

  // Popover menus state
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showHighlightPopover, setShowHighlightPopover] = useState(false);
  const [showEmojiPopover, setShowEmojiPopover] = useState(false);
  const [showTemplatePopover, setShowTemplatePopover] = useState(false);
  const [showBadgePopover, setShowBadgePopover] = useState(false);
  const [showDividerPopover, setShowDividerPopover] = useState(false);
  const [activeColor, setActiveColor] = useState('#ee4d2d');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const lastHtmlRef = useRef<string>('');

  // Save selection inside editorRef
  const saveSelection = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore selection
  const restoreSelection = () => {
    if (typeof window === 'undefined' || !savedSelectionRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.popoverWrap}`)) {
        setShowColorPopover(false);
        setShowHighlightPopover(false);
        setShowEmojiPopover(false);
        setShowTemplatePopover(false);
        setShowBadgePopover(false);
        setShowDividerPopover(false);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Initial load sync
  useEffect(() => {
    if (editorRef.current) {
      const normalized = normalizeToHtml(value);
      if (normalized) {
        editorRef.current.innerHTML = normalized;
        lastHtmlRef.current = normalized;
      }
    }
  }, []);

  // Sync incoming value to editor innerHTML if value changed externally
  useEffect(() => {
    // If value matches what editor just emitted, do not reset innerHTML to prevent cursor jumping
    if (value === lastHtmlRef.current) return;

    const normalized = normalizeToHtml(value);
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== normalized) {
        editorRef.current.innerHTML = normalized;
        lastHtmlRef.current = normalized;
      }
    }
  }, [value]);

  // Handle content change inside contentEditable
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
  }, [onChange]);

  // Update floating toolbar position over selected image
  const updateDeleteBtnPosition = useCallback((img: HTMLImageElement) => {
    if (!containerRef.current) return;
    const imgRect = img.getBoundingClientRect();
    const contRect = containerRef.current.getBoundingClientRect();
    const top = Math.max(8, imgRect.top - contRect.top - 46);
    const contWidth = contRect.width || 600;
    const rawLeft = imgRect.left - contRect.left + (imgRect.width / 2) - 150;
    const left = Math.min(Math.max(12, contWidth - 320), Math.max(12, rawLeft));
    setDeleteBtnPos({ top, left });
  }, []);

  // Recalculate position on window resize
  useEffect(() => {
    const handleRecalculatePos = () => {
      if (selectedImage) {
        updateDeleteBtnPosition(selectedImage);
      }
    };
    window.addEventListener('resize', handleRecalculatePos);
    return () => window.removeEventListener('resize', handleRecalculatePos);
  }, [selectedImage, updateDeleteBtnPosition]);

  // Deselect image when clicking outside editor and toolbar
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        selectedImage &&
        !target.closest(`.${styles.floatingImageToolbar}`) &&
        target !== selectedImage
      ) {
        selectedImage.classList.remove('editor-img-selected');
        setSelectedImage(null);
        setDeleteBtnPos(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [selectedImage]);

  // Handle Click inside Editor to select or deselect image / video
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'IMG' || target.tagName === 'VIDEO')) {
      e.stopPropagation();
      const media = target as HTMLImageElement;

      if (selectedImage && selectedImage !== media) {
        selectedImage.classList.remove('editor-img-selected');
      }

      media.classList.add('editor-img-selected');
      setSelectedImage(media);
      updateDeleteBtnPosition(media);
    } else {
      if (selectedImage) {
        selectedImage.classList.remove('editor-img-selected');
        setSelectedImage(null);
        setDeleteBtnPos(null);
      }
    }
  };

  // Handle Scroll inside Editor to update floating toolbar position
  const handleEditorScroll = () => {
    if (selectedImage) {
      updateDeleteBtnPosition(selectedImage);
    }
  };

  // Delete the currently selected image or video
  const handleDeleteSelectedImage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedImage) return;

    selectedImage.classList.remove('editor-img-selected');
    const parent = selectedImage.parentElement;

    const isSoleChild =
      parent &&
      parent !== editorRef.current &&
      parent.textContent?.trim() === '' &&
      parent.querySelectorAll('img, video').length <= 1;

    if (isSoleChild && parent) {
      parent.remove();
    } else {
      selectedImage.remove();
    }

    const isVideo = selectedImage.tagName === 'VIDEO';
    setSelectedImage(null);
    setDeleteBtnPos(null);
    handleEditorInput();
    toast.success(isVideo ? 'Đã xóa video khỏi mô tả' : 'Đã xóa hình ảnh khỏi mô tả');
  };

  // Change image width (100%, 75%, 50%, 33%)
  const handleSetImageWidth = (widthStr: string) => {
    if (!selectedImage) return;
    selectedImage.style.width = widthStr;
    selectedImage.style.maxWidth = '100%';
    selectedImage.style.height = 'auto';
    handleEditorInput();
    setTimeout(() => {
      if (selectedImage) updateDeleteBtnPosition(selectedImage);
    }, 50);
  };

  // Change image alignment
  const handleSetImageAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedImage) return;
    const parent = selectedImage.parentElement;
    if (parent && parent !== editorRef.current) {
      parent.style.textAlign = align;
    } else {
      const p = document.createElement('p');
      p.style.textAlign = align;
      p.style.margin = '16px 0';
      selectedImage.parentNode?.insertBefore(p, selectedImage);
      p.appendChild(selectedImage);
    }
    handleEditorInput();
    setTimeout(() => {
      if (selectedImage) updateDeleteBtnPosition(selectedImage);
    }, 50);
  };

  // Change image border radius
  const handleSetImageRadius = (radius: string) => {
    if (!selectedImage) return;
    selectedImage.style.borderRadius = radius;
    handleEditorInput();
  };

  // Keyboard shortcut to delete selected image on Backspace / Delete
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImage) {
      e.preventDefault();
      handleDeleteSelectedImage();
    }
  };

  // Handle Tab / Mode Switch with guaranteed two-way preservation
  const handleSwitchMode = (newMode: 'visual' | 'preview' | 'html') => {
    if (selectedImage) {
      selectedImage.classList.remove('editor-img-selected');
      setSelectedImage(null);
      setDeleteBtnPos(null);
    }

    if (mode === 'visual' && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      lastHtmlRef.current = currentHtml;
      onChange(currentHtml);
    }
    if (newMode === 'visual' && editorRef.current) {
      const normalized = normalizeToHtml(value || lastHtmlRef.current);
      if (editorRef.current.innerHTML !== normalized) {
        editorRef.current.innerHTML = normalized;
        lastHtmlRef.current = normalized;
      }
    }
    setMode(newMode);
  };

  // Execute standard formatting command
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (mode !== 'visual') return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    handleEditorInput();
  };

  // Apply Font Size
  const applyFontSize = (sizePx: string) => {
    if (editorRef.current) editorRef.current.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        range.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {
        console.warn('Could not wrap font size:', e);
      }
    } else {
      insertHtmlAtCursorOrBottom(`<span style="font-size: ${sizePx}; font-weight: 600;">Văn bản cỡ ${sizePx}</span> `);
    }
    handleEditorInput();
  };

  // Apply Text Color
  const applyTextColor = (color: string) => {
    if (editorRef.current) editorRef.current.focus();
    restoreSelection();
    if (color === 'inherit') {
      document.execCommand('foreColor', false, '#ffffff');
    } else {
      document.execCommand('foreColor', false, color);
      setActiveColor(color);
    }
    handleEditorInput();
    setShowColorPopover(false);
  };

  // Apply Highlight Background Color
  const applyHighlightColor = (color: string) => {
    if (editorRef.current) editorRef.current.focus();
    restoreSelection();
    if (color === 'transparent') {
      document.execCommand('hiliteColor', false, 'transparent');
      document.execCommand('backColor', false, 'transparent');
    } else {
      document.execCommand('hiliteColor', false, color);
      document.execCommand('backColor', false, color);
    }
    handleEditorInput();
    setShowHighlightPopover(false);
  };

  // Insert arbitrary HTML fragment at cursor position or bottom
  const insertHtmlAtCursorOrBottom = (htmlString: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    let inserted = false;
    if (savedSelectionRef.current && editorRef.current.contains(savedSelectionRef.current.commonAncestorContainer)) {
      try {
        const range = savedSelectionRef.current;
        range.deleteContents();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        const frag = document.createDocumentFragment();
        let node;
        let lastNode: Node | null = null;
        while ((node = tempDiv.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);

        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        inserted = true;
      } catch (err) {
        console.warn('Error inserting into saved range:', err);
      }
    }

    if (!inserted) {
      editorRef.current.insertAdjacentHTML('beforeend', htmlString);
    }

    savedSelectionRef.current = null;
    editorRef.current.focus();
    handleEditorInput();
  };

  // Insert Sales Badge Pill Tag
  const insertBadge = (text: string, icon: string, bgGradient: string) => {
    const badgeHtml = `&nbsp;<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 11px; border-radius: 999px; background: ${bgGradient}; color: #ffffff; font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); vertical-align: middle; text-transform: uppercase;"><span>${icon}</span><span>${text}</span></span>&nbsp;`;
    insertHtmlAtCursorOrBottom(badgeHtml);
    setShowBadgePopover(false);
    toast.success(`Đã chèn huy hiệu [${text}]`);
  };

  // Insert Artistic Divider
  const insertArtisticDivider = (type: 'solid' | 'dashed' | 'gradient' | 'stars' | 'fire' | 'diamond') => {
    let html = '';
    switch (type) {
      case 'solid':
        html = `<hr style="border: none; height: 1px; background: rgba(255,255,255,0.15); margin: 20px 0;" /><p><br></p>`;
        break;
      case 'dashed':
        html = `<hr style="border: none; border-top: 2px dashed #f97316; margin: 20px 0; opacity: 0.85;" /><p><br></p>`;
        break;
      case 'gradient':
        html = `<hr style="border: none; height: 3px; background: linear-gradient(90deg, #ee4d2d 0%, #ec4899 50%, #3b82f6 100%); border-radius: 3px; margin: 22px 0;" /><p><br></p>`;
        break;
      case 'stars':
        html = `<div style="text-align: center; margin: 18px 0; color: #f59e0b; font-size: 15px; letter-spacing: 12px;">✨ ⭐ ✨ ⭐ ✨ ⭐ ✨</div><p><br></p>`;
        break;
      case 'fire':
        html = `<div style="text-align: center; margin: 18px 0; font-size: 15px; letter-spacing: 10px;">🔥 🔥 🔥 🔥 🔥 🔥 🔥</div><p><br></p>`;
        break;
      case 'diamond':
        html = `<div style="text-align: center; margin: 18px 0; font-size: 15px; letter-spacing: 12px;">💎 💎 💎 💎 💎 💎 💎</div><p><br></p>`;
        break;
    }
    insertHtmlAtCursorOrBottom(html);
    setShowDividerPopover(false);
    toast.success('Đã chèn đường phân cách!');
  };

  // Insert Styled Callout Box Template
  const insertCalloutBox = (type: string) => {
    let html = '';
    switch (type) {
      case 'flashsale':
        html = `
          <div style="margin: 16px 0; padding: 14px 18px; border-radius: 10px; background-color: rgba(238, 77, 45, 0.08); border: 2px solid #ee4d2d; box-shadow: 0 4px 14px rgba(238, 77, 45, 0.15);">
            <h4 style="margin: 0 0 6px 0; color: #ee4d2d; font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              <span>🔥</span> CHƯƠNG TRÌNH FLASH SALE - GIÁ SỐC DUY NHẤT HÔM NAY
            </h4>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: inherit;">
              Giảm giá trực tiếp tới <strong>50%</strong> chỉ áp dụng cho 50 đơn hàng đầu tiên trong ngày. Nhanh tay đặt ngay kẻo hết!
            </p>
          </div>
          <p><br></p>
        `;
        break;
      case 'vipgold':
        html = `
          <div style="margin: 16px 0; padding: 14px 18px; border-radius: 10px; background-color: rgba(245, 158, 11, 0.08); border: 2px solid #f59e0b; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.15);">
            <h4 style="margin: 0 0 6px 0; color: #fbbf24; font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              <span>👑</span> ĐẶC QUYỀN VIP & CAM KẾT VÀNG
            </h4>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: inherit;">
              100% sản phẩm chính hãng loại 1 cao cấp, kiểm định chất lượng nghiêm ngặt trước khi giao tận tay quý khách.
            </p>
          </div>
          <p><br></p>
        `;
        break;
      case 'voucher':
        html = `
          <div style="margin: 16px 0; padding: 14px 18px; border-radius: 10px; background-color: rgba(249, 115, 22, 0.06); border: 2px dashed #f97316;">
            <h4 style="margin: 0 0 6px 0; color: #f97316; font-size: 14.5px; font-weight: 800;">
              🎟️ MÃ GIẢM GIÁ ĐỘC QUYỀN: <span style="background: #f97316; color: #ffffff; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px;">AFFSTORE50K</span>
            </h4>
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: inherit;">
              Nhập mã khi đặt mua để được giảm ngay 50.000đ cho đơn hàng từ 300.000đ.
            </p>
          </div>
          <p><br></p>
        `;
        break;
      case 'gift':
        html = `
          <div style="margin: 16px 0; padding: 14px 18px; border-radius: 10px; background-color: rgba(236, 72, 153, 0.08); border: 2px solid #ec4899;">
            <h4 style="margin: 0 0 6px 0; color: #f472b6; font-size: 14.5px; font-weight: 800;">
              🎁 BỘ QUÀ TẶNG KÈM TRỊ GIÁ 250.000Đ
            </h4>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: inherit;">
              Tặng ngay bộ quà tặng độc quyền + Voucher chiết khấu 10% cho lần mua hàng kế tiếp!
            </p>
          </div>
          <p><br></p>
        `;
        break;
      case 'highlight':
        html = `
          <div style="margin: 14px 0; padding: 12px 16px; border-radius: 8px; background-color: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);">
            <h4 style="margin: 0 0 6px 0; color: #60a5fa; font-size: 14px; font-weight: 700;">🌟 ĐẶC ĐIỂM NỔI BẬT</h4>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: inherit;">Chất liệu cao cấp thế hệ mới, độ hoàn thiện tinh xảo, sử dụng bền bỉ vượt trội.</p>
          </div>
          <p><br></p>
        `;
        break;
      case 'guarantee':
        html = `
          <div style="margin: 14px 0; padding: 12px 16px; border-radius: 8px; background-color: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
            <h4 style="margin: 0 0 6px 0; color: #34d399; font-size: 14px; font-weight: 700;">🛡️ CHÍNH SÁCH BẢO HÀNH & ĐỔI TRẢ</h4>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: inherit;">Hỗ trợ 1 đổi 1 miễn phí trong 7 ngày đầu. Cam kết bảo hành chính hãng 12 tháng uy tín.</p>
          </div>
          <p><br></p>
        `;
        break;
      case 'warning':
        html = `
          <div style="margin: 14px 0; padding: 12px 16px; border-radius: 8px; background-color: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">
            <h4 style="margin: 0 0 6px 0; color: #fbbf24; font-size: 14px; font-weight: 700;">💡 HƯỚNG DẪN BẢO QUẢN & SỬ DỤNG</h4>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: inherit;">Bảo quản nơi khô ráo, tránh tiếp xúc trực tiếp ánh nắng gay gắt hoặc hóa chất tẩy mạnh.</p>
          </div>
          <p><br></p>
        `;
        break;
    }
    insertHtmlAtCursorOrBottom(html);
    setShowTemplatePopover(false);
    toast.success('Đã chèn khung trang trí!');
  };

  // Insert Call To Action (CTA) button
  const insertCtaButton = (type: 'buy' | 'contact' | 'voucher') => {
    let text = '👉 ĐẶT MUA NGAY HÔM NAY';
    let gradient = 'linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)';

    if (type === 'contact') {
      text = '💬 LIÊN HỆ TƯ VẤN 24/7';
      gradient = 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)';
    } else if (type === 'voucher') {
      text = '🎁 NHẬN MÃ GIẢM GIÁ 50K';
      gradient = 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)';
    }

    const ctaHtml = `
      <div style="text-align: center; margin: 20px 0;">
        <span style="display: inline-block; padding: 12px 28px; background: ${gradient}; color: #ffffff; font-size: 14px; font-weight: 800; border-radius: 999px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-transform: uppercase;">
          ${text}
        </span>
      </div>
      <p><br></p>
    `;

    insertHtmlAtCursorOrBottom(ctaHtml);
    setShowTemplatePopover(false);
    toast.success('Đã chèn nút kêu gọi hành động!');
  };

  // Insert Specification Table Template
  const insertSpecTable = (theme: 'blue' | 'orange' | 'minimal' = 'blue') => {
    let headerBg = 'rgba(59, 130, 246, 0.18)';
    let headerColor = '#60a5fa';
    let borderColor = 'rgba(59, 130, 246, 0.25)';

    if (theme === 'orange') {
      headerBg = 'rgba(238, 77, 45, 0.18)';
      headerColor = '#f87171';
      borderColor = 'rgba(238, 77, 45, 0.25)';
    } else if (theme === 'minimal') {
      headerBg = 'rgba(255, 255, 255, 0.08)';
      headerColor = '#ffffff';
      borderColor = 'rgba(255, 255, 255, 0.12)';
    }

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: ${headerBg};">
            <th style="padding: 10px 14px; text-align: left; border: 1px solid ${borderColor}; color: ${headerColor}; font-weight: 700; width: 35%;">Thông số</th>
            <th style="padding: 10px 14px; text-align: left; border: 1px solid ${borderColor}; color: ${headerColor}; font-weight: 700;">Chi tiết sản phẩm</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 9px 14px; border: 1px solid ${borderColor}; font-weight: 600;">Thương hiệu</td>
            <td style="padding: 9px 14px; border: 1px solid ${borderColor};">Chính hãng cao cấp</td>
          </tr>
          <tr style="background-color: rgba(255, 255, 255, 0.03);">
            <td style="padding: 9px 14px; border: 1px solid ${borderColor}; font-weight: 600;">Chất liệu / Công nghệ</td>
            <td style="padding: 9px 14px; border: 1px solid ${borderColor};">Vật liệu thế hệ mới, an toàn tuyệt đối</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; border: 1px solid ${borderColor}; font-weight: 600;">Xuất xứ</td>
            <td style="padding: 9px 14px; border: 1px solid ${borderColor};">Việt Nam / Phân phối chính ngạch</td>
          </tr>
          <tr style="background-color: rgba(255, 255, 255, 0.03);">
            <td style="padding: 9px 14px; border: 1px solid ${borderColor}; font-weight: 600;">Bảo hành</td>
            <td style="padding: 9px 14px; border: 1px solid ${borderColor};">12 tháng chính hãng (1 đổi 1 trong 7 ngày)</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;

    insertHtmlAtCursorOrBottom(tableHtml);
    toast.success('Đã chèn bảng thông số kỹ thuật mẫu!');
  };

  // Insert image element at cursor or bottom
  const insertImageElement = (src: string, alt: string = '') => {
    const figureHtml = `
      <p style="text-align: center; margin: 16px 0;">
        <img src="${src}" alt="${alt || 'Hình ảnh mô tả sản phẩm'}" style="max-width: 100%; height: auto; border-radius: 8px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.12);" />
      </p>
      <p><br></p>
    `;

    insertHtmlAtCursorOrBottom(figureHtml);
  };

  // Insert video element (HTML5 video or YouTube iframe embed) at cursor or bottom
  const insertVideoElement = (src: string, isYouTube: boolean = false) => {
    let videoHtml = '';
    if (isYouTube) {
      videoHtml = `
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px; margin: 16px auto; box-shadow: 0 4px 16px rgba(0,0,0,0.15);">
          <iframe 
            src="${src}" 
            title="Video mô tả sản phẩm" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen
          ></iframe>
        </div>
        <p><br></p>
      `;
    } else {
      videoHtml = `
        <p style="text-align: center; margin: 16px 0;">
          <video 
            src="${src}" 
            controls 
            preload="metadata" 
            playsinline 
            muted 
            loop 
            style="max-width: 100%; height: auto; border-radius: 12px; display: inline-block; box-shadow: 0 4px 16px rgba(0,0,0,0.15);"
          ></video>
        </p>
        <p><br></p>
      `;
    }

    insertHtmlAtCursorOrBottom(videoHtml);
  };

  // Upload image files via /api/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(`Đang tải ảnh ${i + 1}/${files.length}...`);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await apiFetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.data?.url) {
          insertImageElement(data.data.url, file.name.replace(/\.[^/.]+$/, ''));
          successCount++;
        } else {
          toast.error(data.message || `Lỗi khi tải ảnh ${file.name}`);
        }
      } catch (err: any) {
        toast.error(`Không thể upload ảnh ${file.name}: ${err.message || 'Lỗi mạng'}`);
      }
    }

    setIsUploading(false);
    setUploadStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (successCount > 0) {
      toast.success(`Đã chèn ${successCount} ảnh vào mô tả thành công!`);
    }
  };

  // Upload video files via /api/upload (Saved directly into MongoDB Atlas)
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadStatus(`Đang tải video "${file.name}" (${sizeMb} MB) lưu vào CSDL MongoDB...`);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await apiFetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.data?.url) {
          insertVideoElement(data.data.url, false);
          successCount++;
        } else {
          toast.error(data.message || `Lỗi khi tải video ${file.name}`);
        }
      } catch (err: any) {
        toast.error(`Không thể upload video ${file.name}: ${err.message || 'Lỗi mạng'}`);
      }
    }

    setIsUploading(false);
    setUploadStatus('');
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';

    if (successCount > 0) {
      toast.success(`Đã chèn ${successCount} video vào mô tả thành công!`);
    }
  };

  // Helper to extract YouTube embed URL
  const formatYouTubeEmbedUrl = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  // Helper to extract TikTok Video ID and embed URL
  const formatTikTokEmbed = (url: string): { embedUrl: string; videoId: string; isShortLink?: boolean } | null => {
    if (!url) return null;
    const clean = url.trim();
    if (!clean.toLowerCase().includes('tiktok.com')) return null;

    if (clean.includes('vt.tiktok.com') || clean.includes('vm.tiktok.com')) {
      return { embedUrl: '', videoId: '', isShortLink: true };
    }

    // Match /video/1234567890123456789 or /player/v1/... or raw id
    const match =
      clean.match(/\/video\/(\d+)/i) ||
      clean.match(/\/player\/v1\/(\d+)/i) ||
      clean.match(/\/embed\/(?:v\d+\/)?(\d+)/i) ||
      clean.match(/\b(\d{15,22})\b/);

    if (match && match[1]) {
      return {
        embedUrl: `https://www.tiktok.com/player/v1/${match[1]}`,
        videoId: match[1],
      };
    }
    return null;
  };

  // Insert TikTok responsive iframe embed at cursor or bottom
  const insertTikTokElement = (embedUrl: string, videoId: string, originalUrl: string) => {
    const tiktokHtml = `
      <div class="tiktok-embed-container" style="text-align: center; margin: 24px auto; max-width: 540px; width: 100%;">
        <iframe
          src="${embedUrl}"
          title="Video TikTok mô tả sản phẩm"
          style="width: 100%; height: 840px; border: none; border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.5); background: #000000; overflow: hidden;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          scrolling="no"
        ></iframe>
        <div style="margin-top: 10px;">
          <a href="${originalUrl || `https://www.tiktok.com/@video/video/${videoId}`}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #fe2c55; text-decoration: none; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: rgba(254,44,85,0.08);">
            <span>🎵 Mở xem video trên TikTok</span>
          </a>
        </div>
      </div>
      <p><br></p>
    `;
    insertHtmlAtCursorOrBottom(tiktokHtml);
  };

  // Handle URL Insert Confirmation (Image or Video)
  const handleConfirmUrl = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanUrl = imageUrlInput.trim();
    if (!cleanUrl) {
      toast.error('Vui lòng nhập link hợp lệ');
      return;
    }

    const tikTokInfo = formatTikTokEmbed(cleanUrl);
    const ytEmbed = formatYouTubeEmbedUrl(cleanUrl);
    const isDirectVideo = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(cleanUrl);

    if (urlMediaType === 'tiktok' || tikTokInfo) {
      if (tikTokInfo?.isShortLink) {
        toast.error('Đây là link rút gọn của app TikTok (vt.tiktok.com). Bạn vui lòng mở link trên trình duyệt để copy link đầy đủ dạng https://www.tiktok.com/@.../video/...');
        return;
      }
      if (!tikTokInfo || !tikTokInfo.videoId) {
        toast.error('Không tìm thấy ID video TikTok. Vui lòng dán link dạng: https://www.tiktok.com/@user/video/12345...');
        return;
      }
      insertTikTokElement(tikTokInfo.embedUrl, tikTokInfo.videoId, cleanUrl);
      toast.success('Đã chèn video TikTok vào mô tả thành công!');
    } else if (urlMediaType === 'youtube' || ytEmbed) {
      if (!ytEmbed) {
        toast.error('Đường dẫn YouTube không đúng định dạng');
        return;
      }
      insertVideoElement(ytEmbed, true);
      toast.success('Đã chèn video YouTube vào mô tả thành công!');
    } else if (urlMediaType === 'video' || isDirectVideo) {
      insertVideoElement(cleanUrl, false);
      toast.success('Đã chèn video vào mô tả thành công!');
    } else {
      insertImageElement(cleanUrl, imageAltInput.trim());
      toast.success('Đã chèn ảnh vào mô tả thành công!');
    }

    setImageUrlInput('');
    setImageAltInput('');
    setShowUrlModal(false);
  };

  // Handle Clipboard Paste (Supports Direct Image & Video Paste)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          saveSelection();
          setIsUploading(true);
          setUploadStatus('Đang tải ảnh dán từ clipboard...');

          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiFetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.success && data.data?.url) {
              insertImageElement(data.data.url, 'Ảnh dán từ clipboard');
              toast.success('Đã chèn ảnh từ clipboard vào vị trí con trỏ!');
            } else {
              toast.error(data.message || 'Không thể upload ảnh từ clipboard');
            }
          } catch (err) {
            toast.error('Lỗi khi tải ảnh từ clipboard');
          } finally {
            setIsUploading(false);
            setUploadStatus('');
          }
        }
        break;
      } else if (item.type.indexOf('video') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          saveSelection();
          setIsUploading(true);
          setUploadStatus('Đang tải video dán từ clipboard lưu vào CSDL MongoDB...');

          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiFetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.success && data.data?.url) {
              insertVideoElement(data.data.url, false);
              toast.success('Đã lưu video vào CSDL MongoDB và chèn vào vị trí con trỏ!');
            } else {
              toast.error(data.message || 'Không thể upload video từ clipboard');
            }
          } catch (err) {
            toast.error('Lỗi khi tải video từ clipboard');
          } finally {
            setIsUploading(false);
            setUploadStatus('');
          }
        }
        break;
      }
    }
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {/* 1. Header Top Bar (Tabs & Mode switch) */}
      <div className={styles.topBar}>
        <div className={styles.tabsGroup}>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === 'visual' ? styles.activeTabBtn : ''}`}
            onClick={() => handleSwitchMode('visual')}
          >
            <FiEdit3 size={14} />
            <span>Soạn Thảo Trực Quan</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === 'preview' ? styles.activeTabBtn : ''}`}
            onClick={() => handleSwitchMode('preview')}
          >
            <FiEye size={14} />
            <span>Xem Trước Giao Diện</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === 'html' ? styles.activeTabBtn : ''}`}
            onClick={() => handleSwitchMode('html')}
          >
            <FiCode size={14} />
            <span>Mã HTML</span>
          </button>
        </div>

        <div className={styles.helperText}>
          <FiHelpCircle size={13} />
          <span>Bôi đen chữ để đổi màu/cỡ chữ | Click ảnh để căn chỉnh & xóa</span>
        </div>
      </div>

      {/* 2. Formatting & Rich Decoration Toolbar (Visible in Visual mode) */}
      {mode === 'visual' && (
        <div className={styles.toolbar}>
          {/* Format Block (P, H2, H3, Blockquote) */}
          <div className={styles.toolGroup}>
            <select
              className={styles.selectFormat}
              onMouseDown={saveSelection}
              onFocus={saveSelection}
              onChange={(e) => {
                const tag = e.target.value;
                if (tag === 'p') execCmd('formatBlock', '<p>');
                else if (tag === 'h2') execCmd('formatBlock', '<h2>');
                else if (tag === 'h3') execCmd('formatBlock', '<h3>');
                else if (tag === 'blockquote') execCmd('formatBlock', '<blockquote>');
                e.target.value = 'default';
              }}
              defaultValue="default"
              title="Chọn kiểu đoạn văn bản"
            >
              <option value="default" disabled>
                Định dạng kiểu...
              </option>
              <option value="p">Đoạn văn thường (P)</option>
              <option value="h2">Tiêu đề chính (H2)</option>
              <option value="h3">Tiêu đề phụ (H3)</option>
              <option value="blockquote">Trích dẫn (Quote)</option>
            </select>
          </div>

          {/* Font Size Selector */}
          <div className={styles.toolGroup}>
            <select
              className={styles.fontSizeSelect}
              onMouseDown={saveSelection}
              onFocus={saveSelection}
              onChange={(e) => {
                const size = e.target.value;
                if (size !== 'default') {
                  applyFontSize(size);
                  e.target.value = 'default';
                }
              }}
              defaultValue="default"
              title="Chọn kích cỡ chữ"
            >
              <option value="default" disabled>
                Cỡ chữ...
              </option>
              <option value="12px">12px (Chú thích nhỏ)</option>
              <option value="14px">14px (Văn bản chuẩn)</option>
              <option value="16px">16px (Nổi bật vừa)</option>
              <option value="18px">18px (Đề mục lớn)</option>
              <option value="22px">22px (Tiêu đề chính)</option>
              <option value="26px">26px (Giá sốc / Đại hạ giá)</option>
            </select>
          </div>

          <div className={styles.divider} />

          {/* Typography Styles: Bold, Italic, Underline, Strikethrough, Clear Formatting */}
          <div className={styles.toolGroup}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('bold')}
              title="In đậm (Ctrl+B)"
            >
              <FiBold />
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('italic')}
              title="In nghiêng (Ctrl+I)"
            >
              <FiItalic />
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('underline')}
              title="Gạch chân (Ctrl+U)"
            >
              <FiUnderline />
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('strikeThrough')}
              title="Gạch ngang giá cũ (Strikethrough)"
            >
              <span style={{ textDecoration: 'line-through', fontWeight: 'bold' }}>S</span>
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('removeFormat')}
              title="Xóa định dạng font/màu (Clear Formatting)"
            >
              <FiRotateCcw size={13} />
            </button>
          </div>

          <div className={styles.divider} />

          {/* Text Color Picker Popover */}
          <div className={`${styles.toolGroup} ${styles.popoverWrap}`}>
            <button
              type="button"
              className={`${styles.toolBtn} ${showColorPopover ? styles.toolBtnActive : ''}`}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                setShowColorPopover(!showColorPopover);
                setShowHighlightPopover(false);
                setShowEmojiPopover(false);
                setShowTemplatePopover(false);
                setShowBadgePopover(false);
                setShowDividerPopover(false);
              }}
              title="Đổi màu chữ (Text Color)"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <FiType size={14} />
                <div
                  className={styles.colorIndicator}
                  style={{ backgroundColor: activeColor }}
                />
              </div>
            </button>

            {showColorPopover && (
              <div className={styles.popover}>
                <div className={styles.popoverTitle}>Bảng 18 màu chữ bán hàng</div>
                <div className={styles.colorGrid}>
                  {TEXT_COLORS.map((item) => (
                    <div
                      key={item.label}
                      className={styles.colorSwatch}
                      style={{
                        backgroundColor: item.color === 'inherit' ? '#334155' : item.color,
                      }}
                      onClick={() => applyTextColor(item.color)}
                      title={item.label}
                    />
                  ))}
                </div>
                <div className={styles.customColorRow}>
                  <span>Tự chọn mã màu:</span>
                  <input
                    type="color"
                    value={activeColor.startsWith('#') ? activeColor : '#ee4d2d'}
                    onChange={(e) => applyTextColor(e.target.value)}
                    className={styles.colorInput}
                    title="Nhấp để chọn màu bất kỳ"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color Picker Popover */}
          <div className={`${styles.toolGroup} ${styles.popoverWrap}`}>
            <button
              type="button"
              className={`${styles.toolBtn} ${showHighlightPopover ? styles.toolBtnActive : ''}`}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                setShowHighlightPopover(!showHighlightPopover);
                setShowColorPopover(false);
                setShowEmojiPopover(false);
                setShowTemplatePopover(false);
                setShowBadgePopover(false);
                setShowDividerPopover(false);
              }}
              title="Tô màu nền highlight văn bản"
            >
              <FiDroplet size={14} />
            </button>

            {showHighlightPopover && (
              <div className={styles.popover}>
                <div className={styles.popoverTitle}>Màu tô sáng dạ quang</div>
                <div className={styles.colorGrid}>
                  {HIGHLIGHT_COLORS.map((item) => (
                    <div
                      key={item.label}
                      className={styles.colorSwatch}
                      style={{
                        backgroundColor: item.color === 'transparent' ? '#1e293b' : item.color,
                        border: item.color === 'transparent' ? '1px dashed #64748b' : undefined,
                      }}
                      onClick={() => applyHighlightColor(item.color)}
                      title={item.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.divider} />

          {/* Text Alignment */}
          <div className={styles.toolGroup}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('justifyLeft')}
              title="Căn lề trái"
            >
              <FiAlignLeft />
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('justifyCenter')}
              title="Căn lề giữa"
            >
              <FiAlignCenter />
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('justifyRight')}
              title="Căn lề phải"
            >
              <FiAlignRight />
            </button>
          </div>

          <div className={styles.divider} />

          {/* Lists */}
          <div className={styles.toolGroup}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => execCmd('insertUnorderedList')}
              title="Danh sách gạch đầu dòng"
            >
              <FiList />
            </button>
          </div>

          {/* Artistic Divider Popover */}
          <div className={`${styles.toolGroup} ${styles.popoverWrap}`}>
            <button
              type="button"
              className={`${styles.toolBtn} ${showDividerPopover ? styles.toolBtnActive : ''}`}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                setShowDividerPopover(!showDividerPopover);
                setShowColorPopover(false);
                setShowHighlightPopover(false);
                setShowEmojiPopover(false);
                setShowTemplatePopover(false);
                setShowBadgePopover(false);
              }}
              title="Chèn đường kẻ phân cách nghệ thuật"
            >
              <FiMinus />
            </button>

            {showDividerPopover && (
              <div className={styles.popover}>
                <div className={styles.popoverTitle}>Đường kẻ phân cách trang trí</div>
                <div className={styles.dividerMenu}>
                  <button
                    type="button"
                    className={styles.dividerBtn}
                    onClick={() => insertArtisticDivider('gradient')}
                  >
                    <span>Cầu vồng Neon</span>
                    <span className={styles.dividerPreview} style={{ color: '#ee4d2d' }}>━━━━━</span>
                  </button>
                  <button
                    type="button"
                    className={styles.dividerBtn}
                    onClick={() => insertArtisticDivider('dashed')}
                  >
                    <span>Nét đứt cam Shopee</span>
                    <span className={styles.dividerPreview} style={{ color: '#f97316' }}>- - - - -</span>
                  </button>
                  <button
                    type="button"
                    className={styles.dividerBtn}
                    onClick={() => insertArtisticDivider('stars')}
                  >
                    <span>Dải sao lấp lánh</span>
                    <span className={styles.dividerPreview}>✨ ⭐ ✨</span>
                  </button>
                  <button
                    type="button"
                    className={styles.dividerBtn}
                    onClick={() => insertArtisticDivider('fire')}
                  >
                    <span>Dải ngọn lửa hot</span>
                    <span className={styles.dividerPreview}>🔥 🔥 🔥</span>
                  </button>
                  <button
                    type="button"
                    className={styles.dividerBtn}
                    onClick={() => insertArtisticDivider('diamond')}
                  >
                    <span>Dải kim cương VIP</span>
                    <span className={styles.dividerPreview}>💎 💎 💎</span>
                  </button>
                  <button
                    type="button"
                    className={styles.dividerBtn}
                    onClick={() => insertArtisticDivider('solid')}
                  >
                    <span>Đường kẻ mỏng thanh lịch</span>
                    <span className={styles.dividerPreview} style={{ color: '#64748b' }}>───────</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.divider} />

          {/* Sales Badges Popover */}
          <div className={`${styles.toolGroup} ${styles.popoverWrap}`}>
            <button
              type="button"
              className={`${styles.urlImageBtn} ${showBadgePopover ? styles.toolBtnActive : ''}`}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                setShowBadgePopover(!showBadgePopover);
                setShowColorPopover(false);
                setShowHighlightPopover(false);
                setShowEmojiPopover(false);
                setShowTemplatePopover(false);
                setShowDividerPopover(false);
              }}
              title="Chèn huy hiệu bán hàng nổi bật (Pill Badges)"
            >
              <FiTag size={13} color="#f59e0b" />
              <span>Huy hiệu</span>
            </button>

            {showBadgePopover && (
              <div className={styles.popover}>
                <div className={styles.popoverTitle}>Huy hiệu bán hàng nổi bật</div>
                <div className={styles.badgeGrid}>
                  {SALES_BADGES.map((b) => (
                    <button
                      key={b.text}
                      type="button"
                      className={styles.badgeBtn}
                      style={{ background: b.bg }}
                      onClick={() => insertBadge(b.text, b.icon, b.bg)}
                      title={`Chèn huy hiệu ${b.text}`}
                    >
                      <span>{b.icon}</span>
                      <span>{b.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Hot Emojis Popover */}
          <div className={`${styles.toolGroup} ${styles.popoverWrap}`}>
            <button
              type="button"
              className={`${styles.toolBtn} ${showEmojiPopover ? styles.toolBtnActive : ''}`}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                setShowEmojiPopover(!showEmojiPopover);
                setShowColorPopover(false);
                setShowHighlightPopover(false);
                setShowTemplatePopover(false);
                setShowBadgePopover(false);
                setShowDividerPopover(false);
              }}
              title="Chèn biểu tượng cảm xúc (36 Emojis bán hàng)"
            >
              <FiSmile size={15} />
            </button>

            {showEmojiPopover && (
              <div className={styles.popover}>
                <div className={styles.popoverTitle}>36 Biểu tượng bán hàng HOT</div>
                <div className={styles.emojiGrid}>
                  {HOT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={styles.emojiBtn}
                      onClick={() => {
                        insertHtmlAtCursorOrBottom(` ${emoji} `);
                        setShowEmojiPopover(false);
                      }}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Spec Table Template */}
          <div className={styles.toolGroup}>
            <button
              type="button"
              className={styles.toolBtn}
              onMouseDown={saveSelection}
              onClick={() => insertSpecTable('blue')}
              title="Chèn bảng thông số kỹ thuật mẫu"
            >
              <FiGrid size={15} />
            </button>
          </div>

          {/* Callout Box & Banners Popover */}
          <div className={`${styles.toolGroup} ${styles.popoverWrap}`}>
            <button
              type="button"
              className={`${styles.urlImageBtn} ${showTemplatePopover ? styles.toolBtnActive : ''}`}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                setShowTemplatePopover(!showTemplatePopover);
                setShowColorPopover(false);
                setShowHighlightPopover(false);
                setShowEmojiPopover(false);
                setShowBadgePopover(false);
                setShowDividerPopover(false);
              }}
              title="Chèn khung trang trí & banner sản phẩm"
            >
              <FiBox size={14} color="#3b82f6" />
              <span>Khung mẫu</span>
            </button>

            {showTemplatePopover && (
              <div className={styles.popover}>
                <div className={styles.popoverTitle}>Khung trang trí & Kêu gọi</div>
                <div className={styles.templateMenu}>
                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCalloutBox('flashsale')}
                  >
                    <span>🔥</span>
                    <div>
                      <div>Khung Flash Sale Giá Sốc</div>
                      <span className={styles.templateSubtext}>Viền đỏ cam Shopee thôi thúc mua hàng</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCalloutBox('vipgold')}
                  >
                    <span>👑</span>
                    <div>
                      <div>Khung Cam Kết Vàng VIP</div>
                      <span className={styles.templateSubtext}>Viền vàng hoàng kim sang trọng</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCalloutBox('voucher')}
                  >
                    <span>🎟️</span>
                    <div>
                      <div>Khung Voucher Giảm Giá</div>
                      <span className={styles.templateSubtext}>Viền nét đứt kèm mã ưu đãi độc quyền</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCalloutBox('gift')}
                  >
                    <span>🎁</span>
                    <div>
                      <div>Khung Quà Tặng Kèm Khủng</div>
                      <span className={styles.templateSubtext}>Màu hồng tím kích thích chốt đơn</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCalloutBox('highlight')}
                  >
                    <span>🌟</span>
                    <div>
                      <div>Khung Đặc Điểm Nổi Bật</div>
                      <span className={styles.templateSubtext}>Xanh neon hiện đại, chuẩn công nghệ</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCalloutBox('guarantee')}
                  >
                    <span>🛡️</span>
                    <div>
                      <div>Khung Cam Kết Bảo Hành</div>
                      <span className={styles.templateSubtext}>Xanh lá an tâm, tin cậy</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCalloutBox('warning')}
                  >
                    <span>💡</span>
                    <div>
                      <div>Khung Lưu Ý & Hướng Dẫn</div>
                      <span className={styles.templateSubtext}>Vàng cam cảnh báo nhẹ nhàng</span>
                    </div>
                  </button>

                  <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCtaButton('buy')}
                  >
                    <span>👉</span>
                    <div>
                      <div style={{ color: '#ee4d2d', fontWeight: 700 }}>Nút [ĐẶT MUA NGAY]</div>
                      <span className={styles.templateSubtext}>Gradient đỏ cam thu hút click</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.templateBtn}
                    onClick={() => insertCtaButton('voucher')}
                  >
                    <span>🎁</span>
                    <div>
                      <div style={{ color: '#ec4899', fontWeight: 700 }}>Nút [NHẬN ƯU ĐÃI 50K]</div>
                      <span className={styles.templateSubtext}>Gradient tím hồng quyến rũ</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.divider} />

          {/* Media Insertion Group: Image & Video */}
          <div className={styles.toolGroup}>
            <button
              type="button"
              className={styles.uploadImageBtn}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              title="Tải ảnh từ máy tính chèn xen kẽ vào bài viết"
            >
              <FiUploadCloud size={15} />
              <span>{isUploading ? 'Đang tải...' : 'Upload ảnh'}</span>
            </button>

            <button
              type="button"
              className={styles.uploadVideoBtn}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                videoFileInputRef.current?.click();
              }}
              disabled={isUploading}
              title="Tải video từ máy tính lưu vào CSDL MongoDB và chèn xen kẽ vào bài viết"
            >
              <FiVideo size={15} />
              <span>{isUploading ? 'Đang tải...' : 'Upload video (Lưu DB)'}</span>
            </button>

            <button
              type="button"
              className={styles.urlImageBtn}
              onMouseDown={saveSelection}
              onClick={() => {
                saveSelection();
                setShowUrlModal(true);
              }}
              title="Chèn ảnh hoặc video qua đường dẫn link URL / YouTube"
            >
              <FiLink size={13} />
              <span>Link Ảnh/Video</span>
            </button>

            {/* Hidden Multi-image input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              multiple
              onChange={handleFileUpload}
            />

            {/* Hidden Multi-video input */}
            <input
              type="file"
              ref={videoFileInputRef}
              style={{ display: 'none' }}
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
              multiple
              onChange={handleVideoUpload}
            />
          </div>
        </div>
      )}

      {/* 3. Uploading Progress Banner */}
      {isUploading && (
        <div className={styles.uploadingBar}>
          <div className={styles.spinner} />
          <span>{uploadStatus || 'Đang tải hình ảnh lên hệ thống, vui lòng chờ...'}</span>
        </div>
      )}

      {/* Floating Toolbar when an image is clicked */}
      {selectedImage && deleteBtnPos && mode === 'visual' && (
        <div
          className={styles.floatingImageToolbar}
          style={{
            top: `${deleteBtnPos.top}px`,
            left: `${deleteBtnPos.left}px`,
          }}
        >
          {/* Quick Image Width */}
          <div className={styles.floatingBtnGroup}>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageWidth('100%')}
              title="Kích thước 100% toàn khung"
            >
              100%
            </button>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageWidth('75%')}
              title="Kích thước 75% vừa vặn"
            >
              75%
            </button>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageWidth('50%')}
              title="Kích thước 50% nhỏ gọn"
            >
              50%
            </button>
          </div>

          <div className={styles.floatingDivider} />

          {/* Quick Image Alignment */}
          <div className={styles.floatingBtnGroup}>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageAlign('left')}
              title="Căn trái ảnh"
            >
              Trái
            </button>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageAlign('center')}
              title="Căn giữa ảnh"
            >
              Giữa
            </button>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageAlign('right')}
              title="Căn phải ảnh"
            >
              Phải
            </button>
          </div>

          <div className={styles.floatingDivider} />

          {/* Quick Image Border Radius */}
          <div className={styles.floatingBtnGroup}>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageRadius('8px')}
              title="Bo góc mềm mại (8px)"
            >
              Bo 8px
            </button>
            <button
              type="button"
              className={styles.floatingSmallBtn}
              onClick={() => handleSetImageRadius('20px')}
              title="Bo góc tròn xoe (20px)"
            >
              Bo tròn
            </button>
          </div>

          <div className={styles.floatingDivider} />

          {/* Delete Image Action */}
          <button
            type="button"
            className={styles.deleteImageBtn}
            onClick={handleDeleteSelectedImage}
            title="Xóa hình ảnh này khỏi mô tả"
          >
            <FiTrash2 size={13} />
            <span>Xóa ảnh</span>
          </button>
        </div>
      )}

      {/* 4. Main Body: Visual Editor (ALWAYS MOUNTED TO PRESERVE CONTENT & CURSOR) */}
      <div
        ref={editorRef}
        className={styles.editorContent}
        style={{ display: mode === 'visual' ? 'block' : 'none' }}
        contentEditable
        suppressContentEditableWarning
        onInput={handleEditorInput}
        onClick={handleEditorClick}
        onScroll={handleEditorScroll}
        onKeyDown={handleEditorKeyDown}
        onBlur={() => {
          saveSelection();
          handleEditorInput();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPaste={handlePaste}
        data-placeholder={placeholder}
      />

      {/* 5. Preview View */}
      {mode === 'preview' && (
        <div className={styles.previewContainer}>
          <div className={styles.previewBanner}>
            <FiCheckCircle size={14} />
            <span>Mô phỏng hiển thị thực tế trên trang Chi tiết sản phẩm (cả Mobile & Desktop)</span>
          </div>
          {(value || editorRef.current?.innerHTML)?.trim() ? (
            <div
              className={styles.previewBody}
              dangerouslySetInnerHTML={{ __html: normalizeToHtml(value || editorRef.current?.innerHTML || '') }}
            />
          ) : (
            <div className={styles.emptyPreview}>
              Chưa có nội dung mô tả sản phẩm. Hãy quay lại tab <strong>Soạn Thảo Trực Quan</strong> để nhập văn bản và chèn ảnh!
            </div>
          )}
        </div>
      )}

      {/* 6. Raw HTML View */}
      {mode === 'html' && (
        <textarea
          className={styles.htmlTextarea}
          value={value}
          onChange={(e) => {
            const nextVal = e.target.value;
            onChange(nextVal);
            lastHtmlRef.current = nextVal;
            if (editorRef.current) {
              editorRef.current.innerHTML = nextVal;
            }
          }}
          placeholder="Mã HTML thô của mô tả sản phẩm..."
        />
      )}

      {/* 7. Modal: Insert Image or Video by URL */}
      {showUrlModal && (
        <div className={styles.urlPromptOverlay} onClick={() => setShowUrlModal(false)}>
          <div className={styles.urlPromptBox} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.urlPromptTitle}>
              {urlMediaType === 'image' && <FiImage color="var(--primary, #3b82f6)" />}
              {urlMediaType === 'video' && <FiVideo color="#a855f7" />}
              {urlMediaType === 'youtube' && <span style={{ color: '#ef4444' }}>▶️</span>}
              {urlMediaType === 'tiktok' && <span style={{ color: '#fe2c55' }}>🎵</span>}
              <span>Chèn Media từ đường dẫn URL</span>
            </h4>

            {/* Media Type Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`${styles.tabBtn} ${urlMediaType === 'image' ? styles.activeTabBtn : ''}`}
                style={{ flex: 1, minWidth: 70, justifyContent: 'center' }}
                onClick={() => setUrlMediaType('image')}
              >
                <FiImage size={13} />
                <span>Link Ảnh</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${urlMediaType === 'video' ? styles.activeTabBtn : ''}`}
                style={{ flex: 1, minWidth: 85, justifyContent: 'center' }}
                onClick={() => setUrlMediaType('video')}
              >
                <FiVideo size={13} />
                <span>Video MP4</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${urlMediaType === 'youtube' ? styles.activeTabBtn : ''}`}
                style={{ flex: 1, minWidth: 80, justifyContent: 'center' }}
                onClick={() => setUrlMediaType('youtube')}
              >
                <span>▶️</span>
                <span>YouTube</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${urlMediaType === 'tiktok' ? styles.activeTabBtn : ''}`}
                style={{ flex: 1, minWidth: 75, justifyContent: 'center' }}
                onClick={() => setUrlMediaType('tiktok')}
              >
                <span>🎵</span>
                <span>TikTok</span>
              </button>
            </div>

            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>
                  {urlMediaType === 'image' && 'Đường dẫn URL hình ảnh (bắt buộc)'}
                  {urlMediaType === 'video' && 'Đường dẫn URL video MP4 / WebM trực tiếp (bắt buộc)'}
                  {urlMediaType === 'youtube' && 'Link video YouTube (VD: https://youtube.com/watch?v=... hoặc https://youtu.be/...)'}
                  {urlMediaType === 'tiktok' && 'Link video TikTok (VD: https://www.tiktok.com/@user/video/756802280...)'}
                </label>
                <input
                  type="text"
                  className={styles.urlInput}
                  placeholder={
                    urlMediaType === 'image'
                      ? 'https://example.com/hinh-anh.jpg hoặc /uploads/...'
                      : urlMediaType === 'video'
                      ? 'https://example.com/video.mp4 hoặc /uploads/...'
                      : urlMediaType === 'youtube'
                      ? 'https://www.youtube.com/watch?v=...'
                      : 'https://www.tiktok.com/@username/video/7568022809629363477'
                  }
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmUrl(e);
                    }
                  }}
                  autoFocus
                />
              </div>

              {urlMediaType === 'image' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Chú thích ảnh / Alt text (tùy chọn)
                  </label>
                  <input
                    type="text"
                    className={styles.urlInput}
                    placeholder="Mô tả ngắn gọn về hình ảnh..."
                    value={imageAltInput}
                    onChange={(e) => setImageAltInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmUrl(e);
                      }
                    }}
                  />
                </div>
              )}

              <div className={styles.urlPromptActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowUrlModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={handleConfirmUrl}
                >
                  Chèn vào bài viết
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

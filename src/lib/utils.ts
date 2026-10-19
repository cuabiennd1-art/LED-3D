import slugify from 'slugify';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price || 0);
}

export function generateSlug(text: string): string {
  return slugify(text || '', {
    lower: true,
    strict: true,
    locale: 'vi',
  });
}

export function generateOrderCode(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ST${random}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]) {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}

/**
 * Tự động biến đổi và sửa lỗi các thẻ video TikTok / YouTube trong mã HTML mô tả sản phẩm
 * Tránh tình trạng chèn nhầm link web vào thẻ <video> gây màn hình đen 0:00
 */
export function sanitizeAndTransformRichDescription(html?: string | null): string {
  if (!html) return '';

  let transformed = html;

  // Tự động nâng cấp kích thước các embed TikTok cũ (từ 360px lên responsive 540px hiển thị to rõ trên PC)
  transformed = transformed.replace(
    /max-width:\s*360px/gi,
    'max-width: 540px'
  );
  transformed = transformed.replace(
    /height:\s*580px/gi,
    'height: 840px'
  );

  // 1. Chuyển đổi thẻ <video src="...tiktok.com..."> thành TikTok iframe player
  const tiktokTagRegex = /<video[^>]*src=["']([^"']*tiktok\.com[^"']*)["'][^>]*>[\s\S]*?<\/video>/gi;
  transformed = transformed.replace(tiktokTagRegex, (match, src) => {
    const idMatch = src.match(/\/video\/(\d+)/i) || src.match(/\/player\/v1\/(\d+)/i) || src.match(/\b(\d{15,22})\b/);
    if (idMatch && idMatch[1]) {
      const videoId = idMatch[1];
      return `<div class="tiktok-embed-container" style="text-align: center; margin: 24px auto; max-width: 540px; width: 100%;">
        <iframe
          src="https://www.tiktok.com/player/v1/${videoId}"
          title="Video TikTok mô tả sản phẩm"
          style="width: 100%; height: 840px; border: none; border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.5); background: #000000; overflow: hidden;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          scrolling="no"
        ></iframe>
        <div style="margin-top: 10px;">
          <a href="${src}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #fe2c55; text-decoration: none; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: rgba(254,44,85,0.08);">
            <span>🎵 Mở xem video trên TikTok</span>
          </a>
        </div>
      </div>`;
    }
    return match;
  });

  // 2. Chuyển đổi <video><source src="...tiktok.com..." /></video>
  const tiktokSourceRegex = /<video[^>]*>[\s\S]*?<source[^>]*src=["']([^"']*tiktok\.com[^"']*)["'][^>]*>[\s\S]*?<\/video>/gi;
  transformed = transformed.replace(tiktokSourceRegex, (match, src) => {
    const idMatch = src.match(/\/video\/(\d+)/i) || src.match(/\/player\/v1\/(\d+)/i) || src.match(/\b(\d{15,22})\b/);
    if (idMatch && idMatch[1]) {
      const videoId = idMatch[1];
      return `<div class="tiktok-embed-container" style="text-align: center; margin: 24px auto; max-width: 540px; width: 100%;">
        <iframe
          src="https://www.tiktok.com/player/v1/${videoId}"
          title="Video TikTok mô tả sản phẩm"
          style="width: 100%; height: 840px; border: none; border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.5); background: #000000; overflow: hidden;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          scrolling="no"
        ></iframe>
        <div style="margin-top: 10px;">
          <a href="${src}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #fe2c55; text-decoration: none; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: rgba(254,44,85,0.08);">
            <span>🎵 Mở xem video trên TikTok</span>
          </a>
        </div>
      </div>`;
    }
    return match;
  });

  // 3. Chuyển đổi <video src="...youtube.com..."> thành YouTube iframe player
  const ytTagRegex = /<video[^>]*src=["']([^"']*(?:youtube\.com|youtu\.be)[^"']*)["'][^>]*>[\s\S]*?<\/video>/gi;
  transformed = transformed.replace(ytTagRegex, (match, src) => {
    const ytMatch = src.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const ytId = ytMatch[1];
      return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 16px 0; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
        <iframe
          src="https://www.youtube.com/embed/${ytId}"
          title="Video YouTube mô tả sản phẩm"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 12px;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>`;
    }
    return match;
  });

  // 4. Đảm bảo tất cả thẻ <video> trong mô tả sản phẩm đều chạy nội tuyến (INLINE), không mở fullscreen trên iPhone
  // Bỏ controls native (nguyên nhân gây ép fullscreen trên iOS), thêm playsinline, webkit-playsinline, x5-playsinline, controlslist="nofullscreen"
  // Bổ sung giao diện điều khiển nội tuyến: nút Bật/Tắt tiếng, Phóng to, và nút Tạm dừng/Phát theo chuẩn Shopee
  const wrapVideoTag = (attrs: string, inner: string = '') => {
    let newAttrs = attrs;
    // Xóa bỏ hoàn toàn thuộc tính controls native để chặn đứng iOS Safari tự động nhảy fullscreen
    newAttrs = newAttrs.replace(/\bcontrols(=["'][^"']*["'])?/gi, '');

    // Đảm bảo đầy đủ các thuộc tính bắt buộc của iOS WebKit / Mobile
    if (!/\bplaysinline\b/i.test(newAttrs)) {
      newAttrs += ' playsinline';
    }
    if (!/\bwebkit-playsinline\b/i.test(newAttrs)) {
      newAttrs += ' webkit-playsinline="true"';
    }
    if (!/\bx5-playsinline\b/i.test(newAttrs)) {
      newAttrs += ' x5-playsinline="true"';
    }
    if (!/\bcontrolslist\b/i.test(newAttrs)) {
      newAttrs += ' controlslist="nofullscreen nodownload noremoteplayback"';
    }
    if (!/\bdisablepictureinpicture\b/i.test(newAttrs)) {
      newAttrs += ' disablepictureinpicture="true"';
    }
    if (!/\bdisableremoteplayback\b/i.test(newAttrs)) {
      newAttrs += ' disableremoteplayback="true"';
    }
    if (!/\bmuted\b/i.test(newAttrs)) {
      newAttrs += ' muted';
    }
    if (!/\bloop\b/i.test(newAttrs)) {
      newAttrs += ' loop';
    }
    if (!/\bpreload\b/i.test(newAttrs)) {
      newAttrs += ' preload="auto"';
    } else {
      newAttrs = newAttrs.replace(/preload=["'][^"']*["']/i, 'preload="auto"');
    }

    // Tinh chỉnh style inline của video để vừa khít container và vô hiệu hóa bắt sự kiện native
    if (/style=["']/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/style=["']([^"']*)["']/i, (_sMatch: string, sVal: string) => {
        return `style="${sVal}; width: 100%; height: auto; display: block; object-fit: contain; pointer-events: none;"`;
      });
    } else {
      newAttrs += ' style="width: 100%; height: auto; display: block; object-fit: contain; pointer-events: none;"';
    }

    // Gắn #t=0.001 vào link mp4 để iOS Safari hiển thị ngay khung hình đầu tiên làm thumbnail thay vì khung đen
    newAttrs = newAttrs.replace(/src=["']([^"']+\.mp4)(?:#[^"']*)?["']/i, 'src="$1#t=0.001"');

    return `<div class="desc-video-container" style="position: relative; margin: 16px auto; max-width: 100%; border-radius: 12px; overflow: hidden; background: #000; display: block; box-shadow: 0 4px 16px rgba(0,0,0,0.25); cursor: pointer;">
      <video ${newAttrs}>${inner}</video>
      <div class="desc-video-play-btn" style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); z-index: 2; pointer-events: none;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.9); color: #000; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); padding-left: 3px; font-size: 20px;">▶</div>
      </div>
      <button type="button" class="desc-video-zoom-btn" style="position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.25); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 3;" title="Phóng to video">⛶</button>
      <button type="button" class="desc-video-sound-btn" style="position: absolute; bottom: 12px; right: 12px; height: 26px; padding: 0 10px; border-radius: 13px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.25); color: #fff; display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; cursor: pointer; z-index: 3;" title="Bật/Tắt âm thanh">🔇 <span>Bật tiếng</span></button>
      <div class="desc-video-progress" style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.25); z-index: 3; pointer-events: none;">
        <div class="desc-video-progress-bar" style="height: 100%; width: 0%; background: #ee4d2d; transition: width 0.1s linear;"></div>
      </div>
    </div>`;
  };

  const videoBlockRegex = /<video\b([^>]*)>([\s\S]*?)<\/video>/gi;
  transformed = transformed.replace(videoBlockRegex, (match, attrs, inner) => {
    if (match.includes('desc-video-container')) return match;
    return wrapVideoTag(attrs, inner);
  });

  // Xử lý các thẻ <video> đơn lẻ (không có thẻ đóng </video>)
  transformed = transformed.replace(/<video\b([^>]*)>(?![\s\S]*?<\/video>)/gi, (match, attrs) => {
    if (match.includes('desc-video-container')) return match;
    return wrapVideoTag(attrs, '');
  });

  return transformed;
}

/**
 * Kiểm tra xem một URL có phải là video (mp4, webm, mov, ogg, youtube, tiktok, v.v.) hay không
 */
export function isVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().split('?')[0].split('#')[0].toLowerCase();
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.mkv') ||
    url.startsWith('data:video/')
  ) {
    return true;
  }
  // Video streams / embed providers
  if (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('tiktok.com')
  ) {
    return true;
  }
  return false;
}

/**
 * Lấy YouTube embed URL nếu là link YouTube
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : null;
}

/**
 * Lấy ảnh hiển thị đại diện (thumbnail / cover) của sản phẩm.
 * Tự động bỏ qua bất kỳ video nào (mp4, webm, youtube, v.v.), luôn lấy ảnh tĩnh đầu tiên
 * (ví dụ nếu video đặt ở vị trí #1 thì tự động lấy ảnh thứ #2 để hiển thị).
 */
export function getProductCoverImage(product?: any, fallback = '/file.svg'): string {
  if (!product) return fallback;

  // Nếu tham số truyền vào là mảng các đường dẫn ảnh
  if (Array.isArray(product)) {
    const staticImg = product.find(
      (img: any) => typeof img === 'string' && img.trim().length > 0 && !isVideoUrl(img)
    );
    return staticImg || fallback;
  }

  // 1. Kiểm tra mảng images của sản phẩm
  if (Array.isArray(product.images) && product.images.length > 0) {
    const staticImg = product.images.find(
      (img: any) => typeof img === 'string' && img.trim().length > 0 && !isVideoUrl(img)
    );
    if (staticImg) return staticImg;
  }

  // 2. Kiểm tra thuộc tính image đơn
  if (product.image && typeof product.image === 'string' && !isVideoUrl(product.image)) {
    return product.image;
  }

  // 3. Kiểm tra ảnh trong variants nếu có
  if (Array.isArray(product.variants)) {
    const variantImg = product.variants.find(
      (v: any) => v.image && typeof v.image === 'string' && !isVideoUrl(v.image)
    )?.image;
    if (variantImg) return variantImg;
  }

  // 4. Nếu product là chuỗi string URL trực tiếp
  if (typeof product === 'string' && product.trim().length > 0 && !isVideoUrl(product)) {
    return product;
  }

  return fallback;
}
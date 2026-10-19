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

  // 4. Đảm bảo tất cả thẻ <video> đều có playsinline, muted, loop, preload="auto", và #t=0.001
  // để hỗ trợ hiển thị ảnh khung hình đầu tiên (tránh màn hình đen trên Safari/iOS) và tự động phát khi cuộn
  transformed = transformed.replace(/<video\b([^>]*)>/gi, (match, attrs) => {
    let newAttrs = attrs;
    if (!/\bplaysinline\b/i.test(newAttrs)) {
      newAttrs += ' playsinline';
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
    // Gắn #t=0.001 vào link mp4 để iOS Safari hiển thị ngay khung hình đầu tiên làm thumbnail thay vì khung đen
    newAttrs = newAttrs.replace(/src=["']([^"']+\.mp4)(?:#[^"']*)?["']/i, 'src="$1#t=0.001"');

    return `<video${newAttrs}>`;
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
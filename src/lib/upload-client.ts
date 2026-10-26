import { apiFetch } from '@/lib/api';

export interface UploadProgress {
  percent: number;
  stage: 'preparing' | 'uploading' | 'assembling' | 'complete' | 'error';
  message: string;
}

export interface UploadMediaOptions {
  onProgress?: (progress: UploadProgress) => void;
  chunkSize?: number; // bytes (mặc định 2MB để an toàn tuyệt đối với Vercel 4.5MB)
}

export interface UploadResult {
  success: boolean;
  url: string;
  data?: {
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
    isVideo?: boolean;
  };
  message?: string;
}

interface UploadServerConfig {
  maxDirectSize: number;
  chunkSize: number;
  cloudinary?: {
    enabled: boolean;
    cloudName: string | null;
    uploadPreset: string | null;
  };
}

let cachedConfig: UploadServerConfig | null = null;

/**
 * Lấy cấu hình upload từ server (Cloudinary, chunkSize, giới hạn)
 */
async function getUploadConfig(): Promise<UploadServerConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await apiFetch('/api/upload');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        cachedConfig = data.data as UploadServerConfig;
        return cachedConfig;
      }
    }
  } catch (e) {
    console.warn('Không thể lấy cấu hình upload, dùng cấu hình mặc định:', e);
  }

  const fallback: UploadServerConfig = {
    maxDirectSize: 3.5 * 1024 * 1024,
    chunkSize: 2 * 1024 * 1024,
  };
  cachedConfig = fallback;
  return fallback;
}

/**
 * Upload trực tiếp lên Cloudinary từ Client (Bỏ qua hoàn toàn Vercel proxy)
 */
async function uploadToCloudinaryDirect(
  file: File,
  cloudName: string,
  uploadPreset: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);
  const resourceType = isVideo ? 'video' : 'image';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress({
          percent,
          stage: percent < 100 ? 'uploading' : 'assembling',
          message:
            percent < 100
              ? `Đang tải ${isVideo ? 'video' : 'ảnh'} lên Cloudinary (${percent}%)...`
              : 'Đang hoàn tất xử lý...',
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.secure_url) {
            resolve({
              success: true,
              url: res.secure_url,
              data: {
                url: res.secure_url,
                filename: res.original_filename || file.name,
                mimeType: file.type,
                size: file.size,
                isVideo,
              },
            });
            return;
          }
        } catch (e) {}
      }
      reject(new Error(`Lỗi tải lên Cloudinary (HTTP ${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải lên Cloudinary'));
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

/**
 * Upload chia nhỏ theo từng mảnh (Chunked Upload) lưu vào MongoDB GridFS
 * Bỏ qua hoàn toàn giới hạn 4.5 MB của Vercel Serverless Function
 */
async function uploadChunked(
  file: File,
  options?: UploadMediaOptions
): Promise<UploadResult> {
  const { onProgress } = options || {};
  const CHUNK_SIZE = options?.chunkSize || 2 * 1024 * 1024; // 2MB mỗi mảnh
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);

  onProgress?.({
    percent: 0,
    stage: 'preparing',
    message: `Đang khởi tạo phiên tải lên (${totalChunks} phần, ${(file.size / (1024 * 1024)).toFixed(1)} MB)...`,
  });

  // BƯỚC 1: INIT - Khởi tạo phiên
  const initForm = new FormData();
  initForm.append('action', 'init');
  initForm.append('filename', file.name);
  initForm.append('mimeType', file.type || 'application/octet-stream');
  initForm.append('totalSize', file.size.toString());
  initForm.append('totalChunks', totalChunks.toString());

  const initRes = await apiFetch('/api/upload/chunk', {
    method: 'POST',
    body: initForm,
  });

  if (!initRes.ok) {
    throw new Error(`Không thể khởi tạo phiên tải (Mã lỗi ${initRes.status})`);
  }

  const initJson = await initRes.json();
  if (!initJson.success || !initJson.data?.uploadId) {
    throw new Error(initJson.message || 'Khởi tạo phiên tải thất bại');
  }

  const { uploadId } = initJson.data;

  // BƯỚC 2: TẢI TỪNG CHUNK
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);

    let retries = 3;
    let chunkSuccess = false;

    while (retries > 0 && !chunkSuccess) {
      try {
        const chunkForm = new FormData();
        chunkForm.append('action', 'chunk');
        chunkForm.append('uploadId', uploadId);
        chunkForm.append('chunkIndex', i.toString());
        chunkForm.append('chunk', chunkBlob);

        const chunkRes = await apiFetch('/api/upload/chunk', {
          method: 'POST',
          body: chunkForm,
        });

        if (chunkRes.ok) {
          const chunkJson = await chunkRes.json();
          if (chunkJson.success) {
            chunkSuccess = true;
            break;
          }
        }
        retries--;
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (chunkErr) {
        retries--;
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    if (!chunkSuccess) {
      // Hủy phiên tải nếu lỗi
      try {
        const abortForm = new FormData();
        abortForm.append('action', 'abort');
        abortForm.append('uploadId', uploadId);
        await apiFetch('/api/upload/chunk', { method: 'POST', body: abortForm });
      } catch (e) {}

      throw new Error(`Lỗi tải mảnh ${i + 1}/${totalChunks}. Vui lòng thử lại!`);
    }

    // Cập nhật tiến độ (90% cho quá trình gửi, 10% cho quá trình ghép)
    const percent = Math.round(((i + 1) / totalChunks) * 90);
    onProgress?.({
      percent,
      stage: 'uploading',
      message: `Đang tải ${isVideo ? 'video' : 'file'}... ${percent}% (Phần ${i + 1}/${totalChunks})`,
    });
  }

  // BƯỚC 3: COMPLETE - Ghép và hoàn tất
  onProgress?.({
    percent: 92,
    stage: 'assembling',
    message: 'Đang ghép và tối ưu file trên máy chủ MongoDB GridFS...',
  });

  const completeForm = new FormData();
  completeForm.append('action', 'complete');
  completeForm.append('uploadId', uploadId);

  const completeRes = await apiFetch('/api/upload/chunk', {
    method: 'POST',
    body: completeForm,
  });

  if (!completeRes.ok) {
    throw new Error(`Lỗi ghép file trên máy chủ (HTTP ${completeRes.status})`);
  }

  const completeJson = await completeRes.json();
  if (!completeJson.success || !completeJson.data?.url) {
    throw new Error(completeJson.message || 'Lỗi hoàn tất upload');
  }

  onProgress?.({
    percent: 100,
    stage: 'complete',
    message: 'Tải lên hoàn tất thành công!',
  });

  return {
    success: true,
    url: completeJson.data.url,
    data: completeJson.data,
    message: completeJson.message,
  };
}

/**
 * HÀM CHÍNH: Tự động phát hiện phương thức upload tối ưu nhất
 * - Nếu file <= 3.5MB: Gửi trực tiếp 1 lần (nhanh nhất)
 * - Nếu file > 3.5MB:
 *     + Ưu tiên Cloudinary Direct Upload (nếu cấu hình)
 *     + Tự động chia nhỏ (Chunked Upload) vào MongoDB GridFS (vượt qua giới hạn 4.5MB Vercel 100%)
 */
export async function uploadMedia(
  file: File,
  options?: UploadMediaOptions
): Promise<UploadResult> {
  const { onProgress } = options || {};
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);

  try {
    const config = await getUploadConfig();

    // 1. Nếu có cấu hình Cloudinary với Preset -> Tải trực tiếp Client -> Cloudinary
    if (config.cloudinary?.enabled && config.cloudinary.cloudName && config.cloudinary.uploadPreset) {
      try {
        return await uploadToCloudinaryDirect(
          file,
          config.cloudinary.cloudName,
          config.cloudinary.uploadPreset,
          onProgress
        );
      } catch (cloudErr) {
        console.warn('Tải lên Cloudinary thất bại, tự động chuyển sang Chunked Upload:', cloudErr);
      }
    }

    // 2. Nếu file nhỏ (<= 3.5 MB) và không phải video lớn -> Gửi 1 lần thông thường
    const SAFE_DIRECT_LIMIT = config.maxDirectSize || 3.5 * 1024 * 1024;
    if (file.size <= SAFE_DIRECT_LIMIT && !isVideo) {
      onProgress?.({
        percent: 30,
        stage: 'uploading',
        message: 'Đang tải file lên hệ thống...',
      });

      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        // Nếu vẫn gặp 413, fallback ngay sang chunked upload!
        if (res.status === 413) {
          console.warn('Gặp lỗi 413, tự động chuyển sang Chunked Upload...');
          return await uploadChunked(file, options);
        }
        throw new Error(`Lỗi tải file (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (!data.success || !data.data?.url) {
        throw new Error(data.message || 'Lỗi tải file');
      }

      onProgress?.({
        percent: 100,
        stage: 'complete',
        message: 'Tải file thành công!',
      });

      return {
        success: true,
        url: data.data.url,
        data: data.data,
      };
    }

    // 3. File lớn (> 3.5 MB hoặc Video) -> Dùng Chunked Upload vào MongoDB GridFS
    return await uploadChunked(file, options);
  } catch (error: any) {
    onProgress?.({
      percent: 0,
      stage: 'error',
      message: error.message || 'Lỗi tải file',
    });
    throw error;
  }
}

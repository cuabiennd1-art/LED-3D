import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Upload from '@/models/Upload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    // Support 'file' or 'files'
    const file = (formData.get('file') || formData.get('files')) as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy file để upload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const rawName = file.name || 'media';
    const safeName = rawName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;

    // Determine MIME type
    let mimeType = file.type || '';
    if (!mimeType) {
      const ext = path.extname(rawName).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.m4v': 'video/x-m4v',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
      };
      mimeType = mimeMap[ext] || 'application/octet-stream';
    }

    const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(rawName);

    // 1. Tùy chọn Cloudinary (nếu cấu hình)
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET) {
      try {
        const base64Data = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        const resourceType = isVideo ? 'video' : 'image';
        const cloudForm = new FormData();
        cloudForm.append('file', dataUrl);
        cloudForm.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
          {
            method: 'POST',
            body: cloudForm,
          }
        );
        const cloudJson = await cloudRes.json();
        if (cloudJson?.secure_url) {
          return NextResponse.json(
            {
              success: true,
              message: isVideo ? 'Upload video lên Cloudinary thành công' : 'Upload ảnh lên Cloudinary thành công',
              data: { url: cloudJson.secure_url },
            },
            { headers: corsHeaders }
          );
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to MongoDB...', cloudErr);
      }
    }

    // 2. Tùy chọn ImgBB (chỉ dùng cho ảnh, bỏ qua nếu là video)
    if (!isVideo && process.env.IMGBB_API_KEY) {
      try {
        const base64Data = buffer.toString('base64');
        const imgbbForm = new FormData();
        imgbbForm.append('image', base64Data);
        const imgbbRes = await fetch(
          `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
          {
            method: 'POST',
            body: imgbbForm,
          }
        );
        const imgbbJson = await imgbbRes.json();
        if (imgbbJson?.success && imgbbJson?.data?.url) {
          return NextResponse.json(
            {
              success: true,
              message: 'Upload file lên ImgBB thành công',
              data: { url: imgbbJson.data.url },
            },
            { headers: corsHeaders }
          );
        }
      } catch (imgbbErr) {
        console.warn('ImgBB upload failed, falling back to MongoDB...', imgbbErr);
      }
    }

    // 3. LƯU TRỰC TIẾP VÀO CƠ SỞ DỮ LIỆU MONGODB
    // Sử dụng GridFS cho Video và file lớn (hỗ trợ file dung lượng lớn vượt 16MB BSON limit)
    let savedToGridFs = false;
    try {
      await connectToDatabase();
      const db = mongoose.connection.db;

      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

        // Ghi dữ liệu vào GridFS
        await new Promise<void>((resolve, reject) => {
          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              originalName: rawName,
              mimeType,
              contentType: mimeType,
              size: bytes.byteLength,
              isVideo,
            },
          });

          const readable = Readable.from(buffer);
          readable
            .pipe(uploadStream)
            .on('error', (err) => {
              console.error('GridFS stream error:', err);
              reject(err);
            })
            .on('finish', () => {
              savedToGridFs = true;
              resolve();
            });
        });
      }

      // Đăng ký bản ghi trong Collection Upload để quản lý & tìm kiếm nhanh
      const canSaveBase64 = !isVideo && bytes.byteLength <= 10 * 1024 * 1024;
      const base64Data = canSaveBase64 ? buffer.toString('base64') : '';

      await Upload.findOneAndUpdate(
        { filename },
        {
          filename,
          originalName: rawName,
          mimeType,
          size: bytes.byteLength,
          data: base64Data,
          isGridFs: savedToGridFs,
        },
        { upsert: true, new: true }
      );
      console.log(`✅ [Upload DB] Đã lưu ${isVideo ? 'video' : 'ảnh'} "${filename}" vào MongoDB thành công! (GridFS: ${savedToGridFs})`);
    } catch (dbUploadErr: any) {
      console.error('Lỗi khi lưu media vào MongoDB:', dbUploadErr.message || dbUploadErr);
    }

    // 4. Ghi thêm vào thư mục public/uploads làm bộ nhớ đệm nếu ổ cứng có quyền ghi
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);
    } catch (fsErr) {
      // Bỏ qua nếu môi trường chỉ đọc (serverless / Vercel)
    }

    return NextResponse.json(
      {
        success: true,
        message: isVideo ? 'Upload video lên hệ thống thành công' : 'Upload ảnh thành công',
        data: {
          url: `/uploads/${filename}`,
          filename,
          mimeType,
          size: bytes.byteLength,
          isVideo,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Lỗi upload file:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi upload file' },
      { status: 500, headers: corsHeaders }
    );
  }
}
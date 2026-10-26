import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Upload from '@/models/Upload';
import { UploadChunkSession, UploadChunkData } from '@/models/UploadChunk';
import path from 'path';

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
    const action = (formData.get('action') as string) || 'chunk';

    await connectToDatabase();

    // ==========================================
    // ACTION 1: INIT - Khởi tạo phiên upload
    // ==========================================
    if (action === 'init') {
      const rawName = (formData.get('filename') as string) || 'media';
      const mimeType = (formData.get('mimeType') as string) || 'application/octet-stream';
      const totalSize = parseInt(formData.get('totalSize') as string, 10) || 0;
      const totalChunks = parseInt(formData.get('totalChunks') as string, 10) || 1;

      const safeName = rawName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${Date.now()}-${safeName}`;
      const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(rawName);

      await UploadChunkSession.create({
        uploadId,
        filename,
        originalName: rawName,
        mimeType,
        totalSize,
        totalChunks,
        isVideo,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Khởi tạo phiên upload thành công',
          data: {
            uploadId,
            filename,
            totalChunks,
          },
        },
        { headers: corsHeaders }
      );
    }

    // ==========================================
    // ACTION 2: CHUNK - Lưu từng mảnh file
    // ==========================================
    if (action === 'chunk') {
      const uploadId = formData.get('uploadId') as string;
      const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
      const chunkFile = formData.get('chunk') as File | Blob | null;

      if (!uploadId || isNaN(chunkIndex) || !chunkFile) {
        return NextResponse.json(
          { success: false, message: 'Dữ liệu chunk không hợp lệ (thiếu uploadId, chunkIndex hoặc chunk blob)' },
          { status: 400, headers: corsHeaders }
        );
      }

      const bytes = await chunkFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      await UploadChunkData.findOneAndUpdate(
        { uploadId, chunkIndex },
        {
          uploadId,
          chunkIndex,
          data: buffer,
          size: buffer.length,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return NextResponse.json(
        {
          success: true,
          message: `Đã lưu chunk ${chunkIndex}`,
          data: { chunkIndex, size: buffer.length },
        },
        { headers: corsHeaders }
      );
    }

    // ==========================================
    // ACTION 3: COMPLETE - Ghép file vào GridFS
    // ==========================================
    if (action === 'complete') {
      const uploadId = formData.get('uploadId') as string;

      if (!uploadId) {
        return NextResponse.json(
          { success: false, message: 'Thiếu uploadId' },
          { status: 400, headers: corsHeaders }
        );
      }

      const session = await UploadChunkSession.findOne({ uploadId });
      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Phiên upload không tồn tại hoặc đã hết hạn' },
          { status: 404, headers: corsHeaders }
        );
      }

      // Kiểm tra đầy đủ các chunks
      const chunkCount = await UploadChunkData.countDocuments({ uploadId });
      if (chunkCount < session.totalChunks) {
        const existingChunks = await UploadChunkData.find({ uploadId }, { chunkIndex: 1 }).lean();
        const existingSet = new Set(existingChunks.map((c) => c.chunkIndex));
        const missing: number[] = [];
        for (let i = 0; i < session.totalChunks; i++) {
          if (!existingSet.has(i)) missing.push(i);
        }

        return NextResponse.json(
          {
            success: false,
            message: `Chưa tải đủ các phần file (${chunkCount}/${session.totalChunks})`,
            missingChunks: missing,
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Không thể kết nối đến cơ sở dữ liệu MongoDB');
      }

      // Khởi tạo GridFSBucket
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

      // Đọc các chunk tuần tự và pipe vào GridFS
      const uploadStream = bucket.openUploadStream(session.filename, {
        metadata: {
          originalName: session.originalName,
          mimeType: session.mimeType,
          contentType: session.mimeType,
          size: session.totalSize,
          isVideo: session.isVideo,
        },
      });

      const totalChunks = session.totalChunks;

      async function* generateChunks() {
        for (let i = 0; i < totalChunks; i++) {
          const chunkDoc = await UploadChunkData.findOne({ uploadId, chunkIndex: i }).lean();
          if (!chunkDoc) {
            throw new Error(`Mảnh dữ liệu chunk ${i} bị thiếu`);
          }
          const buf = Buffer.isBuffer(chunkDoc.data)
            ? chunkDoc.data
            : Buffer.from((chunkDoc.data as any).buffer || chunkDoc.data);
          yield buf;
        }
      }

      const readableStream = Readable.from(generateChunks());

      await new Promise<void>((resolve, reject) => {
        readableStream
          .pipe(uploadStream)
          .on('error', (err) => {
            console.error('Lỗi khi ghép file vào GridFS:', err);
            reject(err);
          })
          .on('finish', () => {
            resolve();
          });
      });

      // Ghi nhận bản ghi vào Collection Upload
      await Upload.findOneAndUpdate(
        { filename: session.filename },
        {
          filename: session.filename,
          originalName: session.originalName,
          mimeType: session.mimeType,
          size: session.totalSize,
          data: '',
          isGridFs: true,
        },
        { upsert: true, new: true }
      );

      // Xóa dọn dẹp các chunk tạm thời
      try {
        await UploadChunkData.deleteMany({ uploadId });
        await UploadChunkSession.deleteOne({ uploadId });
      } catch (cleanupErr) {
        console.warn('Lỗi khi dọn dẹp chunks tạm:', cleanupErr);
      }

      return NextResponse.json(
        {
          success: true,
          message: session.isVideo ? 'Upload video lên hệ thống thành công' : 'Upload file thành công',
          data: {
            url: `/uploads/${session.filename}`,
            filename: session.filename,
            mimeType: session.mimeType,
            size: session.totalSize,
            isVideo: session.isVideo,
          },
        },
        { headers: corsHeaders }
      );
    }

    // ==========================================
    // ACTION 4: ABORT - Hủy và dọn dẹp phiên
    // ==========================================
    if (action === 'abort') {
      const uploadId = formData.get('uploadId') as string;
      if (uploadId) {
        await UploadChunkData.deleteMany({ uploadId });
        await UploadChunkSession.deleteOne({ uploadId });
      }
      return NextResponse.json({ success: true, message: 'Đã hủy phiên upload' }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, message: `Action "${action}" không được hỗ trợ` },
      { status: 400, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Lỗi trong API upload chunk:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi xử lý upload chunk' },
      { status: 500, headers: corsHeaders }
    );
  }
}

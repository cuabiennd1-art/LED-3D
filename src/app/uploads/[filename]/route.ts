import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Upload from '@/models/Upload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper to determine Content-Type from filename
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.ogg':
      return 'video/ogg';
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

function parseRangeHeader(rangeHeader: string, totalSize: number) {
  const matches = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!matches) return null;

  let start = matches[1] ? parseInt(matches[1], 10) : 0;
  let end = matches[2] ? parseInt(matches[2], 10) : totalSize - 1;

  if (isNaN(start)) start = 0;
  if (isNaN(end) || end >= totalSize) end = totalSize - 1;

  if (start > end || start >= totalSize) return null;

  return { start, end, chunkSize: end - start + 1 };
}

// Minimal fallback transparent 1x1 PNG pixel when an image is permanently unavailable
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return new NextResponse(FALLBACK_PNG, {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    }

    const cleanFilename = path.basename(filename);
    const mimeType = getMimeType(cleanFilename);
    const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(cleanFilename);
    const rangeHeader = request.headers.get('range');

    // 1. First priority: Check if file exists in local public/uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const localFilePath = path.join(uploadDir, cleanFilename);

    if (fs.existsSync(localFilePath)) {
      try {
        const stat = fs.statSync(localFilePath);
        const totalSize = stat.size;

        if (rangeHeader && isVideo) {
          const range = parseRangeHeader(rangeHeader, totalSize);
          if (range) {
            const stream = fs.createReadStream(localFilePath, {
              start: range.start,
              end: range.end,
            });

            const webStream = new ReadableStream({
              start(controller) {
                stream.on('data', (chunk) => controller.enqueue(chunk));
                stream.on('end', () => controller.close());
                stream.on('error', (err) => controller.error(err));
              },
              cancel() {
                stream.destroy();
              },
            });

            return new NextResponse(webStream, {
              status: 206,
              headers: {
                'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': range.chunkSize.toString(),
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        }

        const fileBuffer = await readFile(localFilePath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': totalSize.toString(),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (readErr) {
        console.warn('Could not read local file, falling back to MongoDB:', readErr);
      }
    }

    // 2. Second priority: Query MongoDB Atlas shared database
    try {
      await connectToDatabase();
      const db = mongoose.connection.db;

      // 2A. Check MongoDB GridFS first (ideal for videos & large files)
      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
        const gridFiles = await bucket.find({ filename: cleanFilename }).toArray();

        if (gridFiles.length > 0) {
          const gridFile = gridFiles[0];
          const totalSize = gridFile.length;
          const resolvedMime = (gridFile.metadata?.mimeType as string) || mimeType;

          // HTTP 206 Partial Content (Video Seeking & Progressive Streaming)
          if (rangeHeader) {
            const range = parseRangeHeader(rangeHeader, totalSize);
            if (range) {
              const downloadStream = bucket.openDownloadStream(gridFile._id, {
                start: range.start,
                end: range.end + 1,
              });

              const webStream = new ReadableStream({
                start(controller) {
                  downloadStream.on('data', (chunk) => controller.enqueue(chunk));
                  downloadStream.on('end', () => controller.close());
                  downloadStream.on('error', (err) => controller.error(err));
                },
                cancel() {
                  downloadStream.destroy();
                },
              });

              return new NextResponse(webStream, {
                status: 206,
                headers: {
                  'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': range.chunkSize.toString(),
                  'Content-Type': resolvedMime,
                  'Cache-Control': 'public, max-age=31536000, immutable',
                },
              });
            }
          }

          // Full stream
          const downloadStream = bucket.openDownloadStream(gridFile._id);
          const webStream = new ReadableStream({
            start(controller) {
              downloadStream.on('data', (chunk) => controller.enqueue(chunk));
              downloadStream.on('end', () => controller.close());
              downloadStream.on('error', (err) => controller.error(err));
            },
            cancel() {
              downloadStream.destroy();
            },
          });

          return new NextResponse(webStream, {
            status: 200,
            headers: {
              'Content-Type': resolvedMime,
              'Content-Length': totalSize.toString(),
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      }

      // 2B. Check Upload collection Base64 storage (for small files/images)
      const doc = await Upload.findOne({ filename: cleanFilename });
      if (doc && doc.data) {
        const base64Str = doc.data.includes(';base64,')
          ? doc.data.split(';base64,')[1]
          : doc.data;

        const buffer = Buffer.from(base64Str, 'base64');
        const resolvedMime = doc.mimeType || mimeType;
        const totalSize = buffer.length;

        // Cache to local disk asynchronously if possible
        try {
          if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
          }
          await writeFile(localFilePath, buffer);
        } catch (cacheErr) {}

        if (rangeHeader && isVideo) {
          const range = parseRangeHeader(rangeHeader, totalSize);
          if (range) {
            const chunk = buffer.subarray(range.start, range.end + 1);
            return new NextResponse(chunk, {
              status: 206,
              headers: {
                'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': range.chunkSize.toString(),
                'Content-Type': resolvedMime,
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        }

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': resolvedMime,
            'Content-Length': totalSize.toString(),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (dbErr) {
      console.error('Error fetching media from MongoDB Uploads:', dbErr);
    }

    // 3. Fallback: Return 404 for video or fallback 1x1 image for images
    if (isVideo) {
      return new NextResponse('Video not found', { status: 404 });
    }

    return new NextResponse(FALLBACK_PNG, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('Global error in /uploads route:', error);
    return new NextResponse(FALLBACK_PNG, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
  }
}


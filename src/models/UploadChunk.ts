import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUploadChunkSession extends Document {
  uploadId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  isVideo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUploadChunkData extends Document {
  uploadId: string;
  chunkIndex: number;
  data: Buffer;
  size: number;
  createdAt: Date;
}

const UploadChunkSessionSchema = new Schema<IUploadChunkSession>(
  {
    uploadId: { type: String, required: true, unique: true, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: 'application/octet-stream' },
    totalSize: { type: Number, required: true },
    totalChunks: { type: Number, required: true },
    isVideo: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 7200 }, // Auto clean up in 2 hours
  },
  { timestamps: true }
);

const UploadChunkDataSchema = new Schema<IUploadChunkData>(
  {
    uploadId: { type: String, required: true, index: true },
    chunkIndex: { type: Number, required: true, index: true },
    data: { type: Buffer, required: true },
    size: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 7200 }, // Auto clean up in 2 hours
  },
  { timestamps: true }
);

UploadChunkDataSchema.index({ uploadId: 1, chunkIndex: 1 }, { unique: true });

export const UploadChunkSession: Model<IUploadChunkSession> =
  mongoose.models.UploadChunkSession ||
  mongoose.model<IUploadChunkSession>('UploadChunkSession', UploadChunkSessionSchema);

export const UploadChunkData: Model<IUploadChunkData> =
  mongoose.models.UploadChunkData ||
  mongoose.model<IUploadChunkData>('UploadChunkData', UploadChunkDataSchema);

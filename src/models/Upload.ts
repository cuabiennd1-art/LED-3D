import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUpload extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  data: string; // Base64 data string (for small files)
  isGridFs?: boolean; // True if stored in MongoDB GridFS
  createdAt: Date;
  updatedAt: Date;
}

const UploadSchema = new Schema<IUpload>(
  {
    filename: { type: String, required: true, unique: true, index: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: 'image/jpeg' },
    size: { type: Number, default: 0 },
    data: { type: String, default: '' },
    isGridFs: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Upload: Model<IUpload> =
  mongoose.models.Upload || mongoose.model<IUpload>('Upload', UploadSchema);

export default Upload;

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFlashSaleItem {
  _id?: any;
  productId: mongoose.Types.ObjectId;
  flashPrice: number;
  originalPrice: number;
  salePrice?: number;
  discountPercent: number;
  flashPercent?: number;
  flashStock?: number;
  soldCount: number;
  isActive: boolean;
}

export interface IFlashSaleSlot {
  id: string;
  name: string;
  startTime: string; // e.g. "12:00"
  endTime: string;   // e.g. "18:00"
  dateType: 'all_days' | 'specific_date' | 'date_range';
  specificDate?: string; // YYYY-MM-DD
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  enabled: boolean;
  items: IFlashSaleItem[];
}

export interface IFomoSettings {
  enableLivePurchasePopup: boolean;
  popupIntervalSeconds: number;
  enableCheckoutTimer: boolean;
  checkoutTimerMinutes: number;
  enableViewerCount: boolean;
}

export interface IFlashSale extends Document {
  title: string;
  subtitle?: string;
  isActive: boolean;
  slots: IFlashSaleSlot[];
  items: IFlashSaleItem[];
  fomoSettings: IFomoSettings;
  stats: {
    totalOrders: number;
    totalRevenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FlashSaleItemSchema = new Schema<IFlashSaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    flashPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    flashPercent: { type: Number, default: 0, min: 0, max: 100 },
    flashStock: { type: Number, required: true, default: 50, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const FlashSaleSlotSchema = new Schema<IFlashSaleSlot>(
  {
    id: { type: String, required: true },
    name: { type: String, default: 'Khung Giờ Flash Sale' },
    startTime: { type: String, required: true, default: '12:00' },
    endTime: { type: String, required: true, default: '18:00' },
    dateType: { type: String, enum: ['all_days', 'specific_date', 'date_range'], default: 'all_days' },
    specificDate: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    items: { type: [FlashSaleItemSchema], default: [] },
  },
  { _id: false }
);

const FomoSettingsSchema = new Schema<IFomoSettings>(
  {
    enableLivePurchasePopup: { type: Boolean, default: true },
    popupIntervalSeconds: { type: Number, default: 25, min: 5, max: 120 },
    enableCheckoutTimer: { type: Boolean, default: true },
    checkoutTimerMinutes: { type: Number, default: 15, min: 5, max: 60 },
    enableViewerCount: { type: Boolean, default: true },
  },
  { _id: false }
);

const FlashSaleSchema = new Schema<IFlashSale>(
  {
    title: { type: String, default: '⚡ SIÊU SALE GIỜ VÀNG - GIẢM TỚI 50%' },
    subtitle: { type: String, default: 'Săn deal chớp nhoáng • Số lượng có hạn • Giá rẻ vô địch' },
    isActive: { type: Boolean, default: true },
    slots: {
      type: [FlashSaleSlotSchema],
      default: [
        {
          id: 'slot_1',
          name: 'Săn Sale Sáng',
          startTime: '09:00',
          endTime: '12:00',
          dateType: 'all_days',
          enabled: true,
          items: [],
        },
        {
          id: 'slot_2',
          name: 'Giờ Vàng Nửa Giá',
          startTime: '12:00',
          endTime: '18:00',
          dateType: 'all_days',
          enabled: true,
          items: [],
        },
        {
          id: 'slot_3',
          name: 'Flash Deal Tối',
          startTime: '18:00',
          endTime: '21:00',
          dateType: 'all_days',
          enabled: true,
          items: [],
        },
        {
          id: 'slot_4',
          name: 'Xả Kho Đêm',
          startTime: '21:00',
          endTime: '23:59',
          dateType: 'all_days',
          enabled: true,
          items: [],
        },
      ],
    },
    items: { type: [FlashSaleItemSchema], default: [] },
    fomoSettings: {
      type: FomoSettingsSchema,
      default: () => ({
        enableLivePurchasePopup: true,
        popupIntervalSeconds: 25,
        enableCheckoutTimer: true,
        checkoutTimerMinutes: 15,
        enableViewerCount: true,
      }),
    },
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

FlashSaleSchema.index({ isActive: 1 });

if (mongoose.models && mongoose.models.FlashSale) {
  delete (mongoose.models as any).FlashSale;
}

const FlashSale: Model<IFlashSale> = mongoose.model<IFlashSale>('FlashSale', FlashSaleSchema);
export default FlashSale;

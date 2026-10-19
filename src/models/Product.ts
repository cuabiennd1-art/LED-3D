import mongoose, { Schema, Document, Model } from 'mongoose';
import Category from './Category';

// Ensure Category model is referenced so bundler always registers it in Mongoose
void Category;

export interface IProductOption {
  name: string;
  values: string[];
}

export interface IVariant {
  _id?: any;
  sku?: string;
  title?: string;
  name?: string;
  color?: string;
  size?: string;
  attributes?: Record<string, string>;
  price: number;
  salePrice?: number;
  flashPrice?: number;
  originalPrice?: number;
  stock: number;
  image?: string;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  category: mongoose.Types.ObjectId;
  images: string[];
  video?: string;
  stock: number;
  soldCount: number;
  rating?: number;
  reviewCount?: number;
  description?: string;
  isFeatured: boolean;
  status: 'active' | 'hidden';
  options?: IProductOption[];
  variants: IVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductOptionSchema = new Schema<IProductOption>(
  {
    name: { type: String, required: true, trim: true },
    values: [{ type: String, required: true, trim: true }],
  },
  { _id: false }
);

const VariantSchema = new Schema<IVariant>(
  {
    sku: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    attributes: { type: Schema.Types.Mixed, default: {} },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    image: { type: String, default: '' },
  },
  { _id: true, toJSON: { getters: true }, toObject: { getters: true } }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
    minPrice: { type: Number, default: 0, index: true },
    maxPrice: { type: Number, default: 0, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    images: [{ type: String }],
    video: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true },
    options: { type: [ProductOptionSchema], default: [] },
    variants: { type: [VariantSchema], default: [] },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

// High-performance compound & text indexes
ProductSchema.index({ status: 1, category: 1, createdAt: -1 });
ProductSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
ProductSchema.index({ status: 1, soldCount: -1 });
ProductSchema.index({ status: 1, minPrice: 1 });
ProductSchema.index({ status: 1, maxPrice: -1 });
ProductSchema.index({ name: 'text', slug: 'text' });

ProductSchema.pre('save', function () {
  if (this.variants && this.variants.length > 0) {
    let calculatedStock = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const v of this.variants) {
      calculatedStock += Number(v.stock) || 0;
      const effectivePrice = v.salePrice && v.salePrice > 0 ? Number(v.salePrice) : Number(v.price);
      if (effectivePrice < min) min = effectivePrice;
      if (effectivePrice > max) max = effectivePrice;
    }

    this.stock = calculatedStock;
    this.minPrice = min === Infinity ? (this.salePrice || this.price) : min;
    this.maxPrice = max === -Infinity ? this.price : max;
  } else {
    this.minPrice = this.salePrice && this.salePrice > 0 ? this.salePrice : this.price;
    this.maxPrice = this.price;
  }
});

// Avoid stale model caching in Next.js hot reload
if (mongoose.models && mongoose.models.Product) {
  delete (mongoose.models as any).Product;
}

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
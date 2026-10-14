import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  barcode: String,
  qty: { type: Number, required: true, min: 1 },
  buyPrice: { type: Number, required: true }, // snapshot, so old profit never changes
  listPrice: { type: Number, required: true }, // normal price at the time
  soldPrice: { type: Number, required: true }, // price actually charged
});

const SaleSchema = new mongoose.Schema(
  {
    items: { type: [ItemSchema], required: true },
    total: { type: Number, required: true },
    profit: { type: Number, required: true },
    units: { type: Number, required: true },
  },
  { timestamps: true }
);
SaleSchema.index({ createdAt: -1 });

export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

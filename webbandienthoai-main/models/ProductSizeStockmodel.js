const db = require('./db');

const productSizeStockSchema = new db.mongoose.Schema({
  productId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'chitietsp', required: true },
  dungluongId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'dungluong', default: null },
  mausacId: { type: db.mongoose.Schema.Types.ObjectId, ref: 'mausac', default: null },
  quantity: { type: Number, default: null, min: 0 },  
  unlimitedStock: { type: Boolean, default: function() { return this.quantity === null; } },
  sku: { type: String, unique: true },
  __v: { type: Number, default: 0 } 
});

// Middleware để tự động tăng version khi cập nhật
productSizeStockSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  if (!update.$inc) update.$inc = {};
  update.$inc.__v = 1;
  this.setUpdate(update);
  next();
});

const ProductSizeStock = db.mongoose.model('productSizeStock', productSizeStockSchema);
module.exports = { ProductSizeStock };

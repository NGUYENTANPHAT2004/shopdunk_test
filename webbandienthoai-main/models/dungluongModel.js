const db = require('./db')

let dungluong;
try {
  // Kiểm tra xem model đã tồn tại chưa
  dungluong = db.mongoose.model('dungluong');
} catch (e) {
  // Nếu chưa tồn tại, định nghĩa mới
  const dungluongSchema = new db.mongoose.Schema({
    name: { type: String },
    mausac: [{ type: db.mongoose.Schema.Types.ObjectId, ref: 'mausac' }],
    idloaisp: { type: db.mongoose.Schema.Types.ObjectId, ref: 'loaisp' },
    isDeleted: { type: Boolean, default: false }
  });
  dungluong = db.mongoose.model('dungluong', dungluongSchema);
}

module.exports = { dungluong };
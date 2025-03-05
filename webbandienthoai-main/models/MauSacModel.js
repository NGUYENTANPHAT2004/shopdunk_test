const db = require('./db')

const mausacriengSchema = new db.mongoose.Schema({
  name: { type: String },
  price: { type: Number },
  image: [{ type: String }],
  dungluong: { type: db.mongoose.Schema.Types.ObjectId, ref: 'dungluong' }
})

const mausac = db.mongoose.model('mausac', mausacriengSchema)
module.exports = { mausac }
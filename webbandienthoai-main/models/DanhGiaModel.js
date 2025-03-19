const db = require('./db');

const danhgiaSchema = new db.mongoose.Schema({
  tenkhach: {type: String, required: true},
  content: {type: String, required: true},
  isRead: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  rating: {
    type: Number,
    required: true,
    min: 0, 
    max: 5,
  },
  // Make category fields optional with defaults
  theloaiId: {type: String, default: 'general'},
  theloaiName: {type: String, default: 'Chung'},
  theloaiSlug: {type: String, default: 'general'}
});

const danhgia = db.mongoose.model('danhgia', danhgiaSchema);
module.exports = {danhgia};
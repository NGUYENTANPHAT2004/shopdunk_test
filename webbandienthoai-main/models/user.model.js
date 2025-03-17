const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  role: { type: String, default: 'user' },
  phone: { type: String },
  socialLogins: { // Thêm để lưu ID Google/Facebook
    google: { type: String },
    facebook: { type: String }
  },
  status : { type: String, default: 'active' },
});

const User = mongoose.model('User', userSchema);
module.exports = { User };

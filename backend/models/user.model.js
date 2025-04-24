const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  phone: { type: String },
  socialLogins: { // Thêm để lưu ID Google/Facebook
    google: { type: String },
    facebook: { type: String }
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'pending'], 
    default: 'active' 
  },
  lastLogin: { type: Date },
  registrationDate: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
module.exports = { User };

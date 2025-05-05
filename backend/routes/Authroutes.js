const express = require('express');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model'); // Đảm bảo schema có `socialLogins`
const router = express.Router();
const { 
  generateVoucherForUser, 
} = require('../socket/handlers/voucherGenerator');
const GOOGLE_CLIENT_ID = "625355579712-siv3ab624075ufh4uatn695jqe80m5fc.apps.googleusercontent.com";  
const jwtSecret = "NzNkMjY0NjMtMmU4NS00OWRlLTk3OWItOTM5OTRjZjFlN2Iw";

// 🛠 Hàm tạo JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, jwtSecret, { expiresIn: "7d" });
};

// 🔹 Đăng ký tài khoản
// Sửa lại phần xử lý voucher chào mừng trong phần đăng ký
router.post('/register_auth', async (req, res) => {
  try {
    const { username, email, password, role, phone } = req.body;

    // Validate phone
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    }
    
    const existingPhone = await User.User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'Số điện thoại đã được đăng ký' });
    }

    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User.User({ 
      username, 
      email, 
      password: hashedPassword, 
      role: role || 'user', 
      phone,
      socialLogins: {},
      registrationDate: new Date()
    });
    
    await user.save();
    
    // Generate a welcome voucher for the new user - Chỉ phát cho user đã đăng ký
    try {
      const welcomeVoucher = await generateVoucherForUser(user._id, 'new-account', 14); // 14 days expiry
      
      res.json({ 
        message: 'Đăng ký thành công', 
        user,
        welcomeVoucher: {
          code: welcomeVoucher.code,
          discount: welcomeVoucher.discount,
          minOrderValue: welcomeVoucher.minOrderValue,
          expiresAt: welcomeVoucher.expiresAt,
          message: welcomeVoucher.message
        }
      });
    } catch (voucherError) {
      console.error('Error generating welcome voucher:', voucherError);
      // Still register the user even if voucher generation fails
      res.json({ message: 'Đăng ký thành công', user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Đã xảy ra lỗi' });
  }
});
router.post('/login_auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: 'Không tìm thấy tên tài khoản' });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị ẩn' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Nhập sai mật khẩu' });
    }

    const jwtToken = generateToken(user);

    res.json({ token: jwtToken, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Đã xảy ra lỗi' });
  }
});
// 🔹 Đăng nhập bằng Google
router.post('/auth/google', async (req, res) => {
  try {
    const { token, phone } = req.body;
    console.log(phone);
    if (!token) return res.status(400).json({ message: 'Token Google không hợp lệ' });

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });

    const { email, name, sub: googleId } = ticket.getPayload();

    if (!email || !googleId) return res.status(400).json({ message: 'Google không trả về thông tin hợp lệ' });  // Look for user with this Google ID or email
    let user = await User.User.findOne({email,'socialLogins.google': googleId });
    if (user && user.status === 'inactive') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị ẩn' });
    }
    if (!user) {
      const username = name || email.split('@')[0];
      user = new User.User({ 
        username, 
        email, 
        socialLogins: { google: googleId }, 
        role: 'user',
      });
      await user.save();
    }

    const jwtToken = generateToken(user);
    res.json({ token: jwtToken, user });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ message: 'Google login failed', error: error.message });
  }
});

// 🔹 Đăng nhập bằng Facebook
router.post('/auth/facebook', async (req, res) => {
  try {
    const { token, phone } = req.body;
    console.log(phone);
    if (!token) return res.status(400).json({ message: 'Token Facebook không hợp lệ' });

    const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${token}`);
    const { id: facebookId, name, email } = response.data;
    let user = await User.User.findOne({'socialLogins.facebook': facebookId });
    if (user && user.status === 'inactive') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị ẩn' });
    }
    if (!user) {
      const userEmail = email || `fb-${facebookId}@placeholder.com`;
      user = new User.User({ 
        username: name || `user-${facebookId}`, 
        email: userEmail, 
        socialLogins: { facebook: facebookId }, 
        role: 'user', // Store phone if provided
      });
      await user.save();
    }
    const jwtToken = generateToken(user);
    res.json({ token: jwtToken, user });

  } catch (error) {
    console.error('Facebook Auth Error:', error);
    res.status(400).json({ message: 'Facebook login failed', error: error.message });
  }
});
router.get('/auth/userlist', async (req, res) => {
  try {
   const user = await User.User.find();
    if(user.length > 0) {
      res.json(user);
    }else{
      res.status(404).json({ message: 'danh sách người dùng không có ' });
    }
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ message: 'Google login failed', error: error.message });
  }
});
router.put('/auth/updateStatus/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;

    const updatedUser = await User.User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({ message: 'Cập nhật trạng thái thành công', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API cập nhật role người dùng
router.put('/auth/updateRole/:id', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Kiểm tra role hợp lệ
    const validRoles = ['user', 'admin', 'manager', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    const updatedUser = await User.User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({ message: 'Cập nhật vai trò thành công', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});
router.put('/auth/updateStatus/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;

    const userBefore = await User.User.findById(userId);
    const updatedUser = await User.User.findByIdAndUpdate(
      userId,
      { 
        status,
        lastStatusUpdate: new Date() // Thêm thời gian cập nhật
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Ghi log khi trạng thái thay đổi
    if (userBefore.status !== status) {
      console.log(`[${new Date().toISOString()}] User ${userId} status changed from ${userBefore.status} to ${status}`);
    }

    res.json({ message: 'Cập nhật trạng thái thành công', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Cập nhật route checkStatus để xử lý token hết hạn
router.get('/auth/checkStatus', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Token không được cung cấp',
        forceLogout: true 
      });
    }
    
    // Giải mã token với xử lý lỗi
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (tokenError) {
      console.log('Token error:', tokenError.name);
      // Xử lý token hết hạn
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
          forceLogout: true,
          expired: true
        });
      }
      
      // Các lỗi token khác
      return res.status(401).json({ 
        message: 'Token không hợp lệ',
        forceLogout: true 
      });
    }
    
    // Tiếp tục kiểm tra nếu token hợp lệ
    const user = await User.User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Người dùng không tồn tại', 
        forceLogout: true 
      });
    }
    
    // Kiểm tra trạng thái
    if (user.status === 'inactive') {
      console.log(`[${new Date().toISOString()}] Inactive user ${user._id} (${user.username}) attempted access`);
      return res.status(403).json({ 
        message: 'Tài khoản của bạn đã bị vô hiệu hóa', 
        forceLogout: true 
      });
    }
    
    res.json({ 
      status: user.status, 
      valid: true 
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
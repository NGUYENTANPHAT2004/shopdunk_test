const express = require('express');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');  // Đảm bảo schema có `socialLogins`
const router = express.Router();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GOOGLE_CLIENT_ID = "625355579712-siv3ab624075ufh4uatn695jqe80m5fc.apps.googleusercontent.com"  
const jwtSecret = "NzNkMjY0NjMtMmU4NS00OWRlLTk3OWItOTM5OTRjZjFlN2Iw"; // Thêm fallback key


// 🛠 Hàm tạo JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role }, 
    jwtSecret,
    { expiresIn: "7d" }
  );
};

// 🔹 Đăng ký tài khoản
router.post('/register_auth', async (req, res) => {
  try {
    const { username, email, password, role, phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    }
    const exitphone = await User.User.findOne({ phone });
    if (exitphone) {
      return res.status(400).json({ message: 'Số điện thoại đã được đăng kí' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User.User({ username, email, password: hashedPassword, role, phone });
    await user.save();
    
    res.json({ message: 'Đăng ký thành công', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Đã xảy ra lỗi' });
  }
});

// 🔹 Đăng nhập tài khoản thường
router.post('/login_auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: 'Không tìm thấy tên tài khoản' });
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
    const { token } = req.body;
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, sub: googleId } = payload; // Đổi tên biến từ GOOGLE_CLIENT_ID thành googleId

    let user = await User.User.findOne({ email });

    if (!user) {
      user = new User.User({
        username: email.split('@')[0],
        email,
        socialLogins: { google: googleId }, // Sử dụng googleId thay vì GOOGLE_CLIENT_ID
        role: 'user'
      });
      await user.save();
    }

    const jwtToken = generateToken(user);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: jwtToken
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ message: 'Google login failed', error: error.message });
  }
});


// 🔹 Đăng nhập bằng Facebook
router.post('/auth/facebook', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token Facebook không hợp lệ' });
    }

    const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${token}`);
    const { id: facebookId,name, email } = response.data;
    console.log("Facebook Response:", response.data);
    const userEmail = email || `${facebookId}@facebook.com`; 

    let user = await User.User.findOne({ socialLogins: { facebook: facebookId } });

    if (!user) {
      user = new User.User({
        username: name,
        email: userEmail,
        socialLogins: { facebook: facebookId },
        role: 'user'
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

// 🔹 API yêu cầu xác thực (có thể bỏ nếu không cần middleware)
router.get('/profile', async (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Không có token, truy cập bị từ chối!" });
    }

    const verified = jwt.verify(token, jwtSecret);
    const user = await User.User.findById(verified.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.json(user);
  } catch (error) {
    res.status(403).json({ message: "Token không hợp lệ!" });
  }
});

module.exports = router;

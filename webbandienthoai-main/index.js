/* eslint-disable @typescript-eslint/no-var-requires */
// Load environment variables first before any other code
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const MongoStore = require('connect-mongo');
const db = require('./models/db');
const userroutes = require('./routes/UserRouter');
const sanphamroutes = require('./routes/SanPhamRoutes');
const loaisanphamroutes = require('./routes/LoaiSanPhamRoutes');
const dungluongroutes = require('./routes/DungLuongRoutes');
const categoryrouter = require('./routes/CategoryRoutes.js');
const blogroutes = require('./routes/BlogRoutes');
const mausacriengroutes = require('./routes/MauSacRiengRoutes');
const magiamgiaroutes = require('./routes/MaGiamGiaRoutes');
const danhgiaroutes = require('./routes/DanhGiaRoutes');
const hoadonrouter = require('./routes/HoaDonRoutes');
const stockrouter = require('./routes/stockrouter');
const authroutes = require("./routes/Authroutes.js");
const adminnotifi = require('./socket/adminnotifi');
const orderrating = require('./routes/OrderRatingRoutes');
const chatroutes = require('./routes/ChatRoutes');
const http = require("http");
const loyaltyPointsRoutes = require('./routes/LoyaltyPointsRoutes');
const { initSocket } = require('./config/socket');
// Tác vụ định kỳ
const chatAnalyticsService = require('./socket/chat/services/ChatAnalyticsService');
const fs = require('fs');
const cors = require('cors');

// Get MongoDB URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb+srv://phat1z:123@ez88.akrq2.mongodb.net/datn?retryWrites=true&w=majority&appName=ez88';

// Log environment configuration
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3005);

const mongoStoreOptions = {
  mongooseConnection: db.mongoose.connection,
  mongoUrl: uri,
  collection: 'sessions'
}

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

// Configure Express
app.use(express.json());
app.use(cors());
console.log("Server started");

app.use(
  session({
    secret: process.env.JWT_SECRET || 'adscascd8saa8sdv87ds78v6dsv87asvdasv8',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create(mongoStoreOptions)
    // ,cookie: { secure: true } // Enable for HTTPS
  })
);

// Ensure data directory exists for chat
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Đã tạo thư mục dữ liệu cho chat');
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, '/uploads')));

// Register routes
app.use('/', userroutes);
app.use('/', sanphamroutes);
app.use('/', loaisanphamroutes);
app.use('/', dungluongroutes);
app.use('/', categoryrouter);
app.use('/', blogroutes);
app.use('/', mausacriengroutes);
app.use('/', danhgiaroutes);
app.use('/', magiamgiaroutes);
app.use('/', authroutes);
app.use('/', hoadonrouter);
app.use('/', stockrouter);
app.use('/', orderrating);
app.use('/', chatroutes); // Router cho chat
app.use('/', loyaltyPointsRoutes);
// Cập nhật thống kê hàng ngày vào lúc 0:00
const setupDailyAnalytics = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  
  // Tính thời gian đến lúc 0:00
  const delay = midnight.getTime() - now.getTime();
  
  setTimeout(() => {
    // Chạy lần đầu
    chatAnalyticsService.updateDailyAnalytics();
    
    // Sau đó chạy mỗi ngày
    setInterval(() => {
      chatAnalyticsService.updateDailyAnalytics();
    }, 24 * 60 * 60 * 1000); // 24 giờ
  }, delay);
};

// Khởi động tác vụ định kỳ
setupDailyAnalytics();

// Setup socket handlers
adminnotifi(io);

// Get port from environment variables or default to 3005
const PORT = process.env.PORT || 3005;

// Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

module.exports = { io, app, server };
/**
 * Middleware xác thực quyền quản trị
 */
const { authenticateToken, getUserByToken } = require('./authMiddleware');

/**
 * Xác thực quyền quản trị
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Xác thực token trước
    authenticateToken(req, res, () => {
      // Kiểm tra quyền quản trị
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }
      
      next();
    });
  } catch (error) {
    console.error('❌ Lỗi xác thực admin:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý xác thực',
      error: error.message
    });
  }
};

/**
 * Middleware socket.io cho xác thực admin
 * @param {Object} socket - Socket.io socket
 * @param {Function} next - Socket.io next
 */
const adminMiddleware = async (socket, next) => {
  try {
    // Lấy token từ handshake
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Không có quyền truy cập'));
    }
    
    // Lấy thông tin người dùng
    const user = await getUserByToken(token);
    
    if (!user) {
      return next(new Error('Người dùng không tồn tại hoặc đã bị vô hiệu hóa'));
    }
    
    // Kiểm tra quyền quản trị
    if (user.role !== 'admin') {
      return next(new Error('Không có quyền quản trị'));
    }
    
    // Lưu thông tin người dùng vào socket
    socket.user = user;
    socket.isAdmin = true;
    
    next();
    
  } catch (error) {
    console.error('❌ Lỗi xác thực admin socket:', error);
    next(new Error('Lỗi xác thực: ' + error.message));
  }
};

/**
 * Middleware API kiểm tra API key cho admin
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const verifyAdminAPIKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-admin-api-key'] || req.query.adminKey;
    const expectedKey = process.env.ADMIN_API_KEY || 'beeshop_secret_admin_key_2025';
    
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Admin API key không hợp lệ'
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Lỗi xác thực API key:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý xác thực',
      error: error.message
    });
  }
};

module.exports = {
  authenticateAdmin,
  adminMiddleware,
  verifyAdminAPIKey
};
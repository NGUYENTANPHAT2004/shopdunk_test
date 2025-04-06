/**
 * Cấu hình cho context chat
 */

// API base URL từ biến môi trường hoặc mặc định
const API_URL = process.env.REACT_APP_API_URL || '';

// API keys
const CHAT_API_KEY = process.env.REACT_APP_CHAT_API_KEY || 'beeshop_secret_chat_api_key_2025';

// Tùy chọn kết nối Socket.io
const SOCKET_OPTIONS = {
  // Số lần thử kết nối lại
  reconnectionAttempts: 5,
  // Thời gian chờ giữa các lần thử kết nối lại (ms)
  reconnectionDelay: 1000,
  // Thời gian chờ tối đa giữa các lần thử kết nối lại (ms)
  reconnectionDelayMax: 5000,
  // Thời gian chờ kết nối (ms)
  timeout: 10000,
  // Hỗ trợ cả WebSocket và polling
  transports: ['websocket', 'polling'],
  // Thông tin xác thực, sẽ được thêm vào sau khi người dùng đăng nhập
  auth: {}
};

// Cập nhật thông tin xác thực cho Socket.io
const updateSocketAuth = (token, userName = null) => {
  SOCKET_OPTIONS.auth = {
    token,
    guestName: userName
  };
  return SOCKET_OPTIONS;
};

// Cấu hình request cho Axios
const getAxiosConfig = (token = null) => {
  const config = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (CHAT_API_KEY) {
    config.headers['x-api-key'] = CHAT_API_KEY;
  }
  
  return config;
};

// Chuyển đổi path tương đối thành URL đầy đủ
const getFullUrl = (path) => {
  if (!path) return '';
  
  // Nếu path đã là URL đầy đủ, trả về nguyên bản
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Đảm bảo path bắt đầu bằng '/'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Kết hợp với API_URL
  return `${API_URL}${normalizedPath}`;
};

// Export các hàm và biến cấu hình
export {
  API_URL,
  CHAT_API_KEY,
  SOCKET_OPTIONS,
  updateSocketAuth,
  getAxiosConfig,
  getFullUrl
};
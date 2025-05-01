import io from 'socket.io-client';

let socket = null;
let adminSocket = null;
let storeSocket = null;

/**
 * Khởi tạo kết nối socket chính
 * @returns {Object} Socket instance
 */
export const initializeSocket = () => {
  if (!socket) {
    socket = io('http://localhost:3005');
    
    // Thiết lập xử lý sự kiện kết nối
    socket.on('connect', () => {
      console.log('Đã kết nối tới server');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Lỗi kết nối:', error);
    });
    
    // Thiết lập heartbeat để giữ kết nối
    setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000); // 30 giây
  }
  
  return socket;
};

/**
 * Khởi tạo socket Admin cho theo dõi kho
 * @returns {Object} Admin socket instance
 */
export const initializeAdminSocket = () => {
  if (!adminSocket) {
    adminSocket = io('http://localhost:3005/admin');
    
    adminSocket.on('connect', () => {
      console.log('Đã kết nối tới kênh admin');
    });
    
    adminSocket.on('connect_error', (error) => {
      console.error('Lỗi kết nối kênh admin:', error);
    });
  }
  
  return adminSocket;
};

/**
 * Khởi tạo socket Store cho thông báo đơn hàng
 * @returns {Object} Store socket instance
 */
export const initializeStoreSocket = () => {
  if (!storeSocket) {
    storeSocket = io('http://localhost:3005/store');
    
    storeSocket.on('connect', () => {
      console.log('Đã kết nối tới kênh cửa hàng');
    });
    
    storeSocket.on('connect_error', (error) => {
      console.error('Lỗi kết nối kênh cửa hàng:', error);
    });
  }
  
  return storeSocket;
};

/**
 * Lấy instance socket đã khởi tạo
 * @returns {Object|null} Socket instance hoặc null
 */
export const getSocket = () => {
  return socket;
};

/**
 * Ngắt kết nối tất cả các socket
 */
export const disconnectAllSockets = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }
  
  if (storeSocket) {
    storeSocket.disconnect();
    storeSocket = null;
  }
};

/**
 * Đăng ký lắng nghe thông báo tồn kho
 * @param {Function} onLowStock - Callback xử lý thông báo tồn kho thấp
 * @param {Function} onStockStatus - Callback xử lý trạng thái tồn kho
 * @param {Function} onStockError - Callback xử lý lỗi
 * @returns {Function} Hàm hủy đăng ký
 */
export const registerStockListeners = (onLowStock, onStockStatus, onStockError) => {
  const socketToUse = adminSocket || initializeAdminSocket();
  
  socketToUse.on('lowStockAlert', onLowStock);
  socketToUse.on('stockStatus', onStockStatus);
  socketToUse.on('stockError', onStockError);
  
  return () => {
    socketToUse.off('lowStockAlert', onLowStock);
    socketToUse.off('stockStatus', onStockStatus);
    socketToUse.off('stockError', onStockError);
  };
};

/**
 * Đăng ký lắng nghe thông báo đơn hàng
 * @param {Function} onNewOrder - Callback xử lý đơn hàng mới
 * @param {Function} onStatusChange - Callback xử lý thay đổi trạng thái đơn hàng
 * @returns {Function} Hàm hủy đăng ký
 */
export const registerOrderListeners = (onNewOrder, onStatusChange) => {
  const socketToUse = adminSocket || initializeAdminSocket();
  
  socketToUse.on('newOrderNotification', onNewOrder);
  socketToUse.on('orderStatusChanged', onStatusChange);
  
  return () => {
    socketToUse.off('newOrderNotification', onNewOrder);
    socketToUse.off('orderStatusChanged', onStatusChange);
  };
};

/**
 * Kiểm tra tồn kho hiện tại
 */
export const checkStock = () => {
  const socketToUse = adminSocket || initializeAdminSocket();
  socketToUse.emit('check_stock');
};
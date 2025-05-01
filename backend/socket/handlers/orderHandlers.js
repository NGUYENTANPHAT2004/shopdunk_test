// socket/handlers/orderHandlers.js
const HoaDon = require('../../models/HoaDonModel');

/**
 * Xử lý thông báo đơn hàng mới
 * @param {Object} socket - Socket connection
 * @param {Object} io - Socket.io instance
 * @param {Object} data - Dữ liệu đơn hàng
 */
const handleNewOrder = async (socket, io, data) => {
  try {
    console.log("🛒 Đơn hàng mới được tạo:", data.orderCode || data.maHDL);
    
    // Chuẩn hóa mã đơn hàng
    const orderCode = data.orderCode || data.maHDL;
    
    // Gửi thông báo đến tất cả admin
    io.of('/admin').emit("newOrderNotification", {
      message: "Có đơn hàng mới",
      orderData: {
        orderCode: orderCode,
        total: data.total || data.tongtien,
        customerName: data.customerName || data.name,
        phone: data.phone,
        time: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
    // Xác nhận đã nhận đơn hàng cho người gửi
    socket.emit("orderReceived", { 
      success: true,
      message: "Đơn hàng đã được ghi nhận", 
      orderCode: orderCode,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Lỗi khi xử lý đơn hàng mới:", error);
    socket.emit("orderError", { 
      success: false,
      message: "Lỗi khi xử lý đơn hàng", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Xử lý cập nhật trạng thái đơn hàng
 * @param {Object} socket - Socket connection
 * @param {Object} io - Socket.io instance
 * @param {Object} data - Dữ liệu trạng thái đơn hàng
 */
const handleOrderStatusUpdate = async (socket, io, data) => {
  try {
    console.log(`📝 Cập nhật trạng thái đơn hàng ${data.orderCode}: ${data.status}`);
    
    // Gửi thông báo đến tất cả admin
    io.of('/admin').emit("orderStatusChanged", {
      orderCode: data.orderCode,
      status: data.status,
      message: getStatusMessage(data.status),
      updatedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
    
    // Xác nhận cho người gửi
    socket.emit("statusUpdateConfirmed", {
      success: true,
      message: "Đã cập nhật trạng thái đơn hàng",
      orderCode: data.orderCode,
      status: data.status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật trạng thái đơn hàng:", error);
    socket.emit("statusUpdateError", { 
      success: false,
      message: "Lỗi khi cập nhật trạng thái đơn hàng", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Lấy thông báo tương ứng với trạng thái
 * @param {string} status - Trạng thái đơn hàng
 * @returns {string} Thông báo phù hợp
 */
function getStatusMessage(status) {
  const messages = {
    'Đang xử lý': 'Đơn hàng đang được xử lý',
    'Đã thanh toán': 'Đơn hàng đã được thanh toán thành công',
    'Đang giao hàng': 'Đơn hàng đang được giao đến khách hàng',
    'Đã nhận': 'Đơn hàng đã được giao thành công',
    'Hoàn thành': 'Đơn hàng đã hoàn thành',
    'Hủy Đơn Hàng': 'Đơn hàng đã bị hủy',
    'Trả hàng/Hoàn tiền': 'Đơn hàng đang trong quá trình hoàn trả',
    'Thanh toán thất bại': 'Thanh toán đơn hàng không thành công',
    'Thanh toán hết hạn': 'Thời gian thanh toán đơn hàng đã hết hạn'
  };
  
  return messages[status] || 'Trạng thái đơn hàng đã được cập nhật';
}

/**
 * Gửi thông báo cập nhật đơn hàng
 * @param {Object} io - Socket.io instance
 * @param {Object} orderData - Dữ liệu đơn hàng
 */
const sendOrderNotification = (io, orderData) => {
  if (!io || !orderData) return;
  
  const adminNamespace = io.of('/admin');
  
  if (orderData.type === 'new') {
    // Thông báo đơn hàng mới
    adminNamespace.emit("newOrderNotification", {
      message: "Có đơn hàng mới",
      orderData: {
        orderCode: orderData.orderCode || orderData.maHDL,
        total: orderData.total || orderData.tongtien,
        customerName: orderData.customerName || orderData.name,
        phone: orderData.phone
      },
      timestamp: new Date().toISOString()
    });
  } else if (orderData.type === 'status') {
    // Thông báo thay đổi trạng thái
    adminNamespace.emit("orderStatusChanged", {
      orderCode: orderData.orderCode,
      status: orderData.status,
      message: getStatusMessage(orderData.status),
      updatedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  handleNewOrder,
  handleOrderStatusUpdate,
  sendOrderNotification
};
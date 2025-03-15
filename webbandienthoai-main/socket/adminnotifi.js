const { handleCheckStock } = require('./handlers/stockHandlers');

/**
 * Setup admin notification socket handlers
 * @param {Object} io - Socket.io instance
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);
 
    // Khi admin kiểm tra số lượng tồn kho
    socket.on('check_stock', () => handleCheckStock(socket));
    socket.on('new_order', (data) => handleNewOrder(socket, io, data));
    socket.on('update_order_status', (data) => handleOrderStatusUpdate(socket, io, data));

    // Xử lý sự kiện ngắt kết nối
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });
};
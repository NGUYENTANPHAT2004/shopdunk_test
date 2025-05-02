// socket/adminnotifi.js
const { ProductSizeStock } = require('../models/ProductSizeStockmodel');

/**
 * Thiết lập socket admin cho việc theo dõi tồn kho
 * @param {Object} io - Socket.io instance
 */
const setupAdminSocket = (io) => {
  const adminNamespace = io.of('/admin');
  
  adminNamespace.on('connection', (socket) => {
    console.log(`✅ Admin kết nối: ${socket.id}`);
    
    // Xử lý kiểm tra tồn kho
    socket.on('check_stock', async () => {
      try {
        console.log("📦 Admin đang kiểm tra tồn kho...");

        // Tìm sản phẩm có tồn kho thấp (dưới 5 sản phẩm)
        const lowStockProducts = await ProductSizeStock.find({
          unlimitedStock: false,
          quantity: { $lte: 5 }
        }).populate([
          { path: 'productId', select: 'name image price' },
          { path: 'dungluongId', select: 'name' },
          { path: 'mausacId', select: 'name' }
        ]);

        // Định dạng sản phẩm để hiển thị tốt hơn ở frontend
        const formatProduct = (product) => ({
          id: product._id,
          name: product.productId ? product.productId.name : 'Sản phẩm không xác định',
          image: product.productId ? product.productId.image : null,
          sku: product.sku || `${product.productId?._id}-${product.dungluongId?._id || 'n/a'}-${product.mausacId?._id || 'n/a'}`,
          quantity: product.quantity,
          capacity: product.dungluongId ? product.dungluongId.name : 'Mặc định',
          color: product.mausacId ? product.mausacId.name : 'Mặc định',
          threshold: product.lowStockThreshold || 5,
          price: product.productId ? product.productId.price : 0
        });

        const formattedLowStock = lowStockProducts.map(formatProduct);

        // Gửi thông báo tồn kho thấp nếu có sản phẩm
        if (formattedLowStock.length > 0) {
          socket.emit("lowStockAlert", {
            message: "Thông báo: Sản phẩm sắp hết hàng",
            products: formattedLowStock,
            count: formattedLowStock.length,
            timestamp: new Date().toISOString()
          });
          console.log(`Đã gửi thông báo tồn kho thấp: ${formattedLowStock.length} sản phẩm cần bổ sung`);

          // Cập nhật trạng thái đã thông báo
          await ProductSizeStock.updateMany(
            { _id: { $in: lowStockProducts.map(product => product._id) } },
            { $set: { notificationSent: true, lastNotificationDate: new Date() } }
          );
        } else {
          // Nếu không có vấn đề, gửi trạng thái OK
          socket.emit("stockStatus", {
            message: "Tất cả sản phẩm đều có đủ hàng tồn kho",
            status: "ok",
            timestamp: new Date().toISOString()
          });
          console.log("Tất cả sản phẩm đều có tồn kho đủ");
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra tồn kho:", error);
        socket.emit("stockError", {
          message: "Lỗi khi kiểm tra tồn kho",
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Xử lý ngắt kết nối
    socket.on('disconnect', (reason) => {
      console.log(`❌ Admin ngắt kết nối: ${socket.id}, lý do: ${reason}`);
    });
  });
  
  return adminNamespace;
};

/**
 * Gửi thông báo tồn kho toàn cục đến tất cả admin
 * @param {Object} io - Socket.io instance
 * @param {Object} productData - Thông tin sản phẩm
 */
const broadcastInventoryAlert = (io, productData) => {
  if (!io || !productData) return;
  
  const adminNamespace = io.of('/admin');
  
  adminNamespace.emit('lowStockAlert', {
    message: "Thông báo: Sản phẩm sắp hết hàng",
    products: [productData],
    count: 1,
    timestamp: new Date().toISOString()
  });
  
  console.log(`📢 Đã gửi thông báo tồn kho: ${productData.name || productData.id}`);
};

module.exports = {
  setupAdminSocket,
  broadcastInventoryAlert
};
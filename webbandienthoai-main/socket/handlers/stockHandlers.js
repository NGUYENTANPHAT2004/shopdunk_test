const { ProductSizeStock } = require('../../models/ProductSizeStockmodel');

/**
 * Handler for checking stock levels
 * @param {Object} socket - Socket connection
 */
const handleCheckStock = async (socket) => {
  try {
    console.log("📢 Admin đang kiểm tra tồn kho...");
    
    const lowStockProducts = await ProductSizeStock.find({ quantity: { $lt: 5 } });
    
    if (lowStockProducts && lowStockProducts.length > 0) {
      socket.emit("lowStockAlert", {
        message: "Thông báo cần cập nhật số lượng tồn kho",
        products: lowStockProducts
      });
      console.log(`Sent low stock alert: ${lowStockProducts.length} products need restocking`);
    } else {
      socket.emit("stockStatus", {
        message: "Tất cả sản phẩm đều có đủ hàng tồn kho",
        status: "ok"
      });
      console.log("All products have sufficient stock levels");
    }
  } catch (error) {
    console.error("Error fetching stock:", error);
    socket.emit("stockError", { 
      message: "Lỗi khi kiểm tra tồn kho", 
      error: error.message 
    });
  }
};

module.exports = {
  handleCheckStock
};
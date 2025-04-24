// service/flashSaleHelper.js
const { FlashSale } = require('../models/flashemodel');
const { ProductSizeStock } = require('../models/ProductSizeStockmodel');
const db = require("../models/db");
// Thay đổi cách import io
const { getIo } = require('../config/socket'); // Sử dụng hàm getIo từ config/socket

// Hàm bắt đầu Flash Sale
const startFlashSale = async (flashSaleId) => {
  const session = await db.mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`Bắt đầu Flash Sale ID: ${flashSaleId}`);
    
    const flashSale = await FlashSale.findById(flashSaleId).session(session);
    if (!flashSale || !flashSale.isActive) {
      console.log('Flash Sale không tồn tại hoặc không active');
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Cập nhật trạng thái các sản phẩm và lưu lại thông tin tồn kho ban đầu
    const productsUpdated = [];
    
    for (const product of flashSale.products) {
      // Tìm thông tin tồn kho hiện tại
      const stockRecord = await ProductSizeStock.findOne({
        productId: product.productId,
        dungluongId: product.dungluongId || null,
        mausacId: product.mausacId || null
      }).session(session);

      if (!stockRecord) continue;

      // Lưu lại số lượng tồn kho ban đầu để hoàn trả sau này
      product.originalStock = stockRecord.unlimitedStock ? null : stockRecord.quantity;

      // Cập nhật trạng thái sản phẩm
      product.status = 'available';
      
      productsUpdated.push(product.productId);
    }

    await flashSale.save({ session });
    await session.commitTransaction();
    
    // Thông báo qua Socket.IO - Sử dụng try-catch để tránh lỗi nếu chưa khởi tạo
    try {
      const io = getIo();
      io.emit('flashSale:started', {
        flashSaleId: flashSale._id,
        name: flashSale.name
      });
    } catch (socketError) {
      console.log('Socket chưa sẵn sàng hoặc có lỗi:', socketError.message);
    }
    
    console.log(`Flash Sale ID: ${flashSaleId} đã bắt đầu thành công`);
  } catch (error) {
    await session.abortTransaction();
    console.error('Lỗi khi bắt đầu Flash Sale:', error);
  } finally {
    session.endSession();
  }
};

// Hàm kết thúc Flash Sale
const endFlashSale = async (flashSaleId) => {
  const session = await db.mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`Kết thúc Flash Sale ID: ${flashSaleId}`);
    
    const flashSale = await FlashSale.findById(flashSaleId).session(session);
    if (!flashSale) {
      console.log('Flash Sale không tồn tại');
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Đánh dấu Flash Sale đã kết thúc
    flashSale.isActive = false;

    // Cập nhật tồn kho thông thường dựa trên số lượng đã bán trong Flash Sale
    for (const product of flashSale.products) {
      // Đánh dấu trạng thái sản phẩm
      if (product.soldQuantity >= product.quantity) {
        product.status = 'soldout';
      } else {
        product.status = 'ended';
      }

      
      if (product.soldQuantity > 0) { 
        
        if (product.originalStock !== null && product.originalStock !== undefined) {
          console.log(`Giảm tồn kho thông thường theo số lượng đã bán. Product: ${product.productId}, SoldQuantity: ${product.soldQuantity}`);
          
         
          await ProductSizeStock.findOneAndUpdate(
            {
              productId: product.productId,
              dungluongId: product.dungluongId || null,
              mausacId: product.mausacId || null,
              unlimitedStock: { $ne: true }
            },
            {
              $inc: { quantity: -product.soldQuantity } 
            },
            { session }
          );
        }
      }
    }

    await flashSale.save({ session });
    await session.commitTransaction();
    
    try {
      const io = getIo();
      io.emit('flashSale:ended', {
        flashSaleId: flashSale._id,
        name: flashSale.name
      });
    } catch (socketError) {
      console.log('Socket chưa sẵn sàng hoặc có lỗi:', socketError.message);
    }
    
    console.log(`Flash Sale ID: ${flashSaleId} đã kết thúc thành công`);
  } catch (error) {
    await session.abortTransaction();
    console.error('Lỗi khi kết thúc Flash Sale:', error);
  } finally {
    session.endSession();
  }
};

module.exports = {
  startFlashSale,
  endFlashSale
};
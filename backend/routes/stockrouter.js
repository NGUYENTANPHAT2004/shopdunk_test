const router = require('express').Router()
const { ProductSizeStock } = require('../models/ProductSizeStockmodel');
const ChitietSp = require('../models/chitietSpModel');
const DungLuong = require('../models/DungLuongModel');
const MauSac = require('../models/MauSacModel');
const LoaiSP = require('../models/LoaiSanPham');
// Thêm vào đầu file stockrouter.js
const db = require('../models/db');
router.get('/tonkho/sanpham', async (req, res) => {
  try {
    // Lấy sản phẩm chưa bị xóa mềm
    const sanphams = await ChitietSp.ChitietSp.find({ isDeleted: false }).lean();

    const productList = await Promise.all(
      sanphams.map(async (product) => {
        try {
          // CHỈ lấy dung lượng đã được chọn cho sản phẩm cụ thể
          const dungluongs = await DungLuong.dungluong.find({
            _id: { $in: product.selectedDungluongs || [] },
            isDeleted: false
          }).lean();

          if (!dungluongs.length) return null;

          // Với mỗi dung lượng, chỉ lấy màu sắc được chọn
          const dungLuongData = await Promise.all(
            dungluongs.map(async (dungluong) => {
              const mausacs = await MauSac.mausac.find({
                _id: { $in: product.selectedMausacs || [] },
                dungluong: dungluong._id,
                isDeleted: false
              }).lean();

              if (!mausacs.length) return null;

              const mausacData = await Promise.all(
                mausacs.map(async (mausac) => {
                  const stock = await ProductSizeStock.findOne({
                    productId: product._id,
                    dungluongId: dungluong._id,
                    mausacId: mausac._id
                  }).lean();

                  return {
                    _id: mausac._id,
                    name: mausac.name,
                    price: mausac.price || 0,
                    images: mausac.image || [],
                    quantity: stock?.quantity || 0
                  };
                })
              );

              const validMauSacData = mausacData.filter(ms => ms);
              if (!validMauSacData.length) return null;

              return {
                _id: dungluong._id,
                name: dungluong.name,
                mausac: validMauSacData
              };
            })
          );

          const filteredDungLuongData = dungLuongData.filter(dl => dl);
          if (!filteredDungLuongData.length) return null;

          return {
            _id: product._id,
            name: product.name,
            image: product.image,
            price: product.price,
            dungluong: filteredDungLuongData
          };
        } catch (error) {
          console.error(`Lỗi xử lý sản phẩm ${product._id}:`, error);
          return null;
        }
      })
    );

    res.json(productList.filter(Boolean));
  } catch (error) {
    console.error('Lỗi khi lấy tồn kho sản phẩm:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

router.post('/stock/add', async (req, res) => {
  try {
    console.log("🚀 Dữ liệu nhận được từ request:", req.body);

    let { productId, dungluongId, mausacId, quantity } = req.body;

    // Kiểm tra productId (bắt buộc)
    if (!productId) {
      return res.status(400).json({ message: "Thiếu productId" });
    }

    // Nếu dungluongId hoặc mausacId là rỗng (""), thì đặt thành null
    if (!dungluongId) dungluongId = null;
    if (!mausacId) mausacId = null;

    let existingStock = await ProductSizeStock.findOne({ productId, dungluongId, mausacId });

    if (!existingStock) {
      const sku = `${productId}-${dungluongId || 'default'}-${mausacId || 'default'}`;
      const newStock = new ProductSizeStock({
        productId,
        dungluongId,
        mausacId,
        quantity: quantity !== undefined ? quantity : null,
        sku
      });
      await newStock.save();
      return res.status(201).json({ message: "Thêm tồn kho thành công", stock: newStock });
    } else {
      existingStock.quantity = quantity;
      await existingStock.save();
      return res.status(200).json({ message: "Số lượng tồn kho đã được điều chỉnh", stock: existingStock });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi cập nhật tồn kho', error });
  }
});

router.get('/stock/:productId/:dungluongId/:mausacId', async (req, res) => {
  try {
    const { productId, dungluongId, mausacId } = req.params;
    const stock = await ProductSizeStock.findOne({ productId, dungluongId, mausacId });
    console.log(stock);
    if (!stock) return res.status(404).json({ message: 'Không tìm thấy tồn kho' });

    res.json({
      stock: stock.unlimitedStock ? 'Không giới hạn' : stock.quantity,
      unlimitedStock: stock.unlimitedStock
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi lấy tồn kho', error });
  }
});
// Thay đổi trong routes/stockrouter.js
// Cập nhật route /stock/update
router.post('/stock/update', async (req, res) => {
  const session = await db.mongoose.startSession();
  session.startTransaction();
  
  try {
    const { productId, dungluongId, mausacId, quantity } = req.body;
    
    // Tìm và kiểm tra tồn kho trong một transaction
    const stock = await ProductSizeStock.findOne({
      productId,
      dungluongId: dungluongId || null,
      mausacId: mausacId || null
    }).session(session);
    
    if (!stock) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Không tìm thấy biến thể sản phẩm" });
    }
    
    if (!stock.unlimitedStock && stock.quantity < quantity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Hàng tồn kho không đủ" });
    }
    
    // Cập nhật tồn kho
    if (!stock.unlimitedStock) {
      stock.quantity -= quantity;
      await stock.save({ session });
    }
    
    await session.commitTransaction();
    session.endSession();
    
    return res.status(200).json({ 
      message: "Cập nhật tồn kho thành công", 
      stock: stock.unlimitedStock ? 'Không giới hạn' : stock.quantity 
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res.status(500).json({ message: "Lỗi cập nhật tồn kho", error: error.message });
  }
});
router.get('/stock/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const stocks = await ProductSizeStock.find({ productId });
    
    res.json({ 
      success: true,
      stocks 
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin tồn kho:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy thông tin tồn kho', 
      error: error.message 
    });
  }
});

module.exports = router
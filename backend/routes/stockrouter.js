const router = require('express').Router()
const { ProductSizeStock } = require('../models/ProductSizeStockmodel');
const ChitietSp = require('../models/chitietSpModel');
const DungLuong = require('../models/DungLuongModel');
const MauSac = require('../models/MauSacModel');
const LoaiSP = require('../models/LoaiSanPham');
// Thêm vào đầu file stockrouter.js
const db = require('../models/db');
// Cải thiện API /tonkho/sanpham với phân trang và aggregate
router.get('/tonkho/sanpham', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Lấy 50 sản phẩm mỗi lần
    const skip = (page - 1) * limit;

    // Sử dụng aggregation để giảm số lượng truy vấn
    const results = await ProductSizeStock.aggregate([
      // Lookup để join với thông tin sản phẩm
      {
        $lookup: {
          from: 'chitietsps',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      // Unwind để lấy ra từng sản phẩm
      { $unwind: '$product' },
      // Chỉ lấy sản phẩm không bị xóa
      { $match: { 'product.isDeleted': false } },
      // Lookup để join với thông tin dung lượng
      {
        $lookup: {
          from: 'dungluongs',
          localField: 'dungluongId',
          foreignField: '_id',
          as: 'dungluong'
        }
      },
      // Unwind để lấy ra từng dung lượng (nếu có)
      {
        $unwind: {
          path: '$dungluong',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup để join với thông tin màu sắc
      {
        $lookup: {
          from: 'mausacs',
          localField: 'mausacId',
          foreignField: '_id',
          as: 'mausac'
        }
      },
      // Unwind để lấy ra từng màu sắc (nếu có)
      {
        $unwind: {
          path: '$mausac',
          preserveNullAndEmptyArrays: true
        }
      },
      // Nhóm dữ liệu theo sản phẩm
      {
        $group: {
          _id: '$productId',
          name: { $first: '$product.name' },
          image: { $first: '$product.image' },
          price: { $first: '$product.price' },
          variants: {
            $push: {
              dungluongId: '$dungluongId',
              dungluongName: { $ifNull: ['$dungluong.name', 'Mặc định'] },
              mausacId: '$mausacId',
              mausacName: { $ifNull: ['$mausac.name', 'Mặc định'] },
              quantity: { $ifNull: ['$quantity', 0] },
              price: { $ifNull: ['$mausac.price', 0] },
              unlimitedStock: { $ifNull: ['$unlimitedStock', false] }
            }
          }
        }
      },
      // Sắp xếp theo tên sản phẩm
      { $sort: { name: 1 } },
      // Phân trang
      { $skip: skip },
      { $limit: limit }
    ]);

    // Lấy tổng số sản phẩm để phân trang
    const totalItems = await ProductSizeStock.aggregate([
      {
        $lookup: {
          from: 'chitietsps',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $match: { 'product.isDeleted': false } },
      { $group: { _id: '$productId' } },
      { $count: 'total' }
    ]);

    res.json({
      products: results,
      pagination: {
        total: totalItems.length > 0 ? totalItems[0].total : 0,
        page,
        limit
      }
    });
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
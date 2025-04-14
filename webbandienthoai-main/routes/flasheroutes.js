const express = require('express');
const router = express.Router();
const { FlashSale } = require('../models/flashemodel');
const Sp = require('../models/chitietSpModel');
const LoaiSP = require('../models/LoaiSanPham');
const { User } = require('../models/user.model');
const moment = require('moment');
const uploads = require('./upload');

// Middleware để kiểm tra quyền admin
const checkAdminAuth = async (req, res, next) => {
  try {
    // Trong một ứng dụng thực tế, cần kiểm tra token JWT và quyền admin
    // Đây là một ví dụ đơn giản, bạn có thể thay thế bằng mã xác thực thực tế
    // const token = req.headers.authorization?.split(' ')[1];
    // if (!token) {
    //   return res.status(401).json({ 
    //     success: false, 
    //     message: 'Không có quyền truy cập' 
    //   });
    // }
    
    // Kiểm tra quyền Admin (code mẫu, cần thay thế)
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // if (decoded.role !== 'admin') {
    //   return res.status(403).json({ 
    //     success: false, 
    //     message: 'Chỉ quản trị viên mới có quyền thực hiện thao tác này' 
    //   });
    // }
    
    next();
  } catch (error) {
    console.error('Lỗi xác thực:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Lỗi xác thực: ' + error.message
    });
  }
};

// Function cập nhật trạng thái Flash Sale
const updateFlashSaleStatus = async (flashSale) => {
  const now = new Date();

  // Nếu Flash Sale quá thời gian kết thúc
  if (now > flashSale.endTime) {
    if (flashSale.isActive) {
      flashSale.isActive = false;
      await flashSale.save();
    }
    
    // Cập nhật trạng thái cho từng sản phẩm
    flashSale.products.forEach(product => {
      if (product.status !== 'ended') {
        product.status = 'ended';
      }
    });
    await flashSale.save();
    return;
  }

  // Nếu Flash Sale đã bắt đầu
  if (now >= flashSale.startTime && now <= flashSale.endTime) {
    // Cập nhật trạng thái cho từng sản phẩm
    flashSale.products.forEach(product => {
      if (product.soldQuantity >= product.quantity) {
        product.status = 'soldout';
      } else if (product.status === 'upcoming') {
        product.status = 'available';
      }
    });
    await flashSale.save();
  }
};

// 1. [ADMIN] Lấy danh sách Flash Sale
router.get('/admin/flash-sales', checkAdminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Xây dựng filter
    const filter = { isDeleted: false };
    if (status === 'active') {
      filter.isActive = true;
      filter.endTime = { $gte: new Date() };
    } else if (status === 'upcoming') {
      filter.startTime = { $gt: new Date() };
    } else if (status === 'ended') {
      filter.endTime = { $lt: new Date() };
    }
    
    // Lấy tổng số Flash Sale phù hợp với filter
    const totalFlashSales = await FlashSale.countDocuments(filter);
    
    // Lấy danh sách Flash Sale với phân trang
    const flashSales = await FlashSale.find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('products.productId', 'name image')
      .lean();
    
    // Format dữ liệu cho frontend
    const formattedFlashSales = flashSales.map(sale => ({
      _id: sale._id,
      name: sale.name,
      startTime: moment(sale.startTime).format('DD/MM/YYYY HH:mm'),
      endTime: moment(sale.endTime).format('DD/MM/YYYY HH:mm'),
      isActive: sale.isActive,
      totalProducts: sale.products.length,
      totalQuantity: sale.products.reduce((sum, product) => sum + product.quantity, 0),
      soldQuantity: sale.products.reduce((sum, product) => sum + product.soldQuantity, 0),
      status: moment().isAfter(sale.endTime) 
        ? 'ended' 
        : moment().isBefore(sale.startTime) 
          ? 'upcoming' 
          : 'active'
    }));
    
    res.json({
      success: true,
      data: formattedFlashSales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalFlashSales / parseInt(limit)),
        totalItems: totalFlashSales
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách Flash Sale'
    });
  }
});

// 2. [ADMIN] Tạo Flash Sale mới
router.post('/admin/flash-sales', 
  checkAdminAuth, 
  uploads.fields([{ name: 'bannerImage', maxCount: 1 }]), 
  async (req, res) => {
    try {
      const { 
        name, description, startTime, endTime, 
        products = '[]', // Truyền dưới dạng JSON string
        isActive = true,
        priority = 0
      } = req.body;
      
      // Validate dữ liệu
      if (!name || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin cần thiết'
        });
      }
      
      // Kiểm tra thời gian có hợp lệ không
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);
      
      if (parsedStartTime >= parsedEndTime) {
        return res.status(400).json({
          success: false,
          message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
        });
      }
      
      // Xử lý ảnh banner nếu có
      const domain = 'http://localhost:3005';
      const bannerImage = req.files['bannerImage'] 
        ? `${domain}/${req.files['bannerImage'][0].filename}` 
        : null;
      
      // Parse và xử lý danh sách sản phẩm
      let parsedProducts = [];
      try {
        parsedProducts = JSON.parse(products);
        
        // Validate từng sản phẩm
        for (const product of parsedProducts) {
          if (!product.productId || !product.originalPrice || !product.salePrice || !product.quantity) {
            return res.status(400).json({
              success: false,
              message: 'Thông tin sản phẩm không đầy đủ'
            });
          }
          
          // Kiểm tra sản phẩm có tồn tại không
          const existProduct = await Sp.ChitietSp.findById(product.productId);
          if (!existProduct) {
            return res.status(400).json({
              success: false,
              message: `Sản phẩm với ID ${product.productId} không tồn tại`
            });
          }
          
          // Tính phần trăm giảm giá
          if (!product.discountPercent) {
            product.discountPercent = Math.round((1 - product.salePrice / product.originalPrice) * 100);
          }
          
          // Trạng thái sản phẩm
          const now = new Date();
          if (now >= parsedStartTime && now <= parsedEndTime) {
            product.status = 'available';
          } else {
            product.status = 'upcoming';
          }
        }
      } catch (error) {
        console.error('Lỗi khi xử lý danh sách sản phẩm:', error);
        return res.status(400).json({
          success: false,
          message: 'Danh sách sản phẩm không hợp lệ'
        });
      }
      
      // Tạo Flash Sale mới
      const flashSale = new FlashSale({
        name,
        description,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        isActive,
        bannerImage,
        priority: parseInt(priority),
        products: parsedProducts
      });
      
      await flashSale.save();
      
      res.json({
        success: true,
        message: 'Tạo Flash Sale thành công',
        data: flashSale
      });
    } catch (error) {
      console.error('Lỗi khi tạo Flash Sale:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo Flash Sale: ' + error.message
      });
    }
});

// 3. [ADMIN] Lấy chi tiết Flash Sale
router.get('/admin/flash-sales/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashSale = await FlashSale.findOne({ 
      _id: id, 
      isDeleted: false 
    }).populate('products.productId', 'name image namekhongdau price');
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Flash Sale'
      });
    }
    
    // Cập nhật trạng thái Flash Sale và sản phẩm
    await updateFlashSaleStatus(flashSale);
    
    res.json({
      success: true,
      data: flashSale
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết Flash Sale'
    });
  }
});

// 4. [ADMIN] Cập nhật Flash Sale
router.put('/admin/flash-sales/:id', 
  checkAdminAuth, 
  uploads.fields([{ name: 'bannerImage', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        name, description, startTime, endTime, 
        products = '[]', // Truyền dưới dạng JSON string
        isActive,
        priority
      } = req.body;
      
      // Tìm Flash Sale
      const flashSale = await FlashSale.findOne({ _id: id, isDeleted: false });
      if (!flashSale) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy Flash Sale'
        });
      }
      
      // Xử lý ảnh banner nếu có
      const domain = 'http://localhost:3005';
      const bannerImage = req.files['bannerImage'] 
        ? `${domain}/${req.files['bannerImage'][0].filename}` 
        : flashSale.bannerImage;
      
      // Cập nhật thông tin cơ bản
      if (name) flashSale.name = name;
      if (description !== undefined) flashSale.description = description;
      if (startTime) flashSale.startTime = new Date(startTime);
      if (endTime) flashSale.endTime = new Date(endTime);
      if (isActive !== undefined) flashSale.isActive = isActive === 'true' || isActive === true;
      if (priority !== undefined) flashSale.priority = parseInt(priority);
      if (bannerImage) flashSale.bannerImage = bannerImage;
      
      // Kiểm tra thời gian có hợp lệ không
      if (flashSale.startTime >= flashSale.endTime) {
        return res.status(400).json({
          success: false,
          message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
        });
      }
      
      // Parse và xử lý danh sách sản phẩm nếu có
      if (products && products !== '[]') {
        try {
          const parsedProducts = JSON.parse(products);
          
          // Validate từng sản phẩm
          for (const product of parsedProducts) {
            if (!product.productId || !product.originalPrice || !product.salePrice || !product.quantity) {
              return res.status(400).json({
                success: false,
                message: 'Thông tin sản phẩm không đầy đủ'
              });
            }
            
            // Kiểm tra sản phẩm có tồn tại không
            const existProduct = await Sp.ChitietSp.findById(product.productId);
            if (!existProduct) {
              return res.status(400).json({
                success: false,
                message: `Sản phẩm với ID ${product.productId} không tồn tại`
              });
            }
            
            // Tính phần trăm giảm giá
            if (!product.discountPercent) {
              product.discountPercent = Math.round((1 - product.salePrice / product.originalPrice) * 100);
            }
            
            // Trạng thái sản phẩm
            const now = new Date();
            if (now >= flashSale.startTime && now <= flashSale.endTime) {
              product.status = 'available';
            } else {
              product.status = 'upcoming';
            }
          }
          
          // Cập nhật danh sách sản phẩm
          flashSale.products = parsedProducts;
        } catch (error) {
          console.error('Lỗi khi xử lý danh sách sản phẩm:', error);
          return res.status(400).json({
            success: false,
            message: 'Danh sách sản phẩm không hợp lệ'
          });
        }
      }
      
      // Cập nhật trạng thái Flash Sale và sản phẩm
      await updateFlashSaleStatus(flashSale);
      
      await flashSale.save();
      
      res.json({
        success: true,
        message: 'Cập nhật Flash Sale thành công',
        data: flashSale
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật Flash Sale:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật Flash Sale: ' + error.message
      });
    }
});

// 5. [ADMIN] Xóa Flash Sale (soft delete)
router.delete('/admin/flash-sales/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashSale = await FlashSale.findById(id);
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Flash Sale'
      });
    }
    
    // Thực hiện soft delete
    flashSale.isDeleted = true;
    await flashSale.save();
    
    res.json({
      success: true,
      message: 'Xóa Flash Sale thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa Flash Sale'
    });
  }
});

// 6. [ADMIN] Cập nhật trạng thái Flash Sale
router.patch('/admin/flash-sales/:id/status', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin trạng thái'
      });
    }
    
    const flashSale = await FlashSale.findOne({ _id: id, isDeleted: false });
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Flash Sale'
      });
    }
    
    // Kiểm tra nếu Flash Sale đã kết thúc
    if (new Date() > flashSale.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Flash Sale đã kết thúc, không thể thay đổi trạng thái'
      });
    }
    
    flashSale.isActive = isActive === 'true' || isActive === true;
    await flashSale.save();
    
    res.json({
      success: true,
      message: `Flash Sale đã được ${flashSale.isActive ? 'kích hoạt' : 'tạm ngừng'}`
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái Flash Sale'
    });
  }
});

// 7. [PUBLIC] Lấy Flash Sale đang diễn ra
router.get('/flash-sales/active', async (req, res) => {
  try {
    const now = new Date();
    
    // Tìm tất cả Flash Sale đang diễn ra
    const flashSales = await FlashSale.find({
      isActive: true,
      isDeleted: false,
      startTime: { $lte: now },
      endTime: { $gt: now }
    })
    .sort({ priority: -1, startTime: 1 })
    .populate('products.productId', 'name image namekhongdau price')
    .lean();
    
    // Format dữ liệu cho frontend
    const formattedFlashSales = flashSales.map(sale => {
      // Lọc sản phẩm có sẵn
      const availableProducts = sale.products.filter(product => 
        product.status === 'available' && product.soldQuantity < product.quantity
      );
      
      return {
        _id: sale._id,
        name: sale.name,
        description: sale.description,
        bannerImage: sale.bannerImage,
        startTime: sale.startTime,
        endTime: sale.endTime,
        remainingTime: sale.endTime - now,
        products: availableProducts.map(product => ({
          _id: product.productId._id,
          name: product.productId.name,
          image: product.productId.image,
          namekhongdau: product.productId.namekhongdau,
          originalPrice: product.originalPrice,
          salePrice: product.salePrice,
          discountPercent: product.discountPercent,
          quantity: product.quantity,
          soldQuantity: product.soldQuantity,
          remainingQuantity: product.quantity - product.soldQuantity,
          soldPercent: Math.round((product.soldQuantity / product.quantity) * 100)
        }))
      };
    });
    
    res.json({
      success: true,
      data: formattedFlashSales
    });
  } catch (error) {
    console.error('Lỗi khi lấy Flash Sale đang diễn ra:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy Flash Sale đang diễn ra'
    });
  }
});

// 8. [PUBLIC] Lấy tất cả Flash Sale (đang diễn ra và sắp diễn ra)
router.get('/flash-sales', async (req, res) => {
  try {
    const now = new Date();
    
    // Tìm tất cả Flash Sale đang diễn ra và sắp diễn ra
    const flashSales = await FlashSale.find({
      isActive: true,
      isDeleted: false,
      endTime: { $gt: now }
    })
    .sort({ startTime: 1 })
    .populate('products.productId', 'name image namekhongdau price')
    .lean();
    
    // Phân loại Flash Sale
    const activeFlashSales = [];
    const upcomingFlashSales = [];
    
    flashSales.forEach(sale => {
      if (sale.startTime <= now) {
        // Flash Sale đang diễn ra
        const availableProducts = sale.products.filter(product => 
          product.status === 'available' && product.soldQuantity < product.quantity
        );
        
        activeFlashSales.push({
          _id: sale._id,
          name: sale.name,
          description: sale.description,
          bannerImage: sale.bannerImage,
          startTime: sale.startTime,
          endTime: sale.endTime,
          remainingTime: sale.endTime - now,
          products: availableProducts.map(product => ({
            _id: product.productId._id,
            name: product.productId.name,
            image: product.productId.image,
            namekhongdau: product.productId.namekhongdau,
            originalPrice: product.originalPrice,
            salePrice: product.salePrice,
            discountPercent: product.discountPercent,
            quantity: product.quantity,
            soldQuantity: product.soldQuantity,
            remainingQuantity: product.quantity - product.soldQuantity,
            soldPercent: Math.round((product.soldQuantity / product.quantity) * 100)
          }))
        });
      } else {
        // Flash Sale sắp diễn ra
        upcomingFlashSales.push({
          _id: sale._id,
          name: sale.name,
          description: sale.description,
          bannerImage: sale.bannerImage,
          startTime: sale.startTime,
          timeUntilStart: sale.startTime - now,
          totalProducts: sale.products.length,
          startTimeFormatted: moment(sale.startTime).format('DD/MM/YYYY HH:mm'),
          endTimeFormatted: moment(sale.endTime).format('DD/MM/YYYY HH:mm')
        });
      }
    });
    
    res.json({
      success: true,
      data: {
        active: activeFlashSales,
        upcoming: upcomingFlashSales
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách Flash Sale'
    });
  }
});

// 9. [PUBLIC] Lấy chi tiết Flash Sale
router.get('/flash-sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    
    // Tìm Flash Sale
    const flashSale = await FlashSale.findOne({ 
      _id: id, 
      isActive: true,
      isDeleted: false
    }).populate('products.productId', 'name image namekhongdau price content');
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Flash Sale'
      });
    }
    
    // Cập nhật trạng thái Flash Sale và sản phẩm
    await updateFlashSaleStatus(flashSale);
    
    // Format dữ liệu cho frontend
    let status = 'upcoming';
    if (now > flashSale.endTime) {
      status = 'ended';
    } else if (now >= flashSale.startTime) {
      status = 'active';
    }
    
    const formattedProducts = flashSale.products.map(product => ({
      _id: product.productId._id,
      name: product.productId.name,
      image: product.productId.image,
      namekhongdau: product.productId.namekhongdau,
      content: product.productId.content,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      discountPercent: product.discountPercent,
      quantity: product.quantity,
      soldQuantity: product.soldQuantity,
      remainingQuantity: product.quantity - product.soldQuantity,
      status: product.status,
      soldPercent: Math.round((product.soldQuantity / product.quantity) * 100),
      limit: product.limit
    }));
    
    const formattedFlashSale = {
      _id: flashSale._id,
      name: flashSale.name,
      description: flashSale.description,
      bannerImage: flashSale.bannerImage,
      startTime: flashSale.startTime,
      endTime: flashSale.endTime,
      status,
      remainingTime: status === 'active' ? flashSale.endTime - now : 0,
      timeUntilStart: status === 'upcoming' ? flashSale.startTime - now : 0,
      products: formattedProducts
    };
    
    res.json({
      success: true,
      data: formattedFlashSale
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết Flash Sale'
    });
  }
});

// 10. [PUBLIC] Lấy sản phẩm trong Flash Sale
router.get('/flash-sale-products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const now = new Date();
    
    // Tìm Flash Sale đang diễn ra có chứa sản phẩm này
    const flashSale = await FlashSale.findOne({
      isActive: true,
      isDeleted: false,
      startTime: { $lte: now },
      endTime: { $gt: now },
      'products.productId': productId
    }).populate('products.productId', 'name image namekhongdau price');
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong Flash Sale đang diễn ra'
      });
    }
    
    // Lấy thông tin sản phẩm trong Flash Sale
    const product = flashSale.products.find(p => p.productId._id.toString() === productId);
    
    if (!product || product.status !== 'available' || product.soldQuantity >= product.quantity) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không có sẵn trong Flash Sale'
      });
    }
    
    // Format dữ liệu cho frontend
    const flashSaleProduct = {
      flashSaleId: flashSale._id,
      flashSaleName: flashSale.name,
      productId: product.productId._id,
      name: product.productId.name,
      image: product.productId.image,
      namekhongdau: product.productId.namekhongdau,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      discountPercent: product.discountPercent,
      quantity: product.quantity,
      soldQuantity: product.soldQuantity,
      remainingQuantity: product.quantity - product.soldQuantity,
      limit: product.limit,
      endTime: flashSale.endTime,
      remainingTime: flashSale.endTime - now
    };
    
    res.json({
      success: true,
      data: flashSaleProduct
    });
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy sản phẩm Flash Sale'
    });
  }
});

// 11. [PUBLIC] Cập nhật số lượng bán khi mua sản phẩm Flash Sale
router.post('/flash-sale-purchase', async (req, res) => {
  try {
    const { flashSaleId, productId, quantity = 1, userId } = req.body;
    
    if (!flashSaleId || !productId || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết'
      });
    }
    
    const now = new Date();
    
    // Tìm Flash Sale
    const flashSale = await FlashSale.findOne({
      _id: flashSaleId,
      isActive: true,
      isDeleted: false,
      startTime: { $lte: now },
      endTime: { $gt: now }
    });
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: 'Flash Sale không tồn tại hoặc đã kết thúc'
      });
    }
    
    // Tìm sản phẩm trong Flash Sale
    const productIndex = flashSale.products.findIndex(p => 
      p.productId.toString() === productId && p.status === 'available'
    );
    
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không có trong Flash Sale hoặc không có sẵn'
      });
    }
    
    const product = flashSale.products[productIndex];
    
    // Kiểm tra số lượng còn lại
    if (product.soldQuantity + quantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng sản phẩm trong Flash Sale không đủ'
      });
    }
    
    // Kiểm tra giới hạn mua của người dùng (nếu có userId)
    if (userId && product.limit > 0) {
      // Ở đây có thể thêm logic kiểm tra số lượng đã mua của người dùng
      // Ví dụ: lấy thông tin từ bảng đơn hàng để kiểm tra
      
      // Giả sử đã có hàm kiểm tra số lượng đã mua
      // const purchasedQuantity = await getPurchasedQuantity(userId, flashSaleId, productId);
      // if (purchasedQuantity + quantity > product.limit) {
      //   return res.status(400).json({
      //     success: false,
      //     message: `Bạn chỉ có thể mua tối đa ${product.limit} sản phẩm này trong Flash Sale`
      //   });
      // }
    }
    
    // Cập nhật số lượng đã bán
    flashSale.products[productIndex].soldQuantity += quantity;
    
    // Cập nhật trạng thái nếu đã hết hàng
    if (flashSale.products[productIndex].soldQuantity >= flashSale.products[productIndex].quantity) {
      flashSale.products[productIndex].status = 'soldout';
    }
    
    await flashSale.save();
    
    res.json({
      success: true,
      message: 'Cập nhật số lượng sản phẩm Flash Sale thành công',
      data: {
        remainingQuantity: product.quantity - flashSale.products[productIndex].soldQuantity
      }
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật số lượng sản phẩm Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật số lượng sản phẩm Flash Sale'
    });
  }
});

// 12. [ADMIN] Lấy thống kê Flash Sale
router.get('/admin/flash-sales/:id/stats', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const flashSale = await FlashSale.findOne({ 
      _id: id, 
      isDeleted: false 
    }).populate('products.productId', 'name image');
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy Flash Sale'
      });
    }
    
    // Tính toán thống kê
    const totalProducts = flashSale.products.length;
    const totalQuantity = flashSale.products.reduce((sum, product) => sum + product.quantity, 0);
    const soldQuantity = flashSale.products.reduce((sum, product) => sum + product.soldQuantity, 0);
    const soldPercent = totalQuantity > 0 ? Math.round((soldQuantity / totalQuantity) * 100) : 0;
    
    // Phân loại sản phẩm theo trạng thái
    const productStats = {
      available: 0,
      soldout: 0,
      upcoming: 0,
      ended: 0
    };
    
    flashSale.products.forEach(product => {
      productStats[product.status]++;
    });
    
    // Danh sách top sản phẩm bán chạy
    const topProducts = [...flashSale.products]
      .sort((a, b) => {
        // Sắp xếp theo tỷ lệ phần trăm đã bán
        const aPercent = a.quantity > 0 ? (a.soldQuantity / a.quantity) : 0;
        const bPercent = b.quantity > 0 ? (b.soldQuantity / b.quantity) : 0;
        return bPercent - aPercent;
      })
      .slice(0, 5)
      .map(product => ({
        _id: product.productId._id,
        name: product.productId.name,
        image: product.productId.image,
        quantity: product.quantity,
        soldQuantity: product.soldQuantity,
        soldPercent: product.quantity > 0 ? Math.round((product.soldQuantity / product.quantity) * 100) : 0,
        status: product.status
      }));
    
    // Kiểm tra trạng thái Flash Sale
    const now = new Date();
    let status = 'upcoming';
    if (now > flashSale.endTime) {
      status = 'ended';
    } else if (now >= flashSale.startTime) {
      status = 'active';
    }
    
    res.json({
      success: true,
      data: {
        _id: flashSale._id,
        name: flashSale.name,
        startTime: flashSale.startTime,
        endTime: flashSale.endTime,
        status,
        stats: {
          totalProducts,
          totalQuantity,
          soldQuantity,
          soldPercent,
          productStats
        },
        topProducts
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê Flash Sale:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê Flash Sale'
    });
  }
});

// Xuất router
module.exports = router;
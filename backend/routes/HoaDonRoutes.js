const express = require('express')
const router = express.Router()
const HoaDon = require('../models/HoaDonModel')
const moment = require('moment')
const MaGiamGia = require('../models/MaGiamGiaModel')
const SanPham = require('../models/chitietSpModel')
const DungLuong = require('../models/DungLuongModel')
const User = require('../models/user.model')
const momenttimezone = require('moment-timezone');
const { ProductSizeStock } = require('../models/ProductSizeStockmodel')
const { 
  generateVoucherForUser, 
  isFirstOrderVoucherEligible, 
  isThirdOrderVoucherEligible
} = require('../socket/handlers/voucherGenerator');
const { FlashSale } = require('../models/flashemodel');
const db = require('../models/db')
const Category = require('../models/CategoryModel');
const LoaiSP = require('../models/LoaiSanPham').LoaiSP;
const { RedemptionHistory } = require('../models/RedemptionHistoryModel');
const { getIo } = require('../config/socket');

function sortObject (obj) {
  let sorted = {}
  let str = []
  let key
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key))
    }
  }
  str.sort()
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+')
  }
  return sorted
}
async function processFlashSaleItems(flashSaleItems, session = null) {
  if (!flashSaleItems || !Array.isArray(flashSaleItems) || flashSaleItems.length === 0) {
    return { success: true, message: 'Không có sản phẩm Flash Sale' };
  }
  
  try {
    // Nhóm các sản phẩm theo Flash Sale ID để tối ưu số lượng queries
    const flashSaleGroups = {};
    for (const item of flashSaleItems) {
      if (!item.flashSaleId) continue;
      
      if (!flashSaleGroups[item.flashSaleId]) {
        flashSaleGroups[item.flashSaleId] = [];
      }
      
      flashSaleGroups[item.flashSaleId].push(item);
    }
    
    
    for (const [flashSaleId, items] of Object.entries(flashSaleGroups)) {
   
      for (const item of items) {
       
        const result = await FlashSale.findOneAndUpdate(
          { 
            _id: flashSaleId,
            isActive: true,
            startTime: { $lte: new Date() },
            endTime: { $gt: new Date() },
            'products': {
              $elemMatch: {
                productId: item.idsp,
                dungluongId: item.dungluong || null,
                mausacId: item.idmausac || null,
                quantity: { $gte: { $add: ['$soldQuantity', item.soluong] } }
              }
            }
          },
          {
            $inc: { 'products.$.soldQuantity': item.soluong },
            $set: {
              'products.$.status': {
                $cond: [
                  { $gte: [{ $add: ['$products.soldQuantity', item.soluong] }, '$products.quantity'] },
                  'soldout',
                  'available'
                ]
              }
            }
          },
          { 
            new: true,
            session 
          }
        );
        
        if (!result) {
          return { 
            success: false, 
            message: `Sản phẩm Flash Sale không đủ số lượng hoặc không tìm thấy.` 
          };
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi xử lý sản phẩm Flash Sale:', error);
    return { 
      success: false, 
      message: 'Lỗi khi xử lý sản phẩm Flash Sale: ' + error.message 
    };
  }
}

async function rollbackFlashSalePurchase(flashSaleItems, session = null) {
  if (!flashSaleItems || !Array.isArray(flashSaleItems) || flashSaleItems.length === 0) {
    console.log('Không có sản phẩm Flash Sale để hoàn lại');
    return { success: true };
  }
  
  try {
    
    const flashSaleGroups = {};
    for (const item of flashSaleItems) {
      if (!item.flashSaleId) continue;
      
      if (!flashSaleGroups[item.flashSaleId]) {
        flashSaleGroups[item.flashSaleId] = [];
      }
      
      flashSaleGroups[item.flashSaleId].push(item);
    }
    
    // Xử lý từng Flash Sale
    for (const [flashSaleId, items] of Object.entries(flashSaleGroups)) {
      for (const item of items) {
        // Sử dụng atomic operations để hoàn lại số lượng
        const now = new Date();
        const result = await FlashSale.findOneAndUpdate(
          { 
            _id: flashSaleId,
            'products': {
              $elemMatch: {
                productId: item.idsp,
                dungluongId: item.dungluong || null,
                mausacId: item.idmausac || null
              }
            }
          },
          [
            { 
              $set: {
                'products.$.soldQuantity': { 
                  $max: [0, { $subtract: ['$products.$.soldQuantity', item.soluong] }] 
                },
                'products.$.status': {
                  $cond: {
                    if: { 
                      $and: [
                        { $lt: [{ $subtract: ['$products.$.soldQuantity', item.soluong] }, '$products.$.quantity'] },
                        { $lte: [now, '$endTime'] },
                        { $gte: [now, '$startTime'] },
                        '$isActive'
                      ] 
                    },
                    then: 'available',
                    else: '$products.$.status'
                  }
                }
              }
            }
          ],
          { 
            new: true,
            session 
          }
        );
        
        if (!result) {
          console.warn(`Không tìm thấy sản phẩm trong Flash Sale để hoàn lại số lượng`);
          continue;
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Lỗi khi hoàn lại số lượng Flash Sale:', error);
    return { success: false, error };
  }
}


router.get('/gethoadon', async (req, res) => {
  try {
    const hoadon = await HoaDon.hoadon.find({}).lean()
    res.json(hoadon)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Lỗi trong quá trình xóa' })
  }
})

router.post('/deletehoaddon', async (req, res) => {
  try {
    const { ids } = req.body
    
    // Find orders that might need inventory restoration before soft deleting
    const ordersToDelete = await HoaDon.hoadon.find({ _id: { $in: ids } })
    
    // Restore inventory for orders that reduced inventory but weren't completed
    for (const order of ordersToDelete) {
      // Only restore if the order was created but not paid or failed
      if (!order.thanhtoan && order.trangthai !== 'Hủy Đơn Hàng') {
        await restoreInventory(order.sanpham)
      }
    }
    
    // Soft delete by updating isDeleted flag
    await HoaDon.hoadon.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    )
    
    res.json({ message: 'Xóa hóa đơn thành công' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Lỗi trong quá trình xóa' })
  }
})

async function restoreInventory(sanphams, session = null) {
  if (!sanphams || !Array.isArray(sanphams) || sanphams.length === 0) {
    console.log('Không có sản phẩm để khôi phục tồn kho');
    return;
  }
  
  const options = session ? { session } : {};
  const restoredItems = [];
  
  try {
    for (const sanpham of sanphams) {
      try {
        if (!sanpham || !sanpham.idsp || !sanpham.dungluong || !sanpham.soluong) {
          console.warn('Dữ liệu sản phẩm không hợp lệ:', sanpham);
          continue;
        }
        
        const { idsp, soluong, dungluong, idmausac } = sanpham;
        
        // Tìm sản phẩm trong kho với atomic update
        const result = await ProductSizeStock.findOneAndUpdate(
          {
            productId: idsp,
            dungluongId: dungluong,
            mausacId: idmausac,
            unlimitedStock: { $ne: true } // Chỉ cập nhật nếu không phải hàng không giới hạn
          },
          {
            $inc: { quantity: soluong }
          },
          {
            new: true,
            ...options
          }
        );
        
        if (result) {
          restoredItems.push({
            productId: idsp,
            dungluongId: dungluong, 
            mausacId: idmausac,
            quantity: soluong,
            newQuantity: result.quantity
          });
          console.log(`Đã khôi phục ${soluong} sản phẩm ${idsp} vào kho, số lượng mới: ${result.quantity}`);
        } else {
          console.log(`Không tìm thấy hoặc là hàng không giới hạn: ${idsp}, size: ${dungluong}, color: ${idmausac}`);
        }
      } catch (error) {
        console.error(`Lỗi khi khôi phục sản phẩm ${sanpham?.idsp} vào kho:`, error);
      }
    }
    
    console.log(`Đã khôi phục ${restoredItems.length}/${sanphams.length} sản phẩm vào kho`);
    return restoredItems;
  } catch (error) {
    console.error('Lỗi khi khôi phục tồn kho:', error);
    throw error;
  }
}
async function reduceInventory(sanphams) {
  if (!sanphams || !Array.isArray(sanphams) || sanphams.length === 0) {
    throw new Error('No products to reduce in inventory');
  }
  
  const session = await db.mongoose.startSession();
  session.startTransaction();
  
  const reducedItems = [];
  
  try {
    for (const sanpham of sanphams) {
      if (!sanpham || !sanpham.idsp || !sanpham.dungluong || !sanpham.soluong) {
        throw new Error('Invalid product data for inventory reduction');
      }
      
      const { idsp, soluong, dungluong, idmausac } = sanpham;
      
      // Lấy bản ghi và version hiện tại
      const stockItem = await ProductSizeStock.findOne({
        productId: idsp,
        dungluongId: dungluong,
        mausacId: idmausac
      }).session(session);
      
      if (!stockItem) {
        throw new Error(`Không tìm thấy thông tin tồn kho cho sản phẩm: ${idsp} ${dungluong} ${idmausac}`);
      }
      
      if (!stockItem.unlimitedStock && stockItem.quantity < soluong) {
        throw new Error(`Sản phẩm không đủ số lượng trong kho. Hiện chỉ còn ${stockItem.quantity} sản phẩm.`);
      }
      
      if (!stockItem.unlimitedStock) {
        const result = await ProductSizeStock.findOneAndUpdate(
          {
            _id: stockItem._id,
            __v: stockItem.__v  
          },
          {
            $inc: { quantity: -soluong }
          },
          {
            new: true,
            session
          }
        );
        
        if (!result) {
          throw new Error(`Xung đột version khi cập nhật tồn kho cho sản phẩm: ${idsp}`);
        }
        
        reducedItems.push({
          stockId: result._id,
          quantity: soluong
        });
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Lỗi khi giảm tồn kho:', error);
    throw error;
  }
}


router.post('/posthoadon', async (req, res) => {
  try {
    const {
      name,
      phone,
      sex,
      nguoinhan,
      giaotannoi,
      address,
      ghichu,
      magiamgia,
      sanphams,
      userId // userId từ token authentication 
    } = req.body;

    const hoadon = new HoaDon.hoadon({
      name,
      phone,
      sex,
      nguoinhan,
      giaotannoi,
      ngaymua: moment().toISOString(),
      trangthai: 'Đang xử lý',
      tongtien: 0,
      userId: userId || null // gán userId nếu có
    });

    let tongtien = 0;

    for (const sanpham of sanphams) {
      const { idsp, soluong } = sanpham;
      const sanpham1 = await SanPham.ChitietSp.findById(idsp);
      hoadon.sanpham.push({ idsp, soluong, price: sanpham1.price });
      tongtien += sanpham1.price * soluong;
    }

    hoadon.tongtien = tongtien;

    if (magiamgia) {
      // Sử dụng hàm validateVoucher đã cập nhật, truyền thêm userId
      const validationResult = await validateVoucher(magiamgia, phone, tongtien, userId);
      
      if (!validationResult.valid) {
        return res.status(400).json({ message: validationResult.message });
      }
      
      const magiamgia1 = validationResult.voucher;

      hoadon.magiamgia = magiamgia;
      const giamGia = magiamgia1.sophantram / 100;
      hoadon.tongtien = tongtien - tongtien * giamGia;
    }

    if (giaotannoi) hoadon.address = address;
    if (ghichu) hoadon.ghichu = ghichu;

    await hoadon.save();
    res.json(hoadon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi trong quá trình thêm' });
  }
});

async function validateVoucher(magiamgia, phone, orderTotal, userId = null, session = null) {
  if (!magiamgia) return { valid: false, message: 'Không có mã giảm giá' };
  
  // Tìm voucher từ cả hệ thống điểm thưởng và hệ thống mã giảm giá thông thường
  let isPointsVoucher = false;
  
  try {
    // Tìm kiếm bằng cả userId và phone để hỗ trợ cả hai cách
    const query = { voucherCode: magiamgia, status: 'active' };
    
    if (userId) {
      query.userId = userId;
    } else if (phone) {
      query.phone = phone;
    }
    
    const redemptionRecord = await RedemptionHistory.findOne(query);
    
    if (redemptionRecord) {
      isPointsVoucher = true;
      
      // Kiểm tra hạn sử dụng
      if (redemptionRecord.expiryDate < new Date()) {
        redemptionRecord.status = 'expired';
        await redemptionRecord.save({ session });
        return { valid: false, message: 'Mã giảm giá từ điểm thưởng đã hết hạn' };
      }
    }
  } catch (err) {
    console.error('Lỗi khi kiểm tra mã giảm giá từ điểm thưởng:', err);
  }
  
  // Kiểm tra trong bảng mã giảm giá
  const options = session ? { session } : {};
  const voucher = await MaGiamGia.magiamgia.findOne({ magiamgia }, null, options);
  
  if (!voucher) {
    return { valid: false, message: 'Mã giảm giá không tồn tại' };
  }
  
  // Kiểm tra nếu voucher thuộc về người dùng cụ thể
  if (voucher.userId && userId && voucher.userId.toString() !== userId.toString()) {
    return { valid: false, message: 'Mã giảm giá này không thuộc về bạn' };
  }
  
  // Kiểm tra hạn sử dụng
  const ngayHienTai = moment();
  const ngayKetThuc = moment(voucher.ngayketthuc);
  const ngayBatDau = moment(voucher.ngaybatdau);
  
  if (ngayHienTai.isAfter(ngayKetThuc) || ngayHienTai.isBefore(ngayBatDau)) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn hoặc chưa đến thời gian sử dụng' };
  }
  
  // Kiểm tra số lượng còn lại
  if (voucher.soluong <= 0) {
    return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
  }
  
  // Kiểm tra giá trị đơn hàng tối thiểu
  if (orderTotal < voucher.minOrderValue) {
    return { 
      valid: false, 
      message: `Giá trị đơn hàng tối thiểu phải từ ${voucher.minOrderValue.toLocaleString('vi-VN')}đ` 
    };
  }
  
  // Kiểm tra giá trị đơn hàng tối đa (nếu có)
  if (voucher.maxOrderValue && orderTotal > voucher.maxOrderValue) {
    return { 
      valid: false, 
      message: `Giá trị đơn hàng không được vượt quá ${voucher.maxOrderValue.toLocaleString('vi-VN')}đ` 
    };
  }
  
  // Kiểm tra giờ vàng
  if (voucher.goldenHourStart && voucher.goldenHourEnd) {
    if (!isWithinGoldenHour(voucher.goldenHourStart, voucher.goldenHourEnd)) {
      return { 
        valid: false, 
        message: `Mã giảm giá chỉ có hiệu lực trong khung giờ vàng: ${voucher.goldenHourStart} - ${voucher.goldenHourEnd}` 
      };
    }
  }
  
  // Kiểm tra ngày trong tuần
  if (voucher.daysOfWeek && voucher.daysOfWeek.length > 0) {
    if (!isAllowedDayOfWeek(voucher.daysOfWeek)) {
      const allowedDays = voucher.daysOfWeek
        .map(day => ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][day])
        .join(', ');
      
      return { 
        valid: false, 
        message: `Mã giảm giá chỉ có hiệu lực vào: ${allowedDays}` 
      };
    }
  }
  
  // Kiểm tra giới hạn một lần/người dùng
  if (!voucher.isServerWide && voucher.isOneTimePerUser) {
    // Ưu tiên kiểm tra theo userId
    if (userId && voucher.appliedUsers && voucher.appliedUsers.some(id => 
      id && id.toString() === userId.toString()
    )) {
      return { valid: false, message: 'Bạn đã sử dụng mã giảm giá này' };
    }
    
    // Kiểm tra theo phone (hỗ trợ ngược dành cho cũ)
    if (!userId && phone && voucher.appliedUsers && 
        voucher.appliedUsers.some(id => id && id.toString() === phone)) {
      return { valid: false, message: 'Bạn đã sử dụng mã giảm giá này' };
    }
  }
  
  // Lưu thông tin voucher điểm thưởng
  return { 
    valid: true, 
    voucher,
    isPointsVoucher
  };
}
router.post('/create_payment_url', async (req, res) => {
  // Tạo session để đảm bảo tính nguyên vẹn dữ liệu
  const session = await db.mongoose.startSession();
  session.startTransaction();
  
  try {
    process.env.TZ = 'Asia/Ho_Chi_Minh'

    let date = new Date()
    let createDate = moment(date).format('YYYYMMDDHHmmss')

    let ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress

    let config = require('config')

    let tmnCode = config.get('vnp_TmnCode')
    let secretKey = config.get('vnp_HashSecret')
    let vnpUrl = config.get('vnp_Url')
    let returnUrl = config.get('vnp_ReturnUrl')
    let orderId = moment(date).format('DDHHmmss')
    
    // Sử dụng amount từ frontend mà không tính lại
    let amount = req.body.amount
    let bankCode = req.body.bankCode

    let locale = req.body.language || 'vn'
    const { 
      name, nguoinhan, phone, sex, giaotannoi, address, ghichu, 
      magiamgia, sanphams, userId, shippingFee, discountAmount 
    } = req.body

    // Phân loại sản phẩm thông thường và Flash Sale
    const regularItems = sanphams.filter(item => !item.isFlashSale);
    const flashSaleItems = sanphams.filter(item => item.isFlashSale);
    
    // Xử lý Flash Sale trước
    if (flashSaleItems.length > 0) {
      const processResult = await processFlashSaleItems(flashSaleItems, session);
      
      if (!processResult.success) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: processResult.message 
        });
      }
    }

    let currCode = 'VND'
    let vnp_Params = {}
    vnp_Params['vnp_Version'] = '2.1.0'
    vnp_Params['vnp_Command'] = 'pay'
    vnp_Params['vnp_TmnCode'] = tmnCode
    vnp_Params['vnp_Locale'] = locale
    vnp_Params['vnp_CurrCode'] = currCode
    vnp_Params['vnp_TxnRef'] = orderId
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId
    vnp_Params['vnp_OrderType'] = 'other'
    
    // Sử dụng amount từ frontend và nhân với 100 cho VNPay
    vnp_Params['vnp_Amount'] = amount * 100
    
    vnp_Params['vnp_ReturnUrl'] = returnUrl
    vnp_Params['vnp_IpAddr'] = ipAddr
    vnp_Params['vnp_CreateDate'] = createDate
    if (bankCode !== null && bankCode !== '') {
      vnp_Params['vnp_BankCode'] = bankCode
    }
    const ngaymua = momenttimezone().toDate()
    const hoadon = new HoaDon.hoadon({
      name,
      phone,
      sex,
      nguoinhan,
      giaotannoi,
      ngaymua,
      trangthai: 'Đang xử lý',
      tongtien: amount,  
      orderId,
      thanhtoan: false,
      userId: userId || null,
      phivanchuyen: shippingFee || 0,    
      giamgia: discountAmount || 0 
    })

    hoadon.maHDL = 'HD' + hoadon._id.toString().slice(-4)
    
    // Vẫn cần lưu thông tin sản phẩm vào hóa đơn
    let tongtien_sanpham = 0

    for (const sanpham of sanphams) {
      const { idsp, soluong, dungluong, idmausac, price, mausac, isFlashSale, flashSaleId } = sanpham
      const productDetails = await SanPham.ChitietSp.findById(idsp).session(session);
      const dungluongDetails = await DungLuong.dungluong.findById(dungluong).session(session);
      
      // Thêm thông tin Flash Sale vào hóa đơn
      hoadon.sanpham.push({
        idsp,
        soluong,
        price,
        dungluong,
        idmausac,
        mausac,
        isFlashSale: isFlashSale || false,
        flashSaleId: flashSaleId || null,
        productSnapshot: {
          name: productDetails ? productDetails.name : "Sản phẩm không xác định",
          image: productDetails ? productDetails.image : "",
          dungluongName: dungluongDetails ? dungluongDetails.name : "",
          mausacName: mausac || ""
        }
      })
      tongtien_sanpham += price * soluong
    }

    // Xử lý mã giảm giá (chỉ để ghi nhận vào hóa đơn, không tính lại amount)
    if (magiamgia) {
      try {
        const validationResult = await validateVoucher(magiamgia, phone, tongtien_sanpham, userId);
        
        if (!validationResult.valid) {
          await session.abortTransaction();
          session.endSession();
          return res.json({ message: validationResult.message });
        }
        
        // Chỉ lưu thông tin mã giảm giá, không tính lại amount
        hoadon.magiamgia = magiamgia;
      } catch (error) {
        console.error('Lỗi xử lý mã giảm giá:', error);
        await session.abortTransaction();
        session.endSession();
        return res.json({ message: 'Lỗi khi xử lý mã giảm giá: ' + error.message });
      }
    }

    if (giaotannoi) {
      hoadon.address = address
    }
    if (ghichu) {
      hoadon.ghichu = ghichu
    }

    try {
      // Chỉ xử lý tồn kho cho sản phẩm không phải Flash Sale
      if (regularItems.length > 0) {
        await reduceInventory(regularItems, session);
      }
      
      // Lưu hóa đơn
      await hoadon.save({ session });
      
      // Thiết lập timeout cho đơn hàng
      setTimeout(async () => {
        try {
          const order = await HoaDon.hoadon.findById(hoadon._id);
          if (order && !order.thanhtoan && order.trangthai !== 'Hủy Đơn Hàng') {
            // Payment wasn't completed within the timeframe
            
            // Khôi phục tồn kho cho sản phẩm thông thường
            if (regularItems.length > 0) {
              await restoreInventory(regularItems);
            }
            
            // Khôi phục tồn kho Flash Sale
            if (flashSaleItems.length > 0) {
              await rollbackFlashSalePurchase(flashSaleItems);
            }
            
            order.trangthai = 'Thanh toán hết hạn';
            await order.save();
            console.log(`Payment timeout for order ${order._id}, inventory restored`);
          }
        } catch (err) {
          console.error('Error handling payment timeout:', err);
        }
      }, 15 * 60 * 1000); // 15 minutes timeout
      
      // Commit giao dịch
      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      console.error('Error processing order:', error);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: error.message || 'Lỗi khi xử lý đơn hàng' });
    }

    vnp_Params = sortObject(vnp_Params)

    let querystring = require('qs')
    let signData = querystring.stringify(vnp_Params, { encode: false })
    let crypto = require('crypto')
    let hmac = crypto.createHmac('sha512', secretKey)
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex')
    vnp_Params['vnp_SecureHash'] = signed
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false })

    res.json(vnpUrl)
  } catch (error) {
    console.error('Lỗi khi tạo URL thanh toán:', error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    res.status(500).json({ message: error.message || 'Lỗi khi xử lý thanh toán' });
  }
})

// 4. Cập nhật route vnpay_return để xử lý Flash Sale sau khi thanh toán
router.get('/vnpay_return', async (req, res) => {
  // Bắt đầu transaction
  const session = await db.mongoose.startSession();
  session.startTransaction();
  
  try {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];
    let orderId = vnp_Params['vnp_TxnRef'];
    let hoadon = await HoaDon.hoadon.findOne({ orderId: orderId }).session(session);
    
    if (!hoadon) {
      await session.abortTransaction();
      session.endSession();
      return res.redirect('https://localhost:3000/thanhcong');
    }

    let magiamgia = null;
    if (hoadon.magiamgia) {
      magiamgia = await MaGiamGia.magiamgia.findOne({
        magiamgia: hoadon.magiamgia
      }).session(session);
    }

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];
    vnp_Params = sortObject(vnp_Params);

    let config = require('config');
    let secretKey = config.get('vnp_HashSecret');

    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require('crypto');
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      if (vnp_Params['vnp_ResponseCode'] === '00') {
        // Payment successful
        hoadon.thanhtoan = true;
        hoadon.trangthai = 'Đã thanh toán';
        
        // Apply discount code if used
        if (magiamgia) {
          magiamgia.soluong = magiamgia.soluong - 1;
          if (magiamgia.isOneTimePerUser && hoadon.userId) {
            const alreadyApplied = magiamgia.appliedUsers.some(id => 
              id && id.toString() === hoadon.userId.toString()
            );
            
            if (!alreadyApplied) {
              magiamgia.appliedUsers.push(hoadon.userId);
            }
          }
      
          await magiamgia.save({ session });
          
          // Xử lý voucher từ điểm thưởng
          await updateRedemptionVoucherStatus(hoadon.magiamgia, hoadon.userId, session);
        }
        
        await hoadon.save({ session });
        
        // Tích điểm và phát voucher - không truyền session vì API gọi qua HTTP
        const pointsResult = await awardPointsForOrder(hoadon);
        
        // Đảm bảo session đã commit trước khi gọi hàm tạo voucher
        await session.commitTransaction();
        session.endSession();
        
        // Gọi sau khi đã commit session để tránh xung đột
        const vouchersResult = await generateAutomaticVouchersForOrder(hoadon.userId);
        
        // Lưu log chi tiết
        console.log(`Thanh toán thành công cho đơn hàng ${orderId}:`, {
          pointsAwarded: pointsResult?.pointsEarned || 0,
          vouchersGenerated: vouchersResult?.length || 0
        });
        
        return res.redirect('https://localhost:3000/thanhcong?success=true');
      } else {
        // Payment failed
        
        // Phân loại sản phẩm thường và Flash Sale
        const regularItems = hoadon.sanpham.filter(item => !item.isFlashSale);
        const flashSaleItems = hoadon.sanpham.filter(item => item.isFlashSale);
        
        // Khôi phục tồn kho cho sản phẩm thường
        if (regularItems.length > 0) {
          await restoreInventory(regularItems, session);
        }
        
        // Khôi phục tồn kho Flash Sale
        if (flashSaleItems.length > 0) {
          await rollbackFlashSalePurchase(flashSaleItems, session);
        }
        
        // Mark the order as payment failed
        hoadon.thanhtoan = false;
        hoadon.trangthai = 'Thanh toán thất bại';
        await hoadon.save({ session });
        
        console.log(`Payment failed for order ${orderId}, inventory restored`);
        
        await session.commitTransaction();
        session.endSession();
        
        return res.redirect('https://localhost:3000/thanhcong');
      }
    } else {
      // Hash verification failed, potential security issue
      console.log('Hash verification failed');
      
      // Nhưng vẫn rollback hàng tồn kho an toàn
      const regularItems = hoadon.sanpham.filter(item => !item.isFlashSale);
      const flashSaleItems = hoadon.sanpham.filter(item => item.isFlashSale);
      
      if (regularItems.length > 0) {
        await restoreInventory(regularItems, session);
      }
      
      if (flashSaleItems.length > 0) {
        await rollbackFlashSalePurchase(flashSaleItems, session);
      }
      
      hoadon.trangthai = 'Lỗi xác thực thanh toán';
      await hoadon.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.redirect('https://localhost:3000/thanhcong');
    }
  } catch (error) {
    // Xử lý ngoại lệ, đảm bảo rollback transaction
    console.error('Lỗi xử lý thanh toán VNPay:', error);
    
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    return res.redirect('https://localhost:3000/thanhcong?error=true');
  }
});


/**
 * Cập nhật trạng thái voucher từ điểm thưởng
 * @param {string} voucherCode - Mã voucher cần cập nhật
 * @param {string} userId - ID người dùng
 * @param {object} session - MongoDB session
 */
async function updateRedemptionVoucherStatus(voucherCode, userId, session) {
 try {
   if (!voucherCode) return;
   
   const query = { voucherCode: voucherCode, status: 'active' };
   
   // Ưu tiên tìm theo userId, sau đó mới đến phone
   if (userId) {
     query.userId = userId;
   }
   
   const redemptionRecord = await RedemptionHistory.findOne(query).session(session);
   
   if (redemptionRecord) {
     redemptionRecord.status = 'used';
     redemptionRecord.usedDate = new Date();
     await redemptionRecord.save({ session });
     console.log(`Đã cập nhật trạng thái voucher điểm thưởng ${voucherCode}`);
   }
 } catch (error) {
   console.error('Lỗi khi cập nhật trạng thái voucher điểm thưởng:', error);
   // Không throw lỗi ở đây, để quá trình thanh toán tiếp tục
 }
}

/**
* Tích điểm thưởng cho đơn hàng thành công
* @param {Object} order - Đối tượng hóa đơn
* @returns {Promise<Object>} Kết quả tích điểm
*/
async function awardPointsForOrder(order) {
 try {
   // Chỉ tích điểm cho user đã đăng nhập (có userId)
   if (!order.userId) {
     console.log('Bỏ qua tích điểm: Đơn hàng của khách vãng lai (không có userId)');
     return null;
   }
   
   const orderTotal = order.tongtien;
   const userId = order.userId;
   
   // Gọi API tích điểm
   const axios = require('axios');
   try {
     const pointsResponse = await axios.post('http://localhost:3005/loyalty/award-points', {
       userId: userId,
       orderId: order._id.toString(),
       orderAmount: orderTotal,
       orderDate: order.ngaymua
     });
     
     if (pointsResponse.data.success) {
       console.log(`Đã tích ${pointsResponse.data.pointsEarned} điểm thưởng cho đơn hàng ${order._id}`);
       
       // Thông báo qua socket cho người dùng về điểm thưởng nếu có socket.io
       if (typeof io !== 'undefined' && userId) {
         io.to(userId.toString()).emit('pointsEarned', {
           userId: userId,
           pointsEarned: pointsResponse.data.pointsEarned,
           newPointsTotal: pointsResponse.data.newPointsTotal,
           tier: pointsResponse.data.tier
         });
         
         // Kiểm tra nếu người dùng vừa lên hạng
         if (pointsResponse.data.previousTier && 
             pointsResponse.data.previousTier !== pointsResponse.data.tier) {
           io.to(userId.toString()).emit('tierUpgrade', {
             userId: userId,
             newTier: pointsResponse.data.tier,
             previousTier: pointsResponse.data.previousTier
           });
         }
       }
       
       return pointsResponse.data;
     }
   } catch (axiosError) {
     console.error('Lỗi khi gọi API tích điểm:', axiosError.message);
   }
   
   return null;
 } catch (error) {
   console.error('Lỗi khi tích điểm thưởng:', error);
   // Không throw lỗi ở đây, để quá trình thanh toán tiếp tục
   return null;
 }
}

/**
* Phát voucher tự động khi đủ điều kiện
 @param {string} userId - ID người dùng
@returns {Promise<Array>} Danh sách voucher đã phát
*/
async function generateAutomaticVouchersForOrder(userId) {
 try {
   if (!userId) {
     console.log('Bỏ qua phát voucher: Đơn hàng của khách vãng lai (không có userId)');
     return [];
   }
   
   const vouchers = [];
   
   // Kiểm tra và phát voucher đơn đầu tiên
   if (await isFirstOrderVoucherEligible(userId)) {
     try {
       const voucher = await generateVoucherForUser(userId, 'first-order');
       if (voucher) {
         vouchers.push(voucher);
         console.log(`Đã phát voucher đơn đầu tiên cho user ${userId}`);
       }
     } catch (error) {
       console.error('Lỗi khi tạo voucher đơn đầu tiên:', error);
     }
   }
   
   // Kiểm tra và phát voucher đơn thứ 3, 6, 9...
   if (await isThirdOrderVoucherEligible(userId)) {
     try {
       const voucher = await generateVoucherForUser(userId, 'third-order');
       if (voucher) {
         vouchers.push(voucher);
         console.log(`Đã phát voucher đơn thứ 3/6/9 cho user ${userId}`);
       }
     } catch (error) {
       console.error('Lỗi khi tạo voucher đơn thứ 3/6/9:', error);
     }
   }
   
   // Gửi thông báo qua socket nếu có voucher mới
   if (vouchers.length > 0 && typeof io !== 'undefined') {
     io.to(userId.toString()).emit('newVouchers', { vouchers });
   }
   
   return vouchers;
 } catch (error) {
   console.error('Lỗi khi phát voucher tự động:', error);
   // Không throw lỗi ở đây, để quá trình thanh toán tiếp tục
   return [];
 }
}

router.get('/checknewvouchers/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin số điện thoại' 
      });
    }
    
    // Get current date
    const currentDate = new Date();
    
    // Find recent vouchers for this user (created in the last hour)
    const oneHourAgo = moment().subtract(1, 'hour').toDate();
    
    const recentVouchers = await MaGiamGia.magiamgia.find({
      magiamgia: { 
        $regex: /^(FIRST|LOYAL|WELCOME|REWARD)/ 
      },
      ngaybatdau: { $gte: oneHourAgo },
      ngayketthuc: { $gte: currentDate },
      soluong: { $gt: 0 },
      $or: [
        { isServerWide: true },
        { appliedUsers: { $nin: [phone] } }
      ]
    }).sort({ ngaybatdau: -1 }).limit(5).lean();
    
    // Transform vouchers for response
    const formattedVouchers = recentVouchers.map(voucher => ({
      code: voucher.magiamgia,
      discount: voucher.sophantram,
      minOrderValue: voucher.minOrderValue || 0,
      expiresAt: moment(voucher.ngayketthuc).format('DD/MM/YYYY'),
      isNew: moment(voucher.ngaybatdau).isAfter(oneHourAgo)
    }));
    
    res.json({
      success: true,
      hasNewVouchers: formattedVouchers.length > 0,
      vouchers: formattedVouchers
    });
  } catch (error) {
    console.error('Error checking new vouchers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Đã xảy ra lỗi khi kiểm tra voucher mới' 
    });
  }
});

router.post('/settrangthai/:idhoadon', async (req, res) => {
  const session = await db.mongoose.startSession();
  session.startTransaction();
  
  try {
    const idhoadon = req.params.idhoadon;
    const { trangthai, thanhtoan, note } = req.body;
    
    const hoadon = await HoaDon.hoadon.findById(idhoadon).session(session);
    
    if (!hoadon) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }
    
    const oldTrangthai = hoadon.trangthai;
    const oldThanhtoan = hoadon.thanhtoan;
    
    const regularItems = hoadon.sanpham.filter(item => !item.isFlashSale);
    const flashSaleItems = hoadon.sanpham.filter(item => item.isFlashSale);
    
    console.log(`Chuyển trạng thái đơn hàng ${idhoadon} từ '${oldTrangthai}' sang '${trangthai}'`);
    console.log(`Thông tin sản phẩm: Regular=${regularItems.length}, FlashSale=${flashSaleItems.length}`);
    console.log('Dữ liệu sản phẩm:', JSON.stringify(hoadon.sanpham));
    
    if (trangthai === 'Hủy Đơn Hàng' && oldTrangthai !== 'Hủy Đơn Hàng') {
      const nonReducedStatuses = ['Thanh toán thất bại', 'Thanh toán hết hạn', 'Hủy Đơn Hàng'];
      const inventoryWasReduced = oldThanhtoan || (!oldThanhtoan && !nonReducedStatuses.includes(oldTrangthai));
      
      console.log(`Kiểm tra cần hoàn tồn kho không: inventoryWasReduced=${inventoryWasReduced}`);
      
      if (inventoryWasReduced) {
        console.log('Bắt đầu quá trình hoàn tồn kho...');
        
        if (regularItems.length > 0) {
          console.log(`Đang khôi phục ${regularItems.length} sản phẩm thường...`);
          const restored = await restoreInventory(regularItems, session);
          console.log(`Kết quả khôi phục: ${restored ? restored.length : 0} sản phẩm đã được khôi phục`);
        }
        
        if (flashSaleItems.length > 0) {
          console.log(`Đang khôi phục ${flashSaleItems.length} sản phẩm Flash Sale...`);
          const flashResult = await rollbackFlashSalePurchase(flashSaleItems, session);
          console.log(`Kết quả khôi phục Flash Sale: ${flashResult.success ? 'Thành công' : 'Thất bại'}`);
        }
      }
    }
    else if ((trangthai === 'Thanh toán thất bại' || trangthai === 'Thanh toán hết hạn') && 
             !['Thanh toán thất bại', 'Thanh toán hết hạn', 'Hủy Đơn Hàng'].includes(oldTrangthai)) {
      
      const nonReducedStatuses = ['Thanh toán thất bại', 'Thanh toán hết hạn', 'Hủy Đơn Hàng'];
      const inventoryWasReduced = oldThanhtoan || (!oldThanhtoan && !nonReducedStatuses.includes(oldTrangthai));
      
      console.log(`Kiểm tra cần hoàn tồn kho không (thất bại/hết hạn): inventoryWasReduced=${inventoryWasReduced}`);
      
      if (inventoryWasReduced) {
        console.log('Bắt đầu quá trình hoàn tồn kho (do thanh toán thất bại/hết hạn)...');
        
        if (regularItems.length > 0) {
          const restored = await restoreInventory(regularItems, session);
          console.log(`Kết quả khôi phục: ${restored ? restored.length : 0} sản phẩm đã được khôi phục`);
        }
        
        if (flashSaleItems.length > 0) {
          const flashResult = await rollbackFlashSalePurchase(flashSaleItems, session);
          console.log(`Kết quả khôi phục Flash Sale: ${flashResult.success ? 'Thành công' : 'Thất bại'}`);
        }
      }
    }
    else if ((oldTrangthai === 'Đã nhận' || oldTrangthai === 'Hoàn thành') && 
             trangthai === 'Trả hàng/Hoàn tiền') {
      
      console.log('Bắt đầu quá trình hoàn tồn kho (do trả hàng)...');
      
      if (regularItems.length > 0) {
        const restored = await restoreInventory(regularItems, session);
        console.log(`Kết quả khôi phục (trả hàng): ${restored ? restored.length : 0} sản phẩm đã được khôi phục`);
      }
      
      if (flashSaleItems.length > 0) {
        const flashResult = await rollbackFlashSalePurchase(flashSaleItems, session);
        console.log(`Kết quả khôi phục Flash Sale (trả hàng): ${flashResult.success ? 'Thành công' : 'Thất bại'}`);
      }
    }
    else if (['Thanh toán thất bại', 'Thanh toán hết hạn', 'Hủy Đơn Hàng'].includes(oldTrangthai) && 
             ['Đã thanh toán', 'Đang xử lý'].includes(trangthai) && 
             (thanhtoan === true || trangthai === 'Đã thanh toán')) {
      
      if (regularItems.length > 0) {
        try {
          console.log('Bắt đầu quá trình giảm tồn kho (do kích hoạt lại đơn hàng)...');
          await reduceInventory(regularItems, session);
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ 
            message: 'Không thể thanh toán lại đơn hàng do tồn kho không đủ',
            error: error.message
          });
        }
      }
      
      if (flashSaleItems.length > 0) {
        try {
          console.log('Bắt đầu quá trình xử lý Flash Sale (do kích hoạt lại đơn hàng)...');
          const processResult = await processFlashSaleItems(flashSaleItems, session);
          
          if (!processResult.success) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
              message: 'Không thể thanh toán lại đơn hàng Flash Sale: ' + processResult.message,
              isFlashSaleError: true
            });
          }
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ 
            message: 'Không thể thanh toán lại đơn hàng Flash Sale: ' + error.message,
            isFlashSaleError: true
          });
        }
      }
    }
    
    hoadon.trangthai = trangthai;
    if (typeof thanhtoan === 'boolean') {
      hoadon.thanhtoan = thanhtoan;
    }
    
    if (!hoadon.statusHistory) {
      hoadon.statusHistory = [];
    }
    
    hoadon.statusHistory.push({
      from: oldTrangthai,
      to: trangthai,
      thanhtoan: hoadon.thanhtoan,
      date: new Date(),
      note: note || '',
      inventoryUpdated: true
    });
    
    if (['Đã thanh toán', 'Hủy Đơn Hàng', 'Thanh toán thất bại'].includes(trangthai) && 
        global.paymentTimeouts && global.paymentTimeouts[hoadon._id.toString()]) {
      clearTimeout(global.paymentTimeouts[hoadon._id.toString()]);
      delete global.paymentTimeouts[hoadon._id.toString()];
    }
    
    await hoadon.save({ session });
    await session.commitTransaction();
    session.endSession();
    
    const io = getIo();
    if (io) {
      const eventData = {
        orderId: hoadon._id,
        maHDL: hoadon.maHDL,
        oldStatus: oldTrangthai,
        newStatus: trangthai,
        paymentStatus: hoadon.thanhtoan,
        timestamp: new Date().toISOString()
      };
      
      // Emit cho user cụ thể
      if (hoadon.userId) {
        console.log(`📤 Emitting to user_${hoadon.userId}:`, eventData);
        io.of('/store').to(`user_${hoadon.userId}`).emit('order_status_changed', eventData);
      }
      
      // Emit broadcast cho tất cả
      console.log('📢 Broadcasting order update:', eventData);
      io.of('/store').emit('order_status_updated', {
        orderId: hoadon._id,
        status: trangthai,
        paymentStatus: hoadon.thanhtoan,
        timestamp: new Date().toISOString()
      });
      
      // Emit signal để refresh list (optional)
      io.of('/store').emit('order_list_updated', {
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Socket.io instance not available');
    }
    
    res.json(hoadon);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
    res.status(500).json({ 
      message: 'Lỗi khi cập nhật trạng thái đơn hàng', 
      error: error.message 
    });
  }
});

// Trong route getchitiethd/:idhoadon của file HoaDonRoutes.js
router.get('/getchitiethd/:idhoadon', async (req, res) => {
  try {
    const idhoadon = req.params.idhoadon;

    const hoadon = await HoaDon.hoadon.findOne({ _id: idhoadon });
    if (!hoadon) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }
    
    // Tính tổng từ sản phẩm
    const subtotal = hoadon.sanpham.reduce((sum, item) => sum + (item.price * item.soluong), 0);
    
    // Sử dụng product snapshots nếu có, hoặc truy vấn database nếu không
    const hoadonsanpham = await Promise.all(
      hoadon.sanpham.map(async sanpham => {
        // Nếu có product snapshot, sử dụng nó
        if (sanpham.productSnapshot && sanpham.productSnapshot.name) {
          return {
            idsp: sanpham.idsp,
            namesanpham: sanpham.productSnapshot.name,
            dungluong: sanpham.productSnapshot.dungluongName || 'Unknown Size',
            mausac: sanpham.productSnapshot.mausacName || sanpham.mausac,
            soluong: sanpham.soluong,
            price: sanpham.price,
            image: sanpham.productSnapshot.image
          };
        } 
        // Ngược lại, truy vấn database
        else {
          const sanpham1 = await SanPham.ChitietSp.findById(sanpham.idsp);
          const dungluong = await DungLuong.dungluong.findById(sanpham.dungluong);
          return {
            idsp: sanpham.idsp,
            namesanpham: sanpham1 ? sanpham1.name : 'Unknown Product',
            dungluong: dungluong ? dungluong.name : 'Unknown Size',
            mausac: sanpham.mausac,
            soluong: sanpham.soluong,
            price: sanpham.price,
            image: sanpham1 ? sanpham1.image : null
          };
        }
      })
    );
    
    const hoadonjson = {
      _id: hoadon._id,
      maHDL: hoadon.maHDL,
      nguoinhan: hoadon.nguoinhan,
      name: hoadon.name,
      phone: hoadon.phone,
      sex: hoadon.sex,
      address: hoadon.address,
      ghichu: hoadon.ghichu || '',
      magiamgia: hoadon.magiamgia || '',
      ngaymua: moment(hoadon.ngaymua).format('DD/MM/YYYY'),
      thanhtoan: hoadon.thanhtoan,
      trangthai: hoadon.trangthai,
      tongtien: hoadon.tongtien,
      phivanchuyen: hoadon.phivanchuyen || 0,  // Trả về phí vận chuyển
      giamgia: hoadon.giamgia || 0,            // Trả về số tiền giảm giá
      subtotal: subtotal,                       // Trả về tổng tiền sản phẩm
      hoadonsanpham: hoadonsanpham
    };
    
    res.json(hoadonjson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin hóa đơn' });
  }
});

router.get('/getdoanhthu', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: 'Vui lòng nhập ngày bắt đầu và ngày kết thúc.' })
    }

    const start = moment(startDate, 'YYYY-MM-DD').startOf('day')
    const end = moment(endDate, 'YYYY-MM-DD').endOf('day')

    const hoadons = await HoaDon.hoadon.find({
      ngaymua: { $gte: start.toDate(), $lte: end.toDate()},
      trangthai: { $in: ['Hoàn thành', 'Đã nhận'] }
    })

    let doanhthuTheoNgay = {}
    let current = moment(start)

    while (current.isSameOrBefore(end, 'day')) {
      doanhthuTheoNgay[current.format('DD/MM/YYYY')] = 0
      current.add(1, 'days')
    }

    hoadons.forEach(hd => {
      const ngay = moment(hd.ngaymua).format('DD/MM/YYYY')
      doanhthuTheoNgay[ngay] += hd.tongtien
    })

    const doanhthuArray = Object.keys(doanhthuTheoNgay).map(ngay => ({
      ngay,
      doanhthu: doanhthuTheoNgay[ngay]
    }))

    res.json(doanhthuArray)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Lỗi server!' })
  }
})
router.get('/product-sales-trend', async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let matchQuery = {
      ngaymua: { $gte: start, $lte: end },
      trangthai: { $in: ['Đã thanh toán', 'Hoàn thành','Đã nhận'] }
    };

    // Add product filter if provided
    if (productId) {
      matchQuery["sanpham.idsp"] = new db.mongoose.Types.ObjectId(productId);
    }

    const result = await HoaDon.hoadon.aggregate([
      { $match: matchQuery },
      { $unwind: "$sanpham" },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$ngaymua" } },
          productId: "$sanpham.idsp",
          quantity: "$sanpham.soluong",
          revenue: { $multiply: ["$sanpham.soluong", "$sanpham.price"] }
        }
      },
      {
        $group: {
          _id: {
            date: "$date",
            productId: "$productId"
          },
          totalQuantity: { $sum: "$quantity" },
          totalRevenue: { $sum: "$revenue" }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Transform the data for easier frontend consumption
    const transformedData = await Promise.all(
      result.map(async (item) => {
        const product = await SanPham.ChitietSp.findById(item._id.productId);
        return {
          date: item._id.date,
          productId: item._id.productId,
          productName: product ? product.name : "Không rõ",
          quantity: item.totalQuantity,
          revenue: item.totalRevenue
        };
      })
    );

    res.json(transformedData);
  } catch (err) {
    console.error("Error in product-sales-trend:", err);
    res.status(500).json({ message: "Lỗi xu hướng bán sản phẩm", error: err.message });
  }
});

// New route for product category statistics
// Fixed category-stats route in HoaDonRoutes.js
// Fixed category-stats route in HoaDonRoutes.js
router.get('/category-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // First, get all products sold in the period
    const soldProducts = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end },
          trangthai: { $in: ['Đã thanh toán', 'Hoàn thành', 'Đã nhận'] }
        }
      },
      { $unwind: "$sanpham" },
      {
        $group: {
          _id: "$sanpham.idsp",
          totalSold: { $sum: "$sanpham.soluong" },
          totalRevenue: { $sum: { $multiply: ["$sanpham.soluong", "$sanpham.price"] } }
        }
      }
    ]);

    // If no data, return empty array
    if (soldProducts.length === 0) {
      return res.json([]);
    }

    // Get category info for each product
    const categoryStats = {};
    
    for (const product of soldProducts) {
      try {
        if (!product || !product._id) continue;

        const productDetails = await SanPham.ChitietSp.findById(product._id);
        
        // Skip if product not found or has no category
        if (!productDetails || !productDetails.idloaisp) continue;
        
        const loaisp = await LoaiSP.findById(productDetails.idloaisp);
        if (!loaisp) continue;
        
        const categoryId = loaisp._id.toString();
        const categoryName = loaisp.name || "Không rõ danh mục";
        
        if (!categoryStats[categoryId]) {
          categoryStats[categoryId] = {
            categoryId,
            categoryName,
            productCount: 0,
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        
        categoryStats[categoryId].productCount++;
        categoryStats[categoryId].totalQuantity += product.totalSold || 0;
        categoryStats[categoryId].totalRevenue += product.totalRevenue || 0;
      } catch (err) {
        console.error(`Error processing product ${product._id}:`, err);
      }
    }

    // Convert to array and sort by revenue
    const sortedStats = Object.values(categoryStats).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // If no categories were found, return empty array
    if (sortedStats.length === 0) {
      return res.json([]);
    }

    // Calculate percentages
    const totalRevenue = sortedStats.reduce((sum, category) => sum + category.totalRevenue, 0);
    const totalQuantity = sortedStats.reduce((sum, category) => sum + category.totalQuantity, 0);

    const statsWithPercentages = sortedStats.map(category => ({
      ...category,
      revenuePercentage: totalRevenue > 0 ? ((category.totalRevenue / totalRevenue) * 100).toFixed(2) : "0",
      quantityPercentage: totalQuantity > 0 ? ((category.totalQuantity / totalQuantity) * 100).toFixed(2) : "0"
    }));

    res.json(statsWithPercentages);
  } catch (err) {
    console.error("Error in category-stats:", err);
    res.status(500).json({ message: "Lỗi thống kê danh mục", error: err.message });
  }
});
router.get('/top-products', async (req, res) => {
  try {
    const { startDate, endDate, limit = 5 } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // First get the total sales for percentage calculation
    const totalSales = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end },
          trangthai: { $in: ['Đã thanh toán', 'Hoàn thành','Đã nhận'] }
        }
      },
      { $unwind: "$sanpham" },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$sanpham.soluong" },
          totalRevenue: { 
            $sum: { $multiply: ["$sanpham.soluong", "$sanpham.price"] }
          }
        }
      }
    ]);

    const totals = totalSales[0] || { totalQuantity: 0, totalRevenue: 0 };

    // Get top products with detailed information
    const result = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end },
          trangthai: { $in: ['Đã thanh toán', 'Hoàn thành','Đã nhận'] }
        }
      },
      { $unwind: "$sanpham" },
      {
        $group: {
          _id: {
            productId: "$sanpham.idsp",
            dungluong: "$sanpham.dungluong",
            mausac: "$sanpham.idmausac"
          },
          soluong: { $sum: "$sanpham.soluong" },
          doanhthu: {
            $sum: { $multiply: ["$sanpham.soluong", "$sanpham.price"] }
          },
          averagePrice: { $avg: "$sanpham.price" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: "$_id.productId",
          dungluong: "$_id.dungluong",
          mausac: "$_id.mausac",
          soluong: 1,
          doanhthu: 1,
          averagePrice: 1,
          orderCount: 1,
          percentOfTotalSales: { 
            $multiply: [{ $divide: ["$soluong", totals.totalQuantity || 1] }, 100] 
          },
          percentOfTotalRevenue: { 
            $multiply: [{ $divide: ["$doanhthu", totals.totalRevenue || 1] }, 100] 
          }
        }
      },
      { $sort: { soluong: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Properly populate product data
    const populatedData = await Promise.all(result.map(async (item) => {
      try {
        const product = await SanPham.ChitietSp.findById(item._id);
        const dungluong = await DungLuong.dungluong.findById(item.dungluong);
        
        return {
          ...item,
          tensp: product ? product.name : "Không rõ",
          dungluongName: dungluong ? dungluong.name : "N/A",
          percentOfTotalSales: item.percentOfTotalSales.toFixed(2),
          percentOfTotalRevenue: item.percentOfTotalRevenue.toFixed(2)
        };
      } catch (err) {
        console.error(`Error populating product ${item._id}:`, err);
        return {
          ...item,
          tensp: "Không rõ",
          dungluongName: "N/A",
          percentOfTotalSales: item.percentOfTotalSales.toFixed(2),
          percentOfTotalRevenue: item.percentOfTotalRevenue.toFixed(2)
        };
      }
    }));

    res.json(populatedData);
  } catch (err) {
    console.error("Error in top-products:", err);
    res.status(500).json({ message: "Lỗi top sản phẩm", error: err.message });
  }
});

// Similar enhancement for least-products route
router.get('/least-products', async (req, res) => {
  try {
    const { startDate, endDate, limit = 5 } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get total sales for percentage calculation
    const totalSales = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end },
          trangthai: { $in: ['Đã thanh toán', 'Hoàn thành','Đã nhận'] }
        }
      },
      { $unwind: "$sanpham" },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$sanpham.soluong" },
          totalRevenue: { 
            $sum: { $multiply: ["$sanpham.soluong", "$sanpham.price"] }
          }
        }
      }
    ]);

    const totals = totalSales[0] || { totalQuantity: 0, totalRevenue: 0 };

    // Get detailed data for least selling products
    const result = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end },
          trangthai: { $in: ['Đã thanh toán', 'Hoàn thành','Đã nhận'] }
        }
      },
      { $unwind: "$sanpham" },
      {
        $group: {
          _id: {
            productId: "$sanpham.idsp",
            dungluong: "$sanpham.dungluong",
            mausac: "$sanpham.idmausac"
          },
          soluong: { $sum: "$sanpham.soluong" },
          doanhthu: {
            $sum: { $multiply: ["$sanpham.soluong", "$sanpham.price"] }
          },
          averagePrice: { $avg: "$sanpham.price" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: "$_id.productId",
          dungluong: "$_id.dungluong",
          mausac: "$_id.mausac",
          soluong: 1,
          doanhthu: 1,
          averagePrice: 1,
          orderCount: 1,
          percentOfTotalSales: { 
            $multiply: [{ $divide: ["$soluong", totals.totalQuantity || 1] }, 100] 
          },
          percentOfTotalRevenue: { 
            $multiply: [{ $divide: ["$doanhthu", totals.totalRevenue || 1] }, 100] 
          }
        }
      },
      { $sort: { soluong: 1 } },
      { $limit: parseInt(limit) }
    ]);

    // Properly populate product data
    const populatedData = await Promise.all(result.map(async (item) => {
      try {
        const product = await SanPham.ChitietSp.findById(item._id);
        const dungluong = await DungLuong.dungluong.findById(item.dungluong);
        
        return {
          ...item,
          tensp: product ? product.name : "Không rõ",
          dungluongName: dungluong ? dungluong.name : "N/A",
          percentOfTotalSales: item.percentOfTotalSales.toFixed(2),
          percentOfTotalRevenue: item.percentOfTotalRevenue.toFixed(2)
        };
      } catch (err) {
        console.error(`Error populating product ${item._id}:`, err);
        return {
          ...item,
          tensp: "Không rõ",
          dungluongName: "N/A",
          percentOfTotalSales: item.percentOfTotalSales.toFixed(2),
          percentOfTotalRevenue: item.percentOfTotalRevenue.toFixed(2)
        };
      }
    }));

    res.json(populatedData);
  } catch (err) {
    console.error("Error in least-products:", err);
    res.status(500).json({ message: "Lỗi sản phẩm ít bán", error: err.message });
  }
});


// Cập nhật route trung bình sản phẩm mỗi đơn
// Fixed avg-products-per-order route in HoaDonRoutes.js
router.get('/avg-products-per-order', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Thống kê cơ bản
    const basicStats = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end },
          trangthai: { $in: ['Đã thanh toán', 'Hoàn thành','Đã nhận'] }
        }
      },
      {
        $project: {
          tongSL: {
            $sum: "$sanpham.soluong"
          },
          orderTime: "$ngaymua",
          status: "$trangthai"
        }
      },
      {
        $group: {
          _id: null,
          avgSP: { $avg: "$tongSL" },
          totalDon: { $sum: 1 },
          totalItems: { $sum: "$tongSL" },
          maxItems: { $max: "$tongSL" },
          orders: { $push: { items: "$tongSL", time: "$orderTime", status: "$status" } }
        }
      }
    ]);
    
    // If no data, return default values
    if (basicStats.length === 0) {
      return res.json({ 
        avgSP: 0, 
        totalDon: 0,
        totalItems: 0,
        maxItems: 0,
        medianItems: 0,
        orderSizes: {
          single: 0,
          small: 0,
          medium: 0,
          large: 0,
          extraLarge: 0
        },
        timeOfDay: {
          morning: 0,
          afternoon: 0,
          evening: 0,
          night: 0
        },
        busiest: {
          day: 'N/A',
          timeOfDay: 'N/A'
        },
        returnsPercent: '0.0'
      });
    }
    
    const stats = basicStats[0];
    
    // Safety check for null stats
    if (!stats) {
      return res.json({ 
        avgSP: 0, 
        totalDon: 0,
        totalItems: 0
      });
    }
    
    // Ensure orders array exists
    if (!stats.orders || !Array.isArray(stats.orders)) {
      stats.orders = [];
    }
    
    // Ensure totalDon and totalItems are numbers
    stats.totalDon = stats.totalDon || 0;
    stats.totalItems = stats.totalItems || 0;
    
    // Tìm median (trung vị) số sản phẩm mỗi đơn
    const itemsPerOrder = stats.orders.map(order => order.items).sort((a, b) => a - b);
    const medianItems = itemsPerOrder.length % 2 === 0 
      ? (itemsPerOrder[itemsPerOrder.length/2 - 1] + itemsPerOrder[itemsPerOrder.length/2]) / 2
      : itemsPerOrder[Math.floor(itemsPerOrder.length/2)];
    
    // Phân loại đơn hàng theo kích thước
    const orderSizes = {
      single: 0,    // 1 sản phẩm
      small: 0,     // 2-3 sản phẩm
      medium: 0,    // 4-5 sản phẩm
      large: 0,     // 6-10 sản phẩm
      extraLarge: 0 // >10 sản phẩm
    };
    
    itemsPerOrder.forEach(count => {
      if (count === 1) orderSizes.single++;
      else if (count <= 3) orderSizes.small++;
      else if (count <= 5) orderSizes.medium++;
      else if (count <= 10) orderSizes.large++;
      else orderSizes.extraLarge++;
    });
    
    // Phân loại theo thời gian trong ngày
    const timeOfDay = {
      morning: 0,    // 6-11
      afternoon: 0,  // 12-17
      evening: 0,    // 18-21
      night: 0       // 22-5
    };
    
    stats.orders.forEach(order => {
      if (!order.time) return;
      const hour = new Date(order.time).getHours();
      if (hour >= 6 && hour < 12) timeOfDay.morning++;
      else if (hour >= 12 && hour < 18) timeOfDay.afternoon++;
      else if (hour >= 18 && hour < 22) timeOfDay.evening++;
      else timeOfDay.night++;
    });
    
    // Xác định ngày bận rộn nhất
    const ordersByDay = {};
    stats.orders.forEach(order => {
      if (!order.time) return;
      const date = moment(order.time).format('DD/MM/YYYY');
      ordersByDay[date] = (ordersByDay[date] || 0) + 1;
    });
    
    let busiestDay = { day: 'N/A', count: 0 };
    Object.entries(ordersByDay).forEach(([day, count]) => {
      if (count > busiestDay.count) {
        busiestDay = { day, count };
      }
    });
    
    // Xác định thời gian phổ biến nhất
    let busiestTime = { timeOfDay: 'N/A', count: 0 };
    Object.entries(timeOfDay).forEach(([timeOfDay, count]) => {
      if (count > busiestTime.count) {
        const timeLabels = {
          morning: 'Sáng (6h-12h)',
          afternoon: 'Chiều (12h-18h)',
          evening: 'Tối (18h-22h)',
          night: 'Đêm (22h-6h)'
        };
        busiestTime = { timeOfDay: timeLabels[timeOfDay] || 'N/A', count };
      }
    });
    
    // Tính phần trăm đơn hàng bị trả lại hoặc hủy
    const returnOrders = stats.orders.filter(order => 
      order.status === 'Hủy Đơn Hàng' || 
      order.status === 'Trả hàng/Hoàn tiền'
    ).length;
    
    const returnsPercent = ((returnOrders / (stats.totalDon || 1)) * 100).toFixed(1);
    
    const response = {
      avgSP: Number((stats.avgSP || 0).toFixed(2)),
      totalDon: stats.totalDon || 0,
      totalItems: stats.totalItems || 0,
      maxItems: stats.maxItems || 0,
      medianItems: Number((medianItems || 0).toFixed(2)),
      orderSizes,
      timeOfDay,
      busiest: {
        day: busiestDay.day,
        timeOfDay: busiestTime.timeOfDay
      },
      returnsPercent
    };
    
    res.json(response);
  } catch (err) {
    console.error("Error in avg-products-per-order:", err);
    res.status(500).json({ 
      message: "Lỗi tính trung bình sản phẩm", 
      error: err.message,
      // Provide default values
      avgSP: 0,
      totalDon: 0,
      totalItems: 0
    });
  }
});

// Cập nhật route thống kê số điện thoại khách hàng
// Fixed top-phone route in HoaDonRoutes.js
router.get('/top-phone', async (req, res) => {
  try {
    const { startDate, endDate, limit = 5 } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Lấy thông tin cơ bản khách hàng mua nhiều
    const basicStats = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end },
          trangthai: { $in: ['Đã thanh toán', 'Hoàn thành', 'Đã nhận'] }
        }
      },
      {
        $group: {
          _id: "$phone",
          soDon: { $sum: 1 },
          tongTien: { $sum: "$tongtien" },
          lastOrderDate: { $max: "$ngaymua" },
          orders: { $push: { date: "$ngaymua", value: "$tongtien" } }
        }
      },
      { $sort: { soDon: -1, tongTien: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // If no data, return empty array
    if (!basicStats || basicStats.length === 0) {
      return res.json([]);
    }

    // Cố gắng bổ sung thêm thông tin khách hàng nếu có thể
    const enhancedData = await Promise.all(basicStats.map(async (customer) => {
      try {
        if (!customer || !customer._id) {
          return {
            _id: 'Không rõ',
            soDon: 0,
            tongTien: 0,
            lastOrder: 'N/A',
            avgOrdersPerMonth: 0,
            orderHistory: []
          };
        }
        
        // Tìm thông tin khách hàng từ model User nếu có
        let userInfo = null;
        try {
          userInfo = await User.User.findOne({ phone: customer._id });
        } catch (userErr) {
          console.error(`Error finding user with phone ${customer._id}:`, userErr);
        }
        
        // Format lại mảng lịch sử đơn hàng để hiển thị biểu đồ
        const orderHistory = Array.isArray(customer.orders) 
          ? customer.orders
              .filter(order => order && order.date instanceof Date) // Filter out invalid entries
              .map(order => ({
                date: moment(order.date).format('DD/MM/YYYY'),
                value: order.value || 0
              }))
              .sort((a, b) => new Date(a.date) - new Date(b.date))
          : [];
        
        const lastOrder = customer.lastOrderDate instanceof Date 
          ? moment(customer.lastOrderDate).format('DD/MM/YYYY') 
          : 'N/A';
        
        return {
          ...customer,
          customerName: userInfo ? userInfo.username : null,
          lastOrder,
          // Tính trung bình đơn hàng mỗi tháng
          avgOrdersPerMonth: calculateAvgOrdersPerMonth(customer.orders),
          orderHistory
        };
      } catch (err) {
        console.error(`Error enhancing customer data for ${customer ? customer._id : 'unknown'}:`, err);
        // Return basic data if enhancement fails
        return {
          ...customer,
          lastOrder: customer.lastOrderDate instanceof Date 
            ? moment(customer.lastOrderDate).format('DD/MM/YYYY') 
            : 'N/A',
          avgOrdersPerMonth: 0,
          orderHistory: []
        };
      }
    }));

    res.json(enhancedData);
  } catch (err) {
    console.error("Error in top-phone:", err);
    res.status(500).json({ message: "Lỗi thống kê SDT", error: err.message });
  }
});

// Hàm hỗ trợ tính trung bình đơn hàng mỗi tháng
function calculateAvgOrdersPerMonth(orders) {
  if (!orders || !Array.isArray(orders) || orders.length === 0) return 0;
  
  // Lọc đơn hàng có ngày hợp lệ
  const validOrders = orders.filter(order => order && order.date instanceof Date);
  if (validOrders.length === 0) return 0;
  
  // Lấy tháng đầu tiên và tháng cuối cùng
  try {
    const dates = validOrders.map(order => new Date(order.date));
    if (dates.length === 0) return 0;
    
    const firstDate = new Date(Math.min(...dates));
    const lastDate = new Date(Math.max(...dates));
    
    // Kiểm tra ngày hợp lệ
    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) return 0;
    
    // Tính số tháng giữa hai ngày
    const monthsDiff = 
      (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
      (lastDate.getMonth() - firstDate.getMonth()) + 1;
    
    // Tránh trường hợp chia cho 0
    if (monthsDiff <= 0) return validOrders.length;
    
    // Nếu chỉ trong một tháng, trả về số lượng đơn hàng
    if (monthsDiff <= 1) return validOrders.length;
    
    // Nếu nhiều tháng, tính trung bình
    return (validOrders.length / monthsDiff).toFixed(1);
  } catch (error) {
    console.error("Error calculating average orders per month:", error);
    return 0;
  }
}

// Hàm hỗ trợ tính trung bình đơn hàng mỗi tháng


router.post('/timkiemhoadon', async (req, res) => {
  try {
    const { phone } = req.body
    const hoadon = await HoaDon.hoadon.find({ phone })
    if (!hoadon || hoadon.length === 0) {
      return res.json({
        message: 'Không có đơn hàng tương ứng với số điện thoại'
      })
    }
    res.json(hoadon)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Lỗi khi tìm kiếm hóa đơn' })
  }
})
router.post('/gethoadonuser', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu userId' });
    }

    const hoadons = await HoaDon.hoadon.find({ userId, isDeleted: { $ne: true } }).sort({ ngaymua: -1 });

    if (!hoadons || hoadons.length === 0) {
      return res.status(200).json({
        message: 'Người dùng chưa có đơn hàng nào',
        hoadons: []
      });
    }

    // Process orders to use product snapshots
    const processedHoadons = await Promise.all(hoadons.map(async (hoadon) => {
      // Include additional order detail fields as needed
      const sanitizedHoadon = {
        _id: hoadon._id,
        maHDL: hoadon.maHDL,
        name: hoadon.name,
        phone: hoadon.phone,
        nguoinhan: hoadon.nguoinhan,
        ngaymua: moment(hoadon.ngaymua).format('DD/MM/YYYY'),
        trangthai: hoadon.trangthai,
        tongtien: hoadon.tongtien,
        thanhtoan: hoadon.thanhtoan,
        // Process sanpham array to use snapshots
        sanpham: await Promise.all(hoadon.sanpham.map(async item => {
          // If we have a product snapshot, use it
          if (item.productSnapshot && item.productSnapshot.name) {
            return {
              idsp: item.idsp,
              name: item.productSnapshot.name,
              image: item.productSnapshot.image,
              dungluong: item.productSnapshot.dungluongName,
              mausac: item.productSnapshot.mausacName || item.mausac,
              soluong: item.soluong,
              price: item.price
            };
          } 
          // Otherwise fall back to database lookup
          else {
            const sanpham1 = await SanPham.ChitietSp.findById(item.idsp);
            const dungluong = await DungLuong.dungluong.findById(item.dungluong);
            return {
              idsp: item.idsp,
              name: sanpham1 ? sanpham1.name : 'Sản phẩm không xác định',
              image: sanpham1 ? sanpham1.image : null,
              dungluong: dungluong ? dungluong.name : 'Unknown Size',
              mausac: item.mausac,
              soluong: item.soluong,
              price: item.price
            };
          }
        }))
      };
      return sanitizedHoadon;
    }));

    res.json({ hoadons: processedHoadons });
  } catch (error) {
    console.error('Lỗi khi lấy đơn hàng theo user:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy hóa đơn người dùng' });
  }
});

router.get('/order-success-rate', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const stats = await HoaDon.hoadon.aggregate([
      {
        $match: {
          ngaymua: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: "$trangthai",
          count: { $sum: 1 },
          totalAmount: { $sum: "$tongtien" }
        }
      }
    ]);

    // Tính tổng số đơn hàng và tổng doanh thu
    const totalOrders = stats.reduce((sum, item) => sum + item.count, 0);
    const totalRevenue = stats.reduce((sum, item) => sum + item.totalAmount, 0);

    // Phân loại trạng thái đơn hàng
    const statusStats = {
      success: { count: 0, amount: 0, rate: 0 },
      pending: { count: 0, amount: 0, rate: 0 },
      failed: { count: 0, amount: 0, rate: 0 },
      cancelled: { count: 0, amount: 0, rate: 0 }
    };

    stats.forEach(item => {
      const status = item._id;
      const count = item.count;
      const amount = item.totalAmount;

      if (status === 'Đã thanh toán' || status === 'Hoàn thành' || status === 'Đã nhận') {
        statusStats.success.count += count;
        statusStats.success.amount += amount;
      } else if (status === 'Đang xử lý') {
        statusStats.pending.count += count;
        statusStats.pending.amount += amount;
      } else if (status === 'Thanh toán thất bại' || status === 'Thanh toán hết hạn') {
        statusStats.failed.count += count;
        statusStats.failed.amount += amount;
      } else if (status === 'Hủy Đơn Hàng') {
        statusStats.cancelled.count += count;
        statusStats.cancelled.amount += amount;
      }
    });

    // Tính tỷ lệ phần trăm
    Object.keys(statusStats).forEach(key => {
      statusStats[key].rate = ((statusStats[key].count / totalOrders) * 100).toFixed(2);
    });

    res.json({
      totalOrders,
      totalRevenue,
      statusStats,
      dailyStats: await getDailyOrderStats(start, end)
    });
  } catch (err) {
    console.error("Error in order-success-rate:", err);
    res.status(500).json({ message: "Lỗi thống kê tỷ lệ đơn hàng", error: err.message });
  }
});

// Helper function to get daily order statistics
async function getDailyOrderStats(start, end) {
  const dailyStats = await HoaDon.hoadon.aggregate([
    {
      $match: {
        ngaymua: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$ngaymua" } },
          status: "$trangthai"
        },
        count: { $sum: 1 },
        amount: { $sum: "$tongtien" }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        totalOrders: { $sum: "$count" },
        totalAmount: { $sum: "$amount" },
        statusBreakdown: {
          $push: {
            status: "$_id.status",
            count: "$count",
            amount: "$amount"
          }
        }
      }
    },
    {
      $sort: { "_id": 1 }
    }
  ]);

  return dailyStats;
}

module.exports = router
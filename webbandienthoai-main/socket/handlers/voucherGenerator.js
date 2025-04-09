// utils/voucherGenerator.js - Fixed version

const moment = require('moment');
const MaGiamGia = require('../../models/MaGiamGiaModel');
const HoaDon = require('../../models/HoaDonModel');
const User = require('../../models/user.model');

/**
 * Tạo voucher ngẫu nhiên cho người dùng đã đăng nhập (yêu cầu userId)
 * @param {string} userId - ID người dùng đã đăng nhập
 * @param {string} reason - Lý do tạo voucher (first-order, third-order, new-account)
 * @param {number} expiryDays - Số ngày đến khi voucher hết hạn
 * @returns {Promise<object>} - Đối tượng voucher đã tạo
 */
async function generateVoucherForUser(userId, reason = 'reward', expiryDays = 30) {
  try {
    // Đảm bảo rằng chỉ xử lý userId hợp lệ
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Không thể tạo voucher: userId không hợp lệ', userId);
      throw new Error('userId không hợp lệ');
    }

    console.log(`Đang tạo voucher ${reason} cho userId ${userId}`);

    // Lấy thông tin người dùng từ bảng User
    const user = await User.User.findById(userId);
    if (!user) {
      console.error(`Không tìm thấy thông tin người dùng với userId ${userId}`);
      throw new Error('Không tìm thấy người dùng');
    }

    // Lấy thông tin liên hệ của người dùng
    const phone = user.phone;
    const email = user.email;

    if (!phone && !email) {
      console.error(`Người dùng ${userId} không có thông tin liên hệ (điện thoại hoặc email)`);
      throw new Error('Người dùng không có thông tin liên hệ');
    }

    // Kiểm tra xem người dùng đã có bao nhiêu voucher còn hiệu lực
    const queryConditions = [];
    if (phone) queryConditions.push({ intended_users: phone });
    if (email) queryConditions.push({ intended_users: email });

    const activeVouchers = await MaGiamGia.magiamgia.find({
      ngayketthuc: { $gte: new Date() },
      soluong: { $gt: 0 },
      $or: queryConditions,
      isDeleted: { $ne: true }
    });

    // Giới hạn số lượng voucher người dùng có thể có
    const userSpecificVouchers = activeVouchers.filter(v => !v.isServerWide);
    const VOUCHER_LIMIT = 5; // Tối đa 5 voucher cá nhân cùng lúc
    
    if (userSpecificVouchers.length >= VOUCHER_LIMIT && reason !== 'new-account') {
      console.log(`Người dùng ${userId} đã có ${userSpecificVouchers.length} voucher đang hoạt động. Giới hạn là ${VOUCHER_LIMIT}`);
      
      // Nếu không phải voucher chào mừng, không tạo thêm
      if (reason !== 'new-account') {
        return {
          code: userSpecificVouchers[0].magiamgia,
          discount: userSpecificVouchers[0].sophantram,
          minOrderValue: userSpecificVouchers[0].minOrderValue,
          expiresAt: moment(userSpecificVouchers[0].ngayketthuc).format('DD/MM/YYYY'),
          message: 'Bạn đã có sẵn mã giảm giá!',
          isNew: false
        };
      }
    }

    // Kiểm tra xem người dùng đã có voucher loại này chưa
    const voucherRegex = new RegExp(`^${getVoucherPrefix(reason)}`);
    const existingVoucher = await MaGiamGia.magiamgia.findOne({
      magiamgia: { $regex: voucherRegex },
      ngayketthuc: { $gte: new Date() },
      soluong: { $gt: 0 },
      $or: queryConditions,
      isDeleted: { $ne: true }
    });
    
    // Nếu người dùng đã có voucher loại này, không tạo thêm
    if (existingVoucher && reason !== 'reward') {
      console.log(`Người dùng ${userId} đã có voucher ${reason} đang hoạt động: ${existingVoucher.magiamgia}`);
      return {
        code: existingVoucher.magiamgia,
        discount: existingVoucher.sophantram,
        minOrderValue: existingVoucher.minOrderValue,
        expiresAt: moment(existingVoucher.ngayketthuc).format('DD/MM/YYYY'),
        message: getVoucherMessage(reason),
        description: getVoucherDescription(reason),
        isNew: false
      };
    }

    // Cấu hình voucher dựa trên lý do
    const voucherConfig = getVoucherConfig(reason);
    
    // Tạo ngày bắt đầu và kết thúc
    const ngaybatdau = moment();
    const ngayketthuc = moment().add(expiryDays, 'days');
    
    // Tạo mã giảm giá duy nhất
    const randomCode = Math.floor(1000 + Math.random() * 9000); // 4 chữ số ngẫu nhiên
    const voucherCode = `${voucherConfig.prefix}-${randomCode}`;
    
    // Tạo danh sách người dùng được chỉ định
    const intendedUsers = [];
    if (phone) intendedUsers.push(phone);
    if (email) intendedUsers.push(email);
    
    // Tạo voucher
    const magg = new MaGiamGia.magiamgia({
      magiamgia: voucherCode,
      soluong: 1, // Chỉ sử dụng một lần
      sophantram: voucherConfig.discount,
      ngaybatdau: ngaybatdau.toDate(),
      ngayketthuc: ngayketthuc.toDate(),
      minOrderValue: voucherConfig.minOrderValue,
      maxOrderValue: null, // Không giới hạn trên
      isServerWide: false,
      isOneTimePerUser: true,
      intended_users: intendedUsers,
      appliedUsers: [], // Chưa ai sử dụng
      description: voucherConfig.description,
      userId: userId  // Lưu userId tạo voucher này
    });
    
    await magg.save();
    
    console.log(`Đã tạo voucher ${reason} ${voucherCode} cho người dùng ${userId}`);
    
    return {
      code: magg.magiamgia,
      discount: magg.sophantram,
      minOrderValue: magg.minOrderValue,
      expiresAt: ngayketthuc.format('DD/MM/YYYY'),
      message: voucherConfig.message,
      description: voucherConfig.description,
      isNew: true
    };
  } catch (error) {
    console.error('Lỗi khi tạo voucher:', error);
    throw error;
  }
}

/**
 * Gets voucher configuration based on reason
 */
function getVoucherConfig(reason) {
  const configs = {
    'first-order': {
      prefix: 'FIRST',
      discount: getRandomDiscount(15, 20), // 15-20% discount
      minOrderValue: 100000,
      message: 'Cảm ơn bạn đã mua hàng lần đầu!',
      description: 'Ưu đãi đặc biệt cho đơn hàng đầu tiên của bạn'
    },
    'third-order': {
      prefix: 'LOYAL',
      discount: getRandomDiscount(20, 25), // 20-25% discount
      minOrderValue: 200000,
      message: 'Cảm ơn bạn đã là khách hàng thân thiết!',
      description: 'Ưu đãi dành cho khách hàng trung thành'
    },
    'new-account': {
      prefix: 'WELCOME',
      discount: getRandomDiscount(10, 15), // 10-15% discount
      minOrderValue: 50000,
      message: 'Chào mừng bạn đến với cửa hàng của chúng tôi!',
      description: 'Ưu đãi chào mừng thành viên mới'
    },
    'reward': {
      prefix: 'REWARD',
      discount: getRandomDiscount(10, 20), // 10-20% discount
      minOrderValue: 100000,
      message: 'Mã giảm giá dành riêng cho bạn!',
      description: 'Ưu đãi đặc biệt từ cửa hàng'
    }
  };
  
  return configs[reason] || configs.reward;
}

/**
 * Gets voucher prefix based on reason
 */
function getVoucherPrefix(reason) {
  const prefixMap = {
    'first-order': 'FIRST',
    'third-order': 'LOYAL',
    'new-account': 'WELCOME',
    'reward': 'REWARD'
  };
  
  return prefixMap[reason] || 'REWARD';
}

/**
 * Gets voucher message based on reason
 */
function getVoucherMessage(reason) {
  const messageMap = {
    'first-order': 'Cảm ơn bạn đã mua hàng lần đầu!',
    'third-order': 'Cảm ơn bạn đã là khách hàng thân thiết!',
    'new-account': 'Chào mừng bạn đến với cửa hàng của chúng tôi!',
    'reward': 'Mã giảm giá dành riêng cho bạn!'
  };
  
  return messageMap[reason] || 'Mã giảm giá dành riêng cho bạn!';
}

/**
 * Gets voucher description based on reason
 */
function getVoucherDescription(reason) {
  const descriptionMap = {
    'first-order': 'Ưu đãi đặc biệt cho đơn hàng đầu tiên của bạn',
    'third-order': 'Ưu đãi dành cho khách hàng trung thành',
    'new-account': 'Ưu đãi chào mừng thành viên mới',
    'reward': 'Ưu đãi đặc biệt từ cửa hàng'
  };
  
  return descriptionMap[reason] || 'Ưu đãi đặc biệt từ cửa hàng';
}

/**
 * Kiểm tra xem người dùng có đủ điều kiện nhận voucher đơn hàng đầu tiên không
 * @param {string} userId - User ID của người dùng đã đăng nhập
 * @returns {Promise<boolean>} - True nếu đủ điều kiện
 */
async function isFirstOrderVoucherEligible(userId) {
  try {
    // Yêu cầu userId hợp lệ - chỉ phát voucher cho người dùng đã đăng ký
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.log("Không thể kiểm tra tư cách nhận voucher đơn đầu: Không có userId hợp lệ");
      return false;
    }
    
    // Tìm user
    const user = await User.User.findById(userId);
    if (!user) {
      console.log(`Không tìm thấy thông tin người dùng với userId ${userId}`);
      return false;
    }
    
    // Thêm điều kiện lọc chỉ đơn hàng thành công
    const query = {
      userId: userId,
      thanhtoan: true, // Chỉ đếm đơn hàng đã thanh toán
      trangthai: { $in: ['Đã thanh toán', 'Hoàn thành', 'Đã nhận'] } // Trạng thái thành công
    };
    
    // Đếm số đơn hàng đã hoàn thành
    const orderCount = await HoaDon.hoadon.countDocuments(query);
    
    console.log(`Người dùng ${userId} có ${orderCount} đơn hàng hoàn thành`);
    
    // Đủ điều kiện nếu đây là đơn hàng đầu tiên của họ
    // orderCount = 1 vì chúng ta đang đếm TRONG HÀM NÀY sau khi đơn hàng hiện tại đã được đánh dấu là hoàn thành
    const eligible = orderCount === 1;
    console.log(`Đủ điều kiện nhận voucher đơn đầu: ${eligible}`);
    
    // Nếu đủ điều kiện, kiểm tra xem người dùng đã có voucher FIRST chưa
    if (eligible) {
      const phone = user.phone;
      const email = user.email;
      
      // Nếu không có thông tin liên hệ, không phát voucher
      if (!phone && !email) {
        return false;
      }
      
      // Tìm bất kỳ voucher FIRST nào đã cấp cho người dùng này mà vẫn còn hiệu lực
      let voucherQuery = {
        magiamgia: { $regex: /^FIRST/ },
        ngayketthuc: { $gte: new Date() }
      };
      
      const queryConditions = [];
      if (phone) queryConditions.push({ intended_users: phone });
      if (email) queryConditions.push({ intended_users: email });
      
      voucherQuery.$or = queryConditions;
      
      const existingVoucher = await MaGiamGia.magiamgia.findOne(voucherQuery);
      
      if (existingVoucher) {
        console.log(`Người dùng ${userId} đã có voucher FIRST còn hiệu lực: ${existingVoucher.magiamgia}`);
        return false;
      }
    }
    
    return eligible;
  } catch (error) {
    console.error('Lỗi khi kiểm tra tư cách nhận voucher đơn đầu:', error);
    return false;
  }
}

/**
 * Kiểm tra xem người dùng có đủ điều kiện nhận voucher đơn hàng thứ 3, 6, 9... không
 * @param {string} userId - User ID của người dùng đã đăng nhập
 * @returns {Promise<boolean>} - True nếu đủ điều kiện
 */
async function isThirdOrderVoucherEligible(userId) {
  try {
    // Yêu cầu userId hợp lệ - chỉ phát voucher cho người dùng đã đăng ký
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.log("Không thể kiểm tra tư cách nhận voucher đơn thứ 3: Không có userId hợp lệ");
      return false;
    }
    
    // Tìm user
    const user = await User.User.findById(userId);
    if (!user) {
      console.log(`Không tìm thấy thông tin người dùng với userId ${userId}`);
      return false;
    }
    
    // Thêm điều kiện lọc chỉ đơn hàng thành công
    const query = {
      userId: userId,
      thanhtoan: true, // Chỉ đếm đơn hàng đã thanh toán
      trangthai: { $in: ['Đã thanh toán', 'Hoàn thành', 'Đã nhận'] } // Trạng thái thành công
    };
    
    // Đếm số đơn hàng đã hoàn thành
    const orderCount = await HoaDon.hoadon.countDocuments(query);
    
    // Đủ điều kiện nếu đây là đơn hàng thứ 3, 6, 9... của họ
    const eligible = orderCount > 0 && orderCount % 3 === 0;
    console.log(`Người dùng ${userId} có ${orderCount} đơn hàng hoàn thành. Đủ điều kiện nhận voucher đơn thứ 3: ${eligible}`);
    
    // Nếu đủ điều kiện, kiểm tra xem người dùng đã có voucher LOYAL nào chưa
    if (eligible) {
      const phone = user.phone;
      const email = user.email;
      
      // Nếu không có thông tin liên hệ, không phát voucher
      if (!phone && !email) {
        return false;
      }
      
      // Tìm bất kỳ voucher LOYAL nào đã cấp cho người dùng này mà vẫn còn hiệu lực
      let voucherQuery = {
        magiamgia: { $regex: /^LOYAL/ },
        ngayketthuc: { $gte: new Date() }
      };
      
      const queryConditions = [];
      if (phone) queryConditions.push({ intended_users: phone });
      if (email) queryConditions.push({ intended_users: email });
      
      voucherQuery.$or = queryConditions;
      
      const existingVoucher = await MaGiamGia.magiamgia.findOne(voucherQuery);
      
      if (existingVoucher) {
        console.log(`Người dùng ${userId} đã có voucher LOYAL còn hiệu lực: ${existingVoucher.magiamgia}`);
        return false;
      }
    }
    
    return eligible;
  } catch (error) {
    console.error('Lỗi khi kiểm tra tư cách nhận voucher đơn thứ 3:', error);
    return false;
  }
}

/**
 * Generate a random discount percentage within the given range
 * @param {number} min - Minimum discount
 * @param {number} max - Maximum discount
 * @returns {number} - Random discount percentage
 */
function getRandomDiscount(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Notify user about new vouchers or golden hour events
 * @param {string} phone - User phone number
 * @param {string} type - Notification type (new-voucher, golden-hour)
 * @param {object} data - Additional notification data
 */
async function notifyUserAboutVouchers(phone, type, data = {}) {
  try {
    // This is a placeholder for notification functionality
    // In a real application, this might integrate with a notification service
    console.log(`Notifying user ${phone} about ${type} vouchers:`, data);
    
    // Here you could send push notifications, emails, or update a notifications collection
    
    return true;
  } catch (error) {
    console.error('Error notifying user about vouchers:', error);
    return false;
  }
}

module.exports = {
  generateVoucherForUser,
  isFirstOrderVoucherEligible,
  isThirdOrderVoucherEligible,
  notifyUserAboutVouchers
};
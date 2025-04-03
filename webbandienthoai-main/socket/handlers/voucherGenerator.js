// utils/voucherGenerator.js - Fixed version

const moment = require('moment');
const MaGiamGia = require('../../models/MaGiamGiaModel');
const HoaDon = require('../../models/HoaDonModel');

/**
 * Generates a random voucher for a user
 * @param {string} phone - User phone number
 * @param {string} reason - Reason for voucher generation (first-order, third-order, new-account)
 * @param {number} expiryDays - Number of days until voucher expires
 * @returns {Promise<object>} - Created voucher object
 */
async function generateVoucherForUser(phone, reason = 'reward', expiryDays = 30) {
  try {
    if (!phone) {
      console.error('Cannot generate voucher: Phone number is required');
      throw new Error('Phone number is required');
    }

    // Validate phone number format
    if (!/^\d{10,12}$/.test(phone.toString().trim())) {
      console.error(`Invalid phone number format: ${phone}`);
      throw new Error('Invalid phone number format');
    }

    console.log(`Attempting to generate ${reason} voucher for user ${phone}`);

    // Kiểm tra xem người dùng đã có bao nhiêu voucher còn hiệu lực
    const activeVouchers = await MaGiamGia.magiamgia.find({
      ngayketthuc: { $gte: new Date() },
      soluong: { $gt: 0 },
      intended_users: phone,
      isDeleted: { $ne: true }
    });

    // Giới hạn số lượng voucher mà một người có thể có
    const userSpecificVouchers = activeVouchers.filter(v => !v.isServerWide);
    const VOUCHER_LIMIT = 5; // Người dùng chỉ có thể có tối đa 5 voucher cá nhân cùng lúc
    
    if (userSpecificVouchers.length >= VOUCHER_LIMIT && reason !== 'new-account') {
      console.log(`User ${phone} already has ${userSpecificVouchers.length} active vouchers. Limit is ${VOUCHER_LIMIT}`);
      
      // Nếu không phải là voucher chào mừng, không tạo thêm
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

    // Check if user already has an active voucher of this type
    const existingVoucher = await MaGiamGia.magiamgia.findOne({
      magiamgia: { $regex: new RegExp(`^${getVoucherPrefix(reason)}`) },
      ngayketthuc: { $gte: new Date() },
      soluong: { $gt: 0 },
      intended_users: phone,
      isDeleted: { $ne: true }
    });
    
    // If user already has this type of voucher, don't create another one
    if (existingVoucher && reason !== 'reward') {
      console.log(`User ${phone} already has an active ${reason} voucher: ${existingVoucher.magiamgia}`);
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

    // Define voucher configuration based on reason
    const voucherConfig = getVoucherConfig(reason);
    
    // Create start and end dates
    const ngaybatdau = moment();
    const ngayketthuc = moment().add(expiryDays, 'days');
    
    // Generate a unique voucher code
    const randomCode = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const voucherCode = `${voucherConfig.prefix}-${randomCode}`;
    
    // Create the voucher
    const magg = new MaGiamGia.magiamgia({
      magiamgia: voucherCode,
      soluong: 1, // One-time use only
      sophantram: voucherConfig.discount,
      ngaybatdau: ngaybatdau.toDate(),
      ngayketthuc: ngayketthuc.toDate(),
      minOrderValue: voucherConfig.minOrderValue,
      maxOrderValue: null, // No upper limit
      isServerWide: false,
      isOneTimePerUser: true,
      intended_users: [phone], // Specify who this voucher is for
      appliedUsers: [], // No users have used it yet
      description: voucherConfig.description
    });
    
    await magg.save();
    
    console.log(`Generated ${reason} voucher ${voucherCode} for user ${phone}`);
    
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
    console.error('Error generating voucher:', error);
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
 * Checks if a user is eligible for a first order voucher
 * @param {string} phone - User phone number
 * @returns {Promise<boolean>} - True if eligible
 */
async function isFirstOrderVoucherEligible(phone) {
  try {
    if (!phone) {
      console.log("Can't check first order eligibility: Missing phone number");
      return false;
    }
    
    // Validate phone format
    if (!/^\d{10,12}$/.test(phone.toString().trim())) {
      console.log(`Invalid phone format for eligibility check: ${phone}`);
      return false;
    }
    
    // Count previous orders for this user
    const orderCount = await HoaDon.hoadon.countDocuments({ 
      phone, 
      thanhtoan: true // Only count paid orders
    });
    
    const eligible = orderCount === 1;
    console.log(`User ${phone} has ${orderCount} paid orders. First-order eligible: ${eligible}`);
    
    // Eligible if this is their first paid order
    return eligible;
  } catch (error) {
    console.error('Error checking first order eligibility:', error);
    return false;
  }
}

/**
 * Checks if a user is eligible for a third order voucher
 * @param {string} phone - User phone number
 * @returns {Promise<boolean>} - True if eligible
 */
async function isThirdOrderVoucherEligible(phone) {
  try {
    if (!phone) {
      console.log("Can't check third order eligibility: Missing phone number");
      return false;
    }
    
    // Validate phone format
    if (!/^\d{10,12}$/.test(phone.toString().trim())) {
      console.log(`Invalid phone format for eligibility check: ${phone}`);
      return false;
    }
    
    // Count previous orders for this user
    const orderCount = await HoaDon.hoadon.countDocuments({ 
      phone, 
      thanhtoan: true // Only count paid orders
    });
    
    // Eligible if this is their 3rd, 6th, 9th, etc. order (divisible by 3)
    const eligible = orderCount > 0 && orderCount % 3 === 0;
    console.log(`User ${phone} has ${orderCount} paid orders. Third-order eligible: ${eligible}`);
    
    return eligible;
  } catch (error) {
    console.error('Error checking third order eligibility:', error);
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
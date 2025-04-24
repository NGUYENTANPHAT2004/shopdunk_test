const express = require('express');
const router = express.Router();
const { userPoints } = require('../models/UserPointsModel');
const { hoadon } = require('../models/HoaDonModel');
const { pointVoucher } = require('../models/PointVoucherModel');
const { pointRedemption } = require('../models/PointRedemptionModel');
const { User } = require('../models/user.model');
const { auth } = require('../middleware/auth');

// Constants
const POINTS_PER_1000D = 1; // 1 point for every 1000D spent

// Get user points
router.get('/user-points', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    let userPointsDoc = await userPoints.findOne({ userId });
    
    // If user doesn't have points record yet, create one
    if (!userPointsDoc) {
      userPointsDoc = new userPoints({
        userId,
        totalPoints: 0,
        pointsHistory: []
      });
      await userPointsDoc.save();
    }
    
    res.status(200).json({
      success: true,
      data: userPointsDoc
    });
  } catch (error) {
    console.error('Error getting user points:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get points history
router.get('/points-history', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userPointsDoc = await userPoints.findOne({ userId });
    
    if (!userPointsDoc) {
      return res.status(404).json({
        success: false,
        message: 'User points not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: userPointsDoc.pointsHistory
    });
  } catch (error) {
    console.error('Error getting points history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Calculate points for an order
router.post('/calculate-order-points', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    const order = await hoadon.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order belongs to the user
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this order'
      });
    }
    
    // Calculate points (1 point for every 1000D)
    const pointsEarned = Math.floor(order.tongtien / 1000) * POINTS_PER_1000D;
    
    res.status(200).json({
      success: true,
      data: {
        orderId,
        orderAmount: order.tongtien,
        pointsEarned
      }
    });
  } catch (error) {
    console.error('Error calculating order points:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Redeem points for voucher
router.post('/redeem-points', auth, async (req, res) => {
  try {
    const { voucherId } = req.body;
    
    if (!voucherId) {
      return res.status(400).json({
        success: false,
        message: 'Voucher ID is required'
      });
    }
    
    // Get user points
    let userPointsDoc = await userPoints.findOne({ userId: req.user._id });
    
    if (!userPointsDoc) {
      return res.status(404).json({
        success: false,
        message: 'User points not found'
      });
    }
    
    // Get voucher
    const voucher = await pointVoucher.findById(voucherId);
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    // Check if voucher is active
    if (!voucher.isActive || voucher.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is not available'
      });
    }
    
    // Check if voucher is in date range
    const now = new Date();
    if (now < voucher.startDate || now > voucher.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is not available at this time'
      });
    }
    
    // Check if voucher has quantity available
    if (voucher.redeemedCount >= voucher.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is out of stock'
      });
    }
    
    // Check if user has enough points
    if (userPointsDoc.totalPoints < voucher.pointsCost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient points'
      });
    }
    
    // Generate unique voucher code
    const voucherCode = `PV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create redemption record
    const redemption = new pointRedemption({
      userId: req.user._id,
      voucherId: voucher._id,
      pointsSpent: voucher.pointsCost,
      voucherCode,
      expiresAt: voucher.endDate
    });
    
    await redemption.save();
    
    // Update user points
    userPointsDoc.totalPoints -= voucher.pointsCost;
    userPointsDoc.pointsHistory.push({
      points: -voucher.pointsCost,
      type: 'redeemed',
      voucherId: voucher._id,
      description: `Redeemed for voucher: ${voucher.name}`
    });
    userPointsDoc.lastUpdated = new Date();
    
    await userPointsDoc.save();
    
    // Update voucher redeemed count
    voucher.redeemedCount += 1;
    await voucher.save();
    
    res.status(200).json({
      success: true,
      data: {
        redemption,
        remainingPoints: userPointsDoc.totalPoints
      }
    });
  } catch (error) {
    console.error('Error redeeming points:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get available vouchers for redemption
router.get('/available-vouchers', auth, async (req, res) => {
  try {
    const now = new Date();
    
    const vouchers = await pointVoucher.find({
      isActive: true,
      isDeleted: false,
      startDate: { $lte: now },
      endDate: { $gte: now },
      redeemedCount: { $lt: db.mongoose.Types.Decimal128('quantity') }
    });
    
    res.status(200).json({
      success: true,
      data: vouchers
    });
  } catch (error) {
    console.error('Error getting available vouchers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user's redeemed vouchers
router.get('/my-vouchers', auth, async (req, res) => {
  try {
    const redemptions = await pointRedemption.find({
      userId: req.user._id,
      status: { $in: ['pending', 'used'] }
    }).populate('voucherId');
    
    res.status(200).json({
      success: true,
      data: redemptions
    });
  } catch (error) {
    console.error('Error getting user vouchers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router; 
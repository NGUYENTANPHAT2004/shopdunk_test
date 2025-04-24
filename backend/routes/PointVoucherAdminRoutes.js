const express = require('express');
const router = express.Router();
const { pointVoucher } = require('../models/PointVoucherModel');
const { pointRedemption } = require('../models/PointRedemptionModel');
const { userPoints } = require('../models/UserPointsModel');
const { auth, adminAuth } = require('../socket/chat/middlewares/');

// Create a new point voucher
router.post('/create', auth, adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      pointsCost,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      quantity,
      startDate,
      endDate
    } = req.body;
    
    // Validate required fields
    if (!name || !pointsCost || !discountType || !discountValue || !quantity || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate discount type
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discount type'
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    // Create voucher
    const voucher = new pointVoucher({
      name,
      description,
      pointsCost,
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      maxDiscount,
      quantity,
      startDate: start,
      endDate: end,
      createdBy: req.user.username
    });
    
    await voucher.save();
    
    res.status(201).json({
      success: true,
      data: voucher
    });
  } catch (error) {
    console.error('Error creating point voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all point vouchers
router.get('/all', auth, adminAuth, async (req, res) => {
  try {
    const vouchers = await pointVoucher.find({ isDeleted: false });
    
    res.status(200).json({
      success: true,
      data: vouchers
    });
  } catch (error) {
    console.error('Error getting point vouchers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get a specific point voucher
router.get('/:id', auth, adminAuth, async (req, res) => {
  try {
    const voucher = await pointVoucher.findById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: voucher
    });
  } catch (error) {
    console.error('Error getting point voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update a point voucher
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      pointsCost,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      quantity,
      startDate,
      endDate,
      isActive
    } = req.body;
    
    const voucher = await pointVoucher.findById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    // Update fields if provided
    if (name) voucher.name = name;
    if (description !== undefined) voucher.description = description;
    if (pointsCost) voucher.pointsCost = pointsCost;
    if (discountType) {
      if (!['percentage', 'fixed'].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount type'
        });
      }
      voucher.discountType = discountType;
    }
    if (discountValue) voucher.discountValue = discountValue;
    if (minOrderValue !== undefined) voucher.minOrderValue = minOrderValue;
    if (maxDiscount !== undefined) voucher.maxDiscount = maxDiscount;
    if (quantity) voucher.quantity = quantity;
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }
      voucher.startDate = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }
      voucher.endDate = end;
    }
    if (isActive !== undefined) voucher.isActive = isActive;
    
    voucher.updatedAt = new Date();
    
    await voucher.save();
    
    res.status(200).json({
      success: true,
      data: voucher
    });
  } catch (error) {
    console.error('Error updating point voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete a point voucher (soft delete)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const voucher = await pointVoucher.findById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    // Soft delete
    voucher.isDeleted = true;
    voucher.isActive = false;
    voucher.updatedAt = new Date();
    
    await voucher.save();
    
    res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting point voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get redemption statistics
router.get('/stats/redemptions', auth, adminAuth, async (req, res) => {
  try {
    const totalRedemptions = await pointRedemption.countDocuments();
    const usedRedemptions = await pointRedemption.countDocuments({ status: 'used' });
    const pendingRedemptions = await pointRedemption.countDocuments({ status: 'pending' });
    const expiredRedemptions = await pointRedemption.countDocuments({ status: 'expired' });
    
    // Get top redeemed vouchers
    const topVouchers = await pointVoucher.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { redeemedCount: -1 } },
      { $limit: 5 }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalRedemptions,
        usedRedemptions,
        pendingRedemptions,
        expiredRedemptions,
        topVouchers
      }
    });
  } catch (error) {
    console.error('Error getting redemption statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user points statistics
router.get('/stats/user-points', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await userPoints.countDocuments();
    const totalPoints = await userPoints.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPoints' } } }
    ]);
    
    // Get top users by points
    const topUsers = await userPoints.find()
      .sort({ totalPoints: -1 })
      .limit(10)
      .populate('userId', 'username email');
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalPoints: totalPoints.length > 0 ? totalPoints[0].total : 0,
        topUsers
      }
    });
  } catch (error) {
    console.error('Error getting user points statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router; 
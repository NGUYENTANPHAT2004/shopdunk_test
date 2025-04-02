const express = require('express');
const router = express.Router();
const { OrderRating } = require('../models/OrderRatingModel');
const momenttimezone = require('moment-timezone');

// Tạo đánh giá mới cho đơn hàng
router.post('/order-rating', async (req, res) => {
  try {
    const {
      userId,
      orderId,
      productId,
      productName,
      productImage,
      tenkhach,
      content,
      rating,
      dungluong,
      mausac,
      verified
    } = req.body;

    // Kiểm tra xem người dùng đã đánh giá sản phẩm này trong đơn hàng chưa
    const existingRating = await OrderRating.findOne({
      userId,
      orderId,
      productId
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá sản phẩm này trong đơn hàng trước đó'
      });
    }

    // Tạo đánh giá mới
    const orderRating = new OrderRating({
      userId,
      orderId,
      productId,
      productName,
      productImage,
      tenkhach,
      content,
      rating,
      dungluong,
      mausac,
      verified,
      date: momenttimezone().tz('Asia/Ho_Chi_Minh').toDate(),
      isRead: verified // Nếu là đơn hàng đã xác nhận thì auto approve
    });

    await orderRating.save();

    res.json({
      success: true,
      message: 'Đánh giá của bạn đã được ghi nhận',
      data: orderRating
    });
  } catch (error) {
    console.error('Lỗi khi tạo đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi gửi đánh giá'
    });
  }
});

// Lấy đánh giá của một sản phẩm
router.get('/order-rating/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    
    // Lấy tổng số đánh giá đã duyệt
    const totalRatings = await OrderRating.countDocuments({ 
      productId,
      isRead: true
    });

    // Lấy danh sách đánh giá đã duyệt
    const ratings = await OrderRating.find({ 
      productId,
      isRead: true
    })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

    // Tính điểm trung bình
    const allRatings = await OrderRating.find({
      productId,
      isRead: true
    });
    
    const totalScore = allRatings.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = totalRatings > 0 ? (totalScore / totalRatings) : 0;

    // Thống kê số lượng mỗi mức sao
    const ratingStats = await OrderRating.aggregate([
      { 
        $match: { 
          productId,
          isRead: true
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]);

    const ratingCounts = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    ratingStats.forEach(stat => {
      ratingCounts[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        ratings,
        totalRatings,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingStats: ratingCounts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRatings / limit),
          totalItems: totalRatings,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá sản phẩm'
    });
  }
});

// Lấy đánh giá của một đơn hàng
router.get('/order-rating/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const ratings = await OrderRating.find({ orderId })
      .sort({ date: -1 });

    res.json({
      success: true,
      data: ratings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá đơn hàng'
    });
  }
});

// Kiểm tra người dùng đã đánh giá sản phẩm trong đơn hàng chưa
router.get('/order-rating/check', async (req, res) => {
  try {
    const { userId, productId, orderId } = req.query;
    
    const rating = await OrderRating.findOne({
      userId,
      productId,
      orderId
    });

    res.json({
      success: true,
      hasRated: !!rating,
      rating: rating
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra trạng thái đánh giá'
    });
  }
});

// Cập nhật đánh giá
router.put('/order-rating/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, rating } = req.body;

    const updatedRating = await OrderRating.findByIdAndUpdate(
      id,
      {
        content,
        rating,
        isRead: false // Đánh giá sửa cần duyệt lại
      },
      { new: true }
    );

    if (!updatedRating) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật đánh giá thành công',
      data: updatedRating
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đánh giá'
    });
  }
});

// Xóa đánh giá
router.delete('/order-rating/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const rating = await OrderRating.findById(id);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    // Kiểm tra quyền xóa
    if (rating.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đánh giá này'
      });
    }

    await rating.remove();

    res.json({
      success: true,
      message: 'Xóa đánh giá thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đánh giá'
    });
  }
});

module.exports = router; 
const express = require('express')
const router = express.Router()
const DanhGia = require('../models/DanhGiaModel')
const momenttimezone = require('moment-timezone')

// Helper function to create a review
const createReview = async (req, res, isAdmin = false) => {
  try {
    const { tenkhach, content, rating, theloaiId, theloaiName, theloaiSlug } = req.body
    const vietnamTime = momenttimezone().toDate()
    
    // Create review object with required fields
    const reviewData = {
      tenkhach,
      content,
      rating,
      date: vietnamTime,
      isRead: isAdmin // Set to true if admin is creating the review
    }
    
    // Add optional category fields if they exist
    if (theloaiId) reviewData.theloaiId = theloaiId
    if (theloaiName) reviewData.theloaiName = theloaiName
    if (theloaiSlug) reviewData.theloaiSlug = theloaiSlug
    
    const danhgia = new DanhGia.danhgia(reviewData)
    
    await danhgia.save()
    res.json(danhgia)
  } catch (error) {
    console.error('Error creating review:', error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error.message}` })
  }
}

// User review submission
router.post('/danhgia', async (req, res) => {
  await createReview(req, res, false)
})

// Admin review submission (auto-approved)
router.post('/danhgiaadmin', async (req, res) => {
  await createReview(req, res, true)
})

// Get all approved reviews (legacy endpoint)
router.get('/getdanhgia', async (req, res) => {
  try {
    const danhgia = await DanhGia.danhgia.find({ isRead: true })
      .sort({ date: -1 }) // Sort by date, newest first
      .lean()
    res.json(danhgia)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Get approved reviews by category slug
router.get('/getdanhgia/:theloaiSlug', async (req, res) => {
  try {
    const { theloaiSlug } = req.params
    const danhgia = await DanhGia.danhgia.find({ 
      isRead: true,
      theloaiSlug: theloaiSlug 
    })
    .sort({ date: -1 }) // Sort by date, newest first
    .lean()

    res.json(danhgia)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Get all reviews for admin (legacy endpoint)
router.get('/getdanhgiaadmin', async (req, res) => {
  try {
    const danhgia = await DanhGia.danhgia.find()
      .sort({ date: -1, isRead: 1 }) // Sort by date, and show unapproved first
      .lean()
    res.json(danhgia)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Get reviews by category for admin
router.get('/getdanhgiaadmin/:theloaiSlug', async (req, res) => {
  try {
    const { theloaiSlug } = req.params
    const danhgia = await DanhGia.danhgia.find({ theloaiSlug: theloaiSlug })
      .sort({ date: -1, isRead: 1 }) // Sort by date, and show unapproved first
      .lean()
    res.json(danhgia)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Approve selected reviews
router.post('/duyetdanhgia', async (req, res) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    const result = await DanhGia.danhgia.updateMany(
      { _id: { $in: ids } },
      { $set: { isRead: true } }
    )

    res.json({
      message: 'Duyệt đánh giá thành công'
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Delete selected reviews
router.post('/xoadanhgia', async (req, res) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    const result = await DanhGia.danhgia.deleteMany({ _id: { $in: ids } })

    res.json({
      message: 'Xóa đánh giá thành công'
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})
router.get('/danhgia/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find all approved ratings for this product
    const danhGia = await DanhGia.danhgia.find({ 
      theloaiId: productId,
      isRead: true // Only return approved ratings
    }).sort({ date: -1 }); // Sort by newest first
    
    // Calculate average rating with proper rounding to one decimal place
    let totalRating = 0;
    danhGia.forEach(item => {
      totalRating += item.rating;
    });
    
    const averageRating = danhGia.length > 0 ? (totalRating / danhGia.length) : 0;
    
    // Format the average with one decimal place
    const formattedAverage = parseFloat(averageRating.toFixed(1));
    
    res.json({
      success: true,
      totalRatings: danhGia.length,
      averageRating: formattedAverage,
      ratings: danhGia
    });
  } catch (error) {
    console.error('Lỗi khi lấy đánh giá sản phẩm:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy đánh giá sản phẩm'
    });
  }
});

// Add this new endpoint to get all ratings by product (including unapproved ones) - for admin
router.get('/danhgia/product/:productId/all', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find all ratings for this product, including unapproved ones
    const danhGia = await DanhGia.danhgia.find({ 
      theloaiId: productId
    }).sort({ date: -1, isRead: 1 }); // Sort by newest first, unapproved first
    
    res.json({
      success: true,
      totalRatings: danhGia.length,
      ratings: danhGia
    });
  } catch (error) {
    console.error('Lỗi khi lấy tất cả đánh giá sản phẩm:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy tất cả đánh giá sản phẩm'
    });
  }
});

// Route để lấy các đánh giá gần đây (để hiển thị trên trang chủ chẳng hạn)
router.get('/danhgia/recent', async (req, res) => {
  try {
    // Lấy 10 đánh giá gần nhất có nội dung
    const recentRatings = await DanhGia.danhgia
      .find({ content: { $ne: "" } })
      .sort({ date: -1 })
      .limit(10);
    
    res.json({
      success: true,
      ratings: recentRatings
    });
  } catch (error) {
    console.error('Lỗi khi lấy đánh giá gần đây:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy đánh giá gần đây'
    });
  }
});

module.exports = router
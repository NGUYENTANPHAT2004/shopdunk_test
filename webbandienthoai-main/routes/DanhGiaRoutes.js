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

module.exports = router
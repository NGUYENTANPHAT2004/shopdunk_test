const express = require('express')
const router = express.Router()
const MauSac = require('../models/MauSacModel')
const DungLuong = require('../models/DungLuongModel')
const uploads = require('./upload')

router.post(
  '/postmausac/:iddungluong',
  uploads.array('image', 100),
  async (req, res) => {
    try {
      const iddungluong = req.params.iddungluong
      const dungluong = await DungLuong.dungluong.findById(iddungluong)
      const { name, price } = req.body
      const mausac = new MauSac.mausac({ name, price, dungluong: iddungluong })
      const domain = 'http://localhost:3005'
      const image = req.files.map(file => `${domain}/${file.filename}`)
      mausac.image = mausac.image.concat(image)
      dungluong.mausac.push(mausac._id)
      await mausac.save()
      await dungluong.save()
      res.json(mausac)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
    }
  }
)

// Add isDeleted filter to mausac route
router.get('/mausac/:iddungluong', async (req, res) => {
  try {
    const iddungluong = req.params.iddungluong
    const dungluong = await DungLuong.dungluong.findById(iddungluong)
    
    if (!dungluong) {
      return res.status(404).json({ message: 'Không tìm thấy dung lượng' })
    }
    
    const mausac = await Promise.all(
      dungluong.mausac.map(async ms => {
        const maus = await MauSac.mausac.findOne({ _id: ms._id, isDeleted: false })
        if (!maus) return null
        return {
          _id: maus._id,
          name: maus.name,
          price: maus.price || 0
        }
      })
    )
    res.json(mausac.filter(Boolean))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post(
  '/putmausac/:idmausac',
  uploads.array('image', 100),
  async (req, res) => {
    try {
      const { name, price } = req.body
      const idmausac = req.params.idmausac
      const mausac = await MauSac.mausac.findById(idmausac)
      
      if (!mausac) {
        return res.status(404).json({ message: 'Không tìm thấy màu sắc' })
      }
      
      const domain = 'http://localhost:3005'

      const image = req.files.map(file => `${domain}/${file.filename}`)
      if (image.length > 0) {
        mausac.image = mausac.image.concat(image)
      }
      mausac.name = name
      mausac.price = price
      await mausac.save()
      res.json(mausac)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
    }
  }
)

// Update to soft delete
router.post('/deletemausac/:idmausac', async (req, res) => {
  try {
    const idmausac = req.params.idmausac
    const mausac = await MauSac.mausac.findById(idmausac)
    
    if (!mausac) {
      return res.status(404).json({ message: 'Không tìm thấy màu sắc' })
    }
    
    // Soft delete instead of hard delete
    mausac.isDeleted = true
    await mausac.save()
    
    res.json({ message: 'Xóa thành công' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post('/deletemausachangloat', async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    await MauSac.mausac.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    )

    res.json({ message: `Đã xóa ${ids.length} màu sắc thành công` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post(
  '/postanhmausac/:idmausac',
  uploads.array('image', 100),
  async (req, res) => {
    try {
      const idmausac = req.params.idmausac
      const mausac = await MauSac.mausac.findById(idmausac)
      
      if (!mausac) {
        return res.status(404).json({ message: 'Không tìm thấy màu sắc' })
      }
      
      const domain = 'http://localhost:3005'
      const image = req.files.map(file => `${domain}/${file.filename}`)
      mausac.image = mausac.image.concat(image)
      await mausac.save()
      res.json(mausac)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
    }
  }
)

router.get('/getanhmausac/:idmausac', async (req, res) => {
  try {
    const idmausac = req.params.idmausac
    const mausac = await MauSac.mausac.findById(idmausac)
    
    if (!mausac) {
      return res.status(404).json({ message: 'Không tìm thấy màu sắc' })
    }
    
    res.json(mausac.image)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.get('/getchitietmausac/:idmausac', async (req, res) => {
  try {
    const idmausac = req.params.idmausac
    const mausac = await MauSac.mausac.findById(idmausac)
    
    if (!mausac) {
      return res.status(404).json({ message: 'Không tìm thấy màu sắc' })
    }
    
    res.json(mausac)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Fix model naming consistency
router.get('/mausactrash/:iddungluong', async (req, res) => {
  try {
    const iddungluong = req.params.iddungluong
    const dungluong = await DungLuong.dungluong.findById(iddungluong)
    
    if (!dungluong) {
      return res.status(404).json({ message: 'Không tìm thấy dung lượng' })
    }
    
    const mausac = await Promise.all(
      dungluong.mausac.map(async ms => {
        const ms1 = await MauSac.mausac.findOne({ _id: ms._id, isDeleted: true })
        if (!ms1) return null
        return {
          _id: ms1._id,
          name: ms1.name,
          price: ms1.price
        }
      })
    )
    res.json(mausac.filter(Boolean))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Fix model naming consistency
router.post('/restore-mausac', async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    await MauSac.mausac.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: false } }
    )

    res.json({ message: 'Hoàn tác màu sắc thành công' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Already converted to soft delete, just need to fix model name consistency
router.post('/deletemausac/:id', async (req, res) => {
  try {
    const id = req.params.id
    const mausac = await MauSac.mausac.findById(id)
    if (!mausac) {
      return res.status(404).json({ message: 'Không tìm thấy màu sắc' })
    }

    mausac.isDeleted = true
    await mausac.save()

    res.json({ message: 'Xóa thành công' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

module.exports = router
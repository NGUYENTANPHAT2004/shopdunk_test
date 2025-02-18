const router = require('express').Router()
const LoaiSP = require('../models/LoaiSanPham')
const Sp = require('../models/chitietSpModel')
const uploads = require('./upload')

const unicode = require('unidecode')

function removeSpecialChars (str) {
  const specialChars = /[:+,!@#$%^&*()\-/?.\s]/g // Bao gồm cả dấu cách (\s)
  return str
    .replace(specialChars, '-') // Thay tất cả ký tự đặc biệt và dấu cách bằng dấu -
    .replace(/-+/g, '-') // Loại bỏ dấu - thừa (nhiều dấu liền nhau chỉ còn 1)
    .replace(/^-|-$/g, '') // Loại bỏ dấu - ở đầu hoặc cuối chuỗi
}

router.get('/sanpham', async (req, res) => {
  try {
    const theloai = await LoaiSP.LoaiSP.find().lean()
    const theloaijson = await Promise.all(
      theloai.map(async tl => {
        const sanpham = await Promise.all(
          tl.chitietsp.map(async sp => {
            const sp1 = await Sp.ChitietSp.findById(sp._id)
            return {
              _id: sp1._id,
              name: sp1.name,
              image: sp1.image,
              price: sp1.price,
              namekhongdau: sp1.namekhongdau
            }
          })
        )
        return {
          _id: tl._id,
          name: tl.name,
          namekhongdau: tl.namekhongdau,
          sanpham: sanpham
        }
      })
    )
    res.json(theloaijson)
  } catch (error) {
    console.log(error)
  }
})

router.post(
  '/postchitietsp/:id',
  uploads.fields([
    { name: 'image', maxCount: 1 } // Một ảnh duy nhất
  ]),
  async (req, res) => {
    try {
      const id = req.params.id
      const { name, content, price } = req.body
      const domain = 'http://localhost:3005'

      const image = req.files['image']
        ? `${domain}/${req.files['image'][0].filename}`
        : null
      const namekhongdau1 = unicode(name)
      const namekhongdau = removeSpecialChars(namekhongdau1)

      const chitietsp = new Sp.ChitietSp({
        image,
        name,
        content,
        price,
        namekhongdau
      })
      const tensp = await LoaiSP.LoaiSP.findById(id)
      if (!tensp) {
        res.status(403).json({ message: 'khong tim thay tensp' })
      }
      chitietsp.idloaisp = id
      chitietsp.loaisp = tensp.name
      tensp.chitietsp.push(chitietsp._id)
      await chitietsp.save()
      await tensp.save()
      res.json(chitietsp)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
    }
  }
)

router.post(
  '/updatechitietsp/:id',
  uploads.fields([
    { name: 'image', maxCount: 1 } // Một ảnh duy nhất
  ]),
  async (req, res) => {
    try {
      const id = req.params.id
      const { name, content, price } = req.body
      const domain = 'http://localhost:3005/'
      const namekhongdau1 = unicode(name)
      const namekhongdau = removeSpecialChars(namekhongdau1)

      const image = req.files['image']
        ? `${domain}/${req.files['image'][0].filename}`
        : null

      const chitietsp = await Sp.ChitietSp.findById(id)
      if (!chitietsp) {
        return res
          .status(404)
          .json({ message: 'Không tìm thấy chi tiết sản phẩm' })
      }

      chitietsp.content = content
      chitietsp.price = price
      chitietsp.name = name
      chitietsp.namekhongdau = namekhongdau
      if (image) {
        chitietsp.image = image
      }

      await chitietsp.save()

      res.json({ message: 'Cập nhật thành công' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
    }
  }
)

router.post('/deletechitietsp/:id', async (req, res) => {
  try {
    const id = req.params.id
    const chitietsp = await Sp.ChitietSp.findById(id)
    if (!chitietsp) {
      return res
        .status(404)
        .json({ message: 'Không tìm thấy chi tiết sản phẩm' })
    }
    const loaisp = await LoaiSP.LoaiSP.findById(chitietsp.idloaisp)
    loaisp.chitietsp = loaisp.chitietsp.filter(
      chitiet => chitiet.toString() !== id
    )
    await loaisp.save()

    await Sp.ChitietSp.deleteOne({ _id: id })

    res.json({ message: 'xóa thành công' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post('/deletechitietsphangloat', async (req, res) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    const chitietspList = await Sp.ChitietSp.find({ _id: { $in: ids } })

    if (chitietspList.length === 0) {
      return res
        .status(404)
        .json({ message: 'Không tìm thấy chi tiết sản phẩm nào để xóa' })
    }

    await Promise.all(
      chitietspList.map(async chitietsp => {
        const loaisp = await LoaiSP.LoaiSP.findById(chitietsp.idloaisp)
        if (loaisp) {
          loaisp.chitietsp = loaisp.chitietsp.filter(
            chitiet => !ids.includes(chitiet.toString())
          )
          await loaisp.save()
        }
      })
    )

    await Sp.ChitietSp.deleteMany({ _id: { $in: ids } })

    res.json({ message: `Đã xóa ${ids.length} chi tiết sản phẩm thành công` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.get('/san-pham/:nametheloai', async (req, res) => {
  try {
    const nametheloai = req.params.nametheloai
    const theloai = await LoaiSP.LoaiSP.findOne({
      namekhongdau: nametheloai
    })
    const sanpham = await Promise.all(
      theloai.chitietsp.map(async sp => {
        const sp1 = await Sp.ChitietSp.findById(sp._id)
        return {
          _id: sp1._id,
          name: sp1.name,
          namekhongdau: sp1.namekhongdau,
          image: sp1.image,
          price: sp1.price
        }
      })
    )
    const sanphamjson = {
      nametheloai: theloai.name,
      namekhongdau: theloai.namekhongdau,
      sanpham: sanpham
    }
    res.json(sanphamjson)
  } catch (error) {
    console.log(error)
  }
})

router.get('/chitietsanpham/:tieude', async (req, res) => {
  try {
    const tieude = req.params.tieude
    const sanpham = await Sp.ChitietSp.findOne({ namekhongdau: tieude })
    const sanphamjson = {
      _id: sanpham._id,
      name: sanpham.name,
      image: sanpham.image,
      price: sanpham.price,
      mota: sanpham.content
    }
    res.json(sanphamjson)
  } catch (error) {
    console.log(error)
  }
})

router.get('/getsanpham/:idtheloai', async (req, res) => {
  try {
    const idtheloai = req.params.idtheloai
    const theloai = await LoaiSP.LoaiSP.findById(idtheloai)
    const sanpham = await Promise.all(
      theloai.chitietsp.map(async sp => {
        const sp1 = await Sp.ChitietSp.findById(sp._id)
        return {
          _id: sp1._id,
          name: sp1.name,
          image: sp1.image,
          price: sp1.price
        }
      })
    )
    res.json(sanpham)
  } catch (error) {
    console.log(error)
  }
})

router.get('/getchitietspadmin/:idsp', async (req, res) => {
  try {
    const idsp = req.params.idsp
    const sanpham = await Sp.ChitietSp.findById(idsp)
    res.json(sanpham)
  } catch (error) {
    console.log(error)
  }
})

module.exports = router

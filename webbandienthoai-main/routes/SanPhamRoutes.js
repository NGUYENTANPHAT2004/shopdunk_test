const router = require('express').Router()
const { dungluong } = require('../models/DungLuongModel')
const LoaiSP = require('../models/LoaiSanPham')
const { mausac } = require('../models/MauSacModel')
const Sp = require('../models/chitietSpModel')
const uploads = require('./upload')

const unicode = require('unidecode')

function removeSpecialChars (str) {
  const specialChars = /[:+,!@#$%^&*()\-/?.\s]/g
  return str
    .replace(specialChars, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
              price:
                tl.khuyenmai === 0
                  ? sp1.price
                  : sp1.price - (sp1.price * tl.khuyenmai) / 100,
              giagoc: sp1.price,
              namekhongdau: sp1.namekhongdau,
              khuyenmai: tl.khuyenmai
            }
          })
        )
        return {
          _id: tl._id,
          name: tl.name,
          namekhongdau: tl.namekhongdau,
          khuyenmai: tl.khuyenmai,
          sanpham: sanpham
        }
      })
    )
    res.json(theloaijson)
  } catch (error) {
    console.log(error)
  }
})

router.get('/search', async (req, res) => {
  try {
    // Lấy và xử lý tham số từ query
    const keyword = req.query.keyword || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sortField = req.query.sortField || 'price';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const filterCategory = req.query.category || null;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;

    // Xây dựng query tìm kiếm
    let searchQuery = {};
    
    // Xử lý keyword tìm kiếm
    if (keyword.trim() !== '') {
      // Tối ưu hóa regex tìm kiếm để phù hợp với tiếng Việt
      const normalizedKeyword = keyword.trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      
      const searchTerms = normalizedKeyword
        .split(/\s+/)
        .filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        // Tìm kiếm sản phẩm với mọi từ trong từ khóa (fuzzy search)
        searchQuery = {
          $or: [
            { name: { $regex: new RegExp(searchTerms.join('|'), 'i') } },
            { content: { $regex: new RegExp(searchTerms.join('|'), 'i') } }
          ]
        };
      }
    }

    // Áp dụng filter theo thể loại nếu có
    if (filterCategory) {
      const theloai = await LoaiSP.LoaiSP.findOne({ namekhongdau: filterCategory });
      if (theloai) {
        searchQuery.idloaisp = theloai._id;
      }
    }
    
    // Áp dụng filter theo giá nếu có
    if (minPrice !== null || maxPrice !== null) {
      searchQuery.price = {};
      if (minPrice !== null) searchQuery.price.$gte = minPrice;
      if (maxPrice !== null) searchQuery.price.$lte = maxPrice;
    }

    // Đếm tổng số sản phẩm phù hợp với điều kiện tìm kiếm
    const totalProducts = await Sp.ChitietSp.countDocuments(searchQuery);
    
    // Tạo options cho sorting
    const sortOptions = {};
    sortOptions[sortField] = sortOrder;
    
    // Thực hiện tìm kiếm với pagination và sorting
    const products = await Sp.ChitietSp.find(searchQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Bổ sung thông tin thể loại và giá cho sản phẩm tìm thấy
    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        try {
          const theloai = await LoaiSP.LoaiSP.findById(product.idloaisp);
          
          const finalPrice = theloai && theloai.khuyenmai !== undefined && theloai.khuyenmai !== null
            ? theloai.khuyenmai === 0
              ? product.price
              : parseFloat((product.price - (product.price * theloai.khuyenmai / 100)).toFixed(2))
            : product.price;
            
          return {
            _id: product._id,
            name: product.name,
            image: product.image,
            price: finalPrice,
            giagoc: product.price,
            khuyenmai: theloai ? theloai.khuyenmai : 0,
            namekhongdau: product.namekhongdau,
            nametheloai: theloai ? theloai.namekhongdau : '',
            theloaiName: theloai ? theloai.name : '',
            loaisp: product.loaisp || (theloai ? theloai.name : '')
          };
        } catch (error) {
          console.error(`Lỗi khi xử lý sản phẩm ${product._id}:`, error);
          return {
            _id: product._id,
            name: product.name,
            image: product.image,
            price: product.price,
            giagoc: product.price,
            namekhongdau: product.namekhongdau
          };
        }
      })
    );

    // Trả về kết quả có cấu trúc rõ ràng
    res.json({
      success: true,
      keyword: keyword,
      products: productsWithDetails,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalItems: totalProducts,
        limit: limit
      },
      filter: {
        category: filterCategory,
        price: {
          min: minPrice,
          max: maxPrice
        }
      },
      sort: {
        field: sortField,
        order: sortOrder === 1 ? 'asc' : 'desc'
      }
    });
  } catch (error) {
    console.error('Lỗi khi tìm kiếm sản phẩm:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi thực hiện tìm kiếm',
    });
  }
});
// Thêm vào SanPhamRoutes.js
router.get('/search-suggestions', async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    
    if (keyword.trim().length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const searchTerms = keyword
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0);
      
    if (searchTerms.length === 0) {
      return res.json({ suggestions: [] });
    }
    
    const regex = new RegExp(searchTerms.join('|'), 'i');
    
    // Lấy tối đa 5 gợi ý
    const suggestions = await Sp.ChitietSp.find(
      { name: { $regex: regex } },
      { name: 1, namekhongdau: 1, _id: 1, idloaisp: 1 }
    )
    .limit(5)
    .lean();
    
    // Bổ sung thông tin về thể loại cho các gợi ý
    const suggestionsWithCategory = await Promise.all(
      suggestions.map(async (suggestion) => {
        try {
          const theloai = await LoaiSP.LoaiSP.findById(suggestion.idloaisp);
          return {
            ...suggestion,
            nametheloai: theloai ? theloai.namekhongdau : ''
          };
        } catch (error) {
          return suggestion;
        }
      })
    );
    
    res.json({ 
      success: true,
      suggestions: suggestionsWithCategory
    });
  } catch (error) {
    console.error('Lỗi khi lấy gợi ý tìm kiếm:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});
router.post(
  '/postchitietsp/:id',
  uploads.fields([{ name: 'image', maxCount: 1 }]),
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
router.get('/search-all', async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    const sortOrder = req.query.sort === 'desc' ? -1 : 1;

    let searchQuery = {};
    if (keyword.trim() !== '') {
      const searchTerms = keyword
        .split(/\s+/)
        .map(term => term.trim())
        .filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        // Tìm sản phẩm có tên chứa bất kỳ từ nào trong từ khóa
        searchQuery = { 
          name: { 
            $regex: new RegExp(searchTerms.join('|'), 'i') 
          } 
        };
      }
    }

    // Lấy tất cả sản phẩm phù hợp
    const allProducts = await Sp.ChitietSp.find(searchQuery).lean();

    // Bổ sung thông tin thể loại
    const sanphamjson = await Promise.all(
      allProducts.map(async sp => {
        const theloai = await LoaiSP.LoaiSP.findById(sp.idloaisp);
        
        return {
          _id: sp._id,
          name: sp.name,
          image: sp.image,
          price:
            theloai && theloai.khuyenmai !== undefined && theloai.khuyenmai !== null
              ? theloai.khuyenmai === 0
                ? sp.price
                : sp.price - (sp.price * theloai.khuyenmai) / 100
              : sp.price,
          giagoc: sp.price,
          khuyenmai: theloai ? theloai.khuyenmai : 0,
          namekhongdau: sp.namekhongdau,
          nametheloai: theloai ? theloai.namekhongdau : '',
          theloaiName: theloai ? theloai.name : ''
        };
      })
    );

    // Sắp xếp theo giá nếu được yêu cầu
    if (sortOrder !== undefined) {
      sanphamjson.sort((a, b) => (a.price - b.price) * sortOrder);
    }

    res.json({
      sanphamjson,
      total: sanphamjson.length
    });
  } catch (error) {
    console.error('Lỗi khi tìm kiếm sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});
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
      return res.status(404).json({ message: 'Không tìm thấy chi tiết sản phẩm' })
    }

    // Thực hiện xóa mềm
    chitietsp.isDeleted = true
    await chitietsp.save()

    res.json({ message: 'Xóa thành công' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post('/deletechitietsphangloat', async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    await Sp.ChitietSp.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    )

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
    if (!theloai) {
      return res.status(404).json({ message: 'Thể loại không tồn tại' })
    }
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
    res.status(500).json({ 
      success: false, 
      message: `Đã xảy ra lỗi: ${error}`
    })
  }
})

router.get('/san-pham-pt/:nametheloai', async (req, res) => {
  try {
    const nametheloai = req.params.nametheloai
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 8
    const skip = (page - 1) * limit
    const sortOrder = req.query.sort === 'desc' ? -1 : 1

    const theloai = await LoaiSP.LoaiSP.findOne({ 
      namekhongdau: { $regex: new RegExp("^" + nametheloai + "$", "i") } 
    });
    if (!theloai) {
      return res.status(404).json({ message: 'Thể loại không tồn tại' })
    }

    const sanphamTotal = theloai.chitietsp.length
    const sanphamPage = theloai.chitietsp.slice(skip, skip + limit)

    let sanpham = await Promise.all(
      sanphamPage.map(async sp => {
        const sp1 = await Sp.ChitietSp.findById(sp._id)
        return {
          _id: sp1._id,
          name: sp1.name,
          namekhongdau: sp1.namekhongdau,
          image: sp1.image,
          price:
            theloai.khuyenmai === 0
              ? sp1.price
              : sp1.price - (sp1.price * theloai.khuyenmai) / 100,
          giagoc: sp1.price,
          khuyenmai: theloai.khuyenmai
        }
      })
    )

    sanpham.sort((a, b) => (a.price - b.price) * sortOrder)

    res.json({
      nametheloai: theloai.name,
      namekhongdau: theloai.namekhongdau,
      khuyenmai: theloai.khuyenmai,
      sanpham,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(sanphamTotal / limit),
        totalItems: sanphamTotal
      }
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Lỗi server' })
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
router.post('/restoreAll', async (req, res) => {
  try {
    // Cập nhật các document trong collection thể loại
    await LoaiSP.LoaiSP.updateMany({}, { isDeleted: false });
    await Sp.ChitietSp.updateMany({}, { isDeleted: false });
    // Cập nhật các document trong collection màu sắc
    await mausac.updateMany({}, { isDeleted: false });
    // Cập nhật các document trong collection dung lượng
    await dungluong.updateMany({}, { isDeleted: false });
    
    res.status(200).json({ message: 'Đã khôi phục (isDeleted:false) cho tất cả các mục thành công' });
  } catch (error) {
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error.message}` });
  }
});

// Lấy danh sách sản phẩm trong thùng rác
router.get('/getsanphamtrash/:idtheloai', async (req, res) => {
  try {
    const idtheloai = req.params.idtheloai
    const theloai = await LoaiSP.LoaiSP.findById(idtheloai)
    const sanpham = await Promise.all(
      theloai.chitietsp.map(async sp => {
        const sp1 = await Sp.ChitietSp.findOne({ _id: sp._id, isDeleted: true })
        if (!sp1) return null
        return {
          _id: sp1._id,
          name: sp1.name,
          image: sp1.image,
          price: sp1.price
        }
      })
    )
    res.json(sanpham.filter(Boolean))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Hoàn tác sản phẩm từ thùng rác
router.post('/restore-sanpham', async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    await Sp.ChitietSp.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: false } }
    )

    res.json({ message: 'Hoàn tác sản phẩm thành công' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

module.exports = router
const router = require('express').Router()
const LoaiSP = require('../models/LoaiSanPham')
const Sp = require('../models/chitietSpModel')
const unicode = require('unidecode')
const Category = require('../models/CategoryModel')

function removeSpecialChars (str) {
  const specialChars = /[:+,!@#$%^&*()\-/?.\s]/g // Bao gồm cả dấu cách (\s)
  return str
    .replace(specialChars, '-') // Thay tất cả ký tự đặc biệt và dấu cách bằng dấu -
    .replace(/-+/g, '-') // Loại bỏ dấu - thừa (nhiều dấu liền nhau chỉ còn 1)
    .replace(/^-|-$/g, '') // Loại bỏ dấu - ở đầu hoặc cuối chuỗi
}

router.post('/postloaisp', async (req, res) => {
  try {
    const {
      name,
      manhinh,
      chip,
      ram,
      dungluong,
      camera,
      pinsac,
      hang,
      congsac,
      thongtin,
      category,
      khuyenmai
    } = req.body
    const namekhongdau1 = unicode(name)
    const namekhongdau = removeSpecialChars(namekhongdau1)
    const cate = await Category.findById(category);
    if (!cate || cate.children.length > 0) {
      return res.status(400).json({ message: 'Danh mục này không thể chứa thể loại' });
    }
    const tensp = new LoaiSP.LoaiSP({
      name,
      manhinh,
      chip,
      ram,
      dungluong,
      camera,
      pinsac,
      hang,
      congsac,
      thongtin,
      namekhongdau,
      category: category,
      khuyenmai
    })
    cate.theloai.push(tensp._id);
    await cate.save();
    await tensp.save()
    res.json(tensp)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post('/putloaisp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      manhinh,
      chip,
      ram,
      dungluong,
      camera,
      pinsac,
      hang,
      congsac,
      thongtin,
      category,
      khuyenmai // ID Category (mới) do FE gửi lên
    } = req.body;

    // 1. Tìm LoạiSP cũ - thêm filter isDeleted: false
    const loaiSpOld = await LoaiSP.LoaiSP.findOne({ _id: id, isDeleted: false });
    if (!loaiSpOld) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại' });
    }

    // 2. Nếu bạn yêu cầu Category mới phải hợp lệ (tồn tại, không có con,...)
    //    thì kiểm tra.
    //    Nếu category là chuỗi rỗng hoặc null, tùy bạn xử lý.
    if (category) {
      const cateNew = await Category.findById(category);
      if (!cateNew) {
        return res.status(400).json({ message: 'Danh mục mới không tồn tại' });
      }
      if (cateNew.children && cateNew.children.length > 0) {
        return res.status(400).json({ message: 'Danh mục này không thể chứa thể loại' });
      }
    }

    // 3. Kiểm tra Category cũ và mới
    //    Trường hợp LoạiSP cũ chưa có category => loaiSpOld.category = null/undefined
    //    Kiểm tra cẩn thận tránh .toString() trên null
    const oldCategoryId = loaiSpOld.category ? loaiSpOld.category.toString() : null;
    const newCategoryId = category || null; // FE có thể gửi '' => ta chuyển thành null

    // Nếu Category cũ khác Category mới -> xóa LoạiSP khỏi theloai[] của cate cũ, thêm vào cate mới
    if (oldCategoryId && newCategoryId && oldCategoryId !== newCategoryId) {
      // 3a. Tìm Category cũ
      const cateOld = await Category.findById(oldCategoryId);
      if (cateOld) {
        // Lọc bỏ LoạiSP này trong mảng theloai
        cateOld.theloai = cateOld.theloai.filter(
          (itemId) => itemId.toString() !== loaiSpOld._id.toString()
        );
        await cateOld.save();
      }

      // 3b. Tìm Category mới và push _id LoạiSP vào
      const cateNew = await Category.findById(newCategoryId);
      if (cateNew) {
        cateNew.theloai.push(loaiSpOld._id);
        await cateNew.save();
      }
    }

    // Nếu cũ là null, mới != null => thêm vào cate mới
    if (!oldCategoryId && newCategoryId) {
      const cateNew = await Category.findById(newCategoryId);
      if (cateNew) {
        cateNew.theloai.push(loaiSpOld._id);
        await cateNew.save();
      }
    }

    // Nếu cũ != null, mới là null => xóa LoạiSP khỏi cate cũ
    if (oldCategoryId && !newCategoryId) {
      const cateOld = await Category.findById(oldCategoryId);
      if (cateOld) {
        cateOld.theloai = cateOld.theloai.filter(
          (itemId) => itemId.toString() !== loaiSpOld._id.toString()
        );
        await cateOld.save();
      }
    }

    // 4. Cập nhật LoạiSP
    const namekhongdau1 = unicode(name || '');
    const namekhongdau = removeSpecialChars(namekhongdau1);

    loaiSpOld.name = name || '';
    loaiSpOld.manhinh = manhinh || '';
    loaiSpOld.chip = chip || '';
    loaiSpOld.ram = ram || '';
    loaiSpOld.dungluong = dungluong || '';
    loaiSpOld.camera = camera || '';
    loaiSpOld.pinsac = pinsac || '';
    loaiSpOld.hang = hang || '';
    loaiSpOld.congsac = congsac || '';
    loaiSpOld.thongtin = thongtin || '';
    loaiSpOld.namekhongdau = namekhongdau;
    loaiSpOld.category = newCategoryId;
    loaiSpOld.khuyenmai=khuyenmai || "";// Lưu category (hoặc null) vào LoạiSP

    await loaiSpOld.save();

    res.json({ message: 'Sửa thành công', loaiSp: loaiSpOld });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

// Đã thêm filter isDeleted: false
router.get('/getchitiettl/:idtheloai', async (req, res) => {
  try {
    const idtheloai = req.params.idtheloai
    const theloai = await LoaiSP.LoaiSP.findOne({ _id: idtheloai, isDeleted: false })
    
    if (!theloai) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại hoặc thể loại đã bị xóa' })
    }
    
    res.json(theloai)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Đã thêm filter isDeleted: false
router.get('/getchitiet-theloai/:nametheloai', async (req, res) => {
  try {
    const nametheloai = req.params.nametheloai
    const theloai = await LoaiSP.LoaiSP.findOne({ namekhongdau: nametheloai, isDeleted: false })
    
    if (!theloai) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại hoặc thể loại đã bị xóa' })
    }
    
    res.json(theloai)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post('/deleteloaisp/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const loaiSp = await LoaiSP.LoaiSP.findById(id);
    if (!loaiSp) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại' });
    }

    // Xóa chi tiết sản phẩm (nếu cần)
    await Sp.ChitietSp.deleteMany({ _id: { $in: loaiSp.chitietsp } });

    // Xóa reference trong Category
    let resultUpdate = null;
    if (loaiSp.category) {
      resultUpdate = await Category.updateOne(
        { _id: loaiSp.category },
        { $pull: { theloai: loaiSp._id } }
      );
    }

    // Kiểm tra nếu Category vẫn còn tham chiếu
    // (vd: do ObjectId/string không khớp)
    if (resultUpdate && resultUpdate.modifiedCount === 0) {
      console.error(
        `Cảnh báo: LoạiSP ${loaiSp._id} vẫn còn trong mảng 'theloai' của Category ${loaiSp.category}`
      );
    }

    // Xoá chính LoaiSP
    await LoaiSP.LoaiSP.deleteOne({ _id: id });

    res.json({ message: 'Xoá LoạiSP thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

router.post('/deletehangloatloaisp', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' });
    }

    const loaiSPs = await LoaiSP.LoaiSP.find({ _id: { $in: ids } });

    if (loaiSPs.length === 0) {
      return res
        .status(404)
        .json({ message: 'Không tìm thấy thể loại nào để xoá' });
    }

    await Promise.all(
      loaiSPs.map(async (loaiSP) => {
        // Gắn isDeleted = true (xóa mềm)
        loaiSP.isDeleted = true;
        await loaiSP.save();

        // Gắn isDeleted = true cho các chi tiết sản phẩm liên quan (nếu cần)
        await Sp.ChitietSp.updateMany(
          { _id: { $in: loaiSP.chitietsp } },
          { $set: { isDeleted: true } }
        );

        // KHÔNG xóa khỏi Category.theloai để vẫn giữ liên kết
        // Nếu bạn muốn ẩn luôn thì dùng populate có match: { isDeleted: false }
      })
    );

    res.json({ message: `Đã xoá mềm ${ids.length} thể loại thành công` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

// Đã có filter isDeleted: false (giữ nguyên)
router.get('/theloaisanpham', async (req, res) => {
  try {
    const theloai = await LoaiSP.LoaiSP.find({ isDeleted: false }).lean()
    const theloaijson = await Promise.all(
      theloai.map(async tl => {
        return {
          _id: tl._id,
          name: tl.name,
          namekhongdau: tl.namekhongdau
        }
      })
    )
    res.json(theloaijson)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Lỗi khi tải danh sách thể loại', error: error.message });
  }
})

// Đã có filter isDeleted: false (giữ nguyên)
router.get('/theloaiadmin', async (req, res) => {
  try {
    const theloai = await LoaiSP.LoaiSP.find({ isDeleted: false }).lean()
    const theloaijson = await Promise.all(
      theloai.map(async tl => {
        return {
          _id: tl._id,
          name: tl.name,
          chip: tl.chip,
          ram: tl.ram,
          dungluong: tl.dungluong,
          camera: tl.camera,
          pinsac: tl.pinsac,
          hang: tl.hang,
          congsac: tl.congsac,
          khuyenmai: tl.khuyenmai
        }
      })
    )
    res.json(theloaijson)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Lỗi khi tải danh sách thể loại', error: error.message });
  }
})

router.post('/restoreloaisp/:id', async (req, res) => {
  try {
    const loaiSp = await LoaiSP.LoaiSP.findById(req.params.id);
    if (!loaiSp) return res.status(404).json({ message: 'Không tìm thấy' });
    loaiSp.isDeleted = false;
    await loaiSp.save();
    res.json({ message: 'Khôi phục thành công' });
  } catch (error) {
    res.status(500).json({ message: `Lỗi: ${error}` });
  }
});

// Đã có filter isDeleted: true (giữ nguyên)
router.get('/theloaitrash', async (req, res) => {
  try {
    const theloai = await LoaiSP.LoaiSP.find({ isDeleted: true }).lean()
    const theloaijson = await Promise.all(
      theloai.map(async tl => {
        return {
          _id: tl._id,
          name: tl.name,
          chip: tl.chip,
          ram: tl.ram,
          dungluong: tl.dungluong,
          camera: tl.camera,
          pinsac: tl.pinsac,
          hang: tl.hang,
          congsac: tl.congsac,
          khuyenmai: tl.khuyenmai
        }
      })
    )
    res.json(theloaijson)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Hoàn tác thể loại từ thùng rác
router.post('/restore-theloai', async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' })
    }

    const updateResult = await LoaiSP.LoaiSP.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: false } }
    )

    // Hoàn tác các sản phẩm liên quan
    await Sp.ChitietSp.updateMany(
      { idloaisp: { $in: ids } },
      { $set: { isDeleted: false } }
    )

    res.json({ 
      message: 'Hoàn tác thể loại thành công',
      modifiedCount: updateResult.modifiedCount 
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

// Thêm mới: Route lấy sản phẩm theo loại với filter isDeleted: false
router.get('/san-pham-pt/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 8, sort = 'asc' } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;
    
    // Find the category by namekhongdau (slug)
    const theloai = await LoaiSP.LoaiSP.findOne({ namekhongdau: slug, isDeleted: false });
    
    if (!theloai) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại' });
    }
    
    // Find products for this category with pagination and sorting
    let query = Sp.ChitietSp.find({ 
      idloaisp: theloai._id,
      isDeleted: false
    });
    
    // Apply sorting
    if (sort === 'asc') {
      query = query.sort({ giaban: 1 });
    } else if (sort === 'desc') {
      query = query.sort({ giaban: -1 });
    }
    
    // Get total count for pagination
    const totalProducts = await Sp.ChitietSp.countDocuments({ 
      idloaisp: theloai._id,
      isDeleted: false
    });
    
    // Apply pagination
    const products = await query
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limitNum);
    
    // Return the response
    res.json({
      _id: theloai._id,
      nametheloai: theloai.name,
      namekhongdau: theloai.namekhongdau,
      sanpham: products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts,
        limit: limitNum
      }
    });
    
  } catch (error) {
    console.error('Lỗi khi tải sản phẩm:', error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});


module.exports = router
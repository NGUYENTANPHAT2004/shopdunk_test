const express = require('express')
const router = express.Router()
const DungLuong = require('../models/DungLuongModel')
const LoaiSP = require('../models/LoaiSanPham')
const MauSac = require('../models/MauSacModel')

router.post('/postdungluong/:idloaisp', async (req, res) => {
  try {
    const idloaisp = req.params.idloaisp
    const { name } = req.body
    const loaisp = await LoaiSP.LoaiSP.findById(idloaisp)
    const dungluong = new DungLuong.dungluong({ name, idloaisp })
    loaisp.dungluongmay.push(dungluong._id)
    await dungluong.save()
    await loaisp.save()
    res.json(dungluong)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.post('/editdungluong/:iddungluong', async (req, res) => {
  try {
    const iddungluong = req.params.iddungluong

    const { name } = req.body
    const dungluong = await DungLuong.dungluong.findById(iddungluong)
    dungluong.name = name
    await dungluong.save()
    res.json(dungluong)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.get('/geteditdl/:id', async (req, res) => {
  try {
    const id = req.params.id
    const dungluong = await DungLuong.dungluong.findById(id)
    res.json(dungluong)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` })
  }
})

router.get('/dungluongmay/:namekhongdau', async (req, res) => {
  try {
    const namekhongdau = req.params.namekhongdau;
    const loaisp = await LoaiSP.LoaiSP.findOne({ namekhongdau });

    const dungluong = await Promise.all(
      loaisp.dungluongmay.map(async (dl) => {
        const dluong = await DungLuong.dungluong.findOne({ _id: dl._id, isDeleted: false });
        if (!dluong) return null;

        const mausac = await Promise.all(
          dluong.mausac.map(async (ms) => {
            const mausac1 = await MauSac.mausac.findOne({ _id: ms._id, isDeleted: false });
            if (!mausac1) return null;

            return {
              _id: mausac1._id,
              name: mausac1.name,
              price:
                loaisp.khuyenmai === 0
                  ? mausac1.price
                  : mausac1.price - (mausac1.price * loaisp.khuyenmai) / 100,
              giagoc: mausac1.price,
              khuyenmai: loaisp.khuyenmai,
              images: mausac1.image
            };
          })
        );

        return {
          _id: dluong._id,
          name: dluong.name,
          mausac: mausac.filter(Boolean)
        };
      })
    );

    res.json(dungluong.filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

router.get('/getmausacgh/:iddungluong', async (req, res) => {
  try {
    const iddungluong = req.params.iddungluong;
    const dungluong = await DungLuong.dungluong.findById(iddungluong);
    const mausac = await Promise.all(
      dungluong.mausac.map(async (ms) => {
        const maus = await MauSac.mausac.findOne({ _id: ms._id, isDeleted: false });
        if (!maus) return null;

        return {
          _id: maus._id,
          name: maus.name,
          price: maus.price || 0
        };
      })
    );

    res.json(mausac.filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

// ĐÃ SỬA: Không xóa dung lượng khỏi dungluongmay khi xóa mềm
router.post('/deletedungluong/:iddungluong', async (req, res) => {
  try {
    const iddungluong = req.params.iddungluong;
    const dungluong = await DungLuong.dungluong.findById(iddungluong);
    
    if (!dungluong) {
      return res.status(404).json({ message: 'Không tìm thấy dung lượng' });
    }

    // Xoá mềm dung lượng - KHÔNG xóa khỏi dungluongmay
    dungluong.isDeleted = true;
    await dungluong.save();

    // Xoá mềm màu sắc liên quan
    await Promise.all(
      dungluong.mausac.map(async mausacId => {
        const mausac = await MauSac.mausac.findById(mausacId);
        if (mausac) {
          mausac.isDeleted = true;
          await mausac.save();
        }
      })
    );

    res.json({ message: 'Đã xoá mềm dung lượng và màu sắc' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

// ĐÃ SỬA: Không xóa dung lượng khỏi dungluongmay khi xóa mềm hàng loạt
router.post('/deletedungluonghangloat', async (req, res) => {
  try {
    // Accept both iddungluongList and ids for backward compatibility
    const ids = req.body.ids || req.body.iddungluongList;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' });
    }

    // Xóa mềm dung lượng
    await DungLuong.dungluong.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    );

    // Xóa mềm màu sắc liên quan
    const dungluongList = await DungLuong.dungluong.find({ _id: { $in: ids } });
    
    for (const dungluong of dungluongList) {
      if (dungluong.mausac && dungluong.mausac.length > 0) {
        await MauSac.mausac.updateMany(
          { _id: { $in: dungluong.mausac } },
          { $set: { isDeleted: true } }
        );
      }
    }

    res.json({ message: 'Đã xoá mềm danh sách dung lượng', deletedIds: ids });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

router.get('/dungluong/:idloaisp', async (req, res) => {
  try {
    const idloaisp = req.params.idloaisp;
    const loaisp = await LoaiSP.LoaiSP.findById(idloaisp);
    
    if (!loaisp) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại' });
    }
    
    const dungluong = await Promise.all(
      loaisp.dungluongmay.map(async dl => {
        const dluong = await DungLuong.dungluong.findOne({ _id: dl, isDeleted: false });
        if (!dluong) return null;
        return {
          _id: dluong._id,
          name: dluong.name
        };
      })
    );
    res.json(dungluong.filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

// ĐÃ SỬA: route dungluongtrash để tìm dung lượng đã xóa mềm
router.get('/dungluongtrash/:idtheloai', async (req, res) => {
  try {
    const idtheloai = req.params.idtheloai;
    const theloai = await LoaiSP.LoaiSP.findById(idtheloai);
    
    if (!theloai) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại' });
    }
    
    console.log("Số lượng dungluongmay:", theloai.dungluongmay.length);
    
    const dungluong = await Promise.all(
      theloai.dungluongmay.map(async dl => {
        // Tìm dung lượng đã xóa mềm (isDeleted = true)
        const dluong = await DungLuong.dungluong.findOne({ 
          _id: dl, 
          isDeleted: true 
        });
        
        if (!dluong) return null;
        
        console.log("Tìm thấy dung lượng đã xóa:", dluong._id);
        return {
          _id: dluong._id,
          name: dluong.name
        };
      })
    );
    
    const filteredResults = dungluong.filter(Boolean);
    console.log("Số lượng kết quả có trong thùng rác:", filteredResults.length);
    res.json(filteredResults);
  } catch (error) {
    console.error("Lỗi khi lấy thùng rác:", error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

// Route khôi phục dung lượng từ thùng rác
router.post('/restore-dungluong', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ID không hợp lệ' });
    }

    // Khôi phục dung lượng
    await DungLuong.dungluong.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: false } }
    );

    // Nếu cần, khôi phục cả màu sắc liên quan
    for (const id of ids) {
      const dungluong = await DungLuong.dungluong.findById(id);
      if (dungluong && dungluong.mausac && dungluong.mausac.length > 0) {
        await MauSac.mausac.updateMany(
          { _id: { $in: dungluong.mausac } },
          { $set: { isDeleted: false } }
        );
      }
    }

    res.json({ message: 'Hoàn tác dung lượng thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

router.post('/deletedungluong/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const dungluong = await DungLuong.dungluong.findById(id);
    if (!dungluong) {
      return res.status(404).json({ message: 'Không tìm thấy dung lượng' });
    }

    // Chỉ thực hiện xóa mềm, không xóa khỏi mảng dungluongmay
    dungluong.isDeleted = true;
    await dungluong.save();

    res.json({ message: 'Xóa thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error}` });
  }
});

module.exports = router
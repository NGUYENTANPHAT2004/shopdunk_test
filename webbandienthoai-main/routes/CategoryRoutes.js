const router = require('express').Router()
const Category = require('../models/CategoryModel');
const mongoose = require('mongoose');
const unicode = require('unidecode')
function removeSpecialChars(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
}

// 🟢 API: Tạo danh mục mới (hỗ trợ danh mục đa cấp)
router.post('/createcate', async (req, res) => {
  try {
      let { name, parent } = req.body;
      const namekhongdau = removeSpecialChars(name);

      // Kiểm tra nếu `parent` là `"null"` string → chuyển thành `null`
      if (parent === "null" || parent === "" || parent === undefined) {
          parent = null;
      } else if (!mongoose.Types.ObjectId.isValid(parent)) {
          return res.status(400).json({ message: "ID danh mục cha không hợp lệ" });
      }

      // Tạo danh mục mới
      const category = new Category({ name, namekhongdau, parent });

      await category.save();

      // Nếu có danh mục cha, cập nhật danh mục cha để thêm vào children[]
      if (parent) {
          const parentCategory = await Category.findById(parent);
          if (!parentCategory) {
              return res.status(400).json({ message: "Danh mục cha không tồn tại" });
          }
          parentCategory.children.push(category._id);
          await parentCategory.save();
      }

      res.status(201).json(category);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: `Đã xảy ra lỗi: ${error.message}` });
  }
});

router.get('/listcate', async (req, res) => {
  try {
    const categories = await Category.find({ parent: null }).populate({
      path: 'children',
      populate: { path: 'children' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: `Lỗi: ${error.message}` });
  }
});

module.exports = router;

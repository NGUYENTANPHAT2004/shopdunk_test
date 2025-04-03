/**
 * Controller quản lý dữ liệu huấn luyện AI
 */
const { ChatTraining } = require('../../models/Chatmodel');
require('dotenv').config();
/**
 * Tạo dữ liệu huấn luyện mới
 * @param {Object} data - Dữ liệu huấn luyện
 * @param {string} userId - ID người tạo
 * @returns {Promise<Object>} - Dữ liệu huấn luyện đã tạo
 */
const createTraining = async (data, userId) => {
  try {
    // Tự động tạo keywords nếu chưa có
    if (!data.keywords || data.keywords.length === 0) {
      const keywords = generateKeywords(data.question);
      data.keywords = keywords;
    }
    
    const trainingData = new ChatTraining({
      ...data,
      createdBy: userId,
      updatedBy: userId
    });
    
    await trainingData.save();
    console.log(`✅ Đã tạo dữ liệu huấn luyện mới: ${trainingData._id}`);
    return trainingData;
  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu huấn luyện:', error);
    throw error;
  }
};

/**
 * Cập nhật dữ liệu huấn luyện
 * @param {string} id - ID dữ liệu huấn luyện
 * @param {Object} data - Dữ liệu cập nhật
 * @param {string} userId - ID người cập nhật
 * @returns {Promise<Object>} - Dữ liệu huấn luyện đã cập nhật
 */
const updateTraining = async (id, data, userId) => {
  try {
    // Cập nhật keywords nếu câu hỏi thay đổi
    if (data.question) {
      data.keywords = generateKeywords(data.question);
    }
    
    const trainingData = await ChatTraining.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy: userId,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!trainingData) {
      throw new Error('Không tìm thấy dữ liệu huấn luyện');
    }
    
    console.log(`✅ Đã cập nhật dữ liệu huấn luyện: ${id}`);
    return trainingData;
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật dữ liệu huấn luyện:', error);
    throw error;
  }
};

/**
 * Xóa dữ liệu huấn luyện
 * @param {string} id - ID dữ liệu huấn luyện
 * @returns {Promise<boolean>} - Kết quả xóa
 */
const deleteTraining = async (id) => {
  try {
    const result = await ChatTraining.findByIdAndDelete(id);
    
    if (!result) {
      throw new Error('Không tìm thấy dữ liệu huấn luyện');
    }
    
    console.log(`✅ Đã xóa dữ liệu huấn luyện: ${id}`);
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi xóa dữ liệu huấn luyện:', error);
    throw error;
  }
};

/**
 * Lấy tất cả dữ liệu huấn luyện theo bộ lọc
 * @param {Object} filters - Bộ lọc (category, isActive, etc.)
 * @returns {Promise<Array>} - Danh sách dữ liệu huấn luyện
 */
const getAllTraining = async (filters = {}) => {
  try {
    const query = { ...filters };
    
    // Tìm kiếm theo text nếu có
    if (filters.search) {
      query.$text = { $search: filters.search };
      delete query.search;
    }
    
    const trainingData = await ChatTraining.find(query)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ updatedAt: -1 })
      .lean();
    
    return trainingData;
  } catch (error) {
    console.error('❌ Lỗi khi lấy dữ liệu huấn luyện:', error);
    throw error;
  }
};

/**
 * Lấy chi tiết một dữ liệu huấn luyện
 * @param {string} id - ID dữ liệu huấn luyện
 * @returns {Promise<Object>} - Chi tiết dữ liệu huấn luyện
 */
const getTrainingDetail = async (id) => {
  try {
    const trainingData = await ChatTraining.findById(id)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .lean();
    
    if (!trainingData) {
      throw new Error('Không tìm thấy dữ liệu huấn luyện');
    }
    
    return trainingData;
  } catch (error) {
    console.error('❌ Lỗi khi lấy chi tiết dữ liệu huấn luyện:', error);
    throw error;
  }
};

/**
 * Lấy tất cả danh mục (categories) hiện có
 * @returns {Promise<Array>} - Danh sách các danh mục
 */
const getAllCategories = async () => {
  try {
    const categories = await ChatTraining.distinct('category');
    return categories;
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh mục:', error);
    throw error;
  }
};

/**
 * Cập nhật trạng thái kích hoạt của dữ liệu huấn luyện
 * @param {string} id - ID dữ liệu huấn luyện
 * @param {boolean} isActive - Trạng thái kích hoạt
 * @returns {Promise<Object>} - Dữ liệu huấn luyện đã cập nhật
 */
const toggleActiveStatus = async (id, isActive) => {
  try {
    const trainingData = await ChatTraining.findByIdAndUpdate(
      id,
      {
        isActive,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!trainingData) {
      throw new Error('Không tìm thấy dữ liệu huấn luyện');
    }
    
    console.log(`✅ Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} dữ liệu huấn luyện: ${id}`);
    return trainingData;
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật trạng thái:', error);
    throw error;
  }
};

/**
 * Import nhiều dữ liệu huấn luyện từ file
 * @param {Array} data - Mảng dữ liệu huấn luyện
 * @param {string} userId - ID người nhập
 * @returns {Promise<Object>} - Kết quả nhập
 */
const importTrainingData = async (data, userId) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Dữ liệu không hợp lệ');
    }
    
    const results = {
      total: data.length,
      success: 0,
      errors: []
    };
    
    for (const item of data) {
      try {
        // Kiểm tra dữ liệu cần thiết
        if (!item.question || !item.answer) {
          results.errors.push({
            item,
            error: 'Thiếu câu hỏi hoặc câu trả lời'
          });
          continue;
        }
        
        // Tạo keywords
        const keywords = generateKeywords(item.question);
        
        // Tạo dữ liệu huấn luyện mới
        const trainingData = new ChatTraining({
          question: item.question,
          answer: item.answer,
          keywords,
          category: item.category || 'general',
          createdBy: userId,
          updatedBy: userId,
          isActive: item.isActive !== false
        });
        
        await trainingData.save();
        results.success++;
      } catch (error) {
        results.errors.push({
          item,
          error: error.message
        });
      }
    }
    
    console.log(`✅ Đã nhập ${results.success}/${results.total} dữ liệu huấn luyện`);
    return results;
  } catch (error) {
    console.error('❌ Lỗi khi nhập dữ liệu huấn luyện:', error);
    throw error;
  }
};

/**
 * Tạo keywords từ câu hỏi
 * @param {string} question - Câu hỏi
 * @returns {Array} - Mảng keywords
 */
const generateKeywords = (question) => {
  if (!question) return [];
  
  // Các từ ngắn cần bỏ qua
  const stopwords = ['và', 'hoặc', 'nếu', 'thì', 'là', 'của', 'có', 'không', 'cho', 'tôi', 'bạn', 'các'];
  
  // Phân tách câu hỏi thành các từ, loại bỏ dấu câu và chữ thường
  const words = question.toLowerCase()
    .replace(/[.,;:?!()]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopwords.includes(word))
    .slice(0, 10); // Chỉ lấy tối đa 10 từ khóa
  
  return [...new Set(words)]; // Loại bỏ từ khóa trùng lặp
};

module.exports = {
  createTraining,
  updateTraining,
  deleteTraining,
  getAllTraining,
  getTrainingDetail,
  getAllCategories,
  toggleActiveStatus,
  importTrainingData
};
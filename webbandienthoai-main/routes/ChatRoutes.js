const express = require('express');
const router = express.Router();
const chatController = require('../socket/chat/ChatController');
const trainingController = require('../socket/chat/TrainingController'); // Fixed capitalization
const { ChatSession, ChatMessage, ChatTraining, ChatAnalytics } = require('../models/Chatmodel');

/**
 * ==============================================
 * USER-FACING CHAT API ENDPOINTS
 * ==============================================
 */

/**
 * Process a user message and get AI response
 * For environments that don't support WebSockets
 */
router.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, userId, guestInfo = null } = req.body;
    
    // Validate input
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu nội dung tin nhắn'
      });
    }
    
    // Collect client info
    const clientInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    // Create new session if needed
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const userData = userId ? { userId } : { guestInfo };
      const session = await chatController.createSession(userData, clientInfo);
      currentSessionId = session._id.toString();
    }
    
    // Process the message
    const response = await chatController.processMessage(
      currentSessionId,
      message,
      userId,
      guestInfo,
      clientInfo
    );
    
    // Return successful response
    res.json({
      success: true,
      sessionId: currentSessionId,
      response: {
        id: response.id,
        message: response.message,
        source: response.source,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Lỗi API chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý tin nhắn',
      error: error.message
    });
  }
});

/**
 * Retrieve chat history for a session
 */
router.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify session exists
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiên chat'
      });
    }
    
    // Get message history
    const messages = await chatController.getSessionHistory(sessionId);
    
    res.json({
      success: true,
      sessionId,
      session,
      messages
    });
  } catch (error) {
    console.error('❌ Lỗi lấy lịch sử chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy lịch sử chat',
      error: error.message
    });
  }
});

/**
 * Submit feedback for an AI message
 */
router.post('/api/chat/feedback', async (req, res) => {
  try {
    const { messageId, isHelpful, comment } = req.body;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu ID tin nhắn'
      });
    }
    
    const feedback = await chatController.saveFeedback(
      messageId,
      isHelpful,
      comment || ''
    );
    
    res.json({
      success: true,
      messageId,
      feedback
    });
  } catch (error) {
    console.error('❌ Lỗi lưu phản hồi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lưu phản hồi',
      error: error.message
    });
  }
});

/**
 * End a chat session
 */
router.post('/api/chat/end/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await chatController.endSession(sessionId);
    
    res.json({
      success: true,
      sessionId,
      message: 'Đã kết thúc phiên chat',
      session
    });
  } catch (error) {
    console.error('❌ Lỗi kết thúc phiên chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi kết thúc phiên chat',
      error: error.message
    });
  }
});

/**
 * Create a new chat session
 */
router.post('/api/chat/session', async (req, res) => {
  try {
    const { userId, guestInfo } = req.body;
    
    // Collect client info
    const clientInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    // Create new session
    const userData = userId ? { userId } : { guestInfo };
    const session = await chatController.createSession(userData, clientInfo);
    
    res.json({
      success: true,
      message: 'Đã tạo phiên chat mới',
      sessionId: session._id,
      session
    });
  } catch (error) {
    console.error('❌ Lỗi tạo phiên chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo phiên chat',
      error: error.message
    });
  }
});

/**
 * ==============================================
 * ADMIN APIs FOR TRAINING DATA MANAGEMENT
 * (Authentication disabled)
 * ==============================================
 */

/**
 * Get all training data with filters and pagination
 */
router.get('/api/admin/chat/training', async (req, res) => {
  try {
    // Pass all query parameters to controller
    const result = await trainingController.getAllTraining(req.query);
    
    res.json({
      success: true,
      count: result.count,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Lỗi lấy dữ liệu training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy dữ liệu training',
      error: error.message
    });
  }
});

/**
 * Add sample training data (for testing)
 */
router.post('/api/admin/chat/training/samples', async (req, res) => {
  try {
    const result = await trainingController.addSampleTrainingData();
    
    res.json({
      success: true,
      message: 'Đã thêm dữ liệu mẫu thành công',
      result
    });
  } catch (error) {
    console.error('❌ Lỗi thêm dữ liệu mẫu:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi thêm dữ liệu mẫu',
      error: error.message
    });
  }
});

/**
 * Get details of a specific training item
 */
router.get('/api/admin/chat/training/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await trainingController.getTrainingDetail(id);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Lỗi lấy chi tiết training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy chi tiết training',
      error: error.message
    });
  }
});

/**
 * Create new training data
 */
router.post('/api/admin/chat/training', async (req, res) => {
  try {
    // Skip user authentication
    const userId = null;
    
    const result = await trainingController.createTraining(req.body, userId);
    
    res.json({
      success: true,
      message: 'Đã tạo dữ liệu training mới',
      data: result
    });
  } catch (error) {
    console.error('❌ Lỗi tạo dữ liệu training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo dữ liệu training',
      error: error.message
    });
  }
});

/**
 * Update existing training data
 */
router.put('/api/admin/chat/training/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = null; // Skip user authentication
    
    const result = await trainingController.updateTraining(id, req.body, userId);
    
    res.json({
      success: true,
      message: 'Đã cập nhật dữ liệu training',
      data: result
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật dữ liệu training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật dữ liệu training',
      error: error.message
    });
  }
});

/**
 * Delete training data
 */
router.delete('/api/admin/chat/training/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await trainingController.deleteTraining(id);
    
    res.json({
      success: true,
      message: 'Đã xóa dữ liệu training',
      id
    });
  } catch (error) {
    console.error('❌ Lỗi xóa dữ liệu training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa dữ liệu training',
      error: error.message
    });
  }
});

/**
 * Import multiple training items
 */
router.post('/api/admin/chat/training/import', async (req, res) => {
  try {
    const { items } = req.body;
    const userId = null; // Skip user authentication
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ'
      });
    }
    
    const result = await trainingController.importTrainingData(items, userId);
    
    res.json({
      success: true,
      message: `Đã import ${result.success}/${result.total} dữ liệu training`,
      result
    });
  } catch (error) {
    console.error('❌ Lỗi import dữ liệu training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi import dữ liệu training',
      error: error.message
    });
  }
});

/**
 * Toggle active status of training data
 */
router.patch('/api/admin/chat/training/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số isActive'
      });
    }
    
    const result = await trainingController.toggleActiveStatus(id, isActive);
    
    res.json({
      success: true,
      message: `Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} dữ liệu training`,
      data: result
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật trạng thái training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật trạng thái training',
      error: error.message
    });
  }
});

/**
 * Get all available training categories
 */
router.get('/api/admin/chat/categories', async (req, res) => {
  try {
    const categories = await trainingController.getAllCategories();
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('❌ Lỗi lấy danh mục training:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh mục training',
      error: error.message
    });
  }
});

module.exports = router;
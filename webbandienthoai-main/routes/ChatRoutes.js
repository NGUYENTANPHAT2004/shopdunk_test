const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../socket/chat/middlewares/authMiddleware');
const { authenticateAdmin } = require('../socket/chat/middlewares/Addminmidleware');
const chatController = require('../socket/chat/ChatController');
const trainingController = require('../socket/chat/trainingController');
const { ChatSession, ChatMessage, ChatTraining, ChatAnalytics } = require('../models/Chatmodel');

/**
 * Middleware kiểm tra API key cho chat
 */
const verifyAPIKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    // Use environment variable for API key and fallback only for development
    const expectedKey = process.env.NODE_ENV === 'production' 
      ? process.env.CHAT_API_KEY 
      : (process.env.CHAT_API_KEY || 'beeshop_chat_api_key_2025');
    
    if (!apiKey || apiKey !== expectedKey) {
      console.log('Invalid API Key:', apiKey);
      return res.status(401).json({
        success: false,
        message: 'API key không hợp lệ'
      });
    }
    
    next();
  };
  
  /**
   * API endpoint cho chatbot (phục vụ môi trường không hỗ trợ WebSocket)
   */
  router.post('/api/chat', verifyAPIKey, async (req, res) => {
    try {
      console.log('Chat API request received:', req.body);
      const { message, sessionId, userId, guestInfo = null } = req.body;
      
      // Kiểm tra dữ liệu đầu vào
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu nội dung tin nhắn'
        });
      }
      
      // Thông tin client
      const clientInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      // Nếu chưa có sessionId, tạo phiên mới
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        // Kiểm tra xem có thông tin người dùng hay không
        if (!userId && !guestInfo) {
          return res.status(400).json({
            success: false,
            message: 'Cần cung cấp thông tin người dùng hoặc khách'
          });
        }
        
        // Ensure guestInfo contains required data if present
        if (guestInfo && !guestInfo.name) {
          return res.status(400).json({
            success: false,
            message: 'Thông tin khách phải có tên'
          });
        }
        
        const userData = userId ? { userId } : { guestInfo };
        const session = await chatController.createSession(userData, clientInfo);
        currentSessionId = session._id.toString();
      }
      
      // Xử lý tin nhắn
      const response = await chatController.processMessage(
        currentSessionId,
        message,
        userId,
        guestInfo,
        clientInfo
      );
      
      // Trả về kết quả
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
   * Lấy lịch sử chat của một phiên
   */
  router.get('/api/chat/history/:sessionId', verifyAPIKey, async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Kiểm tra phiên chat
      const session = await ChatSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiên chat'
        });
      }
      
      // Lấy lịch sử tin nhắn
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
   * Gửi phản hồi về chất lượng tin nhắn
   */
  router.post('/api/chat/feedback', verifyAPIKey, async (req, res) => {
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
   * Kết thúc phiên chat
   */
  router.post('/api/chat/end/:sessionId', verifyAPIKey, async (req, res) => {
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
   * Tạo phiên chat mới
   */
  router.post('/api/chat/session', verifyAPIKey, async (req, res) => {
    try {
      const { userId, guestInfo } = req.body;
      
      if (!userId && (!guestInfo || !guestInfo.name)) {
        return res.status(400).json({
          success: false,
          message: 'Cần cung cấp ID người dùng hoặc thông tin khách'
        });
      }
      
      // Thông tin client
      const clientInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      // Tạo phiên chat mới
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
 * API ROUTES CHO ADMIN
 */

/**
 * Lấy tất cả dữ liệu training
 */
router.get('/api/admin/chat/training', authenticateAdmin, async (req, res) => {
  try {
    const filters = req.query;
    
    const data = await trainingController.getAllTraining(filters);
    
    res.json({
      success: true,
      count: data.length,
      data
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
 * Lấy chi tiết dữ liệu training
 */
router.get('/api/admin/chat/training/:id', authenticateAdmin, async (req, res) => {
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
 * Tạo dữ liệu training mới
 */
router.post('/api/admin/chat/training', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.user._id;
    
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
 * Cập nhật dữ liệu training
 */
router.put('/api/admin/chat/training/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
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
 * Xóa dữ liệu training
 */
router.delete('/api/admin/chat/training/:id', authenticateAdmin, async (req, res) => {
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
 * Import dữ liệu training từ file
 */
router.post('/api/admin/chat/training/import', authenticateAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user._id;
    
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
 * Lấy thông tin phân tích chat
 */
router.get('/api/admin/chat/analytics', authenticateAdmin, async (req, res) => {
  try {
    // Tham số truy vấn
    const { startDate, endDate } = req.query;
    
    // Parse ngày
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Đảm bảo ngày hợp lệ
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // Lấy dữ liệu phân tích
    const analytics = await ChatAnalytics.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });
    
    // Tính tổng các chỉ số
    const totals = {
      sessionCount: 0,
      messageCount: 0,
      authenticatedUsers: 0,
      guestUsers: 0,
      responseSources: {
        training: 0,
        deepseek: 0,
        claude: 0,
        fallback: 0
      }
    };
    
    analytics.forEach(day => {
      totals.sessionCount += day.sessionCount;
      totals.messageCount += day.messageCount;
      totals.authenticatedUsers += day.authenticatedUsers;
      totals.guestUsers += day.guestUsers;
      totals.responseSources.training += day.responseSources.training;
      totals.responseSources.deepseek += day.responseSources.deepseek;
      totals.responseSources.claude += day.responseSources.claude;
      totals.responseSources.fallback += day.responseSources.fallback;
    });
    
    // Tính tỷ lệ phản hồi trung bình
    let avgPositiveRate = 0;
    if (analytics.length > 0) {
      avgPositiveRate = analytics.reduce((sum, day) => sum + day.positiveResponseRate, 0) / analytics.length;
    }
    
    totals.avgPositiveResponseRate = avgPositiveRate;
    
    res.json({
      success: true,
      analytics,
      totals,
      period: {
        start,
        end,
        days: analytics.length
      }
    });
  } catch (error) {
    console.error('❌ Lỗi lấy thông tin phân tích:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin phân tích',
      error: error.message
    });
  }
});

/**
 * Lấy danh sách phiên chat
 */
router.get('/api/admin/chat/sessions', authenticateAdmin, async (req, res) => {
  try {
    // Tham số truy vấn
    const { status, startDate, endDate, limit = 50, skip = 0 } = req.query;
    
    // Xây dựng query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.startTime = {};
      
      if (startDate) {
        query.startTime.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.startTime.$lte = new Date(endDate);
      }
    }
    
    // Đếm tổng số phiên
    const total = await ChatSession.countDocuments(query);
    
    // Lấy dữ liệu phiên
    const sessions = await ChatSession.find(query)
      .populate('userId', 'username')
      .sort({ startTime: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      total,
      count: sessions.length,
      sessions,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + sessions.length)
      }
    });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách phiên chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách phiên chat',
      error: error.message
    });
  }
});

/**
 * Lấy danh sách tin nhắn không trả lời được
 */
router.get('/api/admin/chat/unanswered', authenticateAdmin, async (req, res) => {
  try {
    // Tìm các tin nhắn không trả lời được
    const unansweredMessages = await ChatMessage.find({
      isUnanswered: true,
      sender: 'user'
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
    
    res.json({
      success: true,
      count: unansweredMessages.length,
      messages: unansweredMessages
    });
  } catch (error) {
    console.error('❌ Lỗi lấy tin nhắn không trả lời:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy tin nhắn không trả lời',
      error: error.message
    });
  }
});

/**
 * Cập nhật trạng thái kích hoạt của dữ liệu training
 */
router.patch('/api/admin/chat/training/:id/toggle', authenticateAdmin, async (req, res) => {
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
 * Lấy tất cả danh mục trong dữ liệu training
 */
router.get('/api/admin/chat/categories', authenticateAdmin, async (req, res) => {
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

/**
 * Cập nhật thống kê chat cho một ngày cụ thể
 */
router.post('/api/admin/chat/analytics/update', authenticateAdmin, async (req, res) => {
  try {
    const { date } = req.body;
    
    // Nếu không cung cấp ngày, cập nhật cho ngày hiện tại
    const updateDate = date ? new Date(date) : new Date();
    
    const analyticsService = require('../services/ChatAnalyticsService');
    const result = await analyticsService.updateDailyAnalytics(updateDate);
    
    res.json({
      success: true,
      message: 'Đã cập nhật thống kê chat',
      data: result
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật thống kê chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thống kê chat',
      error: error.message
    });
  }
});

/**
 * Cập nhật thống kê chat cho 30 ngày gần đây
 */
router.post('/api/admin/chat/analytics/update-recent', authenticateAdmin, async (req, res) => {
  try {
    const analyticsService = require('../services/ChatAnalyticsService');
    const result = await analyticsService.updateRecentAnalytics();
    
    res.json({
      success: true,
      message: 'Đã cập nhật thống kê 30 ngày gần đây',
      data: result
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật thống kê gần đây:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thống kê gần đây',
      error: error.message
    });
  }
});

/**
 * Lấy từ khóa phổ biến
 */
router.get('/api/admin/chat/keywords', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const analyticsService = require('../services/ChatAnalyticsService');
    const keywords = await analyticsService.getTopKeywords(limit);
    
    res.json({
      success: true,
      count: keywords.length,
      keywords
    });
  } catch (error) {
    console.error('❌ Lỗi lấy từ khóa phổ biến:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy từ khóa phổ biến',
      error: error.message
    });
  }
});

module.exports = router;
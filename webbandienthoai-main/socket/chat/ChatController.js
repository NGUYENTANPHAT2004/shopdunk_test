/**
 * Controller xử lý chính cho chức năng chat
 */
const { 
    ChatMessage, 
    ChatSession, 
    ChatTraining 
  } = require('../../models/Chatmodel');
  const axios = require('axios');
  
  /**
   * Tạo phiên chat mới
   * @param {Object} userData - Thông tin người dùng
   * @param {Object} clientInfo - Thông tin IP, user agent
   * @returns {Promise<Object>} - Thông tin phiên chat mới
   */
  const createSession = async (userData, clientInfo) => {
    try {
      // Validate input
      if (!userData || ((!userData.userId) && (!userData.guestInfo || !userData.guestInfo.name))) {
        throw new Error('Missing required user information');
      }
      
      const sessionData = {
        clientInfo: clientInfo || {}
      };
      
      // Nếu user đã đăng nhập, thêm ID user vào
      if (userData.userId) {
        sessionData.userId = userData.userId;
      } else if (userData.guestInfo) {
        sessionData.guestInfo = userData.guestInfo;
      }
      
      const session = new ChatSession(sessionData);
      await session.save();
      
      console.log(`✅ Đã tạo phiên chat mới: ${session._id}`);
      return session;
    } catch (error) {
      console.error('❌ Lỗi khi tạo phiên chat:', error);
      throw error;
    }
  };
  
  /**
   * Kết thúc phiên chat
   * @param {string} sessionId - ID phiên chat
   * @returns {Promise<Object>} - Thông tin phiên chat đã kết thúc
   */
  const endSession = async (sessionId) => {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      const session = await ChatSession.findByIdAndUpdate(
        sessionId,
        {
          endTime: new Date(),
          status: 'ended'
        },
        { new: true }
      );
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      console.log(`✅ Đã kết thúc phiên chat: ${sessionId}`);
      return session;
    } catch (error) {
      console.error('❌ Lỗi khi kết thúc phiên chat:', error);
      throw error;
    }
  };
  
  /**
   * Lưu tin nhắn của người dùng
   * @param {string} sessionId - ID phiên chat
   * @param {string} message - Nội dung tin nhắn
   * @param {string|null} userId - ID người dùng (nếu đã đăng nhập)
   * @param {Object|null} guestInfo - Thông tin khách (nếu chưa đăng nhập)
   * @param {Object} clientInfo - Thông tin thiết bị
   * @returns {Promise<Object>} - Thông tin tin nhắn đã lưu
   */
  const saveUserMessage = async (sessionId, message, userId = null, guestInfo = null, clientInfo = {}) => {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      if (!message) {
        throw new Error('Message content is required');
      }
      
      const startTime = Date.now();
      
      const messageData = {
        sessionId,
        message,
        sender: 'user',
        clientInfo: clientInfo || {}
      };
      
      if (userId) {
        messageData.userId = userId;
      } else if (guestInfo) {
        messageData.guestInfo = guestInfo;
      }
      
      const chatMessage = new ChatMessage(messageData);
      await chatMessage.save();
      
      // Cập nhật số lượng tin nhắn trong phiên chat
      await ChatSession.findByIdAndUpdate(
        sessionId,
        { $inc: { messageCount: 1 } }
      );
      
      const processingTime = Date.now() - startTime;
      
      // Cập nhật thời gian xử lý
      await ChatMessage.findByIdAndUpdate(
        chatMessage._id,
        { processingTime }
      );
      
      return chatMessage;
    } catch (error) {
      console.error('❌ Lỗi khi lưu tin nhắn:', error);
      throw error;
    }
  };
  
  /**
   * Lưu phản hồi từ AI
   * @param {string} sessionId - ID phiên chat
   * @param {string} message - Nội dung tin nhắn 
   * @param {string} source - Nguồn tin nhắn (training, deepseek, claude, fallback)
   * @param {string|null} trainingMatchId - ID dữ liệu training được sử dụng
   * @returns {Promise<Object>} - Thông tin tin nhắn đã lưu
   */
  const saveAIResponse = async (sessionId, message, source = 'fallback', trainingMatchId = null) => {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      if (!message) {
        throw new Error('Message content is required');
      }
      
      const startTime = Date.now();
      
      const messageData = {
        sessionId,
        message,
        sender: 'ai',
        response: {
          text: message,
          source,
          trainingMatchId
        }
      };
      
      const chatMessage = new ChatMessage(messageData);
      await chatMessage.save();
      
      // Cập nhật số lượng tin nhắn trong phiên chat
      await ChatSession.findByIdAndUpdate(
        sessionId,
        { $inc: { messageCount: 1 } }
      );
      
      const processingTime = Date.now() - startTime;
      
      // Cập nhật thời gian xử lý
      await ChatMessage.findByIdAndUpdate(
        chatMessage._id,
        { processingTime }
      );
      
      return chatMessage;
    } catch (error) {
      console.error('❌ Lỗi khi lưu phản hồi AI:', error);
      throw error;
    }
  };
  
  /**
   * Tìm câu trả lời tốt nhất từ dữ liệu training
   * @param {string} question - Câu hỏi của người dùng
   * @returns {Promise<Object|null>} - Dữ liệu training phù hợp nhất hoặc null nếu không tìm thấy
   */
  const findBestTrainingMatch = async (question) => {
    try {
      if (!question) {
        return null;
      }
      
      // Sử dụng MongoDB text search
      const textSearchResults = await ChatTraining.find(
        { 
          $text: { $search: question },
          isActive: true
        },
        { score: { $meta: "textScore" } }
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(5);
      
      // Nếu không có kết quả hoặc điểm thấp, trả về null
      if (textSearchResults.length === 0 || textSearchResults[0]._doc.score < 1.0) {
        return null;
      }
      
      // Cập nhật số lần sử dụng
      await ChatTraining.findByIdAndUpdate(
        textSearchResults[0]._id,
        { $inc: { useCount: 1 } }
      );
      
      return textSearchResults[0];
    } catch (error) {
      console.error('❌ Lỗi khi tìm kiếm trong dữ liệu training:', error);
      return null;
    }
  };
  
  /**
   * Gọi API DeepSeek
   * @param {string} message - Tin nhắn người dùng
   * @returns {Promise<string|null>} - Phản hồi từ DeepSeek hoặc null nếu lỗi
   */
  const callDeepSeekAPI = async (message) => {
    try {
      // Kiểm tra API key
      const apiKey = process.env.DEEPSEEK_API_KEY;
      
      // Skip if no API key is configured
      if (!apiKey || process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ DeepSeek API key not configured or not in production');
        return null;
      }
      
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "Bạn là trợ lý AI của BeeShop, một cửa hàng chuyên bán điện thoại và thiết bị di động. Hãy trả lời câu hỏi của khách hàng một cách ngắn gọn, lịch sự và hữu ích."
            },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 300
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 giây timeout
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ Lỗi khi gọi DeepSeek API:', error.message);
      return null;
    }
  };
  
  /**
   * Gọi API Claude
   * @param {string} message - Tin nhắn người dùng
   * @returns {Promise<string|null>} - Phản hồi từ Claude hoặc null nếu lỗi
   */
  const callClaudeAPI = async (message) => {
    try {
      // Kiểm tra API key
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      // Skip if no API key is configured
      if (!apiKey || process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Claude API key not configured or not in production');
        return null;
      }
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: "claude-3-haiku-20240307",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: message
            }
          ],
          system: "Bạn là trợ lý AI của BeeShop, một cửa hàng chuyên bán điện thoại và thiết bị di động. Hãy trả lời câu hỏi của khách hàng một cách ngắn gọn, lịch sự và hữu ích."
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 giây timeout
        }
      );
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('❌ Lỗi khi gọi Claude API:', error.message);
      return null;
    }
  };
  
  /**
   * Xử lý tin nhắn người dùng và tạo phản hồi
   * @param {string} sessionId - ID phiên chat
   * @param {string} message - Tin nhắn người dùng
   * @param {string|null} userId - ID người dùng (nếu đã đăng nhập)
   * @param {Object|null} guestInfo - Thông tin khách (nếu chưa đăng nhập)
   * @param {Object} clientInfo - Thông tin thiết bị
   * @returns {Promise<Object>} - Thông tin phản hồi
   */
  const processMessage = async (sessionId, message, userId = null, guestInfo = null, clientInfo = {}) => {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      if (!message) {
        throw new Error('Message content is required');
      }
      
      // Lưu tin nhắn người dùng
      await saveUserMessage(sessionId, message, userId, guestInfo, clientInfo);
      
      // 1. Tìm câu trả lời từ dữ liệu training
      const trainingMatch = await findBestTrainingMatch(message);
      if (trainingMatch) {
        console.log(`✅ Tìm thấy câu trả lời từ dữ liệu training cho: "${message.substring(0, 30)}..."`);
        const response = await saveAIResponse(
          sessionId, 
          trainingMatch.answer, 
          'training', 
          trainingMatch._id
        );
        return {
          message: trainingMatch.answer,
          source: 'training',
          id: response._id
        };
      }
      
      // 2. Thử với DeepSeek API
      const deepseekResponse = await callDeepSeekAPI(message);
      if (deepseekResponse) {
        console.log(`✅ Nhận phản hồi từ DeepSeek cho: "${message.substring(0, 30)}..."`);
        const response = await saveAIResponse(sessionId, deepseekResponse, 'deepseek');
        return {
          message: deepseekResponse,
          source: 'deepseek',
          id: response._id
        };
      }
      
      // 3. Thử với Claude API
      const claudeResponse = await callClaudeAPI(message);
      if (claudeResponse) {
        console.log(`✅ Nhận phản hồi từ Claude cho: "${message.substring(0, 30)}..."`);
        const response = await saveAIResponse(sessionId, claudeResponse, 'claude');
        return {
          message: claudeResponse,
          source: 'claude',
          id: response._id
        };
      }
      
      // 4. Dùng phản hồi mặc định nếu tất cả đều thất bại
      const fallbackResponse = "Xin lỗi, tôi không thể xử lý yêu cầu của bạn ngay bây giờ. Vui lòng thử lại sau hoặc liên hệ với chúng tôi qua số điện thoại 0813783419.";
      console.log(`⚠️ Sử dụng phản hồi mặc định cho: "${message.substring(0, 30)}..."`);
      const response = await saveAIResponse(sessionId, fallbackResponse, 'fallback');
      return {
        message: fallbackResponse,
        source: 'fallback',
        id: response._id
      };
    } catch (error) {
      console.error('❌ Lỗi khi xử lý tin nhắn:', error);
      throw error;
    }
  };
  
  /**
   * Lưu phản hồi của người dùng về chất lượng tin nhắn AI
   * @param {string} messageId - ID tin nhắn
   * @param {boolean} isHelpful - Người dùng thấy hữu ích không
   * @param {string} comment - Bình luận thêm
   * @returns {Promise<Object>} - Thông tin tin nhắn đã cập nhật
   */
  const saveFeedback = async (messageId, isHelpful, comment = '') => {
    try {
      if (!messageId) {
        throw new Error('Message ID is required');
      }
      
      const message = await ChatMessage.findByIdAndUpdate(
        messageId,
        {
          feedback: {
            isHelpful,
            comment
          }
        },
        { new: true }
      );
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Nếu tin nhắn là từ training, cập nhật độ chính xác
      if (message.response && message.response.source === 'training' && message.response.trainingMatchId) {
        const trainingId = message.response.trainingMatchId;
        
        // Đếm số lượng phản hồi đã nhận
        const feedbackMessages = await ChatMessage.find({
          'response.trainingMatchId': trainingId,
          'feedback.isHelpful': { $exists: true }
        });
        
        if (feedbackMessages.length > 0) {
          const helpfulCount = feedbackMessages.filter(msg => msg.feedback.isHelpful).length;
          const accuracy = (helpfulCount / feedbackMessages.length) * 100;
          
          // Cập nhật độ chính xác
          await ChatTraining.findByIdAndUpdate(
            trainingId,
            { accuracy }
          );
        }
      }
      
      return message;
    } catch (error) {
      console.error('❌ Lỗi khi lưu phản hồi:', error);
      throw error;
    }
  };
  
  /**
   * Lấy lịch sử chat của một phiên
   * @param {string} sessionId - ID phiên chat
   * @returns {Promise<Array>} - Danh sách tin nhắn
   */
  const getSessionHistory = async (sessionId) => {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      return await ChatMessage.find({ sessionId })
        .sort({ createdAt: 1 })
        .lean();
    } catch (error) {
      console.error('❌ Lỗi khi lấy lịch sử chat:', error);
      throw error;
    }
  };
  
  module.exports = {
    createSession,
    endSession,
    processMessage,
    saveFeedback,
    getSessionHistory,
    saveUserMessage,
    saveAIResponse
  };
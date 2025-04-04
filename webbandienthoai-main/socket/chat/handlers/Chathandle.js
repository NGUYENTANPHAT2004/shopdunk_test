/**
 * Chat message handler functions
 */
const chatController = require('../ChatController');
const { ChatSession } = require('../../../models/Chatmodel');

/**
 * Handle incoming chat messages
 * @param {Object} socket - Socket connection
 * @param {Object} io - Socket.io instance
 * @param {Object} data - Message data containing message and sessionId
 */
const handleIncomingMessage = async (socket, io, data) => {
  try {
    console.log('Received message from client:', data);
    
    // Validate the incoming data
    if (!data || !data.message) {
      throw new Error('Invalid message data');
    }

    // Extract message text and sessionId
    const messageText = data.message.trim();
    const sessionId = data.sessionId;
    
    // Verify session exists if sessionId is provided
    if (sessionId) {
      const session = await ChatSession.findById(sessionId);
      if (!session) {
        throw new Error('Invalid session ID');
      }
    }
    
    // Get user information
    let userId = null;
    let guestInfo = null;
    
    if (socket.user) {
      userId = socket.user._id;
    } else if (socket.handshake.auth.guestName) {
      guestInfo = {
        name: socket.handshake.auth.guestName,
        phone: socket.handshake.auth.guestPhone || null
      };
    } else {
      // If no user info available, create a guest with a generic name
      guestInfo = {
        name: `Guest_${Math.floor(Math.random() * 10000)}`,
        phone: null
      };
    }
    
    // Get client info
    const clientInfo = {
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    };
    
    // Check if session exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      // Create a new session
      const userData = userId ? { userId } : { guestInfo };
      try {
        const session = await chatController.createSession(userData, clientInfo);
        currentSessionId = session._id.toString();
        
        // Join the session room
        socket.join(currentSessionId);
        socket.sessionId = currentSessionId;
        
        // Inform client of new session
        socket.emit('chat_initialized', {
          sessionId: currentSessionId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error creating session:', error);
        throw new Error('Could not create chat session');
      }
    }
    
    // Process message and get AI response
    const response = await chatController.processMessage(
      currentSessionId,
      messageText,
      userId,
      guestInfo,
      clientInfo
    );
    
    // Send response back to user
    socket.emit('ai_message', {
      id: response.id,
      message: response.message,
      source: response.source,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Tin nhắn đã được xử lý và phản hồi: ${response.source}`);
    
  } catch (error) {
    console.error('❌ Lỗi xử lý tin nhắn:', error);
    socket.emit('chat_error', {
      error: 'message_processing_error',
      message: error.message || 'Không thể xử lý tin nhắn',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Initialize a new chat session
 * @param {Object} socket - Socket connection
 * @param {Object} data - Client data for initialization
 */
const handleInitChat = async (socket, data = {}) => {
  try {
    console.log('Initializing chat with data:', data);
    let userId = null;
    let guestInfo = null;
    
    // For simplicity, we're using guest mode by default
    if (data.guestName) {
      guestInfo = {
        name: data.guestName,
        phone: data.guestPhone || null
      };
    } else {
      // Use a random guest name if none provided
      guestInfo = {
        name: `Guest_${Math.floor(Math.random() * 10000)}`,
        phone: null
      };
    }
    
    // Get client info
    const clientInfo = {
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    };
    
    // Create session
    const userData = userId ? { userId } : { guestInfo };
    const session = await chatController.createSession(userData, clientInfo);
    
    // Store session ID in socket
    socket.sessionId = session._id.toString();
    socket.join(session._id.toString());
    
    // Send confirmation to client
    socket.emit('chat_initialized', {
      sessionId: session._id.toString(),
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Phiên chat mới được khởi tạo: ${session._id}`);
    
  } catch (error) {
    console.error('❌ Lỗi khởi tạo chat:', error);
    socket.emit('chat_error', {
      error: 'initialization_error',
      message: error.message || 'Không thể khởi tạo phiên chat',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handle message feedback
 * @param {Object} socket - Socket connection
 * @param {Object} data - Feedback data
 */
const handleMessageFeedback = async (socket, data) => {
  try {
    if (!data.messageId) {
      throw new Error('Missing message ID');
    }
    
    const { messageId, isHelpful, comment } = data;
    
    await chatController.saveFeedback(messageId, isHelpful, comment || '');
    
    socket.emit('feedback_received', {
      messageId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Đã nhận phản hồi cho tin nhắn: ${messageId}`);
    
  } catch (error) {
    console.error('❌ Lỗi lưu phản hồi:', error);
    socket.emit('chat_error', {
      error: 'feedback_error',
      message: error.message || 'Không thể lưu phản hồi',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handle session history request
 * @param {Object} socket - Socket connection
 * @param {Object} data - History request data
 */
const handleGetHistory = async (socket, data = {}) => {
  try {
    const sessionId = data.sessionId || socket.sessionId;
    
    if (!sessionId) {
      throw new Error('Missing session ID');
    }
    
    const messages = await chatController.getSessionHistory(sessionId);
    
    socket.emit('chat_history', {
      sessionId,
      messages,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Đã gửi lịch sử chat: ${sessionId}`);
    
  } catch (error) {
    console.error('❌ Lỗi lấy lịch sử chat:', error);
    socket.emit('chat_error', {
      error: 'history_error',
      message: error.message || 'Không thể lấy lịch sử chat',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handle end chat session
 * @param {Object} socket - Socket connection
 */
const handleEndChat = async (socket) => {
  try {
    const sessionId = socket.sessionId;
    
    if (!sessionId) {
      throw new Error('No active session to end');
    }
    
    await chatController.endSession(sessionId);
    
    socket.emit('chat_ended', {
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Leave room
    socket.leave(sessionId);
    socket.sessionId = null;
    
    console.log(`✅ Đã kết thúc phiên chat: ${sessionId}`);
    
  } catch (error) {
    console.error('❌ Lỗi kết thúc chat:', error);
    socket.emit('chat_error', {
      error: 'end_session_error',
      message: error.message || 'Không thể kết thúc phiên chat',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  handleIncomingMessage,
  handleInitChat,
  handleMessageFeedback,
  handleGetHistory,
  handleEndChat
};
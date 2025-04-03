/**
 * Main entry point for chat socket functionality
 */
const { authMiddleware } = require('./middlewares/authMiddleware');
const { adminMiddleware } = require('./middlewares/Addminmidleware');
const { 
  handleIncomingMessage, 
  handleInitChat, 
  handleMessageFeedback, 
  handleGetHistory, 
  handleEndChat 
} = require('./handlers/Chathandle');
require('dotenv').config();
/**
 * Initialize chat socket handlers
 * @param {Object} io - Socket.io instance
 */
const initChatHandlers = (io) => {
  // Create a namespace for chat
  const chatNamespace = io.of('/chat');

  // Apply middleware
  chatNamespace.use(authMiddleware);

  chatNamespace.on('connection', (socket) => {
    console.log(`✅ Kết nối chat mới: ${socket.id}`);
    
    // Initialize chat
    socket.on('init_chat', (data) => handleInitChat(socket, data));
    
    // User message handler
    socket.on('user_message', (data) => handleIncomingMessage(socket, io, data));
    
    // Message feedback
    socket.on('message_feedback', (data) => handleMessageFeedback(socket, data));
    
    // Get chat history
    socket.on('get_history', (data) => handleGetHistory(socket, data));
    
    // End chat session
    socket.on('end_chat', () => handleEndChat(socket));
    
    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ Ngắt kết nối chat: ${socket.id}`);
      
      // End session if active
      if (socket.sessionId) {
        handleEndChat(socket).catch(error => {
          console.error('Lỗi khi tự động kết thúc phiên chat:', error);
        });
      }
    });
  });

  console.log('✅ Khởi tạo chat handlers thành công');
  return chatNamespace;
};

// Admin training handlers will be defined in a separate file

module.exports = { initChatHandlers };
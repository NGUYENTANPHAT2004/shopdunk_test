// API Configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005';
export const CHAT_API_KEY = process.env.REACT_APP_CHAT_API_KEY || 'beeshop_chat_api_key_2025';

// Socket Configuration
export const SOCKET_OPTIONS = {
  transports: ['websocket'],
  upgrade: false,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};
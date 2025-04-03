import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { UserContextProvider } from './context/Usercontext';
import { ChatAIProvider } from './context/Chatalcontext';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <UserContextProvider>
      <ChatAIProvider>
      <App />
      </ChatAIProvider>
    </UserContextProvider>
  </React.StrictMode>
);

reportWebVitals();
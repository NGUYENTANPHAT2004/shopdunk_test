import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { UserContextProvider } from './context/Usercontext';
import { ChatAIProvider } from './context/Chatalcontext';
import { FlashSaleProvider } from './context/Flashecontext';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
  <UserContextProvider>
  <FlashSaleProvider>
    <ChatAIProvider>
      <App />
    </ChatAIProvider>
  </FlashSaleProvider>
</UserContextProvider>
  </React.StrictMode>
);

reportWebVitals();
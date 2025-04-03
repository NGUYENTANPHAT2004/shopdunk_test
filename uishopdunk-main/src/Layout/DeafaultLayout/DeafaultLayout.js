import React, { useState } from "react";
import Navbar from "./Header/MenuHeader/Navbar";
import { Footer } from "./Footer";
import Call from "./FloatingChat/Call/Call";
import Zalo from "./FloatingChat/Zalo/Zalo";
import ChatAI from "./FloatingChat/Chatai/chatai";
import { FaTimes } from "react-icons/fa";
import "../DeafaultLayout/DefaultLayout.scss";

function DefaultLayout({ children }) {
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  const toggleFloatingMenu = () => {
    setShowFloatingMenu(!showFloatingMenu);
  };

  return (
    <div className="container-default">
      <div className="header-navbar">
        <Navbar />
      </div>
      <div className="content">{children}</div>
      <Footer />
      
      <div className={`floating-buttons ${showFloatingMenu ? 'open' : ''}`}>
        <div className="toggle-button" onClick={toggleFloatingMenu}>
          {showFloatingMenu ? <FaTimes /> : "•••"}
        </div>
        
        {showFloatingMenu && (
          <div className="floating-menu">
            <ChatAI />
            <Zalo />
            <Call />
          </div>
        )}
      </div>
    </div>
  );
}

export default DefaultLayout;
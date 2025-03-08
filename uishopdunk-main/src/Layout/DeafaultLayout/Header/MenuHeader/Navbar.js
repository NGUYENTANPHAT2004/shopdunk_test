import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Navbar.scss";
import Header from "../Header";
import CategoryItem from "../CategoryItem/CategoryItem";

const Navbar = () => {
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Check for mobile view on resize
  // useEffect(() => {
  //   const handleResize = () => {
  //     setIsMobile(window.innerWidth <= 768);
  //   };
    
  //   window.addEventListener('resize', handleResize);
  //   return () => {
  //     window.removeEventListener('resize', handleResize);
  //   };
  // }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:3005/listcate");
        const data = await response.json();
        
        // Log the structure to understand the data format
        console.log("Category data structure:", data);
        
        setCategories(data);
      } catch (error) {
        console.error("Lỗi khi gọi API:", error);
      }
    };
    fetchCategories();
  }, []);

  // Toggle for mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Mobile submenu toggle handler
  const toggleSubmenu = (e, categoryId) => {
    if (isMobile) {
      e.preventDefault();
      const submenuEl = e.currentTarget.querySelector('.submenu');
      if (submenuEl) {
        e.currentTarget.classList.toggle('submenu-active');
      }
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo for desktop */}
        <div className="logo-container">
          <Link to="/">
            <img src="/logo.png" alt="Logo" className="navbar-logo" />
          </Link>
        </div>
        
        {/* Mobile menu toggle button */}
        
          <button className="menu-toggle" onClick={toggleMenu}>
            <span className={`hamburger ${menuOpen ? 'open' : ''}`}></span>
          </button>
      

        <ul className={`menu ${menuOpen ? "menu-open" : ""}`}>
          {/* Logo for mobile menu */}
          
    

          {/* Product Categories with recursive submenu */}
          <li className="menu-item has-submenu" onClick={(e) => isMobile && toggleSubmenu(e)}>
            <span className="menu-title">Danh mục sản phẩm</span>
            <ul className="submenu">
              {categories.map((cat) => (
                <CategoryItem key={cat._id} category={cat} />
              ))}
            </ul>
          </li>

          {/* Other menu items */}
          <li className="menu-item" onClick={() => setMenuOpen(false)}>
            <Link to="/">Trang chủ</Link>
          </li>
          <li className="menu-item" onClick={() => setMenuOpen(false)}>
            <Link to="/gioi-thieu">Giới thiệu</Link>
          </li>
          <li className="menu-item" onClick={() => setMenuOpen(false)}>
            <Link to="/">Sản phẩm</Link>
          </li>
          <li className="menu-item has-submenu" onClick={(e) => isMobile && toggleSubmenu(e)}>
            <span className="menu-title">Dịch vụ</span>
            <ul className="submenu">
              <li>
                <Link to="/chinh-sach-van-chuyen">Chính sách vận chuyển</Link>
              </li>
              <li>
                <Link to="/huong-dan-thanh-toan">Hướng dẫn thanh toán</Link>
              </li>
              {/* ... */}
            </ul>
          </li>
          <li className="menu-item" onClick={() => setMenuOpen(false)}>
            <Link to="/lien-he">Liên hệ</Link>
          </li>
        </ul>
        
        {/* Header with search and cart - moved outside of menu */}
        <Header />
      </div>
    </nav>
  );
};

export default Navbar;
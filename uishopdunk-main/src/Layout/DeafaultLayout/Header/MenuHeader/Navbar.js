import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Navbar.scss";
import Header from "../Header";
import CategoryItem from "../CategoryItem/CategoryItem";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import {  FaBars } from 'react-icons/fa'
const Navbar = () => {
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const menuRef = useRef(null);

  // Check for mobile view on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMenuOpen(false); // Close menu when resizing to desktop
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:3005/listcate");
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Lỗi khi gọi API:", error);
      }
    };
    fetchCategories();
  }, []);

  // Handle click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target) &&
          !event.target.closest('.menu-toggle')) {
        setMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Toggle for mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Toggle individual menu items
  const toggleMenuItem = (e) => {
    if (isMobile) {
      const menuItem = e.currentTarget;
      const isSubmenuItem = menuItem.classList.contains('has-submenu');
      
      if (isSubmenuItem) {
        e.preventDefault();
        
        // Close other open items first
        const openItems = menuRef.current.querySelectorAll('.submenu-active');
        openItems.forEach(item => {
          if (item !== menuItem) {
            item.classList.remove('submenu-active');
          }
        });
        
        menuItem.classList.toggle('submenu-active');
      } else {
        setMenuOpen(false); // Close menu when clicking regular item
      }
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo for desktop */}
        <div className="logo-container">
          <Link to="/">
            <img src="/logo1.png" alt="Logo" className="navbar-logo" />
          </Link>
        </div>
        
        {/* Mobile menu toggle button */}
      
         <button className='menu-toggle' onClick={toggleMenu}>
                  <FontAwesomeIcon icon={faBars} className={` menu-icon  ${menuOpen ? 'open' : ''}`} />
          </button>

        {/* Header component with search and icons */}
        <div className="header-wrapper">
          <Header />
        </div>

        {/* Navigation menu */}
        <ul ref={menuRef} className={`menu ${menuOpen ? "menu-open" : ""}`}>
          {/* Product Categories with recursive submenu */}
          <li className="menu-item has-submenu" onClick={toggleMenuItem}>
            <span className="menu-title">Danh mục sản phẩm</span>
            <ul className="submenu">
              {categories.map((cat) => (
                <CategoryItem key={cat._id} category={cat} />
              ))}
            </ul>
          </li>

          {/* Other menu items */}
          <li className="menu-item" onClick={toggleMenuItem}>
            <Link to="/">Trang chủ</Link>
          </li>
          <li className="menu-item" onClick={toggleMenuItem}>
            <Link to="/gioi-thieu">Giới thiệu</Link>
          </li>
          <li className="menu-item" onClick={toggleMenuItem}>
            <Link to="/">Sản phẩm</Link>
          </li>
          {/* <li className="menu-item has-submenu" onClick={toggleMenuItem}>
            <span className="menu-title">Dịch vụ</span>
            <ul className="submenu">
              <li>
                <Link to="/chinh-sach-van-chuyen" onClick={() => setMenuOpen(false)}>
                  Chính sách vận chuyển
                </Link>
              </li>
              <li>
                <Link to="/huong-dan-thanh-toan" onClick={() => setMenuOpen(false)}>
                  Hướng dẫn thanh toán
                </Link>
              </li>
            </ul>
          </li>
          <li className="menu-item" onClick={toggleMenuItem}>
            <Link to="/lien-he">Liên hệ</Link>
          </li> */}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
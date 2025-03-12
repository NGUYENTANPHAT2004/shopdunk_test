import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './CategoryItem.scss'; 

const CategoryItem = ({ category }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const hasChildren = category.children && category.children.length > 0;
  const hasTheLoai = category.theloai && category.theloai.length > 0;
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsOpen(false); // Reset state when switching to desktop
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const toggleSubmenu = (e) => {
    if (isMobile) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };
  
  const handleMouseEnter = () => {
    if (!isMobile) setIsOpen(true);
  };
  
  const handleMouseLeave = () => {
    if (!isMobile) setIsOpen(false);
  };
  
  return (
    <li 
      className={`menu-item ${hasChildren || hasTheLoai ? "has-submenu" : ""} ${isOpen ? "submenu-active" : ""}`} 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <Link 
        to={"/san-pham/" + category.namekhongdau} 
        className="menu-link"
        onClick={(e) => (hasChildren || hasTheLoai) && toggleSubmenu(e)}
      >
        {category.name}
        {(hasChildren || hasTheLoai) && isMobile && <span className="submenu-toggle">{isOpen ? '-' : '+'}</span>}
      </Link>
      
      {(hasChildren || hasTheLoai) && (
        <ul className={`submenu ${isOpen ? "submenu-open" : ""}`}>
          {hasChildren && category.children.map((child) => (
            <CategoryItem key={child._id} category={child} />
          ))}
          
          {hasTheLoai && category.theloai.map((tl) => (
            <li key={tl._id}>
              <Link 
                to={"/san-pham/" + tl.namekhongdau} 
                className="submenu-item"
              >
                {tl.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export default CategoryItem;
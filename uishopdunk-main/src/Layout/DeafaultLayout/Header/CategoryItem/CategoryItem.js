import React, { useState } from "react";
import { Link } from "react-router-dom";
import './CategoryItem.scss'; 
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';

const CategoryItem = ({ category, isMobile, activeSubmenu, toggleSubmenu }) => {
  const hasChildren = category?.children && category.children.length > 0;
  const isActive = activeSubmenu === category._id;
  
  const handleToggle = (e) => {
    if (isMobile && hasChildren) {
      e.preventDefault();
      toggleSubmenu(category._id);
    }
  };
  
  return (
    <li className={`category-item ${hasChildren ? 'has-submenu' : ''} ${isActive ? 'is-active' : ''}`}>
      <div className="category-header">
        <Link 
          to={`/danh-muc/${category.namekhongdau}`} 
          className="category-link"
          onClick={hasChildren ? handleToggle : undefined}
        >
          <span className="category-name">{category.name}</span>
        </Link>
        
        {hasChildren && (
          <button 
            className="toggle-button"
            onClick={handleToggle}
            aria-label={`${isActive ? 'Thu gọn' : 'Mở rộng'} danh mục ${category.name}`}
          >
            {isMobile ? (
              <FaChevronDown className={`toggle-icon ${isActive ? 'active' : ''}`} />
            ) : (
              <FaChevronRight className="toggle-icon" />
            )}
          </button>
        )}
      </div>
      
      {hasChildren && (
        <ul className={`subcategory-list ${isActive ? 'active' : ''}`}>
          {category.children.map((child) => (
            <CategoryItem 
              key={child._id} 
              category={child} 
              isMobile={isMobile}
              activeSubmenu={activeSubmenu}
              toggleSubmenu={toggleSubmenu}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default CategoryItem;
// CategoryItem.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import './CategoryItem.scss'; 
function CategoryItem({ category }) {
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = category.children && category.children.length > 0;

  return (
    <li
      className={`menu-item has-submenu ${isOpen ? "submenu-active" : ""}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Link danh mục cha */}
      <Link to={`/san-pham/${category.namekhongdau}`}>
        {category.name.toUpperCase()}
      </Link>

      {/* Nếu có children => hiển thị submenu đệ quy */}
      {hasChildren && (
        <ul className={`submenu ${isOpen ? "submenu-open" : ""}`}>
          {category.children.map((child) => (
            <CategoryItem key={child._id} category={child} />
          ))}
        </ul>
      )}
    </li>
    
  );
}

export default CategoryItem;

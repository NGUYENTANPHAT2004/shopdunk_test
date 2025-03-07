// CategoryItem.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import './CategoryItem.scss'; 
const CategoryItem = ({ category }) => {
  const [isOpen, setisOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const hasTheLoai = category.theloai && category.theloai.length > 0;
  return (
    <li className={hasChildren || hasTheLoai ? "menu-item has-submenu" : "menu-item"} 
        onMouseEnter={() => setisOpen(true)} 
        onMouseLeave={() => setisOpen(false)}
    >
      <Link to={"/san-pham/" + category.namekhongdau} className="menu-link">{category.name}</Link>
      {(hasChildren || hasTheLoai) && (
        <ul className={isOpen ? "submenu submenu-open" : "submenu"}>
          {hasChildren && category.children.map((child) => (
            <CategoryItem key={child._id} category={child} />
          ))}
          {hasTheLoai && category.theloai.map((tl) => (
            <li key={tl._id}>
              <Link to={"/san-pham/" + tl.namekhongdau} className="submenu-item">{tl.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};
export default CategoryItem;

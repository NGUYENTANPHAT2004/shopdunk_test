import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Navbar.scss";
import Header from "../Header";
import CategoryItem from "../CategoryItem/CategoryItem"; // Import component đệ quy

const Navbar = () => {
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* ... Logo, menu-toggle, v.v ... */}

        <ul className={`menu ${menuOpen ? "menu-open" : ""}`}>
          {/* Logo ở menu mobile */}
          <li className="menu-logo1">
            <Link to="/">
              <img src="/logo.png" alt="Logo" className="menu-logo2" />
            </Link>
          </li>

          {/* Mục "Danh mục sản phẩm" với submenu đệ quy */}
          <li className="menu-item has-submenu">
            <span className="menu-title">Danh mục sản phẩm</span>
            <ul className="submenu">
              {categories.map((cat) => (
                <CategoryItem key={cat._id} category={cat} />
              ))}
            </ul>
          </li>

          {/* Các mục khác */}
          <li className="menu-item" onClick={() => setMenuOpen(false)}>
            <Link to="/">Trang chủ</Link>
          </li>
          <li className="menu-item" onClick={() => setMenuOpen(false)}>
            <Link to="/gioi-thieu">Giới thiệu</Link>
          </li>
          <li className="menu-item" onClick={() => setMenuOpen(false)}>
            <Link to="/">Sản phẩm</Link>
          </li>
          <li className="menu-item has-submenu">
            Dịch vụ
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

          {/* ... Header */}
          <Header />
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

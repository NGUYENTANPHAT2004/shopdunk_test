import React, { useState } from 'react';
import './Header.scss';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from "react-icons/fa";

const Header = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchKeyword.trim() !== '') {
      navigate(`/search/${encodeURIComponent(searchKeyword)}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="header-container">
     
      <div className="header-right">
        <input
          type="text"
          className="search-input"
          placeholder="Tìm kiếm"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)} 
          onKeyPress={handleKeyPress}
        />
        <button className="search-button" onClick={handleSearch}>
          <FaSearch style={{ color: "#fff", fontSize: "20px", display: "inline-block" }} />
        </button>
      </div>
    </div>
  );
};

export default Header;

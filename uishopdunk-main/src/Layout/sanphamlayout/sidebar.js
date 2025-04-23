import React, { useState, useEffect, useRef } from 'react';
import './sidebar.scss';

const ProductSidebar = ({
  categories = [],
  selectedCategory,
  searchTerm,
  priceRange,
  onSearchChange,
  onSearchSubmit,
  onCategoryChange,
  onPriceRangeChange,
  onCloseMobile
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
  const [localMinPrice, setLocalMinPrice] = useState(priceRange?.min || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(priceRange?.max || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  // Update local state when props change
  useEffect(() => {
    setLocalSearchTerm(searchTerm || '');
  }, [searchTerm]);
  
  useEffect(() => {
    setLocalMinPrice(priceRange?.min || '');
    setLocalMaxPrice(priceRange?.max || '');
  }, [priceRange]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
    
    if (value.length >= 2) {
      fetchSearchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  // Fetch search suggestions
  const fetchSearchSuggestions = async (keyword) => {
    try {
      const response = await fetch(`/api/search-suggestions?keyword=${keyword}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Handle search form submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit(localSearchTerm);
    setShowSuggestions(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setLocalSearchTerm(suggestion.name);
    onSearchSubmit(suggestion.name);
    setShowSuggestions(false);
  };

  // Handle price form submit
  const handlePriceSubmit = (e) => {
    e.preventDefault();
    onPriceRangeChange(localMinPrice, localMaxPrice);
  };

  return (
    <div className="product-sidebar">
      <div className="product-sidebar__mobile-header">
        <h2>Lọc sản phẩm</h2>
        <button 
          className="product-sidebar__close-btn" 
          onClick={onCloseMobile}
          aria-label="Đóng"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="product-sidebar__section">
        <h3 className="product-sidebar__title">Tìm kiếm</h3>
        <form className="product-sidebar__search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper" ref={suggestionsRef}>
            <input
              type="text"
              value={localSearchTerm}
              onChange={handleSearchInputChange}
              placeholder="Tìm kiếm sản phẩm..."
              className="product-sidebar__search-input"
            />
            <button 
              type="submit" 
              className="product-sidebar__search-btn"
              aria-label="Tìm kiếm"
            >
              <i className="fas fa-search"></i>
            </button>
            
            {/* Search suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="product-sidebar__suggestions">
                {suggestions.map((suggestion) => (
                  <li
                    key={suggestion._id}
                    className="product-sidebar__suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
      </div>

      <div className="product-sidebar__section">
        <h3 className="product-sidebar__title">Danh mục</h3>
        <ul className="product-sidebar__category-list">
          <li className="product-sidebar__category-item">
            <button
              className={`product-sidebar__category-btn ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => onCategoryChange('')}
            >
              Tất cả sản phẩm
            </button>
          </li>
          {categories.map((category) => (
            <li key={category._id} className="product-sidebar__category-item">
              <button
                className={`product-sidebar__category-btn ${selectedCategory === category.namekhongdau ? 'active' : ''}`}
                onClick={() => onCategoryChange(category.namekhongdau)}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="product-sidebar__section">
        <h3 className="product-sidebar__title">Lọc theo giá</h3>
        <form className="product-sidebar__price-form" onSubmit={handlePriceSubmit}>
          <div className="product-sidebar__price-inputs">
            <div className="product-sidebar__price-group">
              <label htmlFor="min-price">Từ</label>
              <input
                type="number"
                id="min-price"
                value={localMinPrice}
                onChange={(e) => setLocalMinPrice(e.target.value)}
                placeholder="0đ"
                className="product-sidebar__price-input"
                min="0"
              />
            </div>
            <div className="product-sidebar__price-group">
              <label htmlFor="max-price">Đến</label>
              <input
                type="number"
                id="max-price"
                value={localMaxPrice}
                onChange={(e) => setLocalMaxPrice(e.target.value)}
                placeholder="Tối đa"
                className="product-sidebar__price-input"
                min="0"
              />
            </div>
          </div>
          <button type="submit" className="product-sidebar__price-btn">
            Áp dụng
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductSidebar;
import React from 'react';
import { Link } from 'react-router-dom';
import './listsp.scss';

const ProductList = ({ products = [], loading = false, onClearFilters }) => {
  // Format price to VND currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price).replace('₫', 'đ');
  };

  // Generate loading skeleton
  const renderSkeletons = () => {
    return Array(8).fill().map((_, index) => (
      <div key={`skeleton-${index}`} className="product-card product-card--skeleton">
        <div className="product-card__image-skeleton"></div>
        <div className="product-card__content">
          <div className="product-card__title-skeleton"></div>
          <div className="product-card__category-skeleton"></div>
          <div className="product-card__price-skeleton"></div>
        </div>
      </div>
    ));
  };

  // Render empty state
  if (!loading && products.length === 0) {
    return (
      <div className="product-list__empty">
        <p>Không tìm thấy sản phẩm nào phù hợp.</p>
        <button 
          className="product-list__clear-filters-btn"
          onClick={onClearFilters}
        >
          Xóa bộ lọc
        </button>
      </div>
    );
  }

  return (
    <div className="product-list">
      {loading ? (
        renderSkeletons()
      ) : (
        products.map(product => (
          <div key={product._id} className="product-card">
            <Link to={`/chitietsanpham/${product.namekhongdau}`} className="product-card__link">
              <div className="product-card__image-container">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="product-card__image" 
                  loading="lazy"
                />
                
                {product.khuyenmai > 0 && (
                  <div className="product-card__discount-badge">
                    -{product.khuyenmai}%
                  </div>
                )}
              </div>
              
              <div className="product-card__content">
                <h3 className="product-card__title">{product.name}</h3>
                
                {product.loaisp && (
                  <p className="product-card__category">{product.loaisp}</p>
                )}
                
                <div className="product-card__price-container">
                  <span className="product-card__price">
                    {formatPrice(product.price)}
                  </span>
                  
                  {product.khuyenmai > 0 && product.giagoc && (
                    <span className="product-card__original-price">
                      {formatPrice(product.giagoc)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))
      )}
    </div>
  );
};

export default ProductList;
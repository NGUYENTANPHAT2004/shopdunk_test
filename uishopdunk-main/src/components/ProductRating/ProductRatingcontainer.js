import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import './ProductRating.scss';

const ProductRatingcontainer = ({ productId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingStats, setRatingStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Lấy thống kê đánh giá của sản phẩm
  useEffect(() => {
    const fetchRatingStats = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        // Using the correct endpoint path from our OrderRatingRoutes.js
        const response = await axios.get(`http://localhost:3005/product-rating/${productId}`);
        
        if (response.data.success) {
          setRatingStats(response.data);
        } else {
          setError('Không thể tải thống kê đánh giá');
        }
      } catch (err) {
        console.error('Lỗi khi tải thống kê đánh giá:', err);
        setError('Đã xảy ra lỗi khi tải thống kê đánh giá');
      } finally {
        setLoading(false);
      }
    };

    fetchRatingStats();
  }, [productId]);

  // Lấy danh sách đánh giá có phân trang
  useEffect(() => {
    const fetchReviews = async () => {
      if (!productId) return;

      try {
        // Using the correct endpoint path from our OrderRatingRoutes.js
        const response = await axios.get(`http://localhost:3005/product-reviews/${productId}`, {
          params: { page: currentPage, limit: 5 }
        });
        
        if (response.data.success) {
          setReviews(response.data.reviews || []);
          setTotalPages(response.data.totalPages || 1);
        } else {
          setError('Không thể tải danh sách đánh giá');
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách đánh giá:', err);
        setError('Đã xảy ra lỗi khi tải danh sách đánh giá');
      }
    };

    fetchReviews();
  }, [productId, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Hiển thị các sao dựa trên số đánh giá
  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <FontAwesomeIcon
        key={i}
        icon={i < rating ? solidStar : regularStar}
        className={i < rating ? 'star active' : 'star'}
      />
    ));
  };

  // Hiển thị phân phối đánh giá (biểu đồ thanh)
  const renderRatingDistribution = () => {
    if (!ratingStats) return null;
    
    const { starCounts, totalRatings } = ratingStats;
    
    return (
      <div className="rating-distribution">
        {[5, 4, 3, 2, 1].map(star => {
          const count = starCounts[star] || 0;
          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          
          return (
            <div key={star} className="rating-bar">
              <div className="rating-label">
                <span>{star}</span>
                <FontAwesomeIcon icon={solidStar} className="star active" />
              </div>
              <div className="rating-bar-container">
                <div 
                  className="rating-bar-fill" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="rating-count">
                <span>{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Hiển thị danh sách đánh giá
  const renderReviews = () => {
    if (reviews.length === 0) {
      return <p className="no-reviews">Chưa có đánh giá nào cho sản phẩm này</p>;
    }
    
    return (
      <div className="review-list">
        {reviews.map(review => (
          <div key={review._id} className="review-item">
            <div className="review-header">
              <div className="reviewer-info">
                <span className="reviewer-name">{review.tenkhach}</span>
                <div className="review-rating">
                  {renderStars(review.rating)}
                </div>
              </div>
              <div className="review-date">
                {new Date(review.date).toLocaleDateString('vi-VN')}
              </div>
            </div>
            
            {(review.dungluong || review.mausac) && (
              <div className="review-variant">
                Phiên bản: {review.dungluong} {review.mausac ? `- ${review.mausac}` : ''}
              </div>
            )}
            
            {review.content && (
              <div className="review-content">
                {review.content}
              </div>
            )}
            
            {review.verified && (
              <div className="verified-badge">
                <FontAwesomeIcon icon={solidStar} className="verified-icon" />
                Đã mua hàng
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Hiển thị nút phân trang
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={currentPage === 1 ? 'disabled' : ''}
        >
          &laquo; Trước
        </button>
        
        <div className="page-info">
          Trang {currentPage} / {totalPages}
        </div>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={currentPage === totalPages ? 'disabled' : ''}
        >
          Sau &raquo;
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="product-rating-stats loading">
        <div className="loading-spinner"></div>
        <p>Đang tải đánh giá...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-rating-stats error">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!ratingStats) {
    return (
      <div className="product-rating-stats empty">
        <p>Không có thông tin đánh giá</p>
      </div>
    );
  }

  const { averageRating, totalRatings } = ratingStats;

  return (
    <div className="product-rating-stats">
      <div className="rating-summary">
        <div className="average-rating">
          <div className="average-value">{averageRating}</div>
          <div className="max-value">/ 5</div>
        </div>
        
        <div className="rating-stars-large">
          {renderStars(Math.round(averageRating))}
        </div>
        
        <div className="rating-total">
          {totalRatings} đánh giá
        </div>
      </div>
      
      {renderRatingDistribution()}
      
      <h3 className="reviews-title">Đánh giá từ khách hàng</h3>
      
      {renderReviews()}
      
      {renderPagination()}
    </div>
  );
};

export default ProductRatingcontainer;
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import axios from 'axios';
import './ProductRating.scss';

const ProductRating = ({ productId, size = 'medium', showCount = true }) => {
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!productId) return;
      
      try {
        setIsLoading(true);
        // Sửa endpoint API để phù hợp với định nghĩa trong OrderRatingRoutes.js
        const response = await axios.get(`http://localhost:3005/order-rating/product/${productId}`);
        
        if (response.data && response.data.success) {
          // Xử lý nhiều trường hợp cấu trúc dữ liệu có thể có
          if (response.data.data) {
            // Cấu trúc dữ liệu đúng: response.data.data.averageRating và totalRatings
            if (response.data.data.averageRating !== undefined) {
              setAverageRating(response.data.data.averageRating || 0);
            }
            
            // Kiểm tra cả hai vị trí có thể chứa số lượng đánh giá
            if (response.data.data.totalRatings !== undefined) {
              setRatingCount(response.data.data.totalRatings || 0);
            } else if (response.data.data.pagination && response.data.data.pagination.totalItems !== undefined) {
              setRatingCount(response.data.data.pagination.totalItems || 0);
            }
          } else if (response.data.averageRating !== undefined) {
            // Trường hợp alternative: response.data.averageRating
            setAverageRating(response.data.averageRating || 0);
            setRatingCount(response.data.totalRatings || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching product ratings:', error);
        // Đặt giá trị mặc định khi có lỗi
        setAverageRating(0);
        setRatingCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings();
  }, [productId]);

  // Determine star size based on prop
  const getStarSize = () => {
    switch(size) {
      case 'small': return '14px';
      case 'large': return '24px';
      default: return '18px'; // medium
    }
  };

  // Render 5 stars, filled or empty based on the average rating
  const renderStars = () => {
    return Array(5).fill(0).map((_, index) => {
      const starValue = index + 1;
      // For partial stars (e.g. 3.5 stars)
      if (starValue <= Math.floor(averageRating)) {
        // Full star
        return (
          <FontAwesomeIcon 
            key={index}
            icon={solidStar}
            style={{ 
              color: '#FFC107',
              fontSize: getStarSize()
            }}
          />
        );
      } else if (starValue - 0.5 <= averageRating && starValue > averageRating) {
        // Half star - using CSS for half-filled effect
        return (
          <span key={index} className="half-star-container" style={{ fontSize: getStarSize() }}>
            <FontAwesomeIcon 
              icon={solidStar}
              className="half-star"
              style={{ color: '#FFC107' }}
            />
            <FontAwesomeIcon 
              icon={regularStar}
              className="star-outline"
              style={{ color: '#D1D1D1' }}
            />
          </span>
        );
      } else {
        // Empty star
        return (
          <FontAwesomeIcon 
            key={index}
            icon={regularStar}
            style={{ 
              color: '#D1D1D1',
              fontSize: getStarSize()
            }}
          />
        );
      }
    });
  };

  if (isLoading) {
    return <div className="product-rating-placeholder" style={{ height: getStarSize() }}></div>;
  }

  return (
    <div className="product-rating">
      <div className="rating-stars">
        {renderStars()}
      </div>
      {showCount && ratingCount > 0 && (
        <span className="rating-count">({ratingCount})</span>
      )}
    </div>
  );
};

export default ProductRating;
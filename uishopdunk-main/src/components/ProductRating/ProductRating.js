import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './ProductRating.scss';

const ProductRating = ({ productId, size = 'medium', showCount = false }) => {
  const [rating, setRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    const fetchRating = async () => {
      if (!productId) return;
      
      try {
        const response = await axios.get(`http://localhost:3005/danhgia/product/${productId}`);
        if (response.data && response.data.success) {
          setRating(response.data.averageRating);
          setTotalRatings(response.data.totalRatings);
        }
      } catch (error) {
        console.error('Lỗi khi lấy đánh giá sản phẩm:', error);
      }
    };

    fetchRating();
  }, [productId]);

  const getStarSize = () => {
    switch (size) {
      case 'small':
        return '12px';
      case 'medium':
        return '15px';
      case 'large':
        return '20px';
      default:
        return '15px';
    }
  };

  return (
    <div className="product-rating">
      <div className="stars" style={{ fontSize: getStarSize() }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <FontAwesomeIcon
            key={star}
            icon={faStar}
            className={star <= rating ? 'star-active' : 'star-inactive'}
          />
        ))}
      </div>
      {showCount && totalRatings > 0 && (
        <span className="rating-count">({totalRatings})</span>
      )}
    </div>
  );
};

export default ProductRating;
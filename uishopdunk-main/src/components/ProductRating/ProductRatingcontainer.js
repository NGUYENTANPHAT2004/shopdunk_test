import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import moment from 'moment';
import 'moment/locale/vi';
import './ProductRating.scss';

// Set moment to use Vietnamese locale
moment.locale('vi');

const ProductRatingsContainer = ({ productId }) => {
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAllRatings, setShowAllRatings] = useState(false);
  
  useEffect(() => {
    const fetchRatings = async () => {
      if (!productId) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:3005/danhgia/product/${productId}`);
        
        if (response.data && response.data.success) {
          setRatings(response.data.ratings || []);
          setAverageRating(response.data.averageRating || 0);
          setTotalRatings(response.data.totalRatings || 0);
        }
      } catch (error) {
        console.error('Error fetching product ratings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [productId]);

  // Helper function to render star rating display
  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, index) => (
      <FontAwesomeIcon 
        key={index}
        icon={index < rating ? solidStar : regularStar}
        className={index < rating ? 'star-active' : 'star-inactive'}
      />
    ));
  };

  if (loading) {
    return <div className="ratings-loading">Đang tải đánh giá...</div>;
  }

  if (totalRatings === 0) {
    return <div className="no-ratings">Chưa có đánh giá nào cho sản phẩm này</div>;
  }

  // Show limited ratings or all based on state
  const displayedRatings = showAllRatings ? ratings : ratings.slice(0, 3);

  return (
    <div className="product-ratings-container">
      <div className="ratings-summary">
        <div className="average-rating">
          <span className="rating-number">{averageRating.toFixed(1)}</span> / 5
        </div>
        <div className="rating-stars-display">
          {renderStars(Math.round(averageRating))}
        </div>
        <div className="total-ratings">
          ({totalRatings} đánh giá)
        </div>
      </div>
      
      <div className="product-ratings-list">
        {displayedRatings.map((rating, index) => (
          <div key={index} className="rating-item">
            <div className="rating-header">
              <span className="rating-user">{rating.tenkhach}</span>
              <span className="rating-date">{moment(rating.date).format('DD/MM/YYYY')}</span>
            </div>
            <div className="rating-stars-display">
              {renderStars(rating.rating)}
            </div>
            {rating.content && (
              <div className="rating-comment">{rating.content}</div>
            )}
          </div>
        ))}
      </div>
      
      {ratings.length > 3 && (
        <button 
          className="show-more-ratings" 
          onClick={() => setShowAllRatings(!showAllRatings)}
        >
          {showAllRatings ? 'Thu gọn' : `Xem thêm ${ratings.length - 3} đánh giá`}
        </button>
      )}
    </div>
  );
};

export default ProductRatingsContainer;
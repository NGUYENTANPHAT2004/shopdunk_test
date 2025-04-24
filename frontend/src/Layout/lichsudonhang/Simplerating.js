import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import './SimpleRating.scss'; // Sử dụng SCSS thay vì CSS

const SimpleRating = ({ userId, orderId, productId }) => {
  const [rating, setRating] = useState(null); // Bắt đầu với null chứ không phải 0
  const [hover, setHover] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [productInfo, setProductInfo] = useState(null);

  // Kiểm tra xem người dùng đã đánh giá chưa
  useEffect(() => {
    const checkRating = async () => {
      if (!userId || !orderId || !productId) {
        console.log('Missing required props:', { userId, orderId, productId });
        return;
      }

      try {
        console.log('Checking if user has already rated this product...');
        
        // FIX: Add proper URL path with leading slash
        const response = await axios.get(`http://localhost:3005/order-rating/check`, {
          params: { userId, orderId, productId }
        });

        console.log('Rating check response:', response.data);

        if (response.data && response.data.hasRated) {
          setHasRated(true);
          // Nếu đã đánh giá, lấy thông tin đánh giá cũ
          if (response.data.rating) {
            setRating(response.data.rating.rating);
            setComment(response.data.rating.content || '');
          }
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra đánh giá:', err);
      }
    };

    checkRating();
  }, [userId, orderId, productId]);

  // Lấy thông tin sản phẩm
  useEffect(() => {
    const fetchProductInfo = async () => {
      if (!productId) return;

      try {
        // Gọi API lấy thông tin sản phẩm
        const response = await axios.get(`http://localhost:3005/chitietsanpham/${productId}`);
        
        if (response.data) {
          console.log('Product info loaded:', response.data);
          setProductInfo(response.data);
        }
      } catch (err) {
        console.error('Lỗi khi lấy thông tin sản phẩm:', err);
      }
    };

    fetchProductInfo();
  }, [productId]);

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    
    if (!rating) {
      setError('Vui lòng chọn số sao đánh giá');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      console.log('Submitting rating:', { userId, orderId, productId, rating, comment });
      
      // FIX: Using the correct API endpoint
      const response = await axios.post('http://localhost:3005/simple-rating', {
        userId,
        orderId,
        productId,
        rating,
        content: comment
      });

      console.log('Rating submission response:', response.data);

      if (response.data && response.data.success) {
        setSuccess('Cảm ơn bạn đã đánh giá sản phẩm!');
        setHasRated(true);
      } else {
        setError(response.data.message || 'Có lỗi xảy ra khi gửi đánh giá');
      }
    } catch (err) {
      console.error('Lỗi gửi đánh giá:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nếu đã đánh giá, hiển thị thông tin đánh giá
  if (hasRated) {
    return (
      <div className="simple-rating rated">
        <div className="rating-stars">
          {[...Array(5)].map((_, i) => (
            <FontAwesomeIcon
              key={i}
              icon={i < rating ? solidStar : regularStar}
              className={i < rating ? 'star active' : 'star'}
            />
          ))}
        </div>
        <p className="rating-success">Bạn đã đánh giá sản phẩm này!</p>
        {comment && <p className="rating-comment">"{comment}"</p>}
      </div>
    );
  }

  // Hiển thị form đánh giá
  return (
    <div className="simple-rating">
      <h3>Đánh giá sản phẩm</h3>
      
      <form onSubmit={handleRatingSubmit}>
        <div className="rating-stars">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {[...Array(5)].map((_, i) => {
              const ratingValue = i + 1;
              
              return (
                <label key={i}>
                  <input
                    type="radio"
                    name="rating"
                    value={ratingValue}
                    onClick={() => {
                      console.log(`Setting rating to ${ratingValue}`);
                      setRating(ratingValue);
                    }}
                  />
                  <FontAwesomeIcon
                    icon={ratingValue <= (hover || rating || 0) ? solidStar : regularStar}
                    className={ratingValue <= (hover || rating || 0) ? 'star active' : 'star'}
                    onMouseEnter={() => setHover(ratingValue)}
                    onMouseLeave={() => setHover(null)}
                  />
                </label>
              );
            })}
          </div>
        </div>
        
        <div className="rating-selection">
          {rating ? `Bạn đã chọn: ${rating} sao` : 'Hãy chọn số sao'}
        </div>
        
        <textarea
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
        
        {error && <div className="rating-error">{error}</div>}
        {success && <div className="rating-success">{success}</div>}
        
        <button 
          type="submit" 
          disabled={isSubmitting || !rating}
          className={!rating ? 'disabled' : ''}
        >
          {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </form>
    </div>
  );
};

export default SimpleRating;
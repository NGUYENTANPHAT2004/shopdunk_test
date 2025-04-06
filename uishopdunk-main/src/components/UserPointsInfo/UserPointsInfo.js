import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faGift } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './UserPointsInfo.scss';

const UserPointsInfo = ({ phone }) => {
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!phone) return;
    
    const fetchUserPoints = async () => {
      try {
        setLoading(true);
        // Ưu tiên tìm theo số điện thoại
        const response = await axios.get(`http://localhost:3005/loyalty/user-points/${phone}`);
        
        if (response.data.success && response.data.hasPoints) {
          setPoints(response.data.points);
        } else {
          // Nếu không tìm thấy theo phone, thử tìm theo email hoặc userId
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            if (userData?.email) {
              const emailResponse = await axios.get(`http://localhost:3005/loyalty/user-points-by-email/${userData.email}`);
              if (emailResponse.data.success && emailResponse.data.hasPoints) {
                setPoints(emailResponse.data.points);
              } else {
                setPoints({ availablePoints: 0 });
              }
            } else {
              setPoints({ availablePoints: 0 });
            }
          } else {
            setPoints({ availablePoints: 0 });
          }
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
        setPoints({ availablePoints: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserPoints();
    
    // Tự động cập nhật sau mỗi 5 phút
    const intervalId = setInterval(fetchUserPoints, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [phone]);
  
  if (!phone || loading) {
    return null;
  }
  
  return (
    <Link to="/diem-thuong" className="user-points-info">
      <div className="points-icon">
        <FontAwesomeIcon icon={faCoins} />
      </div>
      <div className="points-details">
        <div className="points-value">
          {Number(points?.availablePoints || 0).toLocaleString('vi-VN')}
        </div>
        <div className="points-label">Điểm thưởng</div>
      </div>
    </Link>
  );
};

export default UserPointsInfo;
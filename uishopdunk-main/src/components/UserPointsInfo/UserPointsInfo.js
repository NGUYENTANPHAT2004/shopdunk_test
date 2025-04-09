import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faSpinner } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './UserPointsInfo.scss';
import { useUserContext } from '../../context/Usercontext';

const UserPointsInfo = () => {
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getUserPhone, getUserPoints, refreshPoints } = useUserContext();
  const fetchedRef = useRef(false);
  const intervalRef = useRef(null);
  
  useEffect(() => {
    // Tránh fetch nhiều lần nếu đã fetch rồi
    if (fetchedRef.current) return;
    
    // First try to get points from context
    const contextPoints = getUserPoints();
    if (contextPoints) {
      setPoints(contextPoints);
      setLoading(false);
      fetchedRef.current = true;
      return;
    }
    
    const fetchUserPoints = async () => {
      try {
        setLoading(true);
        fetchedRef.current = true; // Đánh dấu đã fetch một lần
        
        // Try to fetch by phone first
        const phone = getUserPhone();
        if (phone) {
          try {
            const response = await axios.get(`http://localhost:3005/loyalty/user-points/${phone}`);
            
            if (response.data.success && response.data.hasPoints) {
              setPoints(response.data.points);
              return;
            }
          } catch (error) {
            console.error('Error fetching user points by phone:', error);
          }
        }
        
        // If not found by phone, try by email
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData?.email || userData?.user?.email) {
            const email = userData?.email || userData?.user?.email;
            try {
              const emailResponse = await axios.get(`http://localhost:3005/loyalty/user-points-by-email/${email}`);
              if (emailResponse.data.success && emailResponse.data.hasPoints) {
                setPoints(emailResponse.data.points);
                return;
              }
            } catch (error) {
              console.error('Error fetching user points by email:', error);
            }
          }
          
          // Try by userId as last resort
          const userId = userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
          if (userId) {
            try {
              const userIdResponse = await axios.get(`http://localhost:3005/loyalty/user-points/${userId}`);
              if (userIdResponse.data.success && userIdResponse.data.hasPoints) {
                setPoints(userIdResponse.data.points);
                return;
              }
            } catch (error) {
              console.error('Error fetching user points by userId:', error);
            }
          }
        }
        
        // Default to 0 points if all methods fail
        setPoints({ availablePoints: 0 });
      } catch (error) {
        console.error('Error fetching user points:', error);
        setPoints({ availablePoints: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserPoints();
    
    // Auto-refresh points every 5 minutes, nhưng chỉ tạo một interval
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const updatedPoints = getUserPoints();
        if (updatedPoints) {
          setPoints(updatedPoints);
        }
      }, 5 * 60 * 1000);
    }
    
    return () => {
      // Clear interval khi component unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [getUserPhone, getUserPoints, refreshPoints]);
  
  if (loading) {
    return (
      <Link to="/diem-thuong" className="user-points-info loading">
        <FontAwesomeIcon icon={faSpinner} spin />
      </Link>
    );
  }
  
  if (!points) {
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
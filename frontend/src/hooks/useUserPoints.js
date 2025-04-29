// src/hooks/useUserPoints.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useUserContext } from '../context/Usercontext';

export const useUserPoints = () => {
  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getUserPoints: contextGetUserPoints, updateUserPoints } = useUserContext();

  // Hàm lấy userId từ localStorage
  const getUserId = useCallback(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    
    try {
      const userData = JSON.parse(storedUser);
      return userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
    } catch (e) {
      console.error('Error parsing user data:', e);
      return null;
    }
  }, []);

  // Hàm lấy thông tin điểm từ server
  const fetchUserPoints = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setLoading(false);
      setError('Không thể xác định ID người dùng');
      return null;
    }

    try {
      setLoading(true);
      
      // Kiểm tra nếu có dữ liệu trong context
      const contextPoints = contextGetUserPoints();
      if (contextPoints) {
        setUserPoints(contextPoints);
        setLoading(false);
        return contextPoints;
      }
      
      // Nếu không có sẵn, gọi API
      const response = await axios.get(`http://localhost:3005/loyalty/user-points/${userId}`);
      
      if (response.data.success) {
        const points = response.data.hasPoints 
          ? response.data.points 
          : {
              totalPoints: 0,
              availablePoints: 0,
              tier: 'standard',
              yearToDatePoints: 0,
              history: [],
              soonExpiringPoints: 0
            };
            
        setUserPoints(points);
        // Cập nhật context
        if (updateUserPoints) {
          updateUserPoints(points);
        }
        
        setError(null);
        return points;
      } else {
        throw new Error('Không thể tải thông tin điểm thưởng');
      }
    } catch (err) {
      console.error('Error fetching points:', err);
      setError('Không thể tải thông tin điểm thưởng');
      
      // Sử dụng giá trị mặc định nếu có lỗi
      const defaultPoints = {
        totalPoints: 0,
        availablePoints: 0,
        tier: 'standard',
        yearToDatePoints: 0,
        history: [],
        soonExpiringPoints: 0
      };
      
      setUserPoints(defaultPoints);
      return defaultPoints;
    } finally {
      setLoading(false);
    }
  }, [getUserId, contextGetUserPoints, updateUserPoints]);

  // Hàm đổi điểm lấy voucher
  const redeemPoints = useCallback(async (redemptionId) => {
    const userId = getUserId();
    if (!userId) return { success: false, message: 'Không thể xác định ID người dùng' };

    try {
      const response = await axios.post('http://localhost:3005/loyalty/redeem', {
        userId,
        redemptionId
      });
      
      if (response.data.success) {
        // Cập nhật state và context
        if (userPoints) {
          const updatedPoints = {
            ...userPoints,
            availablePoints: userPoints.availablePoints - response.data.voucher.pointsUsed
          };
          
          setUserPoints(updatedPoints);
          if (updateUserPoints) {
            updateUserPoints(updatedPoints);
          }
        }
        
        return {
          success: true,
          voucher: response.data.voucher
        };
      } else {
        return { success: false, message: response.data.message || 'Đổi điểm thất bại' };
      }
    } catch (error) {
      console.error('Error redeeming points:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Lỗi khi đổi điểm'
      };
    }
  }, [getUserId, userPoints, updateUserPoints]);

  // Tải dữ liệu khi khởi tạo hook
  useEffect(() => {
    fetchUserPoints();
  }, [fetchUserPoints]);

  return {
    userPoints,
    loading,
    error,
    fetchUserPoints,
    redeemPoints,
    getUserId
  };
};
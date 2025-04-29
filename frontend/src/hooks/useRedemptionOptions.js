// src/hooks/useRedemptionOptions.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useRedemptionOptions = (userId, userPointsTier) => {
  const [redemptionOptions, setRedemptionOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy danh sách quà đổi điểm
  const fetchRedemptionOptions = useCallback(async () => {
    if (!userId || !userPointsTier) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Tạo query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('tier', userPointsTier);
      queryParams.append('userId', userId);
      
      const response = await axios.get(
        `http://localhost:3005/loyalty/redemption-options?${queryParams.toString()}`
      );
      
      if (response.data.success) {
        setRedemptionOptions(response.data.redemptionOptions || []);
        setError(null);
      } else {
        setError('Không thể tải danh sách quà đổi điểm');
      }
    } catch (err) {
      console.error('Error fetching redemption options:', err);
      setError('Không thể tải danh sách quà đổi điểm');
    } finally {
      setLoading(false);
    }
  }, [userId, userPointsTier]);

  // Cập nhật trạng thái của một option
  const updateOptionStatus = useCallback((optionId, isRedeemed = true) => {
    setRedemptionOptions(prevOptions => 
      prevOptions.map(opt => 
        opt._id === optionId 
          ? { ...opt, isRedeemed, canRedeem: opt.limitPerUser > 1 }
          : opt
      )
    );
  }, []);

  // Load data khi khởi tạo hoặc khi dependencies thay đổi
  useEffect(() => {
    fetchRedemptionOptions();
  }, [fetchRedemptionOptions]);

  return {
    redemptionOptions,
    loading,
    error,
    fetchRedemptionOptions,
    updateOptionStatus
  };
};
// src/hooks/useRedemptionHistory.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useRedemptionHistory = (userId) => {
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy lịch sử đổi điểm
  const fetchRedemptionHistory = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await axios.get(
        `http://localhost:3005/loyalty/redemption-history/${userId}`
      );
      
      if (response.data.success) {
        setRedemptionHistory(response.data.history || []);
        setError(null);
      } else {
        setError('Không thể tải lịch sử đổi điểm');
      }
    } catch (err) {
      console.error('Error fetching redemption history:', err);
      setError('Không thể tải lịch sử đổi điểm');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load data khi khởi tạo
  useEffect(() => {
    fetchRedemptionHistory();
  }, [fetchRedemptionHistory]);

  return {
    redemptionHistory,
    loading,
    error,
    fetchRedemptionHistory
  };
};
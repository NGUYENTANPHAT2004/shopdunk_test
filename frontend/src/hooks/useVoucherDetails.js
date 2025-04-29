// src/hooks/useVoucherDetails.js
import { useState } from 'react';
import axios from 'axios';

export const useVoucherDetails = () => {
  const [voucherDetails, setVoucherDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy chi tiết voucher
  const fetchVoucherDetails = async (voucherId) => {
    if (!voucherId) {
      setError('Thiếu thông tin ID voucher');
      return null;
    }
    
    // Xử lý voucherId nếu là object
    if (typeof voucherId === 'object' && voucherId !== null) {
      if (voucherId._id) {
        voucherId = voucherId._id;
      } else {
        setError('ID voucher không hợp lệ');
        return null;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`http://localhost:3005/getchitietmagg/${voucherId}`);
      
      if (response.data) {
        setVoucherDetails(response.data);
        return response.data;
      } else {
        setError('Không tìm thấy thông tin voucher');
        return null;
      }
    } catch (err) {
      console.error('Error fetching voucher details:', err);
      setError('Không thể tải thông tin chi tiết voucher');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    voucherDetails,
    loading,
    error,
    fetchVoucherDetails
  };
};
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const FlashSaleContext = createContext();

export const useFlashSale = () => useContext(FlashSaleContext);

export const FlashSaleProvider = ({ children }) => {
  const [activeFlashSale, setActiveFlashSale] = useState(null);
  const [upcomingFlashSales, setUpcomingFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasNewFlashSale, setHasNewFlashSale] = useState(false);
  const [lastCheckedFlashSale, setLastCheckedFlashSale] = useState(() => {
    const saved = localStorage.getItem('lastCheckedFlashSale');
    return saved ? JSON.parse(saved) : null;
  });

  // Tính toán thời gian còn lại
  const calculateRemainingTime = (endTime) => {
    if (!endTime) return null;
    
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const timeLeft = end - now;
    
    if (timeLeft <= 0) return null;
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  // Fetch tất cả Flash Sale
  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3005/flash-sales');
      
      if (response.data.success) {
        // Flash Sale đang diễn ra
        if (response.data.data.active && response.data.data.active.length > 0) {
          // Lọc Flash Sale có sản phẩm
          const activeWithProducts = response.data.data.active.filter(
            sale => sale.products && sale.products.length > 0
          );
          
          if (activeWithProducts.length > 0) {
            // Sắp xếp theo ưu tiên
            activeWithProducts.sort((a, b) => {
              // Ưu tiên theo số lượng sản phẩm
              return b.products.length - a.products.length;
            });
            
            setActiveFlashSale(activeWithProducts[0]);
          } else {
            setActiveFlashSale(null);
          }
        } else {
          setActiveFlashSale(null);
        }
        
        // Flash Sale sắp diễn ra
        setUpcomingFlashSales(response.data.data.upcoming || []);
        
        // Kiểm tra Flash Sale mới
        const now = new Date().getTime();
        if (response.data.data.upcoming && response.data.data.upcoming.length > 0) {
          // Nếu có thông tin lần check cuối
          if (lastCheckedFlashSale) {
            // Tìm Flash Sale mới nhất
            const latestFlashSale = [...response.data.data.upcoming].sort(
              (a, b) => new Date(b.startTime) - new Date(a.startTime)
            )[0];
            
            // Nếu có Flash Sale mới sau lần check cuối
            if (new Date(latestFlashSale.startTime) > new Date(lastCheckedFlashSale.time)) {
              setHasNewFlashSale(true);
            }
          } else {
            // Chưa có thông tin lần check cuối, đánh dấu có Flash Sale mới
            setHasNewFlashSale(true);
          }
        }
      } else {
        setActiveFlashSale(null);
        setUpcomingFlashSales([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải Flash Sale:', error);
      setError('Lỗi khi tải thông tin Flash Sale');
      setActiveFlashSale(null);
      setUpcomingFlashSales([]);
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra sản phẩm có trong Flash Sale không
  const checkProductInFlashSale = async (productId, dungluongId, mausacId) => {
    try {
      const params = {};
      if (dungluongId) params.dungluongId = dungluongId;
      if (mausacId) params.mausacId = mausacId;
      
      const response = await axios.get(`http://localhost:3005/flash-sale-products/${productId}`, {
        params
      });
      
      if (response.data && response.data.data) {
        return {
          inFlashSale: true,
          flashSaleInfo: response.data.data
        };
      }
      
      return { inFlashSale: false };
    } catch (error) {
      console.error('Lỗi khi kiểm tra Flash Sale:', error);
      return { inFlashSale: false, error: error.message };
    }
  };

  // Lấy tất cả biến thể Flash Sale của một sản phẩm
  const getProductFlashSaleVariants = async (productId) => {
    try {
      const response = await axios.get(`http://localhost:3005/product-flash-sale-variants/${productId}`);
      
      if (response.data.success) {
        return {
          success: true,
          variants: response.data.variants || [],
          defaultVariant: response.data.defaultVariant
        };
      }
      
      return { success: false, variants: [] };
    } catch (error) {
      console.error('Lỗi khi lấy biến thể Flash Sale:', error);
      return { success: false, error: error.message };
    }
  };

  // Cập nhật số lượng sản phẩm Flash Sale khi mua
  const updateProductQuantity = async (flashSaleId, productId, dungluongId, mausacId, quantity = 1) => {
    try {
      const response = await axios.post('/flash-sale-purchase', {
        flashSaleId,
        productId,
        dungluongId,
        mausacId,
        quantity
      });
      
      if (response.data.success) {
        return {
          success: true,
          remainingQuantity: response.data.data.remainingQuantity
        };
      }
      
      return { 
        success: false, 
        message: response.data.message || 'Lỗi khi cập nhật số lượng sản phẩm' 
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật số lượng sản phẩm Flash Sale:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message 
      };
    }
  };

  // Đánh dấu đã xem Flash Sale mới
  const markNewFlashSaleSeen = () => {
    setHasNewFlashSale(false);
    const timestamp = new Date().getTime();
    setLastCheckedFlashSale({ time: timestamp });
    localStorage.setItem('lastCheckedFlashSale', JSON.stringify({ time: timestamp }));
  };

  // Fetch Flash Sale khi component mount
  useEffect(() => {
    fetchFlashSales();
    
    // Thiết lập interval để cập nhật định kỳ
    const intervalId = setInterval(fetchFlashSales, 5 * 60 * 1000); // 5 phút
    
    return () => clearInterval(intervalId);
  }, []);

  // Thiết lập interval để cập nhật thời gian còn lại
  useEffect(() => {
    if (!activeFlashSale) return;
    
    const intervalId = setInterval(() => {
      const remainingTime = calculateRemainingTime(activeFlashSale.endTime);
      
      if (!remainingTime) {
        // Flash Sale đã kết thúc, fetch lại dữ liệu
        fetchFlashSales();
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [activeFlashSale]);

  // Lưu lại lần check Flash Sale mới nhất
  useEffect(() => {
    if (lastCheckedFlashSale) {
      localStorage.setItem('lastCheckedFlashSale', JSON.stringify(lastCheckedFlashSale));
    }
  }, [lastCheckedFlashSale]);

  const value = {
    activeFlashSale,
    upcomingFlashSales,
    loading,
    error,
    hasNewFlashSale,
    calculateRemainingTime,
    checkProductInFlashSale,
    updateProductQuantity,
    markNewFlashSaleSeen,
    getProductFlashSaleVariants,
    refreshFlashSales: fetchFlashSales
  };

  return (
    <FlashSaleContext.Provider value={value}>
      {children}
    </FlashSaleContext.Provider>
  );
};
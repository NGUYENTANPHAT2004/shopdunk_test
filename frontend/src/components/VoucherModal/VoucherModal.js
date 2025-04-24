import React, { useState, useEffect, useRef } from 'react';
import { FaTicketAlt, FaCopy, FaCheckCircle, FaRegClock, FaTimes, FaGift, FaStar, FaCrown } from 'react-icons/fa';
import './VoucherModal.scss';
import { useUserContext } from '../../context/Usercontext';

const VoucherModal = ({ isOpen, onClose }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [notification, setNotification] = useState(null);
  const [lastGoldenHourCheck, setLastGoldenHourCheck] = useState(0);
  
  // State for drag-and-drop
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  
  // Get user info from context
  const { user } = useUserContext();

  // Get userId from user info
  const getUserId = () => {
    if (!user) return null;
    return user._id || (user.user && user.user._id);
  };

  // Reset modal position when opened
  useEffect(() => {
    if (isOpen) {
      setModalPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch vouchers when modal opens
  useEffect(() => {
    const fetchVouchers = async () => {
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        setNotification({
          type: 'error',
          message: 'Bạn cần đăng nhập để xem mã giảm giá'
        });
        return;
      }

      try {
        setLoading(true);
        // Add timeout for API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(
          `http://localhost:3005/timkiemvoucher/${userId}`, 
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate data structure
        if (!data || !Array.isArray(data.vouchers)) {
          throw new Error('Invalid data format received from API');
        }
        
        // Filter duplicate vouchers
        const uniqueVouchers = filterDuplicateVouchers(data.vouchers || []);
        setVouchers(uniqueVouchers);
      } catch (error) {
        console.error('Error fetching vouchers:', error);
        
        // Show specific error messages based on error type
        if (error.name === 'AbortError') {
          setNotification({
            type: 'error',
            message: 'Kết nối đến máy chủ quá chậm. Vui lòng thử lại sau.'
          });
        } else if (error.message.includes('Failed to fetch')) {
          setNotification({
            type: 'error',
            message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
          });
        } else {
          setNotification({
            type: 'error',
            message: 'Không thể tải mã giảm giá. Vui lòng thử lại sau.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    // Check for new vouchers
    const checkNewVouchers = async () => {
      const userId = getUserId();
      if (!userId) return;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const response = await fetch(
          `http://localhost:3005/checknewvouchers/${userId}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.hasNewVouchers) {
          setNotification({
            type: 'success',
            message: `Bạn có ${data.vouchers.length} mã giảm giá mới!`
          });
        }
      } catch (error) {
        console.error('Error checking new vouchers:', error);
        // Don't show error notification here to avoid too many notifications
      }
    };

    if (isOpen) {
      fetchVouchers();
      checkNewVouchers();
    }
  }, [isOpen, user]);
  
  // Check golden hour vouchers with throttling
  useEffect(() => {
    const checkGoldenHourVouchers = async () => {
      const userId = getUserId();
      if (!userId || !isOpen) return;
      
      // Prevent checking too frequently
      const now = Date.now();
      if (now - lastGoldenHourCheck < 5 * 60 * 1000) { // 5 minutes between checks
        return;
      }
      
      setLastGoldenHourCheck(now);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `http://localhost:3005/activegoldenhour/${userId}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.hasActiveVouchers) {
          setNotification({
            type: 'golden',
            message: `🎉 Khung giờ vàng đang diễn ra! ${data.vouchers.length} mã giảm giá đặc biệt đang có sẵn.`
          });
        }
      } catch (error) {
        console.error('Error checking golden hour vouchers:', error);
      }
    };
    
    if (isOpen) {
      checkGoldenHourVouchers();
      // Check less frequently
      const interval = setInterval(checkGoldenHourVouchers, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, lastGoldenHourCheck, user]);

  // Filter duplicate vouchers - prioritize higher discount percentage
  const filterDuplicateVouchers = (vouchersList) => {
    if (!Array.isArray(vouchersList)) {
      console.error('Invalid vouchers list:', vouchersList);
      return [];
    }
    
    // Group vouchers by type (prefix)
    const vouchersByType = {};
    
    vouchersList.forEach(voucher => {
      if (!voucher || !voucher.magiamgia) return;
      
      const prefix = getVoucherPrefix(voucher.magiamgia);
      if (!vouchersByType[prefix]) {
        vouchersByType[prefix] = [];
      }
      vouchersByType[prefix].push(voucher);
    });
    
    // For each type, keep only the voucher with the highest discount
    const filteredVouchers = [];
    
    Object.keys(vouchersByType).forEach(prefix => {
      // Golden hour vouchers (SW) can have multiple different vouchers
      if (prefix === 'SW') {
        filteredVouchers.push(...vouchersByType[prefix]);
      } else {
        // For other types, keep only the voucher with the highest discount
        const bestVoucher = vouchersByType[prefix].reduce((best, current) => {
          return (best.sophantram || 0) > (current.sophantram || 0) ? best : current;
        }, vouchersByType[prefix][0]);
        
        filteredVouchers.push(bestVoucher);
      }
    });
    
    return filteredVouchers;
  };
  
  // Get voucher prefix
  const getVoucherPrefix = (code) => {
    if (!code) return 'OTHER';
    
    if (code.startsWith('FIRST')) return 'FIRST';
    if (code.startsWith('LOYAL')) return 'LOYAL';
    if (code.startsWith('WELCOME')) return 'WELCOME';
    if (code.startsWith('SW')) return 'SW';
    if (code.startsWith('REWARD')) return 'REWARD';
    return 'OTHER';
  };

  // Copy voucher code to clipboard
  const handleCopyCode = (code) => {
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setNotification({
        type: 'success',
        message: 'Đã sao chép mã giảm giá!'
      });
      setTimeout(() => setCopiedCode(null), 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
      setNotification({
        type: 'error',
        message: 'Không thể sao chép mã. Vui lòng thử lại.'
      });
    });
  };
  
  // Dismiss notification
  const dismissNotification = () => {
    setNotification(null);
  };

  // Get voucher type icon
  const getVoucherIcon = (code) => {
    if (!code) return <FaTicketAlt className="voucher-type-icon default" />;
    
    if (code.startsWith('FIRST')) return <FaStar className="voucher-type-icon first" />;
    if (code.startsWith('LOYAL')) return <FaCrown className="voucher-type-icon loyal" />;
    if (code.startsWith('WELCOME')) return <FaGift className="voucher-type-icon welcome" />;
    if (code.startsWith('SW')) return <FaRegClock className="voucher-type-icon server" />;
    return <FaTicketAlt className="voucher-type-icon default" />;
  };
  
  // Get voucher type label
  const getVoucherTypeLabel = (code) => {
    if (!code) return 'Mã giảm giá';
    
    if (code.startsWith('FIRST')) return 'Khách hàng mới';
    if (code.startsWith('LOYAL')) return 'Khách hàng thân thiết';
    if (code.startsWith('WELCOME')) return 'Chào mừng';
    if (code.startsWith('SW')) return 'Khung giờ vàng';
    if (code.startsWith('REWARD')) return 'Phần thưởng';
    return 'Mã giảm giá';
  };

  // Improved date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return 'Không xác định';
    
    try {
      // Handle already formatted dates
      if (typeof dateString === 'string' && dateString.includes('/')) {
        // Validate format
        const parts = dateString.split('/');
        if (parts.length === 3) {
          return dateString;
        }
      }
      
      // Try standard date parsing
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('vi-VN');
      }
      
      // Try different date formats
      if (typeof dateString === 'string') {
        // Try DD/MM/YYYY format
        const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const ddmmyyyyMatch = dateString.match(ddmmyyyy);
        if (ddmmyyyyMatch) {
          const day = parseInt(ddmmyyyyMatch[1], 10);
          const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
          const year = parseInt(ddmmyyyyMatch[3], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('vi-VN');
          }
        }
        
        // Try YYYY-MM-DD format
        const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const yyyymmddMatch = dateString.match(yyyymmdd);
        if (yyyymmddMatch) {
          const year = parseInt(yyyymmddMatch[1], 10);
          const month = parseInt(yyyymmddMatch[2], 10) - 1;
          const day = parseInt(yyyymmddMatch[3], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('vi-VN');
          }
        }
      }
      
      return 'Không xác định';
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Không xác định';
    }
  };

  // Improved check expiry function
  const checkExpiry = (dateString) => {
    if (!dateString) return true; // Treat missing dates as expired
    
    try {
      let expiryDate;
      
      // Handle DD/MM/YYYY format
      if (typeof dateString === 'string' && dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // Set to end of day for the expiry date
          expiryDate = new Date(
            parseInt(parts[2], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[0], 10),
            23, 59, 59
          );
        } else {
          expiryDate = new Date(dateString);
        }
      } else {
        expiryDate = new Date(dateString);
      }
      
      if (isNaN(expiryDate.getTime())) {
        console.error('Invalid date format:', dateString);
        return true; // Treat invalid dates as expired
      }
      
      return expiryDate < new Date();
    } catch (error) {
      console.error('Error checking expiry:', error, dateString);
      return true; // Treat error cases as expired
    }
  };

  // Improved golden hour detection
  const isInGoldenHour = (voucher) => {
    if (!voucher || !voucher.goldenHourStart || !voucher.goldenHourEnd) return false;
    
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Convert times to minutes since midnight for easier comparison
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      // Parse start time (HH:MM format)
      const startParts = voucher.goldenHourStart.split(':');
      if (startParts.length !== 2) return false;
      const startTimeInMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
      
      // Parse end time (HH:MM format)
      const endParts = voucher.goldenHourEnd.split(':');
      if (endParts.length !== 2) return false;
      const endTimeInMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
      
      // Handle cases where golden hour crosses midnight
      if (startTimeInMinutes <= endTimeInMinutes) {
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
      } else {
        return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes;
      }
    } catch (error) {
      console.error('Error checking golden hour:', error);
      return false;
    }
  };

  // Filter vouchers based on active tab
  const filteredVouchers = vouchers.filter((voucher) => {
    if (!voucher) return false;
    
    try {
      const isExpired = checkExpiry(voucher.ngayketthuc);
      const isOutOfStock = parseInt(voucher.soluong || 0, 10) <= 0;
      const isAvailable = !isExpired && !isOutOfStock;
      
      if (activeTab === 'available') {
        return isAvailable;
      } else if (activeTab === 'expired') {
        return isExpired || isOutOfStock;
      }
      return true;
    } catch (error) {
      console.error('Error filtering voucher:', error, voucher);
      return false;
    }
  });

  // Improved drag-and-drop handling
  const handleMouseDown = (e) => {
    // Only allow dragging from header and prevent from buttons or interactive elements
    if (
      e.target.closest('.voucher-modal-header') && 
      !e.target.closest('.close-button') && 
      !e.target.closest('button') && 
      !e.target.closest('input')
    ) {
      setIsDragging(true);
      setDragStartPosition({
        x: e.clientX - modalPosition.x,
        y: e.clientY - modalPosition.y
      });
      
      // Prevent text selection during drag
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStartPosition.x;
      const newY = e.clientY - dragStartPosition.y;
      
      // Limit modal to window boundaries
      if (modalRef.current) {
        const modalRect = modalRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        const maxX = windowWidth - modalRect.width;
        const maxY = windowHeight - modalRect.height;
        
        setModalPosition({
          x: Math.min(Math.max(0, newX), maxX),
          y: Math.min(Math.max(0, newY), maxY)
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for drag-and-drop
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isOpen, isDragging]);

  if (!isOpen) return null;

  return (
    <div 
      className="voucher-modal-overlay" 
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className={`voucher-modal ${isDragging ? 'dragging' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`
        }}
      >
        <div className="voucher-modal-header">
          <div className="voucher-modal-title">
            <FaTicketAlt className="voucher-icon" />
            <h2>Mã giảm giá của bạn</h2>
          </div>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {notification && (
          <div className={`notification-banner ${notification.type}`}>
            <p>{notification.message}</p>
            <button className="dismiss-button" onClick={dismissNotification}>
              <FaTimes />
            </button>
          </div>
        )}

        <div className="voucher-tabs">
          <button
            className={`tab-button ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            Khả dụng ({vouchers.filter(v => v && !checkExpiry(v.ngayketthuc) && parseInt(v.soluong || 0, 10) > 0).length})
          </button>
          <button
            className={`tab-button ${activeTab === 'expired' ? 'active' : ''}`}
            onClick={() => setActiveTab('expired')}
          >
            Đã hết hạn ({vouchers.filter(v => v && (checkExpiry(v.ngayketthuc) || parseInt(v.soluong || 0, 10) <= 0)).length})
          </button>
        </div>

        <div className="voucher-modal-content">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Đang tải mã giảm giá...</p>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="no-vouchers">
              <p>{activeTab === 'available' ? 'Bạn chưa có mã giảm giá khả dụng nào' : 'Bạn chưa có mã giảm giá hết hạn nào'}</p>
            </div>
          ) : (
            <div className="vouchers-list">
              {filteredVouchers.map((voucher, index) => {
                // Validate voucher object to prevent errors
                if (!voucher || typeof voucher !== 'object') return null;
                
                // Check for required fields
                if (!voucher.magiamgia || voucher.sophantram === undefined) {
                  console.error('Invalid voucher data:', voucher);
                  return null;
                }
                
                try {
                  const isExpired = checkExpiry(voucher.ngayketthuc);
                  const isOutOfStock = parseInt(voucher.soluong || 0, 10) <= 0;
                  const isGoldenHour = voucher.goldenHourStart && voucher.goldenHourEnd;
                  const isCurrentlyGoldenHour = isGoldenHour && isInGoldenHour(voucher);
                  const voucherType = getVoucherTypeLabel(voucher.magiamgia);
                  
                  return (
                    <div 
                      key={`${voucher.magiamgia}-${index}`} 
                      className={`voucher-item 
                        ${(isExpired || isOutOfStock) ? 'expired' : ''} 
                        ${isGoldenHour ? 'golden-hour-voucher' : ''}
                        ${isCurrentlyGoldenHour ? 'active-golden-hour' : ''}
                      `}
                    >
                      <div className="voucher-header">
                        <div className="voucher-type">
                          {getVoucherIcon(voucher.magiamgia)}
                          <span>{voucherType}</span>
                        </div>
                        <div className="discount-label">
                          Giảm {voucher.sophantram}%
                        </div>
                        {(isExpired || isOutOfStock) && (
                          <div className="expired-label">
                            {isOutOfStock ? 'Đã hết lượt sử dụng' : 'Đã hết hạn'}
                          </div>
                        )}
                        {isCurrentlyGoldenHour && (
                          <div className="active-now-label">
                            Đang áp dụng
                          </div>
                        )}
                      </div>
                      
                      <div className="voucher-body">
                        <div className="voucher-info">
                          <p className="voucher-code-label">Mã giảm giá:</p>
                          <div className="voucher-code">
                            <span>{voucher.magiamgia}</span>
                            {!isExpired && !isOutOfStock && (
                              <button 
                                className="copy-button"
                                onClick={() => handleCopyCode(voucher.magiamgia)}
                              >
                                {copiedCode === voucher.magiamgia ? (
                                  <FaCheckCircle className="copied-icon" />
                                ) : (
                                  <FaCopy />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {voucher.minOrderValue > 0 && (
                          <p className="min-order">
                            Đơn tối thiểu: {Number(voucher.minOrderValue).toLocaleString('vi-VN')}đ
                          </p>
                        )}
                        
                        {voucher.maxOrderValue > 0 && (
                          <p className="max-order">
                            Đơn tối đa: {Number(voucher.maxOrderValue).toLocaleString('vi-VN')}đ
                          </p>
                        )}
                        
                        {isGoldenHour && (
                          <p className={`golden-hour ${isCurrentlyGoldenHour ? 'active' : ''}`}>
                            <FaRegClock /> Khung giờ vàng: {voucher.goldenHourStart} - {voucher.goldenHourEnd}
                            {isCurrentlyGoldenHour && <span className="active-badge">Đang diễn ra</span>}
                          </p>
                        )}
                        
                        {voucher.daysOfWeek && Array.isArray(voucher.daysOfWeek) && voucher.daysOfWeek.length > 0 && (
                          <p className="days-restriction">
                            Áp dụng: {voucher.daysOfWeek.map(day => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day]).join(', ')}
                          </p>
                        )}
                      </div>
                      
                      <div className="voucher-footer">
                        <p className="validity">
                          Có hiệu lực đến: {formatDate(voucher.ngayketthuc)}
                        </p>
                        <p className="uses-left">
                          Còn lại: {voucher.soluong} lượt
                        </p>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering voucher item:', error, voucher);
                  return null;
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoucherModal;
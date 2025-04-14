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
  
  // Thêm state cho phép kéo thả
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  
  // Lấy thông tin người dùng từ context
  const { user } = useUserContext();

  // Lấy userId từ thông tin người dùng
  const getUserId = () => {
    // Kiểm tra user có tồn tại không
    if (!user) return null;
    
    // Trả về userId, có thể nằm trực tiếp trong user hoặc trong user.user
    return user._id || (user.user && user.user._id);
  };

  // Reset vị trí modal khi mở lại
  useEffect(() => {
    if (isOpen) {
      setModalPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

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
        // Gọi API với userId
        const response = await fetch(`http://localhost:3005/timkiemvoucher/${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          // Lọc voucher để tránh voucher trùng lặp
          const uniqueVouchers = filterDuplicateVouchers(data.vouchers || []);
          setVouchers(uniqueVouchers);
        } else {
          console.error('Error fetching vouchers:', data.message);
          setNotification({
            type: 'error',
            message: 'Không thể tải mã giảm giá. Vui lòng thử lại sau.'
          });
        }
      } catch (error) {
        console.error('Error fetching vouchers:', error);
        setNotification({
          type: 'error',
          message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
        });
      } finally {
        setLoading(false);
      }
    };

    // Check for new vouchers when modal opens
    const checkNewVouchers = async () => {
      const userId = getUserId();
      if (!userId) return;
      
      try {
        const response = await fetch(`http://localhost:3005/checknewvouchers/${userId}`);
        const data = await response.json();
        
        if (response.ok && data.hasNewVouchers) {
          setNotification({
            type: 'success',
            message: `Bạn có ${data.vouchers.length} mã giảm giá mới!`
          });
        }
      } catch (error) {
        console.error('Error checking new vouchers:', error);
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
        const response = await fetch(`http://localhost:3005/activegoldenhour/${userId}`);
        const data = await response.json();
        
        if (response.ok && data.hasActiveVouchers) {
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

  // Lọc voucher trùng lặp - ưu tiên giữ lại voucher có % giảm giá cao hơn
  const filterDuplicateVouchers = (vouchersList) => {
    // Nhóm voucher theo loại (prefix)
    const vouchersByType = {};
    
    vouchersList.forEach(voucher => {
      const prefix = getVoucherPrefix(voucher.magiamgia);
      if (!vouchersByType[prefix]) {
        vouchersByType[prefix] = [];
      }
      vouchersByType[prefix].push(voucher);
    });
    
    // Đối với mỗi loại, chỉ giữ lại voucher có % giảm cao nhất
    const filteredVouchers = [];
    
    Object.keys(vouchersByType).forEach(prefix => {
      // Khung giờ vàng (SW) có thể có nhiều voucher khác nhau
      if (prefix === 'SW') {
        filteredVouchers.push(...vouchersByType[prefix]);
      } else {
        // Đối với các loại khác, chỉ giữ lại voucher có % giảm cao nhất
        const bestVoucher = vouchersByType[prefix].reduce((best, current) => {
          return best.sophantram > current.sophantram ? best : current;
        }, vouchersByType[prefix][0]);
        
        filteredVouchers.push(bestVoucher);
      }
    });
    
    return filteredVouchers;
  };
  
  // Lấy prefix của voucher
  const getVoucherPrefix = (code) => {
    if (!code) return 'OTHER';
    
    if (code.startsWith('FIRST')) return 'FIRST';
    if (code.startsWith('LOYAL')) return 'LOYAL';
    if (code.startsWith('WELCOME')) return 'WELCOME';
    if (code.startsWith('SW')) return 'SW';
    if (code.startsWith('REWARD')) return 'REWARD';
    return 'OTHER';
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setNotification({
        type: 'success',
        message: 'Đã sao chép mã giảm giá!'
      });
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };
  
  const dismissNotification = () => {
    setNotification(null);
  };

  // Get voucher type icon based on prefix
  const getVoucherIcon = (code) => {
    if (code.startsWith('FIRST')) return <FaStar className="voucher-type-icon first" />;
    if (code.startsWith('LOYAL')) return <FaCrown className="voucher-type-icon loyal" />;
    if (code.startsWith('WELCOME')) return <FaGift className="voucher-type-icon welcome" />;
    if (code.startsWith('SW')) return <FaRegClock className="voucher-type-icon server" />;
    return <FaTicketAlt className="voucher-type-icon default" />;
  };
  
  const getVoucherTypeLabel = (code) => {
    if (!code) return 'Mã giảm giá';
    
    if (code.startsWith('FIRST')) return 'Khách hàng mới';
    if (code.startsWith('LOYAL')) return 'Khách hàng thân thiết';
    if (code.startsWith('WELCOME')) return 'Chào mừng';
    if (code.startsWith('SW')) return 'Khung giờ vàng';
    if (code.startsWith('REWARD')) return 'Phần thưởng';
    return 'Mã giảm giá';
  };

  // Filter vouchers based on active tab
  const filteredVouchers = vouchers.filter((voucher) => {
    if (!voucher) return false;
    
    const now = new Date();
    const isExpired = new Date(voucher.ngayketthuc) < now;
    const isAvailable = !isExpired && voucher.soluong > 0;
    
    if (activeTab === 'available') {
      return isAvailable;
    } else if (activeTab === 'expired') {
      return isExpired || voucher.soluong <= 0;
    }
    return true;
  });

  // Check if voucher is currently in golden hour
  const isInGoldenHour = (voucher) => {
    if (!voucher.goldenHourStart || !voucher.goldenHourEnd) return false;
    
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                        now.getMinutes().toString().padStart(2, '0');
    
    if (voucher.goldenHourStart <= voucher.goldenHourEnd) {
      return currentTime >= voucher.goldenHourStart && currentTime <= voucher.goldenHourEnd;
    } else {
      return currentTime >= voucher.goldenHourStart || currentTime <= voucher.goldenHourEnd;
    }
  };

  // Xử lý kéo thả modal
  const handleMouseDown = (e) => {
    // Chỉ cho phép kéo từ header
    if (e.target.closest('.voucher-modal-header') && !e.target.closest('.close-button')) {
      setIsDragging(true);
      setDragStartPosition({
        x: e.clientX - modalPosition.x,
        y: e.clientY - modalPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStartPosition.x;
      const newY = e.clientY - dragStartPosition.y;
      
      // Giới hạn không cho modal ra khỏi màn hình
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
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Thêm event listener khi component mount
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
            Khả dụng ({vouchers.filter(v => v && new Date(v.ngayketthuc) >= new Date() && v.soluong > 0).length})
          </button>
          <button
            className={`tab-button ${activeTab === 'expired' ? 'active' : ''}`}
            onClick={() => setActiveTab('expired')}
          >
            Đã hết hạn ({vouchers.filter(v => v && (new Date(v.ngayketthuc) < new Date() || v.soluong <= 0)).length})
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
                if (!voucher) return null;
                
                const isExpired = new Date(voucher.ngayketthuc) < new Date();
                const isOutOfStock = voucher.soluong <= 0;
                const isGoldenHour = voucher.goldenHourStart && voucher.goldenHourEnd;
                const isCurrentlyGoldenHour = isGoldenHour && isInGoldenHour(voucher);
                const voucherType = getVoucherTypeLabel(voucher.magiamgia);
                
                return (
                  <div 
                    key={index} 
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
                          Đơn tối thiểu: {voucher.minOrderValue.toLocaleString('vi-VN')}đ
                        </p>
                      )}
                      
                      {voucher.maxOrderValue && (
                        <p className="max-order">
                          Đơn tối đa: {voucher.maxOrderValue.toLocaleString('vi-VN')}đ
                        </p>
                      )}
                      
                      {isGoldenHour && (
                        <p className={`golden-hour ${isCurrentlyGoldenHour ? 'active' : ''}`}>
                          <FaRegClock /> Khung giờ vàng: {voucher.goldenHourStart} - {voucher.goldenHourEnd}
                          {isCurrentlyGoldenHour && <span className="active-badge">Đang diễn ra</span>}
                        </p>
                      )}
                      
                      {voucher.daysOfWeek && voucher.daysOfWeek.length > 0 && (
                        <p className="days-restriction">
                          Áp dụng: {voucher.daysOfWeek.map(day => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day]).join(', ')}
                        </p>
                      )}
                    </div>
                    
                    <div className="voucher-footer">
                      <p className="validity">
                        Có hiệu lực đến: {new Date(voucher.ngayketthuc).toLocaleDateString('vi-VN')}
                      </p>
                      <p className="uses-left">
                        Còn lại: {voucher.soluong} lượt
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoucherModal;
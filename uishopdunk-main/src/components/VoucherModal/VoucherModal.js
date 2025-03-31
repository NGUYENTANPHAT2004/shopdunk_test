import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaCopy, FaCheckCircle, FaRegClock, FaTimes, FaGift, FaStar, FaCrown } from 'react-icons/fa';
import './VoucherModal.scss';

const VoucherModal = ({ isOpen, onClose, phone }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!phone) return;

      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3005/timkiemvoucher/${phone}`);
        const data = await response.json();
        
        if (response.ok) {
          setVouchers(data.vouchers || []);
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
      if (!phone) return;
      
      try {
        const response = await fetch(`http://localhost:3005/checknewvouchers/${phone}`);
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
  }, [isOpen, phone]);
  
  // Check golden hour vouchers
  useEffect(() => {
    const checkGoldenHourVouchers = async () => {
      if (!phone || !isOpen) return;
      
      try {
        const response = await fetch(`http://localhost:3005/activegoldenhour/${phone}`);
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
      // Check every 5 minutes for golden hour updates
      const interval = setInterval(checkGoldenHourVouchers, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, phone]);

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
    if (code.startsWith('FIRST')) return 'Khách hàng mới';
    if (code.startsWith('LOYAL')) return 'Khách hàng thân thiết';
    if (code.startsWith('WELCOME')) return 'Chào mừng';
    if (code.startsWith('SW')) return 'Khung giờ vàng';
    if (code.startsWith('REWARD')) return 'Phần thưởng';
    return 'Mã giảm giá';
  };

  // Filter vouchers based on active tab
  const filteredVouchers = vouchers.filter((voucher) => {
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

  if (!isOpen) return null;

  return (
    <div className="voucher-modal-overlay" onClick={onClose}>
      <div className="voucher-modal" onClick={(e) => e.stopPropagation()}>
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
            Khả dụng ({vouchers.filter(v => new Date(v.ngayketthuc) >= new Date() && v.soluong > 0).length})
          </button>
          <button
            className={`tab-button ${activeTab === 'expired' ? 'active' : ''}`}
            onClick={() => setActiveTab('expired')}
          >
            Đã hết hạn ({vouchers.filter(v => new Date(v.ngayketthuc) < new Date() || v.soluong <= 0).length})
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
                const isExpired = new Date(voucher.ngayketthuc) < new Date();
                const isOutOfStock = voucher.soluong <= 0;
                const isGoldenHour = voucher.goldenHourStart && voucher.goldenHourEnd;
                const voucherType = getVoucherTypeLabel(voucher.magiamgia);
                
                return (
                  <div 
                    key={index} 
                    className={`voucher-item ${(isExpired || isOutOfStock) ? 'expired' : ''} ${isGoldenHour ? 'golden-hour-voucher' : ''}`}
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
                        <p className="golden-hour">
                          <FaRegClock /> Khung giờ vàng: {voucher.goldenHourStart} - {voucher.goldenHourEnd}
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
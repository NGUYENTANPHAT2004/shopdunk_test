import React, { useState, useEffect } from 'react';
import { 
  initializeAdminSocket,
  registerStockListeners,
  checkStock
} from '../../untils/socketUtils';
import { toast } from 'react-toastify';
import { 
  FaExclamationTriangle, 
  FaTimesCircle, 
  FaBell, 
  FaBox 
} from 'react-icons/fa';
import './inventory.scss';

const InventoryMonitor = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Khởi tạo socket kết nối
    initializeAdminSocket();
    
    // Đăng ký lắng nghe thông báo tồn kho
    const unregisterListeners = registerStockListeners(
      // Xử lý thông báo tồn kho thấp
      (data) => {
        console.log('Đã nhận thông báo tồn kho thấp:', data);
        
        if (data.products && data.products.length > 0) {
          // Lọc các sản phẩm đã tồn tại trong danh sách
          const newItems = data.products.filter(newItem => 
            !lowStockItems.some(item => item.id === newItem.id)
          );
          
          if (newItems.length > 0) {
            setLowStockItems(prev => [...newItems, ...prev].slice(0, 20));
            setUnreadCount(prev => prev + newItems.length);
            setLastUpdated(new Date());
            
            // Hiển thị toast thông báo
            toast.warning(`Cảnh báo: Có ${newItems.length} sản phẩm sắp hết hàng!`, {
              position: "top-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true
            });
          }
        }
      },
      
      // Xử lý trạng thái tồn kho
      (data) => {
        console.log('Trạng thái tồn kho:', data);
        // Có thể xử lý thêm nếu cần
      },
      
      // Xử lý lỗi tồn kho
      (error) => {
        console.error('Lỗi kiểm tra tồn kho:', error);
        toast.error(`Lỗi khi kiểm tra tồn kho: ${error.message}`, {
          position: "top-right",
          autoClose: 3000
        });
      }
    );
    
    // Kiểm tra tồn kho ngay lúc khởi tạo
    checkStock();
    
    // Đặt lịch kiểm tra tồn kho định kỳ (mỗi 15 phút)
    const interval = setInterval(() => {
      checkStock();
    }, 15 * 60 * 1000);
    
    // Dọn dẹp khi unmount
    return () => {
      unregisterListeners();
      clearInterval(interval);
    };
  }, [lowStockItems]);
  
  // Xử lý đánh dấu đã đọc tất cả
  const handleMarkAllRead = () => {
    setUnreadCount(0);
    setLowStockItems(prev => prev.map(item => ({ ...item, read: true })));
  };
  
  // Xử lý đánh dấu đã đọc một mục
  const handleMarkItemRead = (id) => {
    setLowStockItems(prev => prev.map(item => {
      if (item.id === id && !item.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        return { ...item, read: true };
      }
      return item;
    }));
  };
  
  return (
    <div className="inventory-monitor">
      <div 
        className="inventory-icon" 
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <FaBox />
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>
      
      {showDropdown && (
        <div className="inventory-dropdown">
          <div className="inventory-header">
            <h3>Thông báo tồn kho</h3>
            {lowStockItems.length > 0 && (
              <button 
                className="mark-all-read"
                onClick={handleMarkAllRead}
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          
          <div className="inventory-list">
            {lowStockItems.length === 0 ? (
              <div className="no-alerts">
                Không có thông báo tồn kho nào
              </div>
            ) : (
              <>
                {lowStockItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`inventory-item ${item.read ? '' : 'unread'}`}
                    onClick={() => handleMarkItemRead(item.id)}
                  >
                    <div className="item-icon">
                      <FaExclamationTriangle />
                    </div>
                    <div className="item-content">
                      <div className="item-title">
                        <span>{item.name}</span>
                      </div>
                      <div className="item-details">
                        <span>Dung lượng: {item.capacity || 'N/A'}</span>
                        <span>Màu sắc: {item.color || 'N/A'}</span>
                        <span className="quantity">
                          Số lượng: <strong>{item.quantity}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          
          <div className="inventory-footer">
            <button 
              className="check-inventory"
              onClick={() => {
                checkStock();
                toast.info('Đang kiểm tra tồn kho...', {
                  position: "top-right",
                  autoClose: 2000
                });
              }}
            >
              Kiểm tra tồn kho
            </button>
            
            {lastUpdated && (
              <div className="last-updated">
                Cập nhật: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryMonitor;
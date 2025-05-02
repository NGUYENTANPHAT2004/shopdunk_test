import React, { useState, useEffect } from 'react';
import { 
  initializeAdminSocket,
  registerOrderListeners
} from '../../untils/socketUtils';
import { toast } from 'react-toastify';
import { 
  FaShoppingCart, 
  FaBell, 
  FaHistory, 
  FaCheck 
} from 'react-icons/fa';
import './ordernotifi.scss';

const OrderNotifications = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [orders, setOrders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Khởi tạo kết nối socket
    initializeAdminSocket();
    
    // Đăng ký lắng nghe thông báo đơn hàng
    const unregisterListeners = registerOrderListeners(
      // Xử lý thông báo đơn hàng mới
      (data) => {
        console.log('Đã nhận thông báo đơn hàng mới:', data);
        
        if (data.orderData) {
          // Tạo đối tượng đơn hàng từ dữ liệu
          const newOrder = {
            id: data.orderData.orderCode,
            customerName: data.orderData.customerName,
            total: data.orderData.total,
            time: new Date().toISOString(),
            type: 'new',
            read: false
          };
          
          // Thêm vào trạng thái
          setOrders(prev => {
            // Kiểm tra xem đơn hàng đã tồn tại chưa
            const orderExists = prev.some(order => order.id === newOrder.id);
            if (orderExists) return prev;
            
            // Thêm đơn hàng mới vào đầu danh sách
            return [newOrder, ...prev].slice(0, 10);
          });
          
          // Tăng số lượng thông báo chưa đọc
          setUnreadCount(prev => prev + 1);
          
          // Hiển thị toast thông báo
          toast.success(`Đơn hàng mới: #${newOrder.id}`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
          
          // Phát âm thanh thông báo nếu có thể
          try {
            const audio = new Audio('/notification-sound.mp3');
            audio.play();
          } catch (error) {
            console.log('Không thể phát âm thanh thông báo');
          }
        }
      },
      
      // Xử lý thông báo thay đổi trạng thái đơn hàng
      (data) => {
        console.log('Thay đổi trạng thái đơn hàng:', data);
        
        if (data.orderCode) {
          // Tạo thông báo thay đổi trạng thái
          const statusUpdate = {
            id: data.orderCode,
            status: data.status,
            time: new Date().toISOString(),
            type: 'status',
            message: data.message || `Đơn hàng đã chuyển sang trạng thái: ${data.status}`,
            read: false
          };
          
          // Cập nhật trạng thái
          setOrders(prev => {
            // Kiểm tra xem đơn hàng đã tồn tại chưa
            const orderIndex = prev.findIndex(order => order.id === statusUpdate.id);
            
            if (orderIndex === -1) {
              // Nếu không tìm thấy đơn hàng, thêm mới
              return [statusUpdate, ...prev].slice(0, 10);
            } else {
              // Nếu tìm thấy, cập nhật thông tin
              const updatedOrders = [...prev];
              updatedOrders[orderIndex] = {
                ...updatedOrders[orderIndex],
                status: statusUpdate.status,
                time: statusUpdate.time,
                type: 'status',
                message: statusUpdate.message,
                read: false
              };
              return updatedOrders;
            }
          });
          
          // Tăng số lượng thông báo chưa đọc
          setUnreadCount(prev => prev + 1);
          
          // Hiển thị toast thông báo
          toast.info(`Cập nhật đơn hàng #${data.orderCode}: ${data.status}`, {
            position: "top-right",
            autoClose: 3000
          });
        }
      }
    );
    
    // Hủy đăng ký khi unmount
    return () => {
      unregisterListeners();
    };
  }, []);
  
  // Xử lý đánh dấu đọc tất cả
  const handleMarkAllRead = () => {
    setOrders(prev => prev.map(order => ({ ...order, read: true })));
    setUnreadCount(0);
  };
  
  // Xử lý đánh dấu đọc một thông báo
  const handleMarkRead = (id) => {
    setOrders(prev => 
      prev.map(order => {
        if (order.id === id && !order.read) {
          setUnreadCount(unread => Math.max(0, unread - 1));
          return { ...order, read: true };
        }
        return order;
      })
    );
  };
  
  // Định dạng thời gian
  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Định dạng tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };
  
  return (
    <div className="order-notifications">
      <div 
        className="notification-icon" 
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>
      
      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Thông báo đơn hàng</h3>
            {orders.length > 0 && (
              <button 
                className="mark-all-read"
                onClick={handleMarkAllRead}
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {orders.length === 0 ? (
              <div className="no-notifications">
                Không có thông báo đơn hàng nào
              </div>
            ) : (
              orders.map((order) => (
                <div 
                  key={`${order.id}-${order.time}`} 
                  className={`notification-item ${order.read ? '' : 'unread'}`}
                  onClick={() => handleMarkRead(order.id)}
                >
                  <div className="notification-icon">
                    {order.type === 'new' ? (
                      <FaShoppingCart className="new-order" />
                    ) : (
                      <FaHistory className="status-update" />
                    )}
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-title">
                      {order.type === 'new' 
                        ? `Đơn hàng mới #${order.id}` 
                        : `Cập nhật đơn hàng #${order.id}`}
                    </div>
                    
                    {order.type === 'new' && order.customerName && (
                      <div className="notification-customer">
                        Khách hàng: {order.customerName}
                      </div>
                    )}
                    
                    {order.type === 'new' && order.total && (
                      <div className="notification-amount">
                        Tổng tiền: {formatCurrency(order.total)}
                      </div>
                    )}
                    
                    {order.type === 'status' && order.status && (
                      <div className="notification-status">
                        Trạng thái: <span>{order.status}</span>
                      </div>
                    )}
                    
                    {order.type === 'status' && order.message && (
                      <div className="notification-message">
                        {order.message}
                      </div>
                    )}
                    
                    <div className="notification-time">
                      {formatTime(order.time)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="notification-footer">
            <a href="/admin?tab=Hóa đơn" className="view-all">
              Xem tất cả đơn hàng
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderNotifications;
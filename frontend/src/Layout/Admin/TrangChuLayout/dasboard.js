import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShoppingCart, 
  faUsers, 
  faBoxOpen, 
  faBell,
  faMobileAlt,
  faClipboardList,
  faMoneyBillWave,
  faPercent,
  faComments,
  faBolt,
  faStar,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import './dasboarch.scss';

function TrangChuDashboard() {
  const [summaryData, setSummaryData] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    newReviews: 0
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Lấy dữ liệu hóa đơn
        const ordersRes = await axios.get('http://localhost:3005/gethoadon');
        
        // Lọc các hóa đơn gần đây
        const filteredOrders = ordersRes.data
          .filter(order => !order.isDeleted)
          .sort((a, b) => new Date(b.ngaymua) - new Date(a.ngaymua))
          .slice(0, 5);

        setRecentOrders(filteredOrders);
        
        // Đếm số hóa đơn đang xử lý
        const pendingOrders = ordersRes.data.filter(
          order => order.trangthai === 'Đang xử lý' && !order.isDeleted
        ).length;
        
        // Trong triển khai thực tế, thêm các API calls khác tại đây
        // Ví dụ: lấy dữ liệu kho hàng với tồn kho thấp, đánh giá mới, v.v.
        // const stockRes = await axios.get('/api/inventory/low-stock');
        // const reviewsRes = await axios.get('/api/reviews/unread');
        
        // Mock data - thay thế bằng API thực tế trong triển khai
        const lowStockItems = 7; 
        const newReviews = 12;
        
        setSummaryData({
          totalOrders: ordersRes.data.length,
          pendingOrders,
          lowStockItems,
          newReviews
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu trang chủ:', error);
        setError('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Các liên kết nhanh đến các chức năng quản lý chính
  const quickLinks = [
    { name: 'Quản lý sản phẩm', icon: faMobileAlt, path: '/admin?tab=Sản Phẩm', color: '#3498db' },
    { name: 'Quản lý đơn hàng', icon: faClipboardList, path: '/admin?tab=Hóa đơn', color: '#2ecc71' },
    { name: 'Quản lý kho', icon: faBoxOpen, path: '/admin?tab=Kho', color: '#f39c12' },
    { name: 'Báo cáo doanh thu', icon: faMoneyBillWave, path: '/admin?tab=Doanh Thu', color: '#9b59b6' },
    { name: 'Mã giảm giá', icon: faPercent, path: '/admin?tab=Mã Giảm Giá', color: '#e74c3c' },
    { name: 'Flash Sale', icon: faBolt, path: '/admin?tab=Flash Sale', color: '#e67e22' },
    { name: 'Đánh giá', icon: faComments, path: '/admin?tab=Đánh giá', color: '#1abc9c' },
    { name: 'Điểm thưởng', icon: faStar, path: '/admin?tab=Điểm Thưởng', color: '#d35400' }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (isLoading) {
    return <div className="dashboard-loading">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Chào mừng đến với Trang quản trị</h1>
        <p>Tổng quan về cửa hàng của bạn</p>
      </div>

      {/* Thông tin tổng quan */}
      <div className="dashboard-summary">
        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#3498db' }}>
            <FontAwesomeIcon icon={faShoppingCart} />
          </div>
          <div className="summary-content">
            <h3>Tổng đơn hàng</h3>
            <p>{summaryData.totalOrders}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#f39c12' }}>
            <FontAwesomeIcon icon={faBell} />
          </div>
          <div className="summary-content">
            <h3>Đơn chờ xử lý</h3>
            <p>{summaryData.pendingOrders}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#e74c3c' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className="summary-content">
            <h3>Sản phẩm sắp hết</h3>
            <p>{summaryData.lowStockItems}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#2ecc71' }}>
            <FontAwesomeIcon icon={faComments} />
          </div>
          <div className="summary-content">
            <h3>Đánh giá mới</h3>
            <p>{summaryData.newReviews}</p>
          </div>
        </div>
      </div>

      {/* Liên kết nhanh */}
      <div className="dashboard-quick-links">
        <h2>Truy cập nhanh</h2>
        <div className="quick-links-grid">
          {quickLinks.map((link, index) => (
            <a href={link.path} key={index} className="quick-link-card">
              <div className="quick-link-icon" style={{ backgroundColor: link.color }}>
                <FontAwesomeIcon icon={link.icon} />
              </div>
              <div className="quick-link-text">{link.name}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Đơn hàng gần đây */}
      <div className="dashboard-recent-orders">
        <h2>Đơn hàng gần đây</h2>
        <div className="recent-orders-table">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.maHDL || order._id.substring(0, 8)}</td>
                    <td>{order.name}</td>
                    <td>{formatDate(order.ngaymua)}</td>
                    <td>{formatCurrency(order.tongtien)}</td>
                    <td>
                      <span className={`status-badge status-${order.trangthai.replace(/\s+/g, '-').toLowerCase()}`}>
                        {order.trangthai}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">Không có đơn hàng nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="view-all-link">
          <a href="/admin?tab=Hóa đơn">Xem tất cả đơn hàng</a>
        </div>
      </div>
    </div>
  );
}

export default TrangChuDashboard;
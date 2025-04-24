// FlashSaleAdmin.js - Component quản lý Flash Sale cho Admin
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faChartBar, 
  faToggleOn, 
  faToggleOff, 
  faClock,
  faCalendarAlt,
  faInfoCircle,
  faSpinner,
  faMemory,
  faPalette,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import moment from 'moment';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './FlashSaleAdmin.scss';
import FlashSaleForm from './FlashSaleForm';
import FlashSaleStats from './FlashSaleStats';

const FlashSaleAdmin = () => {
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedFlashSale, setSelectedFlashSale] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Hàm kiểm tra ngày hợp lệ
  const isValidDate = (dateString) => {
    if (!dateString) return false;
    
    // Thử phân tích theo định dạng ISO
    let date = moment(dateString);
    
    // Nếu không thành công, thử với định dạng "DD/MM/YYYY HH:mm"
    if (!date.isValid() && typeof dateString === 'string') {
      date = moment(dateString, 'DD/MM/YYYY HH:mm');
    }
    
    return date.isValid();
  };
  
  // Định dạng thời gian - cập nhật để xử lý cả định dạng "DD/MM/YYYY HH:mm"
  const formatDateISO = (dateString) => {
    try {
      if (!dateString) return "N/A";
      
      // Thử phân tích theo định dạng ISO
      let date = moment(dateString);
      
      // Nếu không thành công, thử với định dạng "DD/MM/YYYY HH:mm"
      if (!date.isValid() && typeof dateString === 'string') {
        date = moment(dateString, 'DD/MM/YYYY HH:mm');
      }
      
      if (!date.isValid()) {
        console.warn('Không thể chuyển đổi ngày:', dateString);
        return 'Thời gian không hợp lệ';
      }
      
      // Trả về định dạng tiêu chuẩn
      return date.format('DD/MM/YYYY HH:mm');
    } catch (error) {
      console.error('Lỗi định dạng ngày:', error, dateString);
      return 'Lỗi định dạng';
    }
  };

  // Fetch Flash Sales
  useEffect(() => {
    fetchFlashSales();
  }, [filter, page, refreshTrigger]);

  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3005/admin/flash-sales?status=${filter}&page=${page}&limit=10`);
      
      if (response.data.success) {
        // Log để debug
        console.log('Nhận dữ liệu gốc từ API:', response.data.data[0]);
        
        // Kiểm tra và xử lý dữ liệu nếu cần
        const processedData = response.data.data.map(sale => {
          // Nếu startTime và endTime đã là định dạng DD/MM/YYYY HH:mm, bạn không cần chuyển đổi
          // Chỉ cần đảm bảo nó được giữ nguyên
          
          // Kiểm tra xem dữ liệu có hợp lệ không bằng cách thử xử lý thời gian
          try {
            // Log thông tin thời gian để debug
            console.log(`Flash Sale ${sale.name}:`, {
              startTime: sale.startTime,
              endTime: sale.endTime,
              startTimeValid: isValidDate(sale.startTime),
              endTimeValid: isValidDate(sale.endTime)
            });
            
            // Nếu không hợp lệ, ghi vào console để debug
            if (!isValidDate(sale.startTime) || !isValidDate(sale.endTime)) {
              console.warn('Thời gian không hợp lệ cho Flash Sale:', sale.name);
            }
          } catch (err) {
            console.error('Lỗi khi kiểm tra thời gian:', err);
          }
          
          return sale;
        });
        
        setFlashSales(processedData);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        toast.error('Không thể tải danh sách Flash Sale');
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách Flash Sale:', error);
      toast.error('Lỗi khi tải danh sách Flash Sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlashSale = () => {
    setSelectedFlashSale(null);
    setEditMode(false);
    setShowForm(true);
    setShowStats(false);
  };

  const handleEditFlashSale = (flashSale) => {
    setSelectedFlashSale(flashSale);
    setEditMode(true);
    setShowForm(true);
    setShowStats(false);
  };

  const handleViewStats = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3005/admin/flash-sales/${id}/stats`);
      
      if (response.data.success) {
        setSelectedFlashSale(response.data.data);
        setShowStats(true);
        setShowForm(false);
      } else {
        toast.error('Không thể tải thông tin Flash Sale');
      }
    } catch (error) {
      console.error('Lỗi khi tải thông tin Flash Sale:', error);
      toast.error('Lỗi khi tải thông tin Flash Sale');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlashSale = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Flash Sale này?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(`http://localhost:3005/admin/flash-sales/${id}`);
      
      if (response.data.success) {
        toast.success('Xóa Flash Sale thành công');
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error('Không thể xóa Flash Sale');
      }
    } catch (error) {
      console.error('Lỗi khi xóa Flash Sale:', error);
      toast.error('Lỗi khi xóa Flash Sale');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      console.log(`Thay đổi trạng thái Flash Sale ${id} từ ${currentStatus ? 'bật' : 'tắt'} sang ${!currentStatus ? 'bật' : 'tắt'}`);
      
      const response = await axios.patch(`http://localhost:3005/admin/flash-sales/${id}/status`, {
        isActive: !currentStatus,
        forceActivation: true // Quan trọng: Luôn dùng tham số này để bỏ qua kiểm tra thời gian
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Đã thay đổi trạng thái Flash Sale thành công');
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error('Không thể thay đổi trạng thái Flash Sale');
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi trạng thái Flash Sale:', error);
      
      // Hiển thị thông báo lỗi chi tiết từ phản hồi API
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Lỗi khi thay đổi trạng thái Flash Sale');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  // Format thời gian còn lại
  const formatRemainingTime = (startTime, endTime) => {
    try {
      // Xử lý định dạng "DD/MM/YYYY HH:mm"
      let start = moment(startTime);
      if (!start.isValid() && typeof startTime === 'string') {
        start = moment(startTime, 'DD/MM/YYYY HH:mm');
      }
      
      let end = moment(endTime);
      if (!end.isValid() && typeof endTime === 'string') {
        end = moment(endTime, 'DD/MM/YYYY HH:mm');
      }
      
      const now = moment();
      
      // Kiểm tra tính hợp lệ của thời gian sau khi parse
      if (!start.isValid() || !end.isValid()) {
        console.warn('Thời gian không hợp lệ:', { startTime, endTime });
        return 'Thời gian không hợp lệ';
      }
      
      if (now.isBefore(start)) {
        // Sắp diễn ra
        const diff = start.diff(now);
        const duration = moment.duration(diff);
        return `Còn ${duration.days()}d ${duration.hours()}h để bắt đầu`;
      } else if (now.isBefore(end)) {
        // Đang diễn ra
        const diff = end.diff(now);
        const duration = moment.duration(diff);
        return `Còn ${duration.hours()}h ${duration.minutes()}m để kết thúc`;
      } else {
        // Đã kết thúc
        return 'Đã kết thúc';
      }
    } catch (error) {
      console.error('Lỗi khi tính thời gian còn lại:', error);
      return 'Lỗi định dạng thời gian';
    }
  };

  // Render badge trạng thái
  const renderStatusBadge = (startTime, endTime, isActive) => {
    try {
      // Xử lý định dạng "DD/MM/YYYY HH:mm"
      let start = moment(startTime);
      if (!start.isValid() && typeof startTime === 'string') {
        start = moment(startTime, 'DD/MM/YYYY HH:mm');
      }
      
      let end = moment(endTime);
      if (!end.isValid() && typeof endTime === 'string') {
        end = moment(endTime, 'DD/MM/YYYY HH:mm');
      }
      
      const now = moment();
      
      // Kiểm tra tính hợp lệ của thời gian
      if (!start.isValid() || !end.isValid()) {
        console.warn('Thời gian không hợp lệ cho trạng thái:', { startTime, endTime });
        return <span className="status-badge error">Lỗi dữ liệu</span>;
      }
      
      if (!isActive) {
        return <span className="status-badge inactive">Không hoạt động</span>;
      }
      
      if (now.isBefore(start)) {
        return <span className="status-badge upcoming">Sắp diễn ra</span>;
      } else if (now.isBefore(end)) {
        return <span className="status-badge active">Đang diễn ra</span>;
      } else {
        return <span className="status-badge ended">Đã kết thúc</span>;
      }
    } catch (error) {
      console.error('Lỗi khi xác định trạng thái:', error);
      return <span className="status-badge error">Lỗi dữ liệu</span>;
    }
  };

  // Tính tiến độ bán hàng
  const calculateProgress = (flashSale) => {
    const soldQuantity = flashSale.soldQuantity || 0;
    const totalQuantity = flashSale.totalQuantity || 1;
    return Math.min(Math.round((soldQuantity / totalQuantity) * 100), 100);
  };

  // Hiển thị thông tin biến thể sản phẩm
  const renderVariantInfo = (flashSale) => {
    // Đếm số lượng biến thể
    const totalVariants = flashSale.totalVariants || 0;
    
    // Nếu có biến thể, hiển thị số lượng
    if (totalVariants > 0) {
      return (
        <div className="variant-info">
          <span className="variant-count">{totalVariants} biến thể</span>
        </div>
      );
    }
    
    // Nếu không có biến thể, chỉ hiển thị "Tất cả"
    return (
      <div className="variant-info">
        <span className="variant-all">Tất cả</span>
      </div>
    );
  };

  return (
    <div className="flash-sale-admin">
      <ToastContainer position="top-right" />
      
      <div className="header">
        <h2>Quản lý Flash Sale</h2>
        <button className="create-button" onClick={handleCreateFlashSale}>
          <FontAwesomeIcon icon={faPlus} />
          <span>Tạo Flash Sale mới</span>
        </button>
      </div>
      
      <div className="filter-section">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          Tất cả
        </button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => handleFilterChange('active')}
        >
          Đang diễn ra
        </button>
        <button 
          className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => handleFilterChange('upcoming')}
        >
          Sắp diễn ra
        </button>
        <button 
          className={`filter-btn ${filter === 'ended' ? 'active' : ''}`}
          onClick={() => handleFilterChange('ended')}
        >
          Đã kết thúc
        </button>
      </div>
      
      {loading && flashSales.length === 0 ? (
        <div className="loading-container">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : flashSales.length === 0 ? (
        <div className="no-flash-sales">
          <FontAwesomeIcon icon={faInfoCircle} />
          <p>Không có Flash Sale nào {filter !== 'all' ? `(${filter})` : ''}</p>
          <button className="create-button" onClick={handleCreateFlashSale}>
            Tạo Flash Sale mới
          </button>
        </div>
      ) : (
        <div className="flash-sales-table">
          <table>
            <thead>
              <tr>
                <th>Tên Flash Sale</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Sản phẩm</th>
                <th>Biến thể</th>
                <th>Tiến độ</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {flashSales.map(flashSale => (
                <tr key={flashSale._id}>
                  <td className="name-cell">{flashSale.name}</td>
                  <td className="time-cell">
                    <div className="time-info">
                      <div className="time-range">
                        <FontAwesomeIcon icon={faCalendarAlt} />
                        {isValidDate(flashSale.startTime) && isValidDate(flashSale.endTime) ? (
                          <>
                            <span>{formatDateISO(flashSale.startTime)}</span>
                            <span> - </span>
                            <span>{formatDateISO(flashSale.endTime)}</span>
                          </>
                        ) : (
                          <span className="error-text">Thời gian không hợp lệ</span>
                        )}
                      </div>
                      <div className="remaining-time">
                        <FontAwesomeIcon icon={faClock} />
                        <span>{formatRemainingTime(flashSale.startTime, flashSale.endTime)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="status-cell">
                    {renderStatusBadge(flashSale.startTime, flashSale.endTime, flashSale.isActive)}
                  </td>
                  <td className="products-cell">
                    <div className="products-info">
                      <div className="total-products">{flashSale.totalProducts} sản phẩm</div>
                      <div className="products-qty">
                        Đã bán: {flashSale.soldQuantity}/{flashSale.totalQuantity}
                      </div>
                    </div>
                  </td>
                  <td className="variants-cell">
                    {renderVariantInfo(flashSale)}
                  </td>
                  <td className="progress-cell">
                    <div className="progress-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${calculateProgress(flashSale)}%` }}
                      ></div>
                      <span className="progress-text">{calculateProgress(flashSale)}%</span>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn stats"
                      onClick={() => handleViewStats(flashSale._id)}
                      title="Xem thống kê"
                    >
                      <FontAwesomeIcon icon={faChartBar} />
                    </button>
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEditFlashSale(flashSale)}
                      title="Chỉnh sửa"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button 
                      className="action-btn toggle"
                      onClick={() => handleToggleStatus(flashSale._id, flashSale.isActive)}
                      title={flashSale.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    >
                      <FontAwesomeIcon icon={flashSale.isActive ? faToggleOn : faToggleOff} />
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteFlashSale(flashSale._id)}
                      title="Xóa"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            Trước
          </button>
          
          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx}
              className={page === idx + 1 ? 'active' : ''}
              onClick={() => setPage(idx + 1)}
            >
              {idx + 1}
            </button>
          ))}
          
          <button
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
          >
            Sau
          </button>
        </div>
      )}
      
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <FlashSaleForm 
              isEdit={editMode}
              flashSale={selectedFlashSale}
              onClose={() => setShowForm(false)}
              onSubmit={handleFormSubmit}
            />
          </div>
        </div>
      )}
      
      {showStats && selectedFlashSale && (
        <div className="modal-overlay">
          <div className="modal-content">
            <FlashSaleStats
              flashSale={selectedFlashSale}
              onClose={() => setShowStats(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashSaleAdmin;
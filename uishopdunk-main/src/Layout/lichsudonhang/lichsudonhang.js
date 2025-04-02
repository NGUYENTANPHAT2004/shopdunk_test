import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { useUserContext } from '../../context/Usercontext';
import './lichsudonhang.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faTrash, faReceipt, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import ProductRating from '../../components/ProductRating/ProductRating';

function LichSuDonHangLayout() {
  const { user } = useUserContext();
  const [donHangs, setDonHangs] = useState([]);
  const [selectedDonHang, setSelectedDonHang] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.post('http://localhost:3005/gethoadonuser', {
          userId: user._id,
        });
        // Filter out any orders that might be marked as isDeleted
        const filteredOrders = response.data.hoadons?.filter(order => !order.isDeleted) || [];
        setDonHangs(filteredOrders);
        setError(null);
      } catch (error) {
        console.error('Lỗi khi lấy lịch sử đơn hàng:', error);
        setError('Không thể tải lịch sử đơn hàng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleXemChiTiet = async (idhoadon) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3005/getchitiethd/${idhoadon}`);
      setSelectedDonHang(response.data);
    } catch (error) {
      console.error('Lỗi khi xem chi tiết:', error);
      alert('Có lỗi xảy ra khi tải chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleXacNhan = async (idhoadon) => {
    try {
      await axios.post(`http://localhost:3005/settrangthai/${idhoadon}`, {
        trangthai: 'Hoàn thành',
      });
      alert('Đơn hàng đã được xác nhận hoàn thành');
      setSelectedDonHang(null);
      // Reload lại danh sách
      refreshOrderList();
    } catch (error) {
      console.error('Lỗi xác nhận đơn:', error);
      alert('Có lỗi xảy ra khi xác nhận đơn hàng.');
    }
  };

  const refreshOrderList = async () => {
    try {
      const refreshed = await axios.post('http://localhost:3005/gethoadonuser', {
        userId: user._id,
      });
      // Filter out any deleted orders
      const filteredOrders = refreshed.data.hoadons?.filter(order => !order.isDeleted) || [];
      setDonHangs(filteredOrders);
    } catch (error) {
      console.error('Lỗi khi làm mới danh sách đơn hàng:', error);
    }
  };

  const confirmDeleteOrder = (idhoadon) => {
    setDeleteOrderId(idhoadon);
    setShowDeleteConfirm(true);
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    
    try {
      setLoading(true);
      await axios.post('http://localhost:3005/deletehoaddon', {
        ids: [deleteOrderId]
      });
      
      // Immediately remove the deleted order from the state
      setDonHangs(prevDonHangs => prevDonHangs.filter(order => order._id !== deleteOrderId));
      
      // If we're deleting the currently viewed order, close the detail view
      if (selectedDonHang && selectedDonHang._id === deleteOrderId) {
        setSelectedDonHang(null);
      }
      
      // Close the dialog and reset state
      setShowDeleteConfirm(false);
      setDeleteOrderId(null);
      
    } catch (error) {
      console.error('Lỗi xóa đơn hàng:', error);
      alert('Có lỗi xảy ra khi xóa đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (product) => {
    setSelectedProduct(product);
    setShowRatingModal(true);
    setRating(0); // Reset rating
    setComment(''); // Reset comment
  };

  const submitRating = async () => {
    if (!selectedProduct || !rating) {
      alert('Vui lòng chọn số sao đánh giá');
      return;
    }

    try {
      setLoading(true);
      await axios.post('http://localhost:3005/danhgia', {
        tenkhach: user.name || user.username || 'Khách hàng',
        content: comment,
        rating: rating,
        theloaiId: selectedProduct.idsp,
        theloaiName: selectedProduct.namesanpham,
        theloaiSlug: selectedProduct.namesanpham.toLowerCase().replace(/\s+/g, '-')
      });
      
      alert('Đánh giá thành công!');
      setShowRatingModal(false);
      setRating(0);
      setComment('');
      setSelectedProduct(null);
    } catch (error) {
      console.error('Lỗi khi đánh giá:', error);
      alert('Có lỗi xảy ra khi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Đã thanh toán':
      case 'Hoàn thành':
        return 'status-success';
      case 'Đang xử lý':
      case 'Đang vận chuyển':
        return 'status-pending';
      case 'Hủy Đơn Hàng':
      case 'Thanh toán thất bại':
      case 'Thanh toán hết hạn':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  // Check if the order is eligible for deletion (not completed or paid)
  const canDeleteOrder = (order) => {
    const nonDeletableStatuses = [
      'Hoàn thành',
      'Đã nhận',
      'Đã thanh toán'
    ];
    
    return !nonDeletableStatuses.includes(order.trangthai) || !order.thanhtoan;
  };

  if (loading && donHangs.length === 0) {
    return (
      <div className="lichsu-donhang-container">
        <h2>Lịch sử đơn hàng</h2>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lichsu-donhang-container">
        <h2>Lịch sử đơn hàng</h2>
        <div className="error-message">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lichsu-donhang-container">
      <h2>Lịch sử đơn hàng</h2>

      {donHangs.length === 0 ? (
        <p className="empty-message">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="table-responsive">
          <table className="table-donhang">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Ngày Mua</th>
                <th>Trạng Thái</th>
                <th>Tổng Tiền</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {donHangs.map((hd) => (
                <tr key={hd._id}>
                  <td>{hd.maHDL || (hd._id ? hd._id.slice(-6) : 'N/A')}</td>
                  <td>{moment(hd.ngaymua).format('DD/MM/YYYY')}</td>
                  <td>
                    <span className={`status-indicator ${getStatusClass(hd.trangthai)}`}>
                      {hd.trangthai}
                    </span>
                  </td>
                  <td className="price-column">{hd.tongtien.toLocaleString()}₫</td>
                  <td className="action-buttons">
                    <button className="btn-view" onClick={() => handleXemChiTiet(hd._id)}>
                      <FontAwesomeIcon icon={faReceipt} /> Chi tiết
                    </button>
                    {hd.trangthai === 'Đã thanh toán' && (
                      <button className="btn-confirm" onClick={() => handleXacNhan(hd._id)}>
                        Xác nhận
                      </button>
                    )}
                    {canDeleteOrder(hd) && (
                      <button className="btn-delete" onClick={() => confirmDeleteOrder(hd._id)}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDonHang && (
        <div className="chitiet-donhang">
          <div className="chitiet-header">
            <h3>Chi tiết đơn hàng </h3>
            <span className={`status-badge ${getStatusClass(selectedDonHang.trangthai)}`}>
              {selectedDonHang.trangthai}
            </span>
          </div>
          
          <div className="order-info">
            <div className="info-group">
              <p><strong>Người nhận:</strong> {selectedDonHang.nguoinhan}</p>
              <p><strong>SĐT:</strong> {selectedDonHang.phone}</p>
              <p><strong>Địa chỉ:</strong> {selectedDonHang.address || 'N/A'}</p>
            </div>
            <div className="info-group">
              <p><strong>Ngày mua:</strong> {selectedDonHang.ngaymua}</p>
              <p><strong>Thanh toán:</strong> {selectedDonHang.thanhtoan ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
              <p><strong>Ghi chú:</strong> {selectedDonHang.ghichu || 'Không có'}</p>
            </div>
          </div>
          
          <h4>Sản phẩm:</h4>
          <ul className="product-list">
            {selectedDonHang.hoadonsanpham.map((sp, index) => (
              <li key={index} className="product-item">
                <div className="product-details">
                  <span className="product-name">{sp.namesanpham}</span>
                  <span className="product-variant">{sp.dungluong} - {sp.mausac}</span>
                  <div className="product-price-row">
                    <span className="product-quantity">SL: {sp.soluong}</span>
                    <span className="product-price">{sp.price.toLocaleString()}₫</span>
                  </div>
                </div>
                
                {(selectedDonHang.trangthai === 'Hoàn thành' || selectedDonHang.trangthai === 'Đã nhận') && (
                  <button className="btn-rating" onClick={() => handleRating(sp)}>
                    <FontAwesomeIcon icon={faStar} /> Đánh giá
                  </button>
                )}
              </li>
            ))}
          </ul>
          
          <div className="order-total">
            <p><strong>Tổng tiền:</strong> <span className="total-price">{selectedDonHang.tongtien.toLocaleString()}₫</span></p>
          </div>
          
          <div className="action-row">
            <button className="btn-close" onClick={() => setSelectedDonHang(null)}>Đóng</button>
            {selectedDonHang.trangthai === 'Đã thanh toán' && (
              <button className="btn-confirm" onClick={() => handleXacNhan(selectedDonHang._id)}>Xác nhận đã nhận</button>
            )}
          </div>
        </div>
      )}

      {showRatingModal && (
        <div className="rating-modal">
          <div className="rating-content">
            <h3>Đánh giá sản phẩm</h3>
            <div className="product-to-rate">
              <div className="product-info">
                <div className="product-name">{selectedProduct?.namesanpham}</div>
                <div className="product-variant">{selectedProduct?.dungluong} - {selectedProduct?.mausac}</div>
              </div>
            </div>
            <div className="rating-stars">
              <span className="star-label">Bạn cảm thấy sản phẩm này như thế nào?</span>
              <div className="stars-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesomeIcon
                    key={star}
                    icon={faStar}
                    className={star <= rating ? 'star-active' : 'star-inactive'}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
            <textarea
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="rating-buttons">
              <button className="cancel-rating" onClick={() => {
                setShowRatingModal(false);
                setRating(0);
                setComment('');
              }}>
                Hủy
              </button>
              <button 
                className="submit-rating" 
                onClick={submitRating}
                disabled={!rating}
              >
                Gửi đánh giá
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="confirm-modal">
          <div className="confirm-content">
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa đơn hàng này?</p>
            <p className="warning-text">Lưu ý: Hành động này không thể hoàn tác.</p>
            <div className="confirm-buttons">
              <button className="btn-confirm-delete" onClick={handleDeleteOrder}>Xóa đơn hàng</button>
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LichSuDonHangLayout;
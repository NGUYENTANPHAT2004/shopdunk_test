import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { useUserContext } from '../../context/Usercontext';
import './lichsudonhang.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar, faTrash, faReceipt, faExclamationTriangle, faTimes, faBan } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import ProductRating from '../../components/ProductRating/ProductRating';
import OrderDetails from './OrderDeatails';
import io from 'socket.io-client';

function LichSuDonHangLayout() {
  const { user } = useUserContext();
  const [donHangs, setDonHangs] = useState([]);
  const [selectedDonHang, setSelectedDonHang] = useState(null);
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Định nghĩa hàm fetchOrders ở đây để có thể gọi lại
    const fetchOrders = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }
  
      try {
        setLoading(true);
        const response = await axios.post('http://localhost:3005/gethoadonuser', {
          userId: user._id,
        });
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
  
    // Socket connection logic
    if (user?._id) {
      console.log('🔌 Khởi tạo socket với userId:', user._id);
      
      const socketInstance = io('http://localhost:3005/store', {
        query: { userId: user._id },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      setSocket(socketInstance);
      
      // Xử lý khi kết nối thành công
      socketInstance.on('connect', () => {
        console.log('✅ Socket connected successfully, ID:', socketInstance.id);
        
        // Đăng ký user
        socketInstance.emit('register_user', { 
          userId: user._id,
          phone: user.phone 
        });
        
        // Join room cụ thể của user
        socketInstance.emit('join', `user_${user._id}`);
        console.log(`📢 Joined room: user_${user._id}`);
      });
      
      // Xử lý lỗi kết nối
      socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
      });
      
      // Xử lý khi bị disconnect
      socketInstance.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnect socket, cần kết nối lại thủ công
          socketInstance.connect();
        }
      });
      
      // Lắng nghe sự kiện thay đổi trạng thái đơn hàng
      socketInstance.on('order_status_changed', (data) => {
        console.log('🔔 Đơn hàng thay đổi trạng thái:', data);
        
        // Cập nhật state donHangs
        setDonHangs(prevOrders => 
          prevOrders.map(order => {
            if (order._id === data.orderId) {
              console.log(`📝 Updating order ${data.orderId}: ${data.oldStatus} -> ${data.newStatus}`);
              return { 
                ...order, 
                trangthai: data.newStatus, 
                thanhtoan: data.paymentStatus 
              };
            }
            return order;
          })
        );
        
        // Cập nhật selectedDonHang nếu đang xem chi tiết đơn hàng này
        if (selectedDonHang && selectedDonHang._id === data.orderId) {
          setSelectedDonHang(prev => ({
            ...prev,
            trangthai: data.newStatus,
            thanhtoan: data.paymentStatus
          }));
        }
        
        // Hiển thị thông báo nếu trạng thái thay đổi
        if (data.oldStatus !== data.newStatus) {
          // Có thể dùng toast notification thay vì alert
          alert(`Đơn hàng ${data.maHDL} đã chuyển từ "${data.oldStatus}" sang "${data.newStatus}"`);
        }
      });
      
      // Lắng nghe sự kiện broadcast (cho tất cả orders)
      socketInstance.on('order_status_updated', (data) => {
        console.log('📢 Broadcast order update received:', data);
        
        // Kiểm tra xem đơn hàng có thuộc về user hiện tại không
        const myOrder = donHangs.find(order => order._id === data.orderId);
        if (myOrder) {
          setDonHangs(prevOrders => 
            prevOrders.map(order => {
              if (order._id === data.orderId) {
                return { 
                  ...order, 
                  trangthai: data.status, 
                  thanhtoan: data.paymentStatus 
                };
              }
              return order;
            })
          );
        }
      });
      
      // Lắng nghe sự kiện cập nhật danh sách đơn hàng
      socketInstance.on('order_list_updated', (data) => {
        console.log('📋 Order list update signal received');
        fetchOrders(); // Gọi hàm fetchOrders được định nghĩa ở trên
      });
      
      // Cleanup khi component unmount
      return () => {
        console.log('🔌 Cleaning up socket connection');
        if (socketInstance) {
          socketInstance.off('order_status_changed');
          socketInstance.off('order_status_updated');
          socketInstance.off('order_list_updated');
          socketInstance.disconnect();
        }
      };
    } else {
      console.log('⚠️ No user ID available for socket connection');
    }
    fetchOrders();
    
  }, [user]); 

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
      
      if (!response.data || !response.data.hoadonsanpham || !Array.isArray(response.data.hoadonsanpham)) {
        console.error('Dữ liệu không hợp lệ từ API:', response.data);
        throw new Error('Dữ liệu đơn hàng không hợp lệ');
      }
      
      try {
        if (response.data.hoadonsanpham.length > 0) {
          const ratingStatusPromises = response.data.hoadonsanpham.map(product => 
            axios.get(`http://localhost:3005/order-rating/check`, {
              params: {
                userId: user._id,
                productId: product.idsp,
                orderId: idhoadon
              }
            }).catch(err => {
              console.warn(`Không thể kiểm tra trạng thái đánh giá cho sản phẩm ${product.idsp}:`, err);
              return { data: { hasRated: false } };
            })
          );
          
          const ratingResults = await Promise.all(ratingStatusPromises);
          
          response.data.hoadonsanpham = response.data.hoadonsanpham.map((product, index) => {
            return {
              ...product,
              idsp: response.data.sanpham?.[index]?.idsp || product.idsp,
              hasRated: ratingResults[index]?.data?.hasRated || false
            };
          });
        }
      } catch (ratingErr) {
        console.error('Lỗi khi kiểm tra trạng thái đánh giá:', ratingErr);
      }
      
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
      const filteredOrders = refreshed.data.hoadons?.filter(order => !order.isDeleted) || [];
      setDonHangs(filteredOrders);
    } catch (error) {
      console.error('Lỗi khi làm mới danh sách đơn hàng:', error);
    }
  };

  const confirmCancelOrder = (idhoadon) => {
    setCancelOrderId(idhoadon);
    setShowCancelConfirm(true);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return;
    
    try {
      setLoading(true);
      
      const checkResponse = await axios.get(`http://localhost:3005/getchitiethd/${cancelOrderId}`);
      const currentStatus = checkResponse.data.trangthai;
      
      const cancellableStatuses = ['Đang xử lý', 'Đã thanh toán'];
      
      if (!cancellableStatuses.includes(currentStatus)) {
        alert(`Không thể hủy đơn hàng ở trạng thái "${currentStatus}"`);
        await refreshOrderList();
        setShowCancelConfirm(false);
        setCancelOrderId(null);
        return;
      }
      
      await axios.post(`http://localhost:3005/settrangthai/${cancelOrderId}`, {
        trangthai: 'Hủy Đơn Hàng',
      });
      
      setShowCancelConfirm(false);
      setCancelOrderId(null);
      alert('Đơn hàng đã được hủy thành công');
      
    } catch (error) {
      console.error('Lỗi hủy đơn hàng:', error);
      alert('Có lỗi xảy ra khi hủy đơn hàng.');
      await refreshOrderList();
    } finally {
      setLoading(false);
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
      
      setDonHangs(prevDonHangs => prevDonHangs.filter(order => order._id !== deleteOrderId));
      
      if (selectedDonHang && selectedDonHang._id === deleteOrderId) {
        setSelectedDonHang(null);
      }
      
      setShowDeleteConfirm(false);
      setDeleteOrderId(null);
      
      alert('Đơn hàng đã được xóa khỏi lịch sử của bạn');
      
    } catch (error) {
      console.error('Lỗi xóa đơn hàng:', error);
      alert('Có lỗi xảy ra khi xóa đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const checkRatingStatus = async (product, orderId) => {
    try {
      const response = await axios.get(`http://localhost:3005/order-rating/check`, {
        params: {
          userId: user._id,
          productId: product._id || product.idsp,
          orderId: orderId
        }
      });
      
      return response.data.hasRated;
    } catch (error) {
      console.error('Lỗi kiểm tra trạng thái đánh giá:', error);
      return false;
    }
  };

  const openRatingModal = async (product) => {
    try {
      if (!product || !product.idsp) {
        alert('Thông tin sản phẩm không hợp lệ');
        return;
      }
      
      const response = await axios.get(`http://localhost:3005/order-rating/check`, {
        params: {
          userId: user._id,
          productId: product.idsp,
          orderId: selectedDonHang._id
        }
      });
      
      if (response.data.hasRated) {
        alert('Bạn đã đánh giá sản phẩm này trong đơn hàng!');
        return;
      }
      
      setSelectedProduct(product);
      setRating(null);
      setComment('');
      setRatingError('');
      setRatingModalOpen(true);
      
      console.log('Opening rating modal for product:', product);
    } catch (error) {
      console.error('Lỗi kiểm tra trạng thái đánh giá:', error);
      alert('Có lỗi xảy ra khi kiểm tra trạng thái đánh giá. Vui lòng thử lại sau.');
    }
  };
  
  const closeRatingModal = () => {
    setSelectedProduct(null);
    setRating(null);
    setComment('');
    setRatingError('');
    setRatingModalOpen(false);
  };

  const submitRating = async () => {
    if (!selectedProduct) {
      setRatingError('Không tìm thấy thông tin sản phẩm');
      return;
    }
    
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      setRatingError('Vui lòng chọn số sao đánh giá (1-5 sao)');
      return;
    }

    try {
      setIsSubmitting(true);
      setRatingError('');
      
      console.log('Submitting rating data:', {
        productId: selectedProduct.idsp,
        rating: rating,
        userId: user._id
      });

      const response = await axios.post('http://localhost:3005/order-rating', {
        userId: user._id,
        orderId: selectedDonHang._id,
        productId: selectedProduct.idsp,
        productName: selectedProduct.namesanpham || 'Sản phẩm',
        productImage: selectedProduct.image || '',
        tenkhach: user.tenkhach || user.username || 'Khách hàng',
        content: comment,
        rating: rating,
        dungluong: selectedProduct.dungluong || '',
        mausac: selectedProduct.mausac || '',
        verified: true
      });

      if (response.data.success) {
        alert('Cảm ơn bạn đã đánh giá sản phẩm!');
        closeRatingModal();
        
        if (selectedDonHang) {
          handleXemChiTiet(selectedDonHang._id);
        }
      } else {
        setRatingError(response.data.message || 'Có lỗi xảy ra khi gửi đánh giá');
      }
    } catch (error) {
      console.error('Lỗi khi đánh giá:', error);
      if (error.response && error.response.data) {
        setRatingError(error.response.data.message || 'Lỗi từ máy chủ');
      } else {
        setRatingError('Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRateProduct = (product, order) => {
    const eligibleStatuses = ['Hoàn thành', 'Đã nhận'];
    return eligibleStatuses.includes(order.trangthai) && !product.hasRated;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Đã thanh toán':
      case 'Hoàn thành':
      case 'Đã nhận':
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

  const canCancelOrder = (order) => {
    const cancellableStatuses = [
      'Đang xử lý',
      'Đã thanh toán'
    ];
    
    const nonCancellableStatuses = [
      'Hoàn thành',
      'Đã nhận', 
      'Hủy Đơn Hàng',
      'Thanh toán thất bại',
      'Thanh toán hết hạn'
    ];
    
    return cancellableStatuses.includes(order.trangthai) && 
           !nonCancellableStatuses.includes(order.trangthai);
  };

  const canDeleteOrder = (order) => {
    const deletableStatuses = [
      'Hủy Đơn Hàng',
      'Thanh toán thất bại',
      'Thanh toán hết hạn'
    ];
    
    return deletableStatuses.includes(order.trangthai) || !order.thanhtoan;
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
                <th>Ngày Đặt</th>
                <th>Trạng Thái</th>
                <th>Tổng Tiền</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {donHangs.map((hd) => (
                <tr key={hd._id}>
                  <td>{hd.maHDL || (hd._id ? hd._id.slice(-6) : 'N/A')}</td>
                  <td>{hd.ngaymua}</td>
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
                    
                    {hd.trangthai === 'Đã nhận' && (
                      <button className="btn-confirm" onClick={() => handleXacNhan(hd._id)}>
                        Xác nhận
                      </button>
                    )}
                    
                    {canCancelOrder(hd) && (
                      <button className="btn-cancel" onClick={() => confirmCancelOrder(hd._id)}>
                        <FontAwesomeIcon icon={faBan} /> Hủy
                      </button>
                    )}
                    
                    {canDeleteOrder(hd) && (
                      <button className="btn-delete" onClick={() => confirmDeleteOrder(hd._id)}>
                        <FontAwesomeIcon icon={faTrash} /> Xóa
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
        <OrderDetails
          selectedDonHang={selectedDonHang}
          setSelectedDonHang={setSelectedDonHang}
          handleXacNhan={handleXacNhan}
          handleRating={openRatingModal}
          canRateProduct={canRateProduct}
          getStatusClass={getStatusClass}
          user={user}
        />
      )}

      {showCancelConfirm && (
        <div className="confirm-modal">
          <div className="confirm-content">
            <h3>Xác nhận hủy đơn hàng</h3>
            <p>Bạn có chắc chắn muốn hủy đơn hàng này?</p>
            <p className="warning-text">Lưu ý: Sau khi hủy, bạn sẽ không thể khôi phục đơn hàng này.</p>
            <div className="confirm-buttons">
              <button className="btn-confirm-cancel" onClick={handleCancelOrder}>Hủy đơn hàng</button>
              <button className="btn-cancel" onClick={() => setShowCancelConfirm(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="confirm-modal">
          <div className="confirm-content">
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa đơn hàng này khỏi lịch sử?</p>
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
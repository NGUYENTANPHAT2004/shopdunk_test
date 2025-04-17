import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import OrderDetails from './OrderDeatails';
import './lichsudonhang.scss';
import { useParams } from 'react-router-dom';

const TiemKiemTheoSDT = ({ phone }) => {
  const [donHangs, setDonHangs] = useState([]);
  const [selectedDonHang, setSelectedDonHang] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { keyword } = useParams()
  useEffect(() => {
    const fetchResults = async () => {
      if (!keyword) return;

      setLoading(true);
      try {
        const response = await axios.post('http://localhost:3005/timkiemhoadon', { phone: keyword });

        if (Array.isArray(response.data)) {
          setDonHangs(response.data);
        } else {
          setDonHangs([]);
        }

      } catch (error) {
        console.error('Lỗi khi tải kết quả tìm kiếm:', error);
        setError('Không thể tải dữ liệu, vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [keyword]);

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

  return (
    <div className="lichsu-donhang-container">
      <h2>Kết quả tìm kiếm đơn hàng</h2>

      {loading ? (
        <p>Đang tải...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : donHangs.length === 0 ? (
        <p className="empty-message">Không tìm thấy đơn hàng nào với số điện thoại này.</p>
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
                      Xem chi tiết
                    </button>
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
          handleXacNhan={() => {}}
          handleRating={() => {}}
          canRateProduct={() => false}  // không cho phép đánh giá
          getStatusClass={getStatusClass}
          user={{}} // nếu cần, truyền user info vào đây
        />
      )}
    </div>
  );
};

export default TiemKiemTheoSDT;

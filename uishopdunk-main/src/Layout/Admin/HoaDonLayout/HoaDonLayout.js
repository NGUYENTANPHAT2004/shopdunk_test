import { useState, useEffect } from 'react'
import { FaMobile, FaTrashCan } from 'react-icons/fa6'
import { HoaDonChiTiet } from './HoaDonChiTiet'
import { XoaHoaDon } from './XoaHoaDon'
import './HoaDonLayout.scss'

function HoaDonLayout () {
  const [data, setData] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isOpenXoaHoaDon, setisOpenXoaHoaDon] = useState(false)
  
  // States for pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 // Adjust items per page as needed

  const fetchdata = async () => {
    try {
      const response = await fetch('http://localhost:3005/gethoadon')
      if (response.ok) {
        const data = await response.json()
        setData(data)
        // Reset pagination if needed
        setCurrentPage(1)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchdata()
  }, [])

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(data.map(item => item._id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelectItem = id => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(itemId => itemId !== id)
      : [...selectedIds, id]
      
    setSelectedIds(newSelectedIds)
    setSelectAll(newSelectedIds.length === data.length)
  }
  
  // Kiểm tra xem đơn hàng có thể thay đổi trạng thái không
  const canChangeStatus = (order) => {
    if (['Thanh toán thất bại', 'Thanh toán hết hạn', 'Hủy Đơn Hàng', 'Hoàn thành'].includes(order.trangthai)) {
      return false;
    }
    if (order.trangthai === 'Đã thanh toán') {
      return true;
    }
    return true;
  }
  
  // Hiển thị màu sắc cho từng trạng thái
  const getStatusClass = (status) => {
    switch (status) {
      case 'Hủy Đơn Hàng':
        return 'status-cancelled';
      case 'Thanh toán thất bại':
        return 'status-failed';
      case 'Thanh toán hết hạn':
        return 'status-expired';
      case 'Hoàn thành':
        return 'status-completed';
      case 'Đã nhận':
        return 'status-completed';
      default:
        return '';
    }
  }

  const handleStatusChange = async (id, value) => {
    try {
      const currentOrder = data.find(item => item._id === id);
      
      if (currentOrder.trangthai === 'Thanh toán thất bại') {
        alert('Không thể thay đổi trạng thái của đơn hàng thanh toán thất bại');
        return;
      }
      if (currentOrder.trangthai === 'Thanh toán hết hạn') {
        alert('Không thể thay đổi trạng thái của đơn hàng thanh toán hết hạn');
        return;
      }
      if (currentOrder.trangthai === 'Hủy Đơn Hàng' && value !== 'Hủy Đơn Hàng') {
        alert('Không thể thay đổi trạng thái của đơn hàng đã hủy');
        return;
      }
      if (value === 'Hủy Đơn Hàng' && 
          (currentOrder.trangthai === 'Đã nhận' || currentOrder.trangthai === 'Hoàn thành')) {
        alert('Không thể hủy đơn hàng đã hoàn thành');
        return;
      }
      if (currentOrder.trangthai === 'Hoàn thành' && 
          (value === 'Thanh toán thất bại' || value === 'Thanh toán hết hạn' || 
           value === 'Đang xử lý' || value === 'Đã thanh toán' || 
           value === 'Đang vận chuyển' || value === 'Đã nhận')) {
        alert('Không thể thay đổi trạng thái của đơn hàng đã hoàn thành');
        return;
      }
      if (currentOrder.trangthai === 'Đã nhận' && 
          (value === 'Thanh toán thất bại' || value === 'Thanh toán hết hạn' || 
           value === 'Đang xử lý' || value === 'Đã thanh toán' || 
           value === 'Đang vận chuyển')) {
        alert('Không thể thay đổi trạng thái của đơn hàng đã nhận');
        return;
      }
      if (currentOrder.trangthai === 'Đã thanh toán' && 
          (value === 'Thanh toán thất bại' || value === 'Thanh toán hết hạn' || value === 'Hủy Đơn Hàng')) {
        alert('Không thể chuyển đơn hàng đã thanh toán sang trạng thái thanh toán thất bại, hết hạn hoặc hủy đơn hàng');
        return;
      }

      let defaultValues = {};
      if (currentOrder.thanhtoan) {
        if (value === 'Đang vận chuyển') {
          defaultValues = { trangthai: 'Đang vận chuyển', thanhtoan: true };
        } else if (value === 'Đã nhận') {
          defaultValues = { trangthai: 'Đã nhận', thanhtoan: true };
        } else if (value === 'Hoàn thành') {
          defaultValues = { trangthai: 'Hoàn thành', thanhtoan: true };
        }
      }
      if (!currentOrder.thanhtoan) {
        if (value === 'Đã thanh toán') {
          defaultValues = { trangthai: 'Đã thanh toán', thanhtoan: true };
        } else if (value === 'Thanh toán thất bại') {
          defaultValues = { trangthai: 'Thanh toán thất bại', thanhtoan: false };
        } else if (value === 'Thanh toán hết hạn') {
          defaultValues = { trangthai: 'Thanh toán hết hạn', thanhtoan: false };
        }
      }
      if (value === 'Hủy Đơn Hàng') {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
          return;
        }
        defaultValues = { trangthai: 'Hủy Đơn Hàng', thanhtoan: currentOrder.thanhtoan };
      }

      const response = await fetch(`http://localhost:3005/settrangthai/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trangthai: value, ...defaultValues })
      });

      if (response.ok) {
        fetchdata();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  }

  // Pagination logic: Tính toán các chỉ số cần thiết
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  return (
    <div className='theloai_container'>
      <div className='nav_chucnang'>
        <button
          className='btnthemtheloai'
          onClick={() => {
            if (selectedIds.length === 0) {
              alert('Chọn một hóa đơn để xem chi tiết')
            } else if (selectedIds.length > 1) {
              alert('Chỉ được chọn một hóa đơn để xem chi tiết')
            } else {
              setIsOpen(true)
            }
          }}
        >
          <FaMobile className='icons' />
          Chi tiết
        </button>
        <button
          className='btnthemtheloai'
          onClick={() => {
            if (selectedIds.length === 0) {
              alert('Chọn một hóa đơn để xóa')
              return
            }
            const hoaDonDuocChon = data.filter(hoaDon =>
              selectedIds.includes(hoaDon._id)
            )
            const coHoaDonDaThanhToan = hoaDonDuocChon.some(
              hoaDon => hoaDon.thanhtoan
            )
            if (coHoaDonDaThanhToan) {
              alert('Chỉ được xóa hóa đơn chưa thanh toán')
              return
            }
            setisOpenXoaHoaDon(true)
          }}
        >
          <FaTrashCan className='icons' />
          Xóa hóa đơn
        </button>
      </div>

      <table className='tablenhap'>
        <thead>
          <tr>
            <th>
              <input
                type='checkbox'
                checked={selectAll}
                onChange={handleSelectAll}
              />
            </th>
            <th>Mã hóa đơn</th>
            <th>Tên khách hàng</th>
            <th>Số điện thoại</th>
            <th>Địa chỉ</th>
            <th>Số lượng sản phẩm</th>
            <th>Tổng tiền</th>
            <th>Thanh toán</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {currentData.map(item => (
            <tr key={item._id}>
              <td>
                <input
                  type='checkbox'
                  checked={selectedIds.includes(item._id)}
                  onChange={() => handleSelectItem(item._id)}
                />
              </td>
              <td>{item.maHDL}</td>
              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.address}</td>
              <td>{item.sanpham.length}</td>
              <td>{item.tongtien.toLocaleString()}đ </td>
              <td>{item.thanhtoan ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
              <td>
                <div className="select-container">
                  <select
                    value={item.trangthai}
                    onChange={e => handleStatusChange(item._id, e.target.value)}
                    className={`custom-select ${getStatusClass(item.trangthai)}`}
                    disabled={!canChangeStatus(item)}
                  >
                    <option value='Đang xử lý'>🕒 Đang xử lý</option>
                    <option value='Đã thanh toán'>💳 Đã thanh toán</option>
                    <option value='Đang vận chuyển'>🚚 Đang vận chuyển</option>
                    <option value='Đã nhận'>✅ Đã nhận</option>
                    <option value='Hoàn thành'>✨ Hoàn thành</option>
                    <option value='Thanh toán thất bại' disabled={item.trangthai === 'Đã thanh toán'}>
                      ❌ Thanh toán thất bại
                    </option>
                    <option value='Thanh toán hết hạn' disabled={item.trangthai === 'Đã thanh toán'}>
                      ⏰ Thanh toán hết hạn
                    </option>
                    <option value='Hủy Đơn Hàng' disabled={item.trangthai === 'Đã thanh toán'}>
                      🗑️ Hủy đơn hàng
                    </option>
                  </select>
                  {item.trangthai === 'Thanh toán thất bại' && 
                    <div className="custom-tooltip">Không thể thay đổi trạng thái của đơn hàng thanh toán thất bại</div>
                  }
                  {item.trangthai === 'Thanh toán hết hạn' && 
                    <div className="custom-tooltip">Không thể thay đổi trạng thái của đơn hàng thanh toán hết hạn</div>
                  }
                  {item.trangthai === 'Hủy Đơn Hàng' && 
                    <div className="custom-tooltip">Không thể thay đổi trạng thái của đơn hàng đã hủy</div>
                  }
                  {item.trangthai === 'Hoàn thành' && 
                    <div className="custom-tooltip">Không thể thay đổi trạng thái của đơn hàng đã hoàn thành</div>
                  }
                  {item.trangthai === 'Đã thanh toán' && 
                    <div className="custom-tooltip">Không thể chuyển đơn hàng đã thanh toán sang trạng thái thanh toán thất bại, hết hạn hoặc hủy đơn hàng</div>
                  }
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="pagination">
        <button onClick={handlePreviousPage} disabled={currentPage === 1}>
          Trước
        </button>
        <span>
          Trang {currentPage} trên {totalPages}
        </span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0}>
          Sau
        </button>
      </div>

      <HoaDonChiTiet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        idhoadon={selectedIds}
      />
      <XoaHoaDon
        isOpen={isOpenXoaHoaDon}
        onClose={() => setisOpenXoaHoaDon(false)}
        idhoadon={selectedIds}
        fetchdata={fetchdata}
        setSelectedIds={setSelectedIds}
      />
    </div>
  )
}

export default HoaDonLayout

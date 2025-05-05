import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaMobile, FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import { FaTrashCan, FaServer } from 'react-icons/fa6'
import { HoaDonChiTiet } from './HoaDonChiTiet';
import { XoaHoaDon } from './XoaHoaDon';
import './HoaDonLayout.scss';
import debounce from 'lodash/debounce'; 

function HoaDonLayout() {
  // Trạng thái chính
  const [allOrders, setAllOrders] = useState([]); // Lưu tất cả đơn hàng từ server
  const [filteredOrders, setFilteredOrders] = useState([]); // Đơn hàng đã lọc
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Trạng thái tìm kiếm và lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Trạng thái UI
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Hàm fetch dữ liệu từ API với xử lý lỗi tốt hơn
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3005/gethoadon');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Sắp xếp theo ngày tạo mới nhất
      const sortedData = [...data].sort((a, b) => 
        new Date(b.ngaymua) - new Date(a.ngaymua)
      );
      
      setAllOrders(sortedData);
      
      // Reset selection state khi fetch data mới
      setSelectAll(false);
      setSelectedIds([]);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Lọc đơn hàng dựa trên từ khóa tìm kiếm và trạng thái
  const filterOrders = useCallback(() => {
    if (!allOrders.length) return [];
    
    return allOrders.filter(order => {
      // Kiểm tra trạng thái nếu đã chọn filter
      const matchesStatus = !statusFilter || order.trangthai === statusFilter;
      
      // Nếu không có search term, chỉ cần kiểm tra status
      if (!searchTerm.trim()) return matchesStatus;
      
      // Tìm kiếm theo nhiều trường
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      
      const matchesMaHD = order.maHDL && order.maHDL.toLowerCase().includes(normalizedSearchTerm);
      const matchesName = order.name && order.name.toLowerCase().includes(normalizedSearchTerm);
      const matchesNguoiNhan = order.nguoinhan && order.nguoinhan.toLowerCase().includes(normalizedSearchTerm);
      const matchesPhone = order.phone && order.phone.includes(normalizedSearchTerm);
      
      return (matchesMaHD || matchesName || matchesNguoiNhan || matchesPhone) && matchesStatus;
    });
  }, [allOrders, searchTerm, statusFilter]);
  
  // Debounce hàm search để tránh gọi quá nhiều khi nhập
  const debouncedSearch = useMemo(() => 
    debounce((term) => {
      setSearchTerm(term);
      // Reset về trang 1 khi search
      setCurrentPage(1);
    }, 300),
    []
  );
  
  // Effect để lọc đơn hàng khi search term hoặc status filter thay đổi
  useEffect(() => {
    const filtered = filterOrders();
    setFilteredOrders(filtered);
    
    // Cập nhật selectAll nếu đã chọn tất cả các đơn trong trang hiện tại
    if (selectedIds.length > 0) {
      const currentPageItems = getCurrentPageItems(filtered);
      const allCurrentSelected = currentPageItems.every(item => 
        selectedIds.includes(item._id)
      );
      setSelectAll(allCurrentSelected && currentPageItems.length > 0);
    }
  }, [allOrders, searchTerm, statusFilter, filterOrders]);
  
  // Fetch data khi component mount
  useEffect(() => {
    fetchOrders();
    
    // Cleanup debounced function khi unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, [fetchOrders, debouncedSearch]);
  
  // Xử lý chọn tất cả trên trang hiện tại
  const handleSelectAll = useCallback(() => {
    const currentPageItems = getCurrentPageItems(filteredOrders);
    
    if (selectAll) {
      // Bỏ chọn tất cả items trên trang hiện tại
      setSelectedIds(prev => 
        prev.filter(id => !currentPageItems.some(item => item._id === id))
      );
    } else {
      // Chọn tất cả items trên trang hiện tại (không trùng)
      const currentPageIds = currentPageItems.map(item => item._id);
      setSelectedIds(prev => {
        const uniqueIds = new Set([...prev, ...currentPageIds]);
        return [...uniqueIds];
      });
    }
    
    setSelectAll(!selectAll);
  }, [selectAll, filteredOrders, currentPage, itemsPerPage]);

  const getValidNextStatuses = (currentStatus, isPaid) => {
    const statusFlow = {
      // Đơn hàng mới tạo, chưa thanh toán
      'Đang xử lý': !isPaid ? 
        ['Đã thanh toán', 'Thanh toán thất bại', 'Thanh toán hết hạn', 'Hủy Đơn Hàng'] : 
        ['Đang vận chuyển', 'Hủy Đơn Hàng'], // Khi đã thanh toán, có thể chuyển sang vận chuyển hoặc hủy
      
      // Vừa thanh toán xong
      'Đã thanh toán': ['Đang xử lý', 'Hủy Đơn Hàng'], // Sau khi thanh toán thì chuyển sang Đang xử lý
      
      // Các trạng thái tiếp theo
      'Đang vận chuyển': ['Đã nhận'],
      'Đã nhận': ['trạng thái đã nhận không thể chuyển sang trạng thái khác'], 
      'Hoàn thành': ['trạng thái này chỉ người dùng mới có thể xác thực'],
      
      // Các trạng thái kết thúc
      'Thanh toán thất bại': [],
      'Thanh toán hết hạn': [],
      'Hủy Đơn Hàng': [],
      'Trả hàng/Hoàn tiền': []
    };
    
    return statusFlow[currentStatus] || [];
  };


  const handleSelectItem = useCallback((id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);
  
  // Effect để cập nhật trạng thái selectAll khi selectedIds thay đổi
  useEffect(() => {
    const currentPageItems = getCurrentPageItems(filteredOrders);
    
    // Chỉ được coi là selectAll khi tất cả items trên trang hiện tại được chọn
    const allCurrentSelected = currentPageItems.length > 0 && 
      currentPageItems.every(item => selectedIds.includes(item._id));
    
    setSelectAll(allCurrentSelected);
  }, [selectedIds, filteredOrders, currentPage, itemsPerPage]);
  
  // Helper để lấy các items trên trang hiện tại
  function getCurrentPageItems(items) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }
  
  const handleStatusChange = useCallback(async (id, value) => {
    try {
      setIsLoading(true);
      const currentOrder = allOrders.find(item => item._id === id);
      
      if (!currentOrder) {
        throw new Error('Không tìm thấy đơn hàng');
      }
      
      // Kiểm tra xem trạng thái mới có hợp lệ không
      const validNextStatuses = getValidNextStatuses(currentOrder.trangthai, currentOrder.thanhtoan);
      
      if (!validNextStatuses.includes(value)) {
        throw new Error(`Không thể chuyển từ "${currentOrder.trangthai}" sang "${value}". Các trạng thái hợp lệ: ${validNextStatuses.join(', ')}`);
      }
      
      // Xác định giá trị mặc định dựa trên trạng thái
      let defaultValues = { trangthai: value };
      
      // Tự động set thanhtoan dựa trên trạng thái
      if (value === 'Đã thanh toán') {
        defaultValues.thanhtoan = true;
      } else if (value === 'Thanh toán thất bại' || value === 'Thanh toán hết hạn') {
        defaultValues.thanhtoan = false;
      } else {
        defaultValues.thanhtoan = currentOrder.thanhtoan;
      }
      
      // Xác nhận hủy đơn
      if (value === 'Hủy Đơn Hàng') {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
          setIsLoading(false);
          return;
        }
      }
  
      const response = await fetch(`http://localhost:3005/settrangthai/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultValues)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
      }
      
      await fetchOrders();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setIsLoading(false);
    }
  }, [allOrders, fetchOrders]);
  const getStatusIcon = (status) => {
    const icons = {
      'Đang xử lý': '🕒',
      'Đã thanh toán': '💳',
      'Đang vận chuyển': '🚚',
      'Đã nhận': '✅',
      'Hoàn thành': '✨',
      'Thanh toán thất bại': '❌',
      'Thanh toán hết hạn': '⏰',
      'Hủy Đơn Hàng': '🗑️',
      'Trả hàng/Hoàn tiền': '↩️'
    };
    return icons[status] || '';
  };
  
  // Kiểm tra xem đơn hàng có thể thay đổi trạng thái không
  const canChangeStatus = useCallback((order) => {
    if (['Thanh toán thất bại', 'Thanh toán hết hạn', 'Hủy Đơn Hàng', 'Hoàn thành'].includes(order.trangthai)) {
      return false;
    }
    return true;
  }, []);
  
  // Hiển thị màu sắc cho từng trạng thái
  const getStatusClass = useCallback((status) => {
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
  }, []);
  
  // Lấy dữ liệu của trang hiện tại
  const currentData = useMemo(() => {
    return getCurrentPageItems(filteredOrders);
  }, [filteredOrders, currentPage, itemsPerPage]);
  
  // Tính toán tổng số trang
  const totalPages = useMemo(() => {
    return Math.ceil(filteredOrders.length / itemsPerPage);
  }, [filteredOrders, itemsPerPage]);
  
  // Xử lý chuyển trang
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);
  
  // Xử lý hiển thị modal chi tiết
  const handleShowDetails = useCallback(() => {
    if (selectedIds.length === 0) {
      alert('Chọn một hóa đơn để xem chi tiết');
    } else if (selectedIds.length > 1) {
      alert('Chỉ được chọn một hóa đơn để xem chi tiết');
    } else {
      setIsDetailModalOpen(true);
    }
  }, [selectedIds]);
  
  // Xử lý hiển thị modal xóa
  const handleShowDeleteModal = useCallback(() => {
    if (selectedIds.length === 0) {
      alert('Chọn một hóa đơn để xóa');
      return;
    }
    
    const selectedOrders = allOrders.filter(order =>
      selectedIds.includes(order._id)
    );
    
    const hasPaidOrders = selectedOrders.some(
      order => order.thanhtoan
    );
    
    if (hasPaidOrders) {
      alert('Chỉ được xóa hóa đơn chưa thanh toán');
      return;
    }
    
    setIsDeleteModalOpen(true);
  }, [selectedIds, allOrders]);
  
  // Các options cho dropdown filter trạng thái
  const statusOptions = useMemo(() => [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'Đang xử lý', label: '🕒 Đang xử lý' },
    { value: 'Đã thanh toán', label: '💳 Đã thanh toán' },
    { value: 'Đang vận chuyển', label: '🚚 Đang vận chuyển' },
    { value: 'Đã nhận', label: '✅ Đã nhận' },
    { value: 'Hoàn thành', label: '✨ Hoàn thành' },
    { value: 'Thanh toán thất bại', label: '❌ Thanh toán thất bại' },
    { value: 'Thanh toán hết hạn', label: '⏰ Thanh toán hết hạn' },
    { value: 'Hủy Đơn Hàng', label: '🗑️ Hủy đơn hàng' }
  ], []);
  
  return (
    <div className='theloai_container'>
      {/* Thanh công cụ */}
      <div className='toolbar'>
        <div className='search-filter-container'>
          {/* Thanh tìm kiếm */}
          <div className='search-container'>
            <input
              type='text'
              className='search-input'
              placeholder='Tìm kiếm đơn hàng...'
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          
          {/* Dropdown lọc trạng thái */}
          <div className='filter-container'>
            <FaFilter className='filter-icon' />
            <select
              className='status-filter'
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Các nút chức năng */}
        <div className='nav_chucnang'>
          <button
            className='btnthemtheloai'
            onClick={handleShowDetails}
          >
            <FaMobile className='icons' />
            Chi tiết
          </button>
        </div>
      </div>
      
      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      {/* Hiển thị loading nếu đang tải */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      )}
      
      {/* Bảng đơn hàng */}
      <div className="table-container">
        <table className='tablehoadon'>
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
              <th>Người nhận</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ</th>
              <th>Số lượng sản phẩm</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-data">
                  {isLoading ? 'Đang tải dữ liệu...' : 'Không có đơn hàng nào'}
                </td>
              </tr>
            ) : (
              currentData.map(item => (
                <tr key={item._id}>
                  <td>
                    <input
                      type='checkbox'
                      checked={selectedIds.includes(item._id)}
                      onChange={() => handleSelectItem(item._id)}
                    />
                  </td>
                  <td>{item.maHDL || 'N/A'}</td>
                  <td>{item.name || 'N/A'}</td>
                  <td>{item.nguoinhan || 'N/A'}</td>
                  <td>{item.phone || 'N/A'}</td>
                  <td className="address-cell">
                    {item.address ? (
                      <div className="truncate-text" title={item.address}>
                        {item.address}
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td>{item.sanpham ? item.sanpham.length : 0}</td>
                  <td>{item.tongtien ? item.tongtien.toLocaleString() : 0}đ</td>
                  <td>{item.thanhtoan ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
                  <td>
                    <div className="select-container">
                      <select
                        value={item.trangthai}
                        onChange={(e) => handleStatusChange(item._id, e.target.value)}
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
                      {!canChangeStatus(item) && (
                        <div className="custom-tooltip">
                          Không thể thay đổi trạng thái của đơn hàng này
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      <div className="pagination">
        <div className="pagination-info">
          Hiển thị {filteredOrders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} của {filteredOrders.length} đơn hàng
        </div>
        <div className="pagination-controls">
          <button 
            onClick={handlePreviousPage} 
            disabled={currentPage === 1 || isLoading}
            className="pagination-button"
          >
            Trước
          </button>
          <span className="page-indicator">
            Trang {currentPage} / {totalPages || 1}
          </span>
          <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
            className="pagination-button"
          >
            Sau
          </button>
        </div>
        <div className="items-per-page">
          <label>Số dòng mỗi trang:</label>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset về trang 1 khi thay đổi số item/trang
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Modal Chi tiết hóa đơn */}
      <HoaDonChiTiet
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        idhoadon={selectedIds}
      />
      
      {/* Modal Xóa hóa đơn */}
      <XoaHoaDon
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        idhoadon={selectedIds}
        fetchdata={fetchOrders}
        setSelectedIds={setSelectedIds}
      />
    </div>
  );
}

export default HoaDonLayout;
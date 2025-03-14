import { useState, useEffect } from 'react';
import './TonKhoLayout.scss';
import { FaEdit } from 'react-icons/fa';
import { CapNhatTonKho } from './UpdateTonKho/CapNhatTonKho';

function TonKhoLayout() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isOpenCapNhat, setIsOpenCapNhat] = useState(false);

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Số sản phẩm trên mỗi trang

  // State bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDungLuong, setFilterDungLuong] = useState('');
  const [filterMauSac, setFilterMauSac] = useState('');
  
  // State để lưu sản phẩm được làm phẳng để hiển thị
  const [flattenedProducts, setFlattenedProducts] = useState([]);

  // Fetch tất cả sản phẩm tồn kho
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3005/tonkho/sanpham');
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
        processProductData(data);
      } else {
        console.error('Không thể lấy dữ liệu sản phẩm');
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
    }
  };

  // Hàm xử lý và làm phẳng dữ liệu sản phẩm
  const processProductData = (productData) => {
    // Tạo danh sách phẳng các biến thể sản phẩm
    const flattened = productData.flatMap(product => {
      return product.dungluong.flatMap(dl => {
        return dl.mausac.map(ms => {
          return {
            productId: product._id,
            productName: product.name,
            dungLuongId: dl._id,
            dungLuongName: dl.name,
            mauSacId: ms._id,
            mauSacName: ms.name,
            quantity: ms.quantity,
            price: ms.price,
            uniqueId: `${product._id}-${dl._id}-${ms._id}` // ID duy nhất cho mỗi biến thể
          };
        });
      });
    });
    
    setFlattenedProducts(flattened);
    setFilteredProducts(flattened);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Xử lý chọn tất cả
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      // Chỉ lấy productId không trùng lặp
      const uniqueProductIds = [...new Set(flattenedProducts.map(item => item.productId))];
      setSelectedIds(uniqueProductIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectItem = (productId) => {
    setSelectedIds(prevSelected =>
      prevSelected.includes(productId) 
        ? prevSelected.filter(id => id !== productId) 
        : [...prevSelected, productId]
    );
  };

  // Bộ lọc sản phẩm
  useEffect(() => {
    let filtered = flattenedProducts;

    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDungLuong) {
      filtered = filtered.filter(item => item.dungLuongName === filterDungLuong);
    }

    if (filterMauSac) {
      filtered = filtered.filter(item => item.mauSacName === filterMauSac);
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, filterDungLuong, filterMauSac, flattenedProducts]);

  // Phân trang
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  // Danh sách tất cả các dung lượng và màu sắc không trùng lặp
  const allDungLuong = [...new Set(flattenedProducts.map(item => item.dungLuongName))];
  const allMauSac = [...new Set(flattenedProducts.map(item => item.mauSacName))];

  return (
    <div className="theloai_container">
      <div className="nav_chucnang">
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select value={filterDungLuong} onChange={(e) => setFilterDungLuong(e.target.value)}>
          <option value="">Chọn dung lượng</option>
          {allDungLuong.map((dl, index) => (
            <option key={index} value={dl}>{dl}</option>
          ))}
        </select>
        <select value={filterMauSac} onChange={(e) => setFilterMauSac(e.target.value)}>
          <option value="">Chọn màu sắc</option>
          {allMauSac.map((ms, index) => (
            <option key={index} value={ms}>{ms}</option>
          ))}
        </select>
        
        <button
          className="btnthemtheloai"
          onClick={() => {
            if (selectedIds.length === 0) {
              alert('Chọn một sản phẩm để cập nhật');
            } else if (selectedIds.length > 1) {
              alert('Chỉ được chọn một sản phẩm để cập nhật kho');
            } else {
              setIsOpenCapNhat(true);
            }
          }}
        >
          <FaEdit className="icons" /> Cập nhật số lượng kho
        </button>
      </div>

      <table className="tablenhap">
        <thead>
          <tr>
            <th>
              <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
            </th>
            <th>STT</th>
            <th>Tên sản phẩm</th>
            <th>Dung lượng</th>
            <th>Màu sắc</th>
            <th>Số lượng</th>
          </tr>
        </thead>
        <tbody>
          {displayedProducts.map((item, index) => (
            <tr key={item.uniqueId}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.productId)}
                  onChange={() => handleSelectItem(item.productId)}
                />
              </td>
              <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
              <td>{item.productName}</td>
              <td>{item.dungLuongName}</td>
              <td>{item.mauSacName}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phân trang */}
      <div className="pagination">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
          disabled={currentPage === 1}>
          Trước
        </button>
        <span>Trang {currentPage} / {totalPages || 1}</span>
        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
          disabled={currentPage === totalPages || totalPages === 0}>
          Tiếp
        </button>
      </div>

      <CapNhatTonKho
        isOpen={isOpenCapNhat}
        onClose={() => setIsOpenCapNhat(false)}
        fetchdata={fetchProducts}
        selectedProductId={selectedIds[0]}
      />
    </div>
  );
}

export default TonKhoLayout;
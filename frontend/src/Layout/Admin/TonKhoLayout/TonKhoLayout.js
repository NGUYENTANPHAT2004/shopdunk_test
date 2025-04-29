import { useState, useEffect } from 'react';
import './TonKhoLayout.scss';
import { FaEdit } from 'react-icons/fa';
import { CapNhatTonKho } from './UpdateTonKho/CapNhatTonKho';
import { 
  initializeSocket, 
  registerStockListeners, 
  checkStock 
} from '../../../untils/socketUtils';
import { toast, ToastContainer } from 'react-toastify';

function TonKhoLayout() {
  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 10; // Số sản phẩm hiển thị trên UI
  const fetchLimit = 50; // Số sản phẩm lấy mỗi lần từ API

  const [flattenedProducts, setFlattenedProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isOpenCapNhat, setIsOpenCapNhat] = useState(false);
  
  // State bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDungLuong, setFilterDungLuong] = useState('');
  const [filterMauSac, setFilterMauSac] = useState('');
  const [allDungLuong, setAllDungLuong] = useState([]);
  const [allMauSac, setAllMauSac] = useState([]);
  
  // State ghi nhớ kết quả API
  const [cachedProducts, setCachedProducts] = useState({});
  const [lastFetchedPage, setLastFetchedPage] = useState(0);

  useEffect(() => {
    // Initialize socket
    initializeSocket();

    // Register stock alert listeners
    const unregisterListeners = registerStockListeners(
      // onLowStock
      (data) => {
        console.log('Received low stock alert:', data);
        if (data.products && data.products.length > 0) {
          toast.warning(`Cảnh báo: Có ${data.products.length} sản phẩm có số lượng tồn kho thấp (<=5)!`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
        }
      },
      // onStockStatus
      (data) => {
        console.log('Stock status:', data);
      },
      // onStockError
      (error) => {
        console.error('Stock check error:', error);
        toast.error(`Lỗi khi kiểm tra tồn kho: ${error.message}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
      }
    );

    // Check stock levels immediately
    checkStock();

    // Clean up listeners when component unmounts
    return () => {
      unregisterListeners();
    };
  }, []);

  // Fetch products with pagination
  const fetchProducts = async (page = 1, refresh = false) => {
    try {
      // Return cached data if available and not refreshing
      if (!refresh && cachedProducts[page]) {
        processProductData(cachedProducts[page].products);
        return;
      }

      setIsLoading(true);
      
      const response = await fetch(`http://localhost:3005/tonkho/sanpham?page=${page}&limit=${fetchLimit}`);
      const data = await response.json();
      
      if (response.ok) {
        // Cache the result
        setCachedProducts(prev => ({
          ...prev,
          [page]: data
        }));
        
        setLastFetchedPage(page);
        setTotalPages(Math.ceil(data.pagination.total / fetchLimit));
        
        // Process the product data
        processProductData(data.products);
      } else {
        console.error('Không thể lấy dữ liệu sản phẩm');
        toast.error('Không thể tải dữ liệu sản phẩm');
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
      toast.error('Lỗi kết nối đến máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý dữ liệu sản phẩm và làm phẳng để hiển thị
  const processProductData = (productData) => {
    // Tiền xử lý để cải thiện hiệu suất - thay vì sử dụng flatMap nhiều lần
    const flattened = [];
    const dungLuongs = new Set();
    const mauSacs = new Set();
    
    productData.forEach(product => {
      // Đảm bảo variants tồn tại
      const variants = product.variants || [];
      
      variants.forEach(variant => {
        // Thêm dung lượng và màu sắc vào bộ lọc
        if (variant.dungluongName) dungLuongs.add(variant.dungluongName);
        if (variant.mausacName) mauSacs.add(variant.mausacName);
        
        flattened.push({
          productId: product._id,
          productName: product.name,
          dungLuongId: variant.dungluongId,
          dungLuongName: variant.dungluongName,
          mauSacId: variant.mausacId,
          mauSacName: variant.mausacName,
          quantity: variant.unlimitedStock ? 'Không giới hạn' : variant.quantity,
          price: variant.price,
          uniqueId: `${product._id}-${variant.dungluongId || 'null'}-${variant.mausacId || 'null'}`
        });
      });
    });
    
    setFlattenedProducts(flattened);
    setAllDungLuong([...dungLuongs]);
    setAllMauSac([...mauSacs]);
    
    // Reset selected item if it doesn't exist in the new data
    if (selectedId) {
      const stillExists = flattened.some(item => item.uniqueId === selectedId);
      if (!stillExists) {
        setSelectedId(null);
        setSelectedVariant(null);
      }
    }
  };

  // Load dữ liệu ban đầu
  useEffect(() => {
    fetchProducts(1, true);
  }, []);

  // Bộ lọc sản phẩm
  useEffect(() => {
    if (flattenedProducts.length === 0) return;
    
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
    
    // Update displayed products
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedProducts(filtered.slice(startIndex, endIndex));
    
    // Update total pages for UI pagination
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    
    // Reset to first page when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, filterDungLuong, filterMauSac, flattenedProducts]);

  // Update displayed products when current page changes
  useEffect(() => {
    if (filteredProducts.length === 0) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedProducts(filteredProducts.slice(startIndex, endIndex));
  }, [currentPage, filteredProducts]);

  // Xử lý chọn/bỏ chọn một item
  const handleSelectItem = (uniqueId) => {
    if (selectedId === uniqueId) {
      setSelectedId(null);
      setSelectedVariant(null);
    } else {
      setSelectedId(uniqueId);
      const variant = flattenedProducts.find(item => item.uniqueId === uniqueId);
      setSelectedVariant(variant);
    }
  };

  // Filter products with low stock (less than 5)
  const handleFilterLowStock = () => {
    let filtered = flattenedProducts.filter(item => 
      item.quantity !== 'Không giới hạn' && parseInt(item.quantity) < 5
    );
    setFilteredProducts(filtered);
    
    // Update displayed products
    const startIndex = 0;
    const endIndex = itemsPerPage;
    setDisplayedProducts(filtered.slice(startIndex, endIndex));
    
    // Update total pages for UI pagination
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1);
  };

  // Refresh data after updating stock
  const handleAfterUpdate = async () => {
    // Only refresh the current page data instead of all data
    await fetchProducts(lastFetchedPage, true);
    setIsOpenCapNhat(false);
  };

  return (
    <div className="theloai_container">
      <ToastContainer/>
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
        <button className="low-stock-filter" onClick={handleFilterLowStock}>
          Lọc hàng tồn thấp
        </button>
        <button
          className="btnthemtheloai"
          onClick={() => {
            if (!selectedId) {
              toast.warn('Chọn một biến thể sản phẩm để cập nhật');
            } else {
              setIsOpenCapNhat(true);
            }
          }}
        >
          <FaEdit className="icons" /> Cập nhật số lượng kho
        </button>
      </div>

      {isLoading ? (
        <div className="loading-indicator">Đang tải dữ liệu...</div>
      ) : (
        <>
          <table className="tablenhap">
            <thead>
              <tr>
                <th>Chọn</th>
                <th>STT</th>
                <th>Tên sản phẩm</th>
                <th>Dung lượng</th>
                <th>Màu sắc</th>
                <th>Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.length > 0 ? (
                displayedProducts.map((item, index) => (
                  <tr 
                    key={item.uniqueId}
                    className={selectedId === item.uniqueId ? "selected-row" : ""}
                  >
                    <td>
                      <input
                        type="radio"
                        checked={selectedId === item.uniqueId}
                        onChange={() => handleSelectItem(item.uniqueId)}
                      />
                    </td>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.dungLuongName}</td>
                    <td>{item.mauSacName}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">Không có dữ liệu</td>
                </tr>
              )}
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
        </>
      )}

      {selectedVariant && (
        <CapNhatTonKho
          isOpen={isOpenCapNhat}
          onClose={() => setIsOpenCapNhat(false)}
          fetchdata={handleAfterUpdate}
          selectedProductId={selectedVariant.productId}
          selectedDungLuongId={selectedVariant.dungLuongId}
          selectedMauSacId={selectedVariant.mauSacId}
          selectedVariant={selectedVariant}
        />
      )}
    </div>
  );
}

export default TonKhoLayout;
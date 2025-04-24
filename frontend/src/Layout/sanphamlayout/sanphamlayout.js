import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ProductCard from '../../components/ProductItem/ProductCard';
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong';
import { Helmet } from 'react-helmet';
import Loading from '../../components/Loading/Loading';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faArrowRight, 
  faFilter, 
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import './sanphamlayout.scss';

const ProductPage = () => {
  const { category } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  // State cơ bản
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(parseInt(queryParams.get('page')) || 1);
  const [sortOrder, setSortOrder] = useState(queryParams.get('sort') || 'asc');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch sản phẩm khi component mount và khi filters thay đổi
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, sortOrder, page]);

  // Cập nhật URL khi filters thay đổi
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (page > 1) params.append('page', page);
    if (sortOrder !== 'asc') params.append('sort', sortOrder);
    
    const url = selectedCategory 
      ? `/san-pham/${selectedCategory}${params.toString() ? `?${params.toString()}` : ''}`
      : `/san-pham${params.toString() ? `?${params.toString()}` : ''}`;
    
    navigate(url, { replace: true });
  }, [selectedCategory, sortOrder, page, navigate]);

  // Fetch sản phẩm
  const fetchProducts = async () => {
    setLoading(true);
    
    try {
      let url;
      
      if (selectedCategory) {
        // Gọi API lấy sản phẩm theo danh mục
        url = `http://localhost:3005/san-pham-pt/${selectedCategory}?page=${page}&sort=${sortOrder}`;
      } else {
        // Gọi API lấy tất cả sản phẩm
        url = `http://localhost:3005/sanpham`;
      }
      
      console.log("Fetching products from:", url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu sản phẩm');
      }
      
      const data = await response.json();
      console.log("Product data received:", data);
      
      if (selectedCategory) {
        // Xử lý dữ liệu khi chọn danh mục
        setProducts(data.sanpham || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || data.sanpham?.length || 0);
      } else {
        // Xử lý dữ liệu khi lấy tất cả sản phẩm
        let allProducts = [];
        
        // Tổng hợp sản phẩm từ tất cả danh mục
        if (Array.isArray(data)) {
          data.forEach(category => {
            if (category.sanpham && Array.isArray(category.sanpham)) {
              allProducts = [...allProducts, ...category.sanpham];
            }
          });
        }
        
        // Sắp xếp theo giá
        allProducts.sort((a, b) => {
          return sortOrder === 'asc' 
            ? Number(a.price) - Number(b.price) 
            : Number(b.price) - Number(a.price);
        });
        
        // Phân trang
        const limit = 12; // Số sản phẩm mỗi trang
        const startIndex = (page - 1) * limit;
        const paginatedProducts = allProducts.slice(startIndex, startIndex + limit);
        
        setProducts(paginatedProducts);
        setTotalPages(Math.ceil(allProducts.length / limit));
        setTotalItems(allProducts.length);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch danh mục
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3005/theloaisanpham');
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Reset tất cả bộ lọc
  const resetFilters = () => {
    setSelectedCategory('');
    setSortOrder('asc');
    setPage(1);
  };

  return (
    <div className="product-container">
      <Helmet>
        <title>
          {selectedCategory 
            ? `${categories.find(c => c.namekhongdau === selectedCategory)?.name || 'Sản phẩm'} - ShopDunk` 
            : 'Tất cả sản phẩm - ShopDunk'}
        </title>
      </Helmet>

      <ThanhDinhHuong
        breadcrumbs={[
          { label: 'Trang Chủ', link: '/' },
          { label: selectedCategory 
            ? categories.find(c => c.namekhongdau === selectedCategory)?.name || 'Sản phẩm' 
            : 'Tất cả sản phẩm', 
            link: selectedCategory ? `/san-pham/${selectedCategory}` : '/san-pham' }
        ]}
      />

      <div className="product-header">
        <h1>
          {selectedCategory 
            ? categories.find(c => c.namekhongdau === selectedCategory)?.name || 'Sản phẩm' 
            : 'Tất cả sản phẩm'}
        </h1>
        <p>{totalItems} sản phẩm</p>

        {/* Control Panel */}
        <div className="filter-controls">
          <button className="filter-button" onClick={() => setIsFilterOpen(!isFilterOpen)}>
            <FontAwesomeIcon icon={faFilter} /> Lọc
          </button>
          
          <select
            onChange={(e) => setSortOrder(e.target.value)}
            value={sortOrder}
            className="custom-select"
          >
            <option value="asc">Giá thấp đến cao</option>
            <option value="desc">Giá cao đến thấp</option>
          </select>
          
          {selectedCategory && (
            <button className="reset-button" onClick={resetFilters}>
              <FontAwesomeIcon icon={faTimes} /> Xóa bộ lọc
            </button>
          )}
        </div>
        
        {/* Filter Sidebar */}
        {isFilterOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsFilterOpen(false)}></div>
        )}
        
        <div className={`filter-sidebar ${isFilterOpen ? 'open' : ''}`}>
          <div className="filter-header">
            <h3>Danh mục sản phẩm</h3>
            <button onClick={() => setIsFilterOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <div className="category-list">
            <div className="category-item">
              <input
                type="radio"
                id="all-categories"
                name="category"
                checked={selectedCategory === ''}
                onChange={() => {
                  setSelectedCategory('');
                  setPage(1);
                }}
              />
              <label htmlFor="all-categories">Tất cả sản phẩm</label>
            </div>
            
            {categories.map((cat) => (
              <div className="category-item" key={cat._id}>
                <input
                  type="radio"
                  id={`category-${cat._id}`}
                  name="category"
                  checked={selectedCategory === cat.namekhongdau}
                  onChange={() => {
                    setSelectedCategory(cat.namekhongdau);
                    setPage(1);
                  }}
                />
                <label htmlFor={`category-${cat._id}`}>{cat.name}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Display */}
      {loading ? (
        <Loading />
      ) : (
        <>
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  sanpham={product}
                  nametheloai={product.nametheloai || selectedCategory || ''}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h2>Không tìm thấy sản phẩm nào</h2>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="page-btn"
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                className="page-btn"
                disabled={page === totalPages} 
                onClick={() => setPage(page + 1)}
              >
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductPage;
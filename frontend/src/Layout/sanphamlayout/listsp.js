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
  faTimes,
  faSort
} from '@fortawesome/free-solid-svg-icons';
import './sanphamlayout.scss';

const ProductPage = () => {
  const { category } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(parseInt(queryParams.get('page')) || 1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortOrder, setSortOrder] = useState(queryParams.get('sort') || 'asc');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [minPrice, setMinPrice] = useState(queryParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(queryParams.get('maxPrice') || '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (page > 1) params.append('page', page);
    if (sortOrder !== 'asc') params.append('sort', sortOrder);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    
    const url = selectedCategory 
      ? `/san-pham/${selectedCategory}${params.toString() ? `?${params.toString()}` : ''}`
      : `/san-pham${params.toString() ? `?${params.toString()}` : ''}`;
    
    navigate(url, { replace: true });
  }, [selectedCategory, sortOrder, minPrice, maxPrice, page, navigate]);

  // Fetch products and categories on component mount and when filters change
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, sortOrder, minPrice, maxPrice, page]);

  // Fetch products based on filters
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url;
      
      if (selectedCategory) {
        url = `http://localhost:3005/san-pham-pt/${selectedCategory}?page=${page}&sort=${sortOrder}`;
        
        if (minPrice) url += `&minPrice=${minPrice}`;
        if (maxPrice) url += `&maxPrice=${maxPrice}`;
      } else {
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
        // Trường hợp lọc theo danh mục
        setProducts(data.sanpham || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || data.sanpham?.length || 0);
      } else {
        // Trường hợp không lọc - lấy tất cả sản phẩm
        let allProducts = [];
        
        // API sanpham trả về mảng các danh mục, mỗi danh mục có mảng sản phẩm
        if (Array.isArray(data)) {
          data.forEach(category => {
            if (category.sanpham && Array.isArray(category.sanpham)) {
              allProducts = [...allProducts, ...category.sanpham];
            }
          });
        }
        
        // Lọc theo khoảng giá nếu có
        if (minPrice || maxPrice) {
          allProducts = allProducts.filter(product => {
            const price = Number(product.price);
            const min = minPrice ? Number(minPrice) : 0;
            const max = maxPrice ? Number(maxPrice) : Infinity;
            return price >= min && price <= max;
          });
        }
        
        // Sắp xếp theo giá
        allProducts.sort((a, b) => {
          return sortOrder === 'asc' 
            ? Number(a.price) - Number(b.price) 
            : Number(b.price) - Number(a.price);
        });
        
        // Phân trang
        const startIndex = (page - 1) * limit;
        const paginatedProducts = allProducts.slice(startIndex, startIndex + limit);
        
        setProducts(paginatedProducts);
        setTotalPages(Math.ceil(allProducts.length / limit));
        setTotalItems(allProducts.length);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3005/theloaisanpham');
      
      if (!response.ok) {
        throw new Error('Không thể tải danh mục sản phẩm');
      }
      
      const data = await response.json();
      console.log("Categories received:", data);
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCategory('');
    setSortOrder('asc');
    setMinPrice('');
    setMaxPrice('');
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
        <meta name="description" content="Danh sách sản phẩm với nhiều lựa chọn hấp dẫn" />
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
          
          {(selectedCategory || sortOrder !== 'asc' || minPrice || maxPrice) && (
            <button className="reset-button" onClick={resetFilters}>
              <FontAwesomeIcon icon={faTimes} /> Xóa bộ lọc
            </button>
          )}
        </div>
        
        {/* Backdrop for filter sidebar */}
        {isFilterOpen && (
          <div 
            className="sidebar-backdrop" 
            onClick={() => setIsFilterOpen(false)}
          ></div>
        )}
        
        {/* Filter sidebar */}
        <div className={`filter-sidebar ${isFilterOpen ? 'open' : ''}`}>
          <div className="filter-header">
            <h3>Lọc sản phẩm</h3>
            <button onClick={() => setIsFilterOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <div className="filter-section">
            <h4>Khoảng giá</h4>
            <div className="price-range">
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Từ"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Đến"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <button className="apply-price" onClick={() => setPage(1)}>Áp dụng</button>
            </div>
            
            <div className="price-presets">
              <button onClick={() => { setMinPrice('0'); setMaxPrice('5000000'); setPage(1); }}>Dưới 5 triệu</button>
              <button onClick={() => { setMinPrice('5000000'); setMaxPrice('10000000'); setPage(1); }}>5 - 10 triệu</button>
              <button onClick={() => { setMinPrice('10000000'); setMaxPrice('20000000'); setPage(1); }}>10 - 20 triệu</button>
              <button onClick={() => { setMinPrice('20000000'); setMaxPrice(''); setPage(1); }}>Trên 20 triệu</button>
            </div>
          </div>
          
          <div className="filter-section">
            <h4>Thể loại</h4>
            <div className="category-list">
              <div className="category-item">
                <input
                  type="radio"
                  id="all-categories"
                  name="category"
                  checked={selectedCategory === ''}
                  onChange={() => setSelectedCategory('')}
                />
                <label htmlFor="all-categories">Tất cả</label>
              </div>
              
              {categories.map((cat) => (
                <div className="category-item" key={cat._id}>
                  <input
                    type="radio"
                    id={`category-${cat._id}`}
                    name="category"
                    checked={selectedCategory === cat.namekhongdau}
                    onChange={() => setSelectedCategory(cat.namekhongdau)}
                  />
                  <label htmlFor={`category-${cat._id}`}>{cat.name}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="filter-actions">
            <button className="apply-btn" onClick={() => setIsFilterOpen(false)}>
              Áp dụng
            </button>
            <button className="reset-btn" onClick={resetFilters}>
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Active filters */}
      {(selectedCategory || sortOrder !== 'asc' || minPrice || maxPrice) && (
        <div className="active-filters">
          <span>Bộ lọc đang áp dụng:</span>
          
          {selectedCategory && (
            <div className="filter-tag">
              Thể loại: {categories.find(c => c.namekhongdau === selectedCategory)?.name || selectedCategory}
              <button onClick={() => setSelectedCategory('')}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}
          
          {(minPrice || maxPrice) && (
            <div className="filter-tag">
              Giá: {minPrice ? `${parseInt(minPrice).toLocaleString('vi-VN')}đ` : 'Từ 0đ'} - {maxPrice ? `${parseInt(maxPrice).toLocaleString('vi-VN')}đ` : 'trở lên'}
              <button onClick={() => { setMinPrice(''); setMaxPrice(''); }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}
          
          {sortOrder !== 'asc' && (
            <div className="filter-tag">
              Sắp xếp: Giá cao đến thấp
              <button onClick={() => setSortOrder('asc')}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}
        </div>
      )}

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
              <h2>Không tìm thấy sản phẩm nào phù hợp</h2>
              <p>Vui lòng thử điều chỉnh bộ lọc</p>
              {(selectedCategory || minPrice || maxPrice) && (
                <button className="reset-filter-btn" onClick={resetFilters}>
                  Bỏ tất cả bộ lọc
                </button>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="page-btn"
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              
              {/* Hiển thị các trang */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  // Nếu có ít hơn 5 trang, hiển thị tất cả
                  pageNum = i + 1;
                } else if (page <= 3) {
                  // Nếu đang ở gần đầu
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  // Nếu đang ở gần cuối
                  pageNum = totalPages - 4 + i;
                } else {
                  // Ở giữa, hiển thị 2 trang trước và 2 trang sau
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
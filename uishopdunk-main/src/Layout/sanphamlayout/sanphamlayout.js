import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ProductList from './listsp';
import ProductSidebar from './sidebar';
import Pagination from './pagination';
import FilterBar from './filterbar';
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
  const [pagination, setPagination] = useState({
    currentPage: parseInt(queryParams.get('page')) || 1,
    totalPages: 1,
    totalItems: 0
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState(queryParams.get('keyword') || '');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [sortOrder, setSortOrder] = useState(queryParams.get('sort') || 'asc');
  const [priceRange, setPriceRange] = useState({
    min: queryParams.get('minPrice') || '',
    max: queryParams.get('maxPrice') || ''
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.append('keyword', searchTerm);
    if (pagination.currentPage > 1) params.append('page', pagination.currentPage);
    if (sortOrder !== 'asc') params.append('sort', sortOrder);
    if (priceRange.min) params.append('minPrice', priceRange.min);
    if (priceRange.max) params.append('maxPrice', priceRange.max);
    
    const url = selectedCategory 
      ? `/san-pham/${selectedCategory}${params.toString() ? `?${params.toString()}` : ''}`
      : `/${params.toString() ? `?${params.toString()}` : ''}`;
    
    navigate(url, { replace: true });
    
    // Update active filters
    const newFilters = [];
    
    if (searchTerm) {
      newFilters.push({
        type: 'search',
        value: searchTerm,
        name: `Tìm: ${searchTerm}`
      });
    }
    
    if (selectedCategory) {
      const categoryName = categories.find(c => c.namekhongdau === selectedCategory)?.name || selectedCategory;
      newFilters.push({
        type: 'category',
        value: selectedCategory,
        name: `Danh mục: ${categoryName}`
      });
    }
    
    if (sortOrder) {
      newFilters.push({
        type: 'sort',
        value: sortOrder,
        name: `Giá: ${sortOrder === 'asc' ? 'Thấp đến Cao' : 'Cao đến Thấp'}`
      });
    }
    
    if (priceRange.min || priceRange.max) {
      newFilters.push({
        type: 'price',
        value: priceRange,
        name: `Giá: ${priceRange.min || 0}đ - ${priceRange.max ? priceRange.max + 'đ' : 'Max'}`
      });
    }
    
    setActiveFilters(newFilters);
  }, [searchTerm, selectedCategory, sortOrder, priceRange, pagination.currentPage, categories, navigate]);

  // Fetch products and categories on component mount and when filters change
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchTerm, selectedCategory, sortOrder, priceRange, pagination.currentPage]);

  // Fetch products based on filters
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url;
      
      if (searchTerm) {
        url = `/api/search?keyword=${searchTerm}&page=${pagination.currentPage}&sortOrder=${sortOrder}`;
        if (priceRange.min) url += `&minPrice=${priceRange.min}`;
        if (priceRange.max) url += `&maxPrice=${priceRange.max}`;
        if (selectedCategory) url += `&category=${selectedCategory}`;
      } else if (selectedCategory) {
        url = `/api/san-pham-pt/${selectedCategory}?page=${pagination.currentPage}&sort=${sortOrder}`;
      } else {
        url = `/api/search-all?sort=${sortOrder}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu sản phẩm');
      }
      
      const data = await response.json();
      
      if (searchTerm) {
        setProducts(data.products || []);
        setPagination({
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          totalItems: data.pagination.totalItems
        });
      } else if (selectedCategory) {
        setProducts(data.sanpham || []);
        setPagination({
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          totalItems: data.pagination.totalItems
        });
      } else {
        setProducts(data.sanphamjson || []);
        setPagination({
          currentPage: 1,
          totalPages: Math.ceil((data.total || 0) / 12),
          totalItems: data.total || 0
        });
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
      const response = await fetch('/api/sanpham');
      
      if (!response.ok) {
        throw new Error('Không thể tải danh mục sản phẩm');
      }
      
      const data = await response.json();
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Handle search input change
  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  // Handle search form submit
  const handleSearchSubmit = (term) => {
    setSearchTerm(term);
    setPagination({...pagination, currentPage: 1});
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPagination({...pagination, currentPage: 1});
  };

  // Handle price range filter
  const handlePriceRangeChange = (min, max) => {
    setPriceRange({min, max});
    setPagination({...pagination, currentPage: 1});
  };

  // Handle sort order change
  const handleSortOrderChange = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Handle page change
  const handlePageChange = (page) => {
    setPagination({...pagination, currentPage: page});
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  // Remove a specific filter
  const removeFilter = (filterType) => {
    if (filterType === 'search') {
      setSearchTerm('');
    } else if (filterType === 'category') {
      setSelectedCategory('');
    } else if (filterType === 'sort') {
      setSortOrder('asc');
    } else if (filterType === 'price') {
      setPriceRange({min: '', max: ''});
    }
    
    setPagination({...pagination, currentPage: 1});
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSortOrder('asc');
    setPriceRange({min: '', max: ''});
    setPagination({...pagination, currentPage: 1});
  };

  // Toggle mobile filters
  const toggleMobileFilters = () => {
    setShowMobileFilters(!showMobileFilters);
  };

  return (
    <div className="product-page">
      <div className="container">
        <div className="product-page__content">
          {/* Sidebar - Mobile Toggle */}
          <div className={`product-page__sidebar ${showMobileFilters ? 'active' : ''}`}>
            <ProductSidebar 
              categories={categories}
              selectedCategory={selectedCategory}
              searchTerm={searchTerm}
              priceRange={priceRange}
              onSearchChange={handleSearchChange}
              onSearchSubmit={handleSearchSubmit}
              onCategoryChange={handleCategoryChange}
              onPriceRangeChange={handlePriceRangeChange}
              onCloseMobile={() => setShowMobileFilters(false)}
            />
          </div>
          
          {/* Main Content */}
          <div className="product-page__main">
            <FilterBar 
              activeFilters={activeFilters}
              loading={loading}
              sortOrder={sortOrder}
              onSortOrderChange={handleSortOrderChange}
              onRemoveFilter={removeFilter}
              onClearAllFilters={clearAllFilters}
              onToggleMobileFilters={toggleMobileFilters}
            />
            
            {error && <div className="product-page__error">{error}</div>}
            
            <ProductList 
              products={products}
              loading={loading}
              onClearFilters={clearAllFilters}
            />
            
            {pagination.totalPages > 1 && (
              <Pagination 
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
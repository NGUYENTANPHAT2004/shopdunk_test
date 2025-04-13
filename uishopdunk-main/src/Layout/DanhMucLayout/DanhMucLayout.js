import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loading from '../../components/Loading/Loading';
import ProductCard from '../../components/ProductItem/ProductCard';
import './DanhMucLayout.scss';
import ListBlog from '../../components/ListBlog/ListBlog';
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong';
import { Helmet } from 'react-helmet';
import DanhGiaLayout from '../DanhGiaLayout/DanhGiaLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faStar, faStarHalfAlt } from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';

const DanhMucLayout = () => {
  const { slug } = useParams();
  const [categoryDetail, setCategoryDetail] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [displayProducts, setDisplayProducts] = useState([]);
  const [selectedTheLoai, setSelectedTheLoai] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState('asc');
  const [allTheLoai, setAllTheLoai] = useState([]);
  const [selectedTheLoaiData, setSelectedTheLoaiData] = useState(null);

  // State to track parent category info
  const [parentCategory, setParentCategory] = useState(null);

  // Fetch category detail by slug
  useEffect(() => {
    const fetchCategoryDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3005/categoryitem/${slug}`);
        if (!response.ok) {
          throw new Error("Danh mục không tồn tại");
        }
        const data = await response.json();
        console.log("Dữ liệu danh mục:", data);
        setCategoryDetail(data);
        
        // If category has a parent, fetch parent details
        if (data.parent) {
          try {
            const parentResponse = await fetch(`http://localhost:3005/categoryitem/${data.parent}`);
            if (parentResponse.ok) {
              const parentData = await parentResponse.json();
              setParentCategory(parentData);
            }
          } catch (error) {
            console.error("Lỗi khi tải danh mục cha:", error);
          }
        }
        
        // Extract all theloai from the category
        const theLoaiList = extractAllTheLoai(data);
        setAllTheLoai(theLoaiList);
        
        // Fetch products from all the theloai
        await fetchAllProducts(theLoaiList);
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error);
        setLoading(false);
      }
    };
    fetchCategoryDetail();
  }, [slug]);

  // Update selectedTheLoaiData when selectedTheLoai changes
  useEffect(() => {
    if (selectedTheLoai === 'all') {
      // If "all" is selected, use the category detail for reviews
      setSelectedTheLoaiData({
        theloaiId: categoryDetail?._id,
        theloaiName: categoryDetail?.name,
        theloaiSlug: categoryDetail?.namekhongdau
      });
    } else {
      // Find the selected theloai data
      const theloai = allTheLoai.find(t => t.namekhongdau === selectedTheLoai);
      if (theloai) {
        setSelectedTheLoaiData({
          theloaiId: theloai._id,
          theloaiName: theloai.name,
          theloaiSlug: theloai.namekhongdau
        });
      }
    }
  }, [selectedTheLoai, allTheLoai, categoryDetail]);

  // Extract all theloai from category and its children recursively
  const extractAllTheLoai = (category) => {
    let result = [];
    
    // Add theloai from current category
    if (category.theloai && category.theloai.length > 0) {
      result = [...category.theloai];
    }
    
    // Add theloai from children recursively
    if (category.children && category.children.length > 0) {
      category.children.forEach(child => {
        const childTheLoai = extractAllTheLoai(child);
        result = [...result, ...childTheLoai];
      });
    }
    
    // Remove duplicates by ID
    return result.filter((theLoai, index, self) => 
      index === self.findIndex(t => t._id === theLoai._id)
    );
  };

  // Fetch products from all theloai
  const fetchAllProducts = async (theLoaiList) => {
    try {
      // Create an array of promises for parallel fetching
      const productPromises = theLoaiList.map(theLoai => 
        fetch(`http://localhost:3005/san-pham-pt/${theLoai.namekhongdau}?limit=100`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Error fetching products for ${theLoai.name}`);
            }
            return response.json();
          })
          .then(data => ({
            theLoai: theLoai.name,
            theLoaiSlug: theLoai.namekhongdau,
            theLoaiId: theLoai._id,
            products: data.sanpham || []
          }))
          .catch(error => {
            console.error(error);
            return { 
              theLoai: theLoai.name, 
              theLoaiSlug: theLoai.namekhongdau,
              theLoaiId: theLoai._id,
              products: [] 
            };
          })
      );
      
      // Wait for all requests to complete
      const results = await Promise.all(productPromises);
      
      // Combine all products with their theloai info
      let allProductsData = [];
      results.forEach(result => {
        const productsWithTheLoai = result.products.map(product => ({
          ...product,
          theLoaiName: result.theLoai,
          theLoaiSlug: result.theLoaiSlug,
          theLoaiId: result.theLoaiId
        }));
        allProductsData = [...allProductsData, ...productsWithTheLoai];
      });
      
      // Remove duplicate products (by ID)
      const uniqueProducts = allProductsData.filter((product, index, self) =>
        index === self.findIndex(p => p._id === product._id)
      );
      
      setAllProducts(uniqueProducts);
      applyFiltersAndPagination(uniqueProducts, 'all', sortOrder, page, limit);
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải tất cả sản phẩm:", error);
      setLoading(false);
    }
  };

  // Apply filters and pagination to the products
  const applyFiltersAndPagination = (products, theLoai, sort, currentPage, itemsPerPage) => {
    // Filter by theloai if not 'all'
    let filteredProducts = products;
    if (theLoai !== 'all') {
      filteredProducts = products.filter(product => product.theLoaiSlug === theLoai);
    }
    
    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      return sort === 'asc' ? a.price - b.price : b.price - a.price;
    });
    
    // Calculate pagination
    const total = sortedProducts.length;
    const totalPageCount = Math.ceil(total / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
    
    setDisplayProducts(paginatedProducts);
    setTotalPages(totalPageCount > 0 ? totalPageCount : 1);
  };

  // Handle category/theloai change
  useEffect(() => {
    if (allProducts.length > 0) {
      setPage(1); // Reset to first page when changing category
      applyFiltersAndPagination(allProducts, selectedTheLoai, sortOrder, 1, limit);
    }
  }, [selectedTheLoai, sortOrder]);

  // Handle page change
  useEffect(() => {
    if (allProducts.length > 0) {
      applyFiltersAndPagination(allProducts, selectedTheLoai, sortOrder, page, limit);
    }
  }, [page]);

  if (loading) return <Loading />;

  // Build breadcrumbs with parent categories
  const buildBreadcrumbs = () => {
    const breadcrumbs = [{ label: "Trang Chủ", link: "/" }];
    
    // If we have parent category info, add it to breadcrumbs
    if (parentCategory) {
      breadcrumbs.push({ 
        label: parentCategory.name, 
        link: `/danh-muc/${parentCategory.namekhongdau}` 
      });
    }
    
    // Add current category
    breadcrumbs.push({ 
      label: categoryDetail?.name || "Danh mục", 
      link: `/danh-muc/${slug}` 
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = buildBreadcrumbs();

  // Enhanced ProductCard wrapper component to add custom styling
  const EnhancedProductCard = ({ product }) => {
    // Check if product has a discount
    const hasDiscount = product.priceDiscount && product.priceDiscount < product.price;
    const discountPercentage = hasDiscount 
      ? Math.round(((product.price - product.priceDiscount) / product.price) * 100) 
      : 0;

    return (
      <div className="product-card">
        <div className="product-image">
          <img src={product.image} alt={product.name} />
          {hasDiscount && (
            <div className="discount-badge">
              Giảm {discountPercentage}%
            </div>
          )}
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <div className="product-price">
            {hasDiscount ? (
              <>
                {product.priceDiscount.toLocaleString('vi-VN')}₫
                <span className="original-price">{product.price.toLocaleString('vi-VN')}₫</span>
              </>
            ) : (
              `${product.price.toLocaleString('vi-VN')}₫`
            )}
          </div>
          <div className="product-meta">
            {product.theLoaiName}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="theloailayout-container">
      <Helmet>
        <title>{categoryDetail?.name || "Danh mục"} - Shopdunk</title>
        <meta name="description" content={categoryDetail?.name} />
      </Helmet>

      <ThanhDinhHuong breadcrumbs={breadcrumbs} />

      <div className="category-header">
        <h1>{categoryDetail?.name || "Danh mục"}</h1>
        <div className="category-description">
          {categoryDetail?.name === "iPhone" && (
            <>Khám phá bộ sưu tập iPhone mới nhất tại ShopDunk - đại lý ủy quyền chính thức của Apple tại Việt Nam. Mua ngay để nhận ưu đãi đặc biệt cùng chế độ bảo hành chính hãng.</>
          )}
          {categoryDetail?.name === "iPad" && (
            <>Khám phá các dòng iPad mới nhất với đầy đủ phiên bản, kích thước và màu sắc. Mua iPad chính hãng với giá tốt nhất và nhiều ưu đãi hấp dẫn tại ShopDunk.</>
          )}
          {!["iPhone", "iPad"].includes(categoryDetail?.name) && categoryDetail?.name && (
            <>Mua sắm {categoryDetail?.name} chính hãng với giá tốt nhất và chế độ bảo hành uy tín chỉ có tại ShopDunk - đại lý ủy quyền chính thức của Apple tại Việt Nam.</>
          )}
        </div>
      </div>
      
      {/* Featured banner for products */}
      {categoryDetail?.name === "iPhone" && (
        <div className="featured-banner">
          <img src="https://cdn.tgdd.vn/Products/Images/42/289663/s16/iphone-15-pro-blue-titanium-thumbnew-650x650.png" alt="iPhone Promotion" className="banner-image" />
          <div className="banner-content">
            <h3>iPhone 16 - Hiệu năng đỉnh cao</h3>
            <a href="#" className="banner-cta">Xem ngay</a>
          </div>
        </div>
      )}

      {/* Thể loại tabs */}
      {allTheLoai.length > 0 && (
        <div className="theloai-tabs">
          <button
            onClick={() => setSelectedTheLoai('all')}
            className={selectedTheLoai === 'all' ? 'active' : ''}
          >
            Tất cả
          </button>
          {allTheLoai.map(theLoai => (
            <button
              key={theLoai._id}
              onClick={() => setSelectedTheLoai(theLoai.namekhongdau)}
              className={selectedTheLoai === theLoai.namekhongdau ? 'active' : ''}
            >
              {theLoai.name}
            </button>
          ))}
        </div>
      )}

      {/* Sort dropdown */}
      <div className="filter-dropdown">
        <select
          onChange={e => setSortOrder(e.target.value)}
          value={sortOrder}
          className="custom-select"
        >
          <option value="asc">Giá thấp đến cao</option>
          <option value="desc">Giá cao đến thấp</option>
        </select>
      </div>

      {/* Product list */}
      <div className="theloaisp-category">
        {displayProducts.length > 0 ? (
          displayProducts.map(product => (
            <EnhancedProductCard key={product._id} product={product} />
          ))
        ) : (
          <div className="no-products">Không có sản phẩm nào trong danh mục này</div>
        )}
      </div>

      {/* Pagination */}
      {displayProducts.length > 0 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <span>
            Trang {page} / {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      )}

      {/* Keep original ListBlog component */}
      
      {/* Use original DanhGiaLayout component */}
      {selectedTheLoaiData && (
        <DanhGiaLayout 
          theloaiId={selectedTheLoaiData.theloaiId}
          theloaiName={selectedTheLoaiData.theloaiName}
          theloaiSlug={selectedTheLoaiData.theloaiSlug}
        />
      )}
      
      {/* Additional information section from reference images */}
      {categoryDetail && (
        <div className="info-section">
          <h3>Apple đã khai tử những dòng iPhone nào?</h3>
          <p>Tính đến nay, Apple đã khai tử (ngừng sản xuất) các dòng iPhone đời cũ bao gồm: iPhone 2G, iPhone 3G, iPhone 4, iPhone 5 series, iPhone 6 series, iPhone 7 series, iPhone 8 series, iPhone X series, iPhone SE (thế hệ 1), iPhone SE (thế hệ 2), iPhone 11 Pro, iPhone 11 Pro Max, iPhone 12 Pro, iPhone 12 Pro Max.</p>
          
          <h3>ShopDunk cung cấp những dòng iPhone nào?</h3>
          <p>ShopDunk là một trong những thương hiệu bán lẻ được Apple ủy quyền tại Việt Nam, đáp ứng được các yêu cầu khắt khe từ Apple như: dịch vụ kinh doanh, dịch vụ chăm sóc khách hàng, vị trí đặt cửa hàng...</p>
          <p>Những chiếc iPhone do Apple Việt Nam phân phối tại nước ta đều mang mã VN/A và được bảo hành 12 tháng theo tiêu chuẩn tại các trung tâm bảo hành Apple. Các dòng iPhone được cung cấp tại ShopDunk gồm:</p>
          <ul>
            <li><a href="#">iPhone 16 Series</a></li>
            <li><a href="#">iPhone 15 Series</a></li>
            <li><a href="#">iPhone 14 Series</a></li>
            <li><a href="#">iPhone 13 Series</a></li>
            <li><a href="#">iPhone 12 Series</a></li>
            <li><a href="#">iPhone 11 Series</a></li>
            <li><a href="#">iPhone SE 3</a></li>
          </ul>
          
          <h3>Mua iPhone giá tốt nhất tại ShopDunk</h3>
          <p>ShopDunk đã đại lý ủy quyền Apple tại Việt Nam với hệ thống 40 cửa hàng trên toàn quốc, trong đó có 11 Mono Store. Đến nay, ShopDunk đã trở thành điểm dừng chân lý tưởng cho mọi tín đồ công nghệ.</p>
        </div>
      )}
    </div>
  );
};

export default DanhMucLayout;
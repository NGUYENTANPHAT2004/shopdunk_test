import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loading from '../../components/Loading/Loading';
import ProductCard from '../../components/ProductItem/ProductCard';
import './DanhMucLayout.scss';
import ListBlog from '../../components/ListBlog/ListBlog';
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong';
import { Helmet } from 'react-helmet';
import { DanhGiaLayout } from '../DanhGiaLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const DanhMucLayout = () => {
  const { slug } = useParams();
  const [categoryDetail, setCategoryDetail] = useState(null);
  const [selectedTheLoai, setSelectedTheLoai] = useState(null); // Slug của thể loại được chọn
  const [productDetails, setProductDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState('asc');

  // Lấy thông tin danh mục theo slug từ URL
  useEffect(() => {
    const fetchCategoryDetail = async () => {
      try {
        const response = await fetch(`http://localhost:3005/categoryitem/${slug}`);
        if (!response.ok) {
          throw new Error("Danh mục không tồn tại");
        }
        const data = await response.json();
        console.log("Dữ liệu danh mục:", data);
        setCategoryDetail(data);
        // Nếu danh mục có nhiều thể loại, đặt thể loại mặc định là thể loại đầu tiên
        if (data.theloai && data.theloai.length > 0) {
          setSelectedTheLoai(data.theloai[0].namekhongdau);
        } else {
          // Nếu không có thể loại, fallback về slug của danh mục
          setSelectedTheLoai(slug);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error);
      }
    };
    fetchCategoryDetail();
  }, [slug]);

  // Khi selectedTheLoai thay đổi, gọi API lấy sản phẩm cho thể loại đó
  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedTheLoai) return;
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:3005/san-pham-pt/${selectedTheLoai}?page=${page}&limit=${limit}&sort=${sortOrder}`
        );
        if (!response.ok) {
          throw new Error("Không tìm thấy sản phẩm");
        }
        const data = await response.json();
        setProductDetails(data);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
        setProductDetails({
          sanpham: [],
          pagination: { totalPages: 1, currentPage: 1 }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedTheLoai, page, sortOrder, limit]);

  // Reset trang khi thể loại thay đổi
  useEffect(() => {
    setPage(1);
  }, [selectedTheLoai]);

  if (loading || !categoryDetail || !productDetails) return <Loading />;

  return (
    <div className="theloailayout-container">
      <Helmet>
        <title>{categoryDetail.name} - Shopdunk</title>
        <meta name="description" content={categoryDetail.name} />
      </Helmet>

      <ThanhDinhHuong
        breadcrumbs={[
          { label: "Trang Chủ", link: "/" },
          { label: categoryDetail.name, link: `/san-pham/${slug}` }
        ]}
      />

      {/* Hiển thị danh sách thể loại nếu có */}
      {categoryDetail.theloai && categoryDetail.theloai.length > 0 && (
        <div className="theloai-tabs">
          {categoryDetail.theloai.map(theLoai => (
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

      {/* Dropdown sắp xếp */}
      <div className="filter-dropdown">
        <select
          onChange={e => {
            setSortOrder(e.target.value);
            setPage(1);
          }}
          value={sortOrder}
          className="custom-select"
        >
          <option value="asc">Giá thấp đến cao</option>
          <option value="desc">Giá cao đến thấp</option>
        </select>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="theloaisp">
        {productDetails.sanpham && productDetails.sanpham.length > 0 ? (
          productDetails.sanpham.map(sanpham => (
            <ProductCard
              key={sanpham._id}
              sanpham={sanpham}
              setLoading={setLoading}
              nametheloai={categoryDetail.namekhongdau || slug}
            />
          ))
        ) : (
          <div className="no-products">Không có sản phẩm nào trong thể loại này</div>
        )}
      </div>

      {/* Phân trang */}
      {productDetails.pagination && productDetails.sanpham && productDetails.sanpham.length > 0 && (
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

      <ListBlog />
      <DanhGiaLayout />
    </div>
  );
};

export default DanhMucLayout;

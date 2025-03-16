import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Loading from '../../components/Loading/Loading'
import ProductCard from '../../components/ProductItem/ProductCard'  // Component đệ quy hiển thị danh mục
import './TheLoaiLayout.scss'
import ListBlog from '../../components/ListBlog/ListBlog'
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong'
import { Helmet } from 'react-helmet'
import { DanhGiaLayout } from '../DanhGiaLayout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'

const TheLoaiLayout = () => {
  const { slug } = useParams();
  const [productDetails, setProductDetails] = useState(null);
  const [categoryDetail, setCategoryDetail] = useState(null); // Thông tin danh mục đa cấp
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState('asc');

  // API lấy sản phẩm theo thể loại
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:3005/san-pham-pt/${slug}?page=${page}&limit=${limit}&sort=${sortOrder}`
        );
        const data = await response.json();
        setProductDetails(data);
        setTotalPages(data.pagination.totalPages);
      } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [slug, page, sortOrder]);

  // API lấy thông tin danh mục đa cấp theo slug
  useEffect(() => {
    const fetchCategoryDetail = async () => {
      try {
        const response = await fetch(`http://localhost:3005/categoryitem/${slug}`);
        const data = await response.json();
        console.log("Dữ liệu trả về từ API category:", data);
        setCategoryDetail(data);
      } catch (error) {
        console.error('Lỗi khi tải danh mục:', error);
      }
    };
    fetchCategoryDetail();
  }, [slug]);
  

  if (!productDetails || !categoryDetail) return <Loading />;

  return (
    <div className='theloailayout-container'>
      <Helmet>
        <title>{categoryDetail.name} - Shopdunk</title>
        <meta name='description' content={categoryDetail.name} />
      </Helmet>
      
      <ThanhDinhHuong
        breadcrumbs={[
          { label: 'Trang Chủ', link: '/' },
          { label: categoryDetail.name, link: `/san-pham/${slug}` }
        ]}
      />

      <div className='theloailayout'>
        

        <div className='filter-dropdown'>
          <select
            onChange={e => setSortOrder(e.target.value)}
            value={sortOrder}
            className='custom-select'
          >
            <option value='asc'>Giá thấp đến cao</option>
            <option value='desc'>Giá cao đến thấp</option>
          </select>
        </div>

        <div className='theloaisp'>
          {loading ? (
            <Loading />
          ) : (
            productDetails.sanpham.map(sanpham => (
              <ProductCard
                key={sanpham._id}
                sanpham={sanpham}
                setLoading={setLoading}
                nametheloai={categoryDetail.namekhongdau}
              />
            ))
          )}
        </div>

        <div className='pagination'>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>

          <span>
            Trang {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </div>
      <ListBlog />
      <DanhGiaLayout />
    </div>
  );
};

export default TheLoaiLayout;

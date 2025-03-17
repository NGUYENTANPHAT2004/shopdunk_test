/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import CategoryList from '../../components/ListTheLoai/CategoryList'
import Loading from '../../components/Loading/Loading'
import ProductCard from '../../components/ProductItem/ProductCard'
import './TheLoaiLayout.scss'
import ListBlog from '../../components/ListBlog/ListBlog'
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong'
import { Helmet } from 'react-helmet'
import { DanhGiaLayout } from '../DanhGiaLayout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'

const TheLoaiLayout = () => {
  const { slug } = useParams()
  const [productDetails, setProductDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const filterRef = useRef(null)
  const filterButtonRef = useRef(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target)
      ) {
        setShowFilter(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `http://localhost:3005/san-pham-pt/${slug}?page=${page}&limit=${limit}&sort=${sortOrder}`
        )
        const data = await response.json()
        setProductDetails(data)
        setTotalPages(data.pagination.totalPages)
      } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [slug, page, sortOrder])

  if (!productDetails) return <Loading />

  return (
    <div className='theloailayout-container'>
      <Helmet>
        <title>{productDetails.nametheloai} - Shopdunk</title>
        <meta name='description' content={productDetails.nametheloai} />
      </Helmet>
      <ThanhDinhHuong
        breadcrumbs={[
          { label: 'Trang Chủ', link: '/' },
          { label: productDetails.nametheloai, link: `/san-pham/${slug}` }
        ]}
      />
      <div className='theloailayout'>
        <div className='category-sidebar'>
          <CategoryList />
        </div>

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

        <div
          className={`category-filter ${showFilter ? 'show' : ''}`}
          ref={filterRef}
        >
          <CategoryList />
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
                nametheloai={productDetails.namekhongdau}
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
  )
}

export default TheLoaiLayout
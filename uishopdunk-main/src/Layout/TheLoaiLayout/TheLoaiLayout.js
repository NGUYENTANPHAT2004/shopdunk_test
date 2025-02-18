import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import CategoryList from '../../components/ListTheLoai/CategoryList'
import Loading from '../../components/Loading/Loading'
import ProductCard from '../../components/ProductItem/ProductCard'
import './TheLoaiLayout.scss'
import { FaFilter } from 'react-icons/fa6'
import ListBlog from '../../components/ListBlog/ListBlog'
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong'
import { Helmet } from 'react-helmet'

const TheLoaiLayout = () => {
  const { slug } = useParams()
  const [productDetails, setProductDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const filterRef = useRef(null)
  const filterButtonRef = useRef(null)

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
          `http://localhost:3005/san-pham/${slug}`
        )
        const data = await response.json()
        setProductDetails(data)
      } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [slug])

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

        <div
          className='filter-button'
          ref={filterButtonRef}
          onClick={() => setShowFilter(!showFilter)}
        >
          <FaFilter /> Bộ Lọc
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
            productDetails.sanpham.map((sanpham) => (
              <ProductCard key={sanpham._id} sanpham={sanpham} setLoading={setLoading} nametheloai={productDetails.namekhongdau}/>
            ))
          )}
        </div>
      </div>
      <ListBlog />

    </div>
  )
}

export default TheLoaiLayout

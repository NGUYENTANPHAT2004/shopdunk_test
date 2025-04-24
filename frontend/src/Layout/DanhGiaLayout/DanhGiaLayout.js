import React, { useState, useEffect } from 'react'
import './DanhGiaLayout.scss'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import moment from 'moment'
import { useUserContext } from '../../context/Usercontext'
import { Link } from 'react-router-dom'

const DanhGiaLayout = ({ theloaiId, theloaiName, theloaiSlug }) => {
  const [rating, setRating] = useState(0)
  const [tenkhach, setTenkhach] = useState('')
  const [content, setContent] = useState('')
  const [danhgias, setDanhgias] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const { getUser } = useUserContext()
  const currentUser = getUser()

  // Set username from user context when component mounts
  useEffect(() => {
    if (currentUser) {
      setTenkhach(currentUser)
    }
  }, [currentUser])

  const handleRating = value => {
    setRating(value)
  }

  const handlePostdanhgia = async () => {
    // Validation
    if (!rating) {
      return toast.error('Vui lòng chọn số sao đánh giá', {
        position: 'top-right',
        autoClose: 2000
      })
    }

    if (!tenkhach.trim()) {
      return toast.error('Vui lòng nhập tên của bạn', {
        position: 'top-right',
        autoClose: 2000
      })
    }

    if (!content.trim()) {
      return toast.error('Vui lòng nhập nội dung đánh giá', {
        position: 'top-right',
        autoClose: 2000
      })
    }

    try {
      // Prepare request data
      const reviewData = {
        tenkhach,
        content,
        rating
      }
      
      // Only add category data if it exists
      if (theloaiId) reviewData.theloaiId = theloaiId
      if (theloaiName) reviewData.theloaiName = theloaiName
      if (theloaiSlug) reviewData.theloaiSlug = theloaiSlug
      
      const response = await fetch('http://localhost:3005/danhgia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      })
      
      if (response.ok) {
        toast.success('Đánh giá thành công', {
          position: 'top-right',
          autoClose: 2000
        })
        
        // Reset form - but keep the name if logged in
        if (!currentUser) {
          setTenkhach('')
        }
        setContent('')
        setRating(0)
        fetchdanhgia()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Server returned an error')
      }
    } catch (error) {
      console.log(error)
      toast.error('Đã xảy ra lỗi khi gửi đánh giá', {
        position: 'top-right',
        autoClose: 2000
      })
    }
  }

  const fetchdanhgia = async () => {
    try {
      setLoading(true)
      // Clear existing reviews first to avoid showing old data
      setDanhgias([])
      setAverageRating(0)
      
      // Skip the fetch if we don't have a slug (fresh page load or invalid category)
      if (!theloaiSlug) {
        setLoading(false)
        return
      }
      
      // Use the category-specific endpoint if we have a slug
      const endpoint = `http://localhost:3005/getdanhgia/${theloaiSlug}`
      
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const data = await response.json()
        setDanhgias(data)

        if (data.length > 0) {
          const totalRating = data.reduce((acc, item) => acc + item.rating, 0)
          setAverageRating(totalRating / data.length)
        } else {
          setAverageRating(0)
        }
      }
    } catch (error) {
      console.log(error)
      toast.error('Đã xảy ra lỗi khi tải đánh giá', {
        position: 'top-right',
        autoClose: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  // Reset reviews and fetch new ones when theloaiId or theloaiSlug changes
  useEffect(() => {
    // Reset reviews when category changes
    setDanhgias([])
    setAverageRating(0)
    
    // Only fetch if we have a valid slug
    if (theloaiSlug) {
      fetchdanhgia()
    }
  }, [theloaiId, theloaiSlug]) // Add theloaiId as dependency to ensure reloading when category changes

  return (
    <div className='review-container'>
      <div className='review-rating'>
        <h2 className='title_rate'>
          {theloaiName ? `Đánh giá: ${theloaiName}` : 'Đánh giá danh mục'}
        </h2>

        <div className='rating-summary'>
          <div className='score'>
            <span>{averageRating.toFixed(1)}</span>
            <p>{danhgias.length} đánh giá</p>
          </div>

          <div className='rating-details'>
            <div className='stars'>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    color: i < Math.round(averageRating) ? 'gold' : '#ccc'
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            <div className='rating-bars'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className={`bar ${
                    Math.round(averageRating) === 5 - index ? 'active' : ''
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        <div className='review-form'>
          <h3 className='form-title'>Viết đánh giá của riêng bạn</h3>
          <div className='div_chatluong_star'>
            <label>Chất lượng*:</label>
            <div className='rating-select'>
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  className={`star ${rating >= star ? 'starselected' : ''}`}
                  onClick={() => handleRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className='div_danhgia_input'>
            <label htmlFor=''>Tên của bạn</label>
             <input
              type='text'
              value={tenkhach}
              className='input-name'
              onChange={e => setTenkhach(e.target.value)}
              disabled={currentUser ? true : false}
              placeholder={currentUser ? '' : 'Nhập tên của bạn'}
            />
          </div>
          <div className='div_danhgia_input'>
            <label htmlFor=''>Đánh giá danh mục</label>
            <textarea
              className='input-review'
              value={content}
              onChange={e => setContent(e.target.value)}
            ></textarea>
          </div>

          <button className='submit-btn' onClick={handlePostdanhgia}>
            Gửi
          </button>
        </div>
      </div>

      <div className='reviews'>
        {loading ? (
          <div className='loading'>Đang tải đánh giá...</div>
        ) : danhgias.length > 0 ? (
          danhgias.map((review, index) => (
            <div className='review-item' key={review._id || index}>
              <p className='reviewer'>
                {`${review.tenkhach} - ${moment(review.date).format(
                  'DD/MM/YYYY'
                )}`}
              </p>
              <div className='stars'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    style={{ color: i < review.rating ? 'gold' : '#ccc' }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className='comment'>{review.content}</p>
            </div>
          ))
        ) : (
          <div className='danhgia_no'>Không có đánh giá nào</div>
        )}
      </div>
    </div>
  )
}

export default DanhGiaLayout
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import './TimKiemLayout.scss'
import { Link } from 'react-router-dom'
const SearchResults = () => {
  const { keyword } = useParams()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)
      try {
        const response = await fetch('https://demovemaybay.shop/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ keyword })
        })

        const data = await response.json()
        setResults(data)
      } catch (error) {
        console.error('Lỗi khi tải kết quả tìm kiếm:', error)
      } finally {
        setLoading(false)
      }
    }

    if (keyword) fetchResults()
  }, [keyword])

  if (loading) return <div>Đang tải kết quả tìm kiếm...</div>

  return (
    <div className='search-results'>
      <h1>Kết quả tìm kiếm cho: "{keyword}"</h1>
      {results.length === 0 ? (
        <p>Không tìm thấy sản phẩm nào.</p>
      ) : (
        <div className='results-container'>
          {results.map(item => (
            <div key={item._id} className='result-item'>
              <Link
                to={`/chitietsanpham/${item.namekhongdau}`}
                className='product-link'
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className='result-image'
                />
                <h3>{item.name}</h3>
                <p>{item.price.toLocaleString()} đ</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchResults

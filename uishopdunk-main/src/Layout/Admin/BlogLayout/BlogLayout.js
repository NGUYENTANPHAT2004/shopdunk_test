import { useState, useEffect } from 'react'
import { FaPlus } from 'react-icons/fa'
import { AddBlog } from './AddBlog'
import { XoaBlog } from './XoaBlog'
import './BlogLayout.scss'
function BlogLayout () {
  const [data, setdata] = useState([])

  const [isOpenAdd, setIsOpenAdd] = useState(false)
  const [isOpenDelete, setIsOpenDelete] = useState(false)
  const [idBlog, setIdBlog] = useState('')

  const fetchdata = async () => {
    try {
      const response = await fetch('http://localhost:3005/getblog')
      if (response.ok) {
        const data = await response.json()
        setdata(data)
      }
    } catch (error) {
      console.error(error)
    }
  }
  useEffect(() => {
    fetchdata()
  }, [])
  return (
    <div className='blog_container'>
      <button className='btnthemtheloai' onClick={() => setIsOpenAdd(true)}>
        <FaPlus className='icons' />
        Thêm Blog
      </button>
      <table className='tablenhap'>
        <thead>
          <tr>
            <th>STT</th>
            <th>ID</th>
            <th>Ảnh</th>
            <th>Tiêu đề</th>
            <th>Chức năng</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item._id}</td>
              <td>
                <img src={`${item.img_blog}`} alt='' />
              </td>
              <td>{item.tieude_blog}</td>
              <td className='tdchucnang'>
                <button>Chi tiết</button>
                <button
                  onClick={() => {
                    setIdBlog(item._id)
                    setIsOpenDelete(true)
                  }}
                >
                  Xóa
                </button>
                <button>Cập nhật</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <AddBlog
        isOpen={isOpenAdd}
        onClose={() => setIsOpenAdd(false)}
        fetchdata={fetchdata}
      />
      <XoaBlog
        isOpen={isOpenDelete}
        onClose={() => setIsOpenDelete(false)}
        idblog={idBlog}
        fetchdata={fetchdata}
      />
    </div>
  )
}

export default BlogLayout

import { useState, useEffect } from 'react'
import './TheLoaiLayout.scss'
import { FaEdit, FaPlus, FaSignal } from 'react-icons/fa'
import { AddTheLoai } from './AddTheLoai'
import { SanPhamLayout } from '../SanPhamLayout'
import { XoaTheLoai } from './XoaTheLoai'
import { CapNhatTheLoai } from './UpdateTheLoai/CapNhatTheLoai'
import { FaMobile, FaTrashCan, FaRotateLeft } from 'react-icons/fa6'
import { DungLuongLayout } from '../DungLuongLayout'

function TheLoaiLayout () {
  const [data, setData] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isOpenSp, setisOpenSp] = useState(false)
  const [isOpenXoaTL, setisOpenXoaTL] = useState(false)
  const [isOpenCapNhat, setisOpenCapNhat] = useState(false)
  const [isOpenDungLuong, setisOpenDungLuong] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchdata = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3005/theloaiadmin')
      if (response.ok) {
        const data = await response.json()
        setData(data)
      } else {
        console.error('Lỗi khi tải dữ liệu:', response.status)
        alert('Có lỗi xảy ra khi tải dữ liệu')
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error)
      alert('Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }

  const fetchTrashData = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3005/theloaitrash')
      if (response.ok) {
        const data = await response.json()
        setData(data)
      } else {
        console.error('Lỗi khi tải dữ liệu thùng rác:', response.status)
        alert('Có lỗi xảy ra khi tải dữ liệu thùng rác')
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error)
      alert('Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showTrash) {
      fetchTrashData()
    } else {
      fetchdata()
    }
  }, [showTrash])

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(data.map(item => item._id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelectItem = id => {
    let newSelectedIds = [...selectedIds]
    if (newSelectedIds.includes(id)) {
      newSelectedIds = newSelectedIds.filter(itemId => itemId !== id)
    } else {
      newSelectedIds.push(id)
    }
    setSelectedIds(newSelectedIds)

    setSelectAll(newSelectedIds.length === data.length)
  }

  const handleRestore = async () => {
    if (selectedIds.length === 0) {
      alert('Chọn thể loại để hoàn tác')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('http://localhost:3005/restore-theloai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (response.ok) {
        alert('Hoàn tác thành công')
        setSelectedIds([])
        setSelectAll(false)
        fetchTrashData()
      } else {
        const errorData = await response.json()
        alert(`Có lỗi xảy ra khi hoàn tác: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(error)
      alert('Có lỗi xảy ra khi hoàn tác')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTrash = () => {
    // Reset selection when switching views
    setSelectedIds([])
    setSelectAll(false)
    setShowTrash(!showTrash)
  }

  return (
    <div className='theloai_container'>
      <div className='nav_chucnang'>
        {!showTrash ? (
          <>
            <button className='btnthemtheloai' onClick={() => setIsOpen(true)}>
              <FaPlus className='icons' />
              Thêm thể loại
            </button>
            <button
              className='btnthemtheloai'
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert('Chọn một thể loại để cập nhật')
                } else if (selectedIds.length > 1) {
                  alert('Chỉ được chọn một thể loại để cập nhật')
                } else {
                  setisOpenCapNhat(true)
                }
              }}
            >
              <FaEdit className='icons' />
              Cập nhật
            </button>
            <button
              className='btnthemtheloai'
              onClick={() =>
                selectedIds.length > 0
                  ? setisOpenXoaTL(true)
                  : alert('Chọn thể loại để xóa')
              }
            >
              <FaTrashCan className='icons' />
              Xóa thể loại
            </button>
            <button
              className='btnthemtheloai'
              onClick={handleToggleTrash}
            >
              <FaTrashCan className='icons' />
              Thùng rác
            </button>
            <button
              className='btnthemtheloai'
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert('Chọn một thể loại để xem sản phẩm')
                } else if (selectedIds.length > 1) {
                  alert('Chỉ được chọn một thể loại để xem sản phẩm')
                } else {
                  setisOpenSp(true)
                }
              }}
            >
              <FaMobile className='icons' />
              Sản Phẩm
            </button>
            <button
              className='btnthemtheloai'
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert('Chọn một thể loại để xem dung lượng')
                } else if (selectedIds.length > 1) {
                  alert('Chỉ được chọn một thể loại để xem dung lượng')
                } else {
                  setisOpenDungLuong(true)
                }
              }}
            >
              <FaSignal className='icons' />
              Dung lượng
            </button>
          </>
        ) : (
          <>
            <button
              className='btnthemtheloai'
              onClick={handleToggleTrash}
            >
              <FaTrashCan className='icons' />
              Quay lại
            </button>
            <button
              className='btnthemtheloai'
              onClick={handleRestore}
              disabled={selectedIds.length === 0}
            >
              <FaRotateLeft className='icons' />
              Khôi phục
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          <div className="view-title">
            <h2>{showTrash ? 'Thùng rác thể loại' : 'Quản lý thể loại'}</h2>
          </div>
          
          <table className='tablenhap'>
            <thead>
              <tr>
                <th>
                  <input
                    type='checkbox'
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>STT</th>
                <th>Tên thể loại</th>
                <th>Ram</th>
                <th>Dung lượng</th>
                <th>Hãng</th>
                <th>Khuyến mãi</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, index) => (
                  <tr key={item._id}>
                    <td>
                      <input
                        type='checkbox'
                        checked={selectedIds.includes(item._id)}
                        onChange={() => handleSelectItem(item._id)}
                      />
                    </td>
                    <td>{index + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.ram}</td>
                    <td>{item.dungluong}</td>
                    <td>{item.hang}</td>
                    <td>{item.khuyenmai}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    {showTrash ? 'Không có dữ liệu trong thùng rác' : 'Không có thể loại nào'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      <AddTheLoai
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          fetchdata()
        }}
        fetchdata={fetchdata}
      />
      <SanPhamLayout
        isOpen={isOpenSp}
        onClose={() => setisOpenSp(false)}
        idtheloai={selectedIds}
      />
      <DungLuongLayout
        isOpen={isOpenDungLuong}
        onClose={() => setisOpenDungLuong(false)}
        idtheloai={selectedIds}
      />
      <XoaTheLoai
        isOpen={isOpenXoaTL}
        onClose={() => setisOpenXoaTL(false)}
        idtheloai={selectedIds}
        fetchdata={fetchdata}
        setSelectedIds={setSelectedIds}
      />
      <CapNhatTheLoai
        isOpen={isOpenCapNhat}
        onClose={() => {
          setisOpenCapNhat(false)
          fetchdata()
        }}
        idtheloai={selectedIds}
        fetchdata={fetchdata}
      />
    </div>
  )
}

export default TheLoaiLayout
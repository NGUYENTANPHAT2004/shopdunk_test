/* eslint-disable react-hooks/exhaustive-deps */
import { ModalBig } from '../../../components/ModalBig'
import { useState, useEffect } from 'react'
import { FaEdit, FaPlus } from 'react-icons/fa'
import { FaTrashCan, FaRotateLeft } from 'react-icons/fa6'
import { FaDroplet } from 'react-icons/fa6'
import { MauSacLayout } from '../MauSacLayout'
import { AddDungLuong } from './AddDungLuong'
import { UpdateDungLuong } from './UpdateDungLuong'
import { XoaDungLuong } from './XoaDungLuong'

function DungLuongLayout ({ isOpen, onClose, idtheloai }) {
  const [data, setdata] = useState([])
  const [isOpenThem, setIsOpenThem] = useState(false)
  const [isOpenEdit, setIsOpenEdit] = useState(false)
  const [isOpenXoa, setIsOpenXoa] = useState(false)
  const [isOpenMauSac, setIsOpenMauSac] = useState(false)
  const [loading, setloading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

  const fetchdata = async () => {
    if (idtheloai) {
      setloading(true)
      setError(null)
      try {
        const response = await fetch(
          `http://localhost:3005/dungluong/${idtheloai}`
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Lỗi khi tải dữ liệu')
        }
        
        const data = await response.json()
        setdata(data)
      } catch (error) {
        console.error(error)
        setError(error.message)
      } finally {
        setloading(false)
      }
    } else {
      setloading(false)
    }
  }

  const fetchTrashData = async () => {
    if (idtheloai) {
      setloading(true)
      setError(null)
      try {
        const response = await fetch(
          `http://localhost:3005/dungluongtrash/${idtheloai}`
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Lỗi khi tải dữ liệu thùng rác')
        }
        
        const data = await response.json()
        setdata(data)
      } catch (error) {
        console.error(error)
        setError(error.message)
      } finally {
        setloading(false)
      }
    } else {
      setloading(false)
    }
  }

  useEffect(() => {
    if (idtheloai && isOpen) {
      if (showTrash) {
        fetchTrashData()
      } else {
        fetchdata()
      }
    }
  }, [idtheloai, isOpen, showTrash])

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
      alert('Chọn dung lượng để hoàn tác')
      return
    }

    setloading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:3005/restore-dungluong', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Có lỗi xảy ra khi hoàn tác')
      }

      alert('Hoàn tác thành công')
      setSelectedIds([])
      setSelectAll(false)
      fetchTrashData()
    } catch (error) {
      console.error(error)
      setError(`Lỗi hoàn tác: ${error.message}`)
    } finally {
      setloading(false)
    }
  }

  const handleToggleTrash = () => {
    setSelectedIds([])
    setSelectAll(false)
    setShowTrash(!showTrash)
  }

  return (
    <ModalBig
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setSelectedIds([])
        setSelectAll(false)
        setShowTrash(false)
        setError(null)
      }}
    >
      <div>
        <div className='nav_chucnang'>
          {!showTrash ? (
            <>
              <button
                className='btnthemtheloai'
                onClick={() => setIsOpenThem(true)}
                disabled={loading}
              >
                <FaPlus className='icons' />
                Thêm dung lượng
              </button>
              <button
                className='btnthemtheloai'
                onClick={() => {
                  if (selectedIds.length === 0) {
                    alert('Chọn một dung lượng để cập nhật')
                  } else if (selectedIds.length > 1) {
                    alert('Chỉ được chọn một dung lượng để cập nhật')
                  } else {
                    setIsOpenEdit(true)
                  }
                }}
                disabled={loading || selectedIds.length !== 1}
              >
                <FaEdit className='icons' />
                Cập nhật
              </button>
              <button
                className='btnthemtheloai'
                onClick={() =>
                  selectedIds.length > 0
                    ? setIsOpenXoa(true)
                    : alert('Chọn dung lượng để xóa')
                }
                disabled={loading || selectedIds.length === 0}
              >
                <FaTrashCan className='icons' />
                Xóa dung lượng
              </button>
              <button
                className='btnthemtheloai'
                onClick={() => {
                  if (selectedIds.length === 0) {
                    alert('Chọn một dung lượng để xem màu sắc')
                  } else if (selectedIds.length > 1) {
                    alert('Chỉ được chọn một dung lượng để xem màu sắc')
                  } else {
                    setIsOpenMauSac(true)
                  }
                }}
                disabled={loading || selectedIds.length !== 1}
              >
                <FaDroplet className='icons' />
                Màu sắc
              </button>
              <button
                className='btnthemtheloai'
                onClick={handleToggleTrash}
                disabled={loading}
              >
                <FaTrashCan className='icons' />
                Thùng rác
              </button>
            </>
          ) : (
            <>
              <button
                className='btnthemtheloai'
                onClick={handleToggleTrash}
                disabled={loading}
              >
                <FaRotateLeft className='icons' />
                Quay lại
              </button>
              <button
                className='btnthemtheloai'
                onClick={handleRestore}
                disabled={loading || selectedIds.length === 0}
              >
                <FaRotateLeft className='icons' />
                Hoàn tác
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Đóng</button>
          </div>
        )}

        <div className="view-title">
          <h3>{showTrash ? 'Thùng rác dung lượng' : 'Quản lý dung lượng'}</h3>
        </div>

        <table className='tablenhap'>
          <thead>
            <tr>
              <th>
                <input
                  type='checkbox'
                  checked={selectAll}
                  onChange={handleSelectAll}
                  disabled={loading || data.length === 0}
                />
              </th>
              <th>STT</th>
              <th>ID</th>
              <th>Tên dung lượng</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan='4' className="loading-cell">
                  <div className="loading-spinner"></div> Đang tải dữ liệu...
                </td>
              </tr>
            ) : data.length > 0 ? (
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
                  <td>{item._id}</td>
                  <td>{item.name}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan='4' className="no-data">
                  {showTrash 
                    ? 'Không có dung lượng nào trong thùng rác' 
                    : 'Không có dung lượng nào'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <MauSacLayout
        isOpen={isOpenMauSac}
        onClose={() => setIsOpenMauSac(false)}
        iddungluong={selectedIds}
      />
      <AddDungLuong
        isOpen={isOpenThem}
        onClose={() => {
          setIsOpenThem(false);
          fetchdata();
        }}
        idtheloai={idtheloai}
        fetchdata={fetchdata}
      />
      <UpdateDungLuong
        isOpen={isOpenEdit}
        onClose={() => {
          setIsOpenEdit(false);
          fetchdata();
        }}
        iddungluong={selectedIds}
        fetchdata={fetchdata}
        setSelectedIds={setSelectedIds}
      />
      <XoaDungLuong
        isOpen={isOpenXoa}
        onClose={() => {
          setIsOpenXoa(false);
          fetchdata();
        }}
        iddungluong={selectedIds}
        fetchdata={fetchdata}
        setSelectedIds={setSelectedIds}
      />
    </ModalBig>
  )
}

export default DungLuongLayout
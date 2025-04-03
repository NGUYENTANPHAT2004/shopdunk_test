// Example of improved error handling for XoaMauSac.js
import { Modal } from '../../../../components/Modal'
import { MdDeleteForever } from 'react-icons/md'
import { MdCancelPresentation } from 'react-icons/md'
import { useState } from 'react'

function XoaMauSac ({ isOpen, onClose, idmausac, fetchdata, setSelectedIds }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const handleXoaMauSac = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `http://localhost:3005/deletemausachangloat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids: idmausac
          })
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Có lỗi xảy ra khi xóa màu sắc');
      }
      
      onClose()
      setSelectedIds([])
      fetchdata()
      alert('Xóa thành công!')
    } catch (error) {
      console.error('Lỗi xóa màu sắc:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div>
        <p>Bạn có chắc muốn xóa màu sắc này?</p>
        {error && <p className="error-message">{error}</p>}
        <div className='divbtnxtl'>
          <button 
            onClick={handleXoaMauSac} 
            className='btndelete'
            disabled={isLoading}
          >
            {isLoading ? 'Đang xóa...' : (
              <>
                <MdDeleteForever />
                Xóa
              </>
            )}
          </button>
          <button 
            onClick={onClose} 
            className='btnhuy'
            disabled={isLoading}
          >
            <MdCancelPresentation />
            Hủy
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default XoaMauSac

// Same improvements can be applied to DungLuongLayout.js's restore functionality

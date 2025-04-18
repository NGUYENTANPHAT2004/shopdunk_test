/* eslint-disable react-hooks/exhaustive-deps */
import { Modal } from '../../../../components/Modal'
import { useState, useEffect } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

function UpdateSanPham ({
  isOpen,
  onClose,
  idsanpham,
  fetchData,
  setSelectedIds
}) {
  const [name, setname] = useState('')
  const [price, setprice] = useState('')
  const [image, setimage] = useState('')
  const [file, setFile] = useState(null)
  const [mota, setmota] = useState('')
  const [idtheloai, setIdtheloai] = useState('')
  
  // Thêm state cho dung lượng và màu sắc
  const [dungluongs, setDungluongs] = useState([])
  const [mausacs, setMausacs] = useState([])
  const [selectedDungluong, setSelectedDungluong] = useState('')
  const [selectedMausac, setSelectedMausac] = useState('')
  const [stockQuantity, setStockQuantity] = useState(0)
  const [loading, setLoading] = useState(false)
  const [currentStock, setCurrentStock] = useState(null)

  const fetchchitiet = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3005/getchitietspadmin/${idsanpham}`
      )
      const data = await response.json()
      if (response.ok) {
        setname(data.name)
        setmota(data.content)
        setprice(data.price)
        setimage(data.image)
        setIdtheloai(data.idloaisp)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (idsanpham && isOpen) {
      fetchchitiet()
    }
  }, [idsanpham, isOpen])
  
  useEffect(() => {
    if (idtheloai) {
      fetchDungluongs();
    }
  }, [idtheloai]);

  useEffect(() => {
    if (selectedDungluong) {
      fetchMausacs(selectedDungluong);
    } else {
      setMausacs([]);
      setSelectedMausac('');
    }
  }, [selectedDungluong]);
  
  useEffect(() => {
    if (idsanpham && selectedDungluong && selectedMausac) {
      fetchCurrentStock();
    }
  }, [idsanpham, selectedDungluong, selectedMausac]);

  const fetchDungluongs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3005/dungluong/${idtheloai}`);
      if (response.ok) {
        const data = await response.json();
        setDungluongs(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách dung lượng:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMausacs = async (dungluongId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3005/mausac/${dungluongId}`);
      if (response.ok) {
        const data = await response.json();
        setMausacs(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách màu sắc:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCurrentStock = async () => {
    try {
      const response = await fetch(`http://localhost:3005/stock/${idsanpham}/${selectedDungluong}/${selectedMausac}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentStock(data);
        // Nếu đã có tồn kho, sử dụng giá trị đó
        if (data && data.stock !== 'Không giới hạn') {
          setStockQuantity(data.stock);
        }
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin tồn kho:', error);
      setCurrentStock(null);
    }
  };

  const handelclose = () => {
    setname('')
    setmota('')
    setprice('')
    setimage('')
    setFile(null)
    setSelectedDungluong('')
    setSelectedMausac('')
    setStockQuantity(0)
    setCurrentStock(null)
    onClose()
  }

  const handelUpdate = async () => {
    // Validate input
    if (!name.trim()) {
      alert('Vui lòng nhập tên sản phẩm');
      return;
    }

    if (!price.trim() || isNaN(parseFloat(price))) {
      alert('Vui lòng nhập giá hợp lệ');
      return;
    }

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('content', mota)
      formData.append('price', price)
      if (file) {
        formData.append('image', file)
      }

      const response = await fetch(
        `http://localhost:3005/updatechitietsp/${idsanpham}`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (response.ok) {
        // Nếu đã chọn dung lượng và màu sắc, cập nhật tồn kho
        if (selectedDungluong && selectedMausac) {
          await updateStock(idsanpham, selectedDungluong, selectedMausac, stockQuantity);
        }
        
        handelclose()
        setSelectedIds([])
        fetchData()
      }
    } catch (error) {
      console.error(error)
    }
  }
  
  const updateStock = async (productId, dungluongId, mausacId, quantity) => {
    try {
      const response = await fetch('http://localhost:3005/stock/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          dungluongId,
          mausacId,
          quantity: parseInt(quantity, 10) || 0
        })
      });

      if (!response.ok) {
        console.error('Lỗi khi cập nhật tồn kho');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật tồn kho:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handelclose}>
      <div>
        <h2>Cập nhật sản phẩm</h2>
        <div className='div_input_group'>
          <div className='input-group'>
            <img src={image} alt='' />
          </div>
          <div className='input-group'>
            <label> Ảnh</label>
            <input
              type='file'
              onChange={e => {
                const file = e.target.files[0]
                if (file) {
                  setFile(file)
                  setimage(URL.createObjectURL(file))
                }
              }}
            />
            <label>Tên sản phẩm:</label>
            <input
              type='text'
              value={name}
              onChange={e => setname(e.target.value)}
              placeholder='Nhập tên sản phẩm'
            />
            <label>Giá sản phẩm:</label>
            <input
              type='text'
              value={price}
              onChange={e => setprice(e.target.value)}
              placeholder='Nhập đơn giá'
            />
            
            {/* Phần chọn dung lượng và màu sắc */}
            {dungluongs.length > 0 ? (
              <>
                <label>Dung lượng:</label>
                <select 
                  value={selectedDungluong}
                  onChange={e => setSelectedDungluong(e.target.value)}
                >
                  <option value="">-- Chọn dung lượng --</option>
                  {dungluongs.map(dl => (
                    <option key={dl._id} value={dl._id}>{dl.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <div className="info-message">
                Chưa có dung lượng nào cho thể loại này. Vui lòng thêm dung lượng trước.
              </div>
            )}
            
            {selectedDungluong && (
              <>
                {mausacs.length > 0 ? (
                  <>
                    <label>Màu sắc:</label>
                    <select 
                      value={selectedMausac}
                      onChange={e => setSelectedMausac(e.target.value)}
                    >
                      <option value="">-- Chọn màu sắc --</option>
                      {mausacs.map(ms => (
                        <option key={ms._id} value={ms._id}>{ms.name} - Giá: {parseInt(price) + parseInt(ms.price || 0)}đ</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <div className="info-message">
                    Chưa có màu sắc nào cho dung lượng này. Vui lòng thêm màu sắc trước.
                  </div>
                )}
              </>
            )}
            
            {selectedDungluong && selectedMausac && (
              <>
                <label>Số lượng tồn kho:</label>
                <input
                  type='number'
                  min="0"
                  value={stockQuantity}
                  onChange={e => setStockQuantity(e.target.value)}
                  placeholder='Nhập số lượng tồn kho'
                />
                {currentStock && (
                  <div className="stock-info">
                    <p>Tồn kho hiện tại: {currentStock.stock}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <label>Mô tả sản phẩm:</label>
        <ReactQuill
          value={mota}
          onChange={setmota}
          placeholder='Nhập mô tả sản phẩm'
          theme='snow'
        />

        <div className='button-group'>
          <button 
            className='btnaddtl' 
            onClick={handelUpdate}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default UpdateSanPham
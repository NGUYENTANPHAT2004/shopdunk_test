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
  
  // Biến State cho danh sách dung lượng và màu sắc của thể loại
  const [dungluongs, setDungluongs] = useState([])
  const [mausacs, setMausacs] = useState([])
  
  // Biến State cho biến thể đã chọn và đang chọn
  const [variantList, setVariantList] = useState([]) // Danh sách biến thể đã thêm
  const [currentVariant, setCurrentVariant] = useState({
    dungluong: '',
    mausac: '',
    stockQuantity: 0,
    isExisting: false, // Đánh dấu biến thể đã tồn tại trong DB
    stockId: null // ID của bản ghi tồn kho nếu đã tồn tại
  })
  
  const [loading, setLoading] = useState(false)
  const [editingVariantIndex, setEditingVariantIndex] = useState(-1)

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
        
        // Lấy danh sách dung lượng của thể loại
        await fetchDungluongs(data.idloaisp);
        
        // Lấy danh sách biến thể đã được chọn trước đó
        await fetchExistingVariants();
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false);
    }
  }

  // Fetch dung lượng theo thể loại
  const fetchDungluongs = async (categoryId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3005/dungluong/${categoryId || idtheloai}`);
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

  // Fetch màu sắc theo dung lượng
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

  // Lấy các biến thể đã được chọn trước đó cho sản phẩm
  const fetchExistingVariants = async () => {
    try {
      // Lấy danh sách tồn kho của sản phẩm
      const response = await fetch(`http://localhost:3005/stock/product/${idsanpham}`);
      if (response.ok) {
        const stockData = await response.json();
        
        if (stockData && stockData.stocks) {
          // Chuyển đổi dữ liệu tồn kho thành danh sách biến thể
          const variants = [];
          
          for (const stock of stockData.stocks) {
            if (stock.dungluongId && stock.mausacId) {
              // Lấy thông tin chi tiết về dung lượng và màu sắc
              const dlResponse = await fetch(`http://localhost:3005/geteditdl/${stock.dungluongId}`);
              const msResponse = await fetch(`http://localhost:3005/getchitietmausac/${stock.mausacId}`);
              
              let dungluongInfo = { name: 'Không xác định' };
              let mausacInfo = { name: 'Không xác định', price: 0 };
              
              if (dlResponse.ok) {
                dungluongInfo = await dlResponse.json();
              }
              
              if (msResponse.ok) {
                mausacInfo = await msResponse.json();
              }
              
              variants.push({
                dungluong: stock.dungluongId,
                dungluongName: dungluongInfo.name,
                mausac: stock.mausacId,
                mausacName: mausacInfo.name,
                price: mausacInfo.price || 0,
                stockQuantity: stock.unlimitedStock ? 0 : (stock.quantity || 0),
                unlimitedStock: stock.unlimitedStock || false,
                isExisting: true,
                stockId: stock._id
              });
            }
          }
          
          setVariantList(variants);
        }
      }
    } catch (error) {
      console.error('Lỗi khi lấy biến thể hiện có:', error);
    }
  };

  useEffect(() => {
    if (idsanpham && isOpen) {
      fetchchitiet()
    }
  }, [idsanpham, isOpen])
  
  // Fetch màu sắc khi dung lượng thay đổi
  useEffect(() => {
    if (currentVariant.dungluong) {
      fetchMausacs(currentVariant.dungluong);
    } else {
      setMausacs([]);
    }
  }, [currentVariant.dungluong]);
  
  const handleDungluongChange = (e) => {
    const dungluongId = e.target.value;
    // Tìm thông tin dung lượng từ danh sách
    const selectedDungluong = dungluongs.find(dl => dl._id === dungluongId);
    
    setCurrentVariant({
      ...currentVariant,
      dungluong: dungluongId,
      dungluongName: selectedDungluong ? selectedDungluong.name : '',
      mausac: '', // Reset màu sắc khi đổi dung lượng
      mausacName: '',
      price: 0
    });
  };

  const handleMausacChange = (e) => {
    const mausacId = e.target.value;
    // Tìm thông tin màu sắc từ danh sách
    const selectedMausac = mausacs.find(ms => ms._id === mausacId);
    
    setCurrentVariant({
      ...currentVariant,
      mausac: mausacId,
      mausacName: selectedMausac ? selectedMausac.name : '',
      price: selectedMausac ? selectedMausac.price : 0
    });
  };

  const clearVariantForm = () => {
    setCurrentVariant({
      dungluong: '',
      mausac: '',
      stockQuantity: 0,
      isExisting: false,
      stockId: null
    });
    setEditingVariantIndex(-1);
  }

  const addVariant = () => {
    // Kiểm tra nếu đang chỉnh sửa
    if (editingVariantIndex > -1) {
      const newList = [...variantList];
      newList[editingVariantIndex] = {...currentVariant};
      setVariantList(newList);
      setEditingVariantIndex(-1);
      clearVariantForm();
      return;
    }
    
    // Kiểm tra nếu đã có đủ thông tin
    if (!currentVariant.dungluong || !currentVariant.mausac) {
      alert('Vui lòng chọn đầy đủ dung lượng và màu sắc');
      return;
    }
    
    // Kiểm tra xem biến thể đã tồn tại chưa
    const exists = variantList.some(v => 
      v.dungluong === currentVariant.dungluong && 
      v.mausac === currentVariant.mausac
    );
    
    if (exists) {
      alert('Biến thể này đã được thêm vào danh sách');
      return;
    }
    
    // Lấy tên đầy đủ từ danh sách
    const dungluongInfo = dungluongs.find(dl => dl._id === currentVariant.dungluong);
    const mausacInfo = mausacs.find(ms => ms._id === currentVariant.mausac);
    
    // Thêm biến thể mới vào danh sách
    const newVariant = {
      ...currentVariant,
      dungluongName: dungluongInfo ? dungluongInfo.name : 'Không xác định',
      mausacName: mausacInfo ? mausacInfo.name : 'Không xác định',
      price: mausacInfo ? mausacInfo.price : 0
    };
    
    setVariantList([...variantList, newVariant]);
    clearVariantForm();
  };

  const editVariant = (index) => {
    setCurrentVariant({...variantList[index]});
    setEditingVariantIndex(index);
  };

  const removeVariant = (index) => {
    const newList = [...variantList];
    newList.splice(index, 1);
    setVariantList(newList);
  };

  const handelclose = () => {
    setname('')
    setmota('')
    setprice('')
    setimage('')
    setFile(null)
    setVariantList([])
    clearVariantForm()
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
    
    if (variantList.length === 0) {
      alert('Vui lòng thêm ít nhất một biến thể cho sản phẩm');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('content', mota)
      formData.append('price', price)
      if (file) {
        formData.append('image', file)
      }

      // Cập nhật thông tin cơ bản của sản phẩm
      const response = await fetch(
        `http://localhost:3005/updatechitietsp/${idsanpham}`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (response.ok) {
        // Cập nhật tồn kho cho từng biến thể
        for (const variant of variantList) {
          await fetch('http://localhost:3005/stock/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              productId: idsanpham,
              dungluongId: variant.dungluong,
              mausacId: variant.mausac,
              quantity: parseInt(variant.stockQuantity, 10) || 0,
              unlimitedStock: variant.unlimitedStock || false
            })
          });
        }
        
        handelclose();
        setSelectedIds([]);
        fetchData();
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật sản phẩm:', error);
      alert(`Lỗi: ${error.message || 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  }

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
            <label>Giá sản phẩm cơ bản:</label>
            <input
              type='text'
              value={price}
              onChange={e => setprice(e.target.value)}
              placeholder='Nhập đơn giá'
            />
          </div>
        </div>
        
        <label>Mô tả sản phẩm:</label>
        <ReactQuill
          value={mota}
          onChange={setmota}
          placeholder='Nhập mô tả sản phẩm'
          theme='snow'
        />
        
        {/* Phần biến thể */}
        <div className="variant-section" style={{marginTop: '20px'}}>
          <h3>Biến thể sản phẩm</h3>
          
          {/* Danh sách biến thể đã thêm */}
          {variantList.length > 0 && (
            <div className="variant-list">
              <h4>Danh sách biến thể:</h4>
              <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '20px'}}>
                <thead>
                  <tr>
                    <th style={{border: '1px solid #ddd', padding: '8px'}}>Dung lượng</th>
                    <th style={{border: '1px solid #ddd', padding: '8px'}}>Màu sắc</th>
                    <th style={{border: '1px solid #ddd', padding: '8px'}}>Giá thêm</th>
                    <th style={{border: '1px solid #ddd', padding: '8px'}}>Tồn kho</th>
                    <th style={{border: '1px solid #ddd', padding: '8px'}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {variantList.map((variant, index) => (
                    <tr key={index}>
                      <td style={{border: '1px solid #ddd', padding: '8px'}}>{variant.dungluongName}</td>
                      <td style={{border: '1px solid #ddd', padding: '8px'}}>{variant.mausacName}</td>
                      <td style={{border: '1px solid #ddd', padding: '8px'}}>{parseInt(variant.price).toLocaleString()}đ</td>
                      <td style={{border: '1px solid #ddd', padding: '8px'}}>
                        {variant.unlimitedStock ? 'Không giới hạn' : variant.stockQuantity}
                      </td>
                      <td style={{border: '1px solid #ddd', padding: '8px'}}>
                        <button 
                          onClick={() => editVariant(index)} 
                          style={{background: '#1890ff', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', marginRight: '5px'}}
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => removeVariant(index)} 
                          style={{background: '#ff4d4f', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer'}}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Form thêm biến thể */}
          <div className="add-variant-form" style={{marginTop: '10px', padding: '15px', border: '1px solid #e8e8e8', borderRadius: '5px'}}>
            <h4>{editingVariantIndex > -1 ? 'Cập nhật biến thể:' : 'Thêm biến thể mới:'}</h4>
            
            {/* Nếu đang cập nhật biến thể hiện có */}
            {editingVariantIndex > -1 ? (
              <div>
                <div style={{marginBottom: '15px'}}>
                  <label>Dung lượng:</label>
                  <input
                    type="text"
                    value={currentVariant.dungluongName}
                    readOnly
                    style={{width: '100%', padding: '8px', marginTop: '5px', backgroundColor: '#f5f5f5'}}
                  />
                </div>
                
                <div style={{marginBottom: '15px'}}>
                  <label>Màu sắc:</label>
                  <input
                    type="text"
                    value={currentVariant.mausacName}
                    readOnly
                    style={{width: '100%', padding: '8px', marginTop: '5px', backgroundColor: '#f5f5f5'}}
                  />
                </div>
                
                <div style={{marginBottom: '15px'}}>
                  <label>Giá thêm:</label>
                  <input
                    type="number"
                    value={currentVariant.price}
                    onChange={(e) => setCurrentVariant({...currentVariant, price: e.target.value})}
                    placeholder="Nhập giá thêm"
                    style={{width: '100%', padding: '8px', marginTop: '5px'}}
                    disabled={currentVariant.isExisting} // Không cho sửa giá nếu là biến thể đã tồn tại
                  />
                  {currentVariant.isExisting && (
                    <div style={{color: '#ff4d4f', fontSize: '12px', marginTop: '3px'}}>
                      *Không thể thay đổi giá biến thể đã tồn tại. Vui lòng cập nhật trong mục "Quản lý kho hàng".
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Chọn dung lượng */}
                <div style={{marginBottom: '15px'}}>
                  <label>Dung lượng:</label>
                  <select 
                    value={currentVariant.dungluong}
                    onChange={handleDungluongChange}
                    style={{width: '100%', padding: '8px', marginTop: '5px'}}
                  >
                    <option value="">-- Chọn dung lượng --</option>
                    {dungluongs.map(dl => (
                      <option key={dl._id} value={dl._id}>{dl.name}</option>
                    ))}
                  </select>
                  {dungluongs.length === 0 && (
                    <div style={{color: '#ff4d4f', marginTop: '5px', fontSize: '14px'}}>
                      Thể loại này chưa có dung lượng nào. Vui lòng thêm dung lượng cho thể loại trước.
                    </div>
                  )}
                </div>
                
                {/* Chọn màu sắc */}
                {currentVariant.dungluong && (
                  <div style={{marginBottom: '15px'}}>
                    <label>Màu sắc:</label>
                    <select 
                      value={currentVariant.mausac}
                      onChange={handleMausacChange}
                      style={{width: '100%', padding: '8px', marginTop: '5px'}}
                    >
                      <option value="">-- Chọn màu sắc --</option>
                      {mausacs.map(ms => (
                        <option key={ms._id} value={ms._id}>
                          {ms.name} - Giá: {parseInt(price) + parseInt(ms.price || 0)}đ
                        </option>
                      ))}
                    </select>
                    {mausacs.length === 0 && (
                      <div style={{color: '#ff4d4f', marginTop: '5px', fontSize: '14px'}}>
                        Dung lượng này chưa có màu sắc nào. Vui lòng thêm màu sắc cho dung lượng trước.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Số lượng tồn kho */}
            <div style={{marginBottom: '15px'}}>
              <label>Số lượng tồn kho:</label>
              <div style={{display: 'flex', alignItems: 'center', marginTop: '5px'}}>
                <input
                  type="number"
                  min="0"
                  value={currentVariant.stockQuantity}
                  onChange={(e) => setCurrentVariant({...currentVariant, stockQuantity: e.target.value})}
                  placeholder="Nhập số lượng tồn kho"
                  style={{flex: 1, padding: '8px'}}
                  disabled={currentVariant.unlimitedStock}
                />
                <div style={{marginLeft: '10px', display: 'flex', alignItems: 'center'}}>
                  <input
                    type="checkbox"
                    checked={currentVariant.unlimitedStock}
                    onChange={(e) => setCurrentVariant({...currentVariant, unlimitedStock: e.target.checked})}
                    id="unlimitedStock"
                  />
                  <label htmlFor="unlimitedStock" style={{marginLeft: '5px'}}>Không giới hạn</label>
                </div>
              </div>
            </div>
            
            {/* Nút thêm/cập nhật biến thể */}
            <button 
              onClick={addVariant}
              style={{background: '#1890ff', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer', borderRadius: '4px'}}
              disabled={(editingVariantIndex === -1 && (!currentVariant.dungluong || !currentVariant.mausac))}
            >
              {editingVariantIndex > -1 ? 'Cập nhật biến thể' : 'Thêm biến thể'}
            </button>
            
            {/* Nút hủy khi đang cập nhật */}
            {editingVariantIndex > -1 && (
              <button 
                onClick={clearVariantForm}
                style={{background: '#ff4d4f', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer', borderRadius: '4px', marginLeft: '10px'}}
              >
                Hủy cập nhật
              </button>
            )}
          </div>
        </div>

        <div className='button-group' style={{marginTop: '20px'}}>
          <button 
            className='btnaddtl' 
            onClick={handelUpdate}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Cập nhật sản phẩm'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default UpdateSanPham
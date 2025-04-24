import { Modal } from '../../../../components/Modal'
import { useState,useEffect  } from 'react'
import './AddTheLoai.scss'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
function AddTheLoai ({ isOpen, onClose, fetchdata }) {
  const [name, setname] = useState('')
  const [manhinh, setManhinh] = useState('')
  const [chip, setChip] = useState('')
  const [ram, setRam] = useState('')
  const [dungluong, setdungluong] = useState('')
  const [camera, setCamera] = useState('')
  const [pinsac, setpinsac] = useState('')
  const [hang, sethang] = useState('')
  const [congsac, setcongsac] = useState('')
  const [thongtin, sethongtin] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [khuyenmai, setkhuyenmai] = useState(0)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:3005/listcate')
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Lỗi khi fetch danh mục:', error)
      }
    }
    fetchCategories()
  }, [])

  // -----------------------------
  // 4. Hàm đệ quy "flatten" danh mục (nếu muốn hiển thị dạng dropdown đơn)
  // -----------------------------
  const flattenCategories = (arr, prefix = '') => {
    let result = []
    arr.forEach(cat => {
      // Thêm danh mục hiện tại
      result.push({
        _id: cat._id,
        name: prefix + cat.name
      })
      // Nếu có children, gọi đệ quy thêm
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategories(cat.children, prefix + '-- '))
      }
    })
    return result
  }
  const handelAddTheLoai = async () => {
    try {
      const response = await fetch('http://localhost:3005/postloaisp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          manhinh,
          chip,
          ram,
          dungluong,
          camera,
          pinsac,
          hang,
          congsac,
          thongtin,
          category: selectedCategory,
          khuyenmai
        })
      })
      if (response.ok) {
        alert('them thể loại thành công!');
        fetchdata(); // refresh data cha
        onClose();
      } else {
        const errData = await response.json();
        alert(`them thất bại: ${errData.message || ''}`);
      }
    } catch (error) {
      console.error(error)
    }
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className='addtheloai'>
        <h2>Thêm thể loại</h2>
        <div className='div_input_group'>
          <div className='input-group'>
            <input
              type='text'
              value={name}
              onChange={e => setname(e.target.value)}
              placeholder='Nhập tên thể loại'
            />
            <input
              type='text'
              value={manhinh}
              onChange={e => setManhinh(e.target.value)}
              placeholder='Nhập màn hình'
            />
            <input
              type='text'
              value={chip}
              onChange={e => setChip(e.target.value)}
              placeholder='Nhập chip'
            />
            <input
              type='text'
              value={ram}
              onChange={e => setRam(e.target.value)}
              placeholder='Nhập ram'
            />
            <input
              type='text'
              value={dungluong}
              onChange={e => setdungluong(e.target.value)}
              placeholder='Nhập dung lượng'
            />
          </div>
          <div className='input-group'>
            <input
              type='text'
              value={camera}
              onChange={e => setCamera(e.target.value)}
              placeholder='Nhập camera'
            />
            <input
              type='text'
              value={pinsac}
              onChange={e => setpinsac(e.target.value)}
              placeholder='Nhập pin'
            />
            <input
              type='text'
              value={congsac}
              onChange={e => setcongsac(e.target.value)}
              placeholder='Nhập cổng sạc'
            />
            <input
              type='text'
              value={hang}
              onChange={e => sethang(e.target.value)}
              placeholder='Nhập hàng'
            />
            <input
              type='number'
              value={khuyenmai}
              onChange={e => setkhuyenmai(e.target.value)}
              placeholder='Nhập khuyến mãi (%)'
            />
          </div>
        </div>
        <div className="select-group">
  <label>Chọn danh mục:</label>
  <select
    value={selectedCategory}
    onChange={e => setSelectedCategory(e.target.value)}
  >
    <option value="">-- Chọn danh mục --</option>
    {flattenCategories(categories).map(cat => (
      <option key={cat._id} value={cat._id}>
        {cat.name}
      </option>
    ))}
  </select>
</div>

        <label>Mô tả sản phẩm:</label>
        <ReactQuill
          value={thongtin}
          onChange={sethongtin}
          placeholder='Nhập mô tả sản phẩm'
          theme='snow'
        />
        <div className='button-group'>
          <button onClick={handelAddTheLoai} className='btnaddtl'>
            Thêm
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default AddTheLoai
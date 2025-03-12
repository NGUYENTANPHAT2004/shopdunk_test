/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import './CapNhatTheLoai.scss';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export function CapNhatTheLoai({ isOpen, onClose, idtheloai, fetchdata }) {
  const [name, setName] = useState('');
  const [manhinh, setManhinh] = useState('');
  const [chip, setChip] = useState('');
  const [ram, setRam] = useState('');
  const [dungluong, setDungluong] = useState('');
  const [camera, setCamera] = useState('');
  const [pinsac, setPinsac] = useState('');
  const [hang, setHang] = useState('');
  const [congsac, setCongsac] = useState('');
  const [thongtin, setThongtin] = useState('');
  const [khuyenmai, setkhuyenmai] = useState(0)

  // Thêm state cho category
  const [category, setCategory] = useState('');

  // State lưu danh sách category
  const [categories, setCategories] = useState([]);

  // Hàm đệ quy "flatten" danh mục, nếu bạn muốn hiển thị dạng dropdown đơn
  const flattenCategories = (arr, prefix = '') => {
    let result = [];
    arr.forEach((cat) => {
      result.push({
        _id: cat._id,
        name: prefix + cat.name,
      });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(
          flattenCategories(cat.children, prefix + '-- ')
        );
      }
    });
    return result;
  };

  // Lấy danh mục từ server
  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:3005/listcate'); 
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Lỗi fetch categories:', error);
    }
  };

  // Lấy thông tin chi tiết thể loại
  const fetchtheloai = async () => {
    try {
      const response = await fetch(`http://localhost:3005/getchitiettl/${idtheloai}`);
      const data = await response.json();
      if (response.ok) {
        setName(data.name || '');
        setManhinh(data.manhinh || '');
        setChip(data.chip || '');
        setRam(data.ram || '');
        setDungluong(data.dungluong || '');
        setCamera(data.camera || '');
        setPinsac(data.pinsac || '');
        setHang(data.hang || '');
        setCongsac(data.congsac || '');
        setThongtin(data.thongtin || '');
        setkhuyenmai(data.khuyenmai)
        // Lấy id category hiện tại của LoạiSP
        if (data.category) {
          setCategory(data.category);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Gọi fetch khi mở modal
  useEffect(() => {
    if (idtheloai && isOpen) {
      fetchtheloai();
      fetchCategories();
    }
  }, [idtheloai, isOpen]);

  // Hàm cập nhật
  const handleUpdate = async () => {
    try {
      const response = await fetch(`http://localhost:3005/putloaisp/${idtheloai}`, {
        method: 'POST', // hoặc 'PUT' tùy backend
        headers: {
          'Content-Type': 'application/json',
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
          category,
          khuyenmai // Gửi kèm ID category
        }),
      });

      if (response.ok) {
        alert('Cập nhật thể loại thành công!');
        fetchdata(); // refresh data cha
        onClose();
      } else {
        const errData = await response.json();
        alert(`Cập nhật thất bại: ${errData.message || ''}`);
      }
    } catch (error) {
      console.error(error);
      alert('Đã xảy ra lỗi!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-capnhat">
      <div className="modal-content-capnhat">
        <h2>Cập nhật thể loại</h2>
        <div className="div_input_group">
          <div className="input-group">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên thể loại"
            />
            <input
              type="text"
              value={manhinh}
              onChange={(e) => setManhinh(e.target.value)}
              placeholder="Nhập màn hình"
            />
            <input
              type="text"
              value={chip}
              onChange={(e) => setChip(e.target.value)}
              placeholder="Nhập chip"
            />
            <input
              type="text"
              value={ram}
              onChange={(e) => setRam(e.target.value)}
              placeholder="Nhập ram"
            />
            <input
              type="text"
              value={dungluong}
              onChange={(e) => setDungluong(e.target.value)}
              placeholder="Nhập dung lượng"
            />
          </div>

          <div className="input-group">
            <input
              type="text"
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              placeholder="Nhập camera"
            />
            <input
              type="text"
              value={pinsac}
              onChange={(e) => setPinsac(e.target.value)}
              placeholder="Nhập pin"
            />
            <input
              type="text"
              value={congsac}
              onChange={(e) => setCongsac(e.target.value)}
              placeholder="Nhập cổng sạc"
            />
            <input
              type="text"
              value={hang}
              onChange={(e) => setHang(e.target.value)}
              placeholder="Nhập hàng"
            />
            <input
              type='number'
              value={khuyenmai}
              onChange={e => setkhuyenmai(e.target.value)}
              placeholder='Nhập khuyến mãi (%)'
            />
          </div>
        </div>

        {/* Chọn danh mục */}
        <label>Chọn danh mục:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">-- Chọn danh mục --</option>
          {flattenCategories(categories).map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        <label>Mô tả sản phẩm:</label>
        <ReactQuill
          value={thongtin}
          onChange={setThongtin}
          placeholder="Nhập mô tả sản phẩm"
          theme="snow"
        />
        <div className="modal-actions">
          <button onClick={handleUpdate}>Cập nhật</button>
          <button onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}
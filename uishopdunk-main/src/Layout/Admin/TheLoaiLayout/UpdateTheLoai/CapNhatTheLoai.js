/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react'
import './CapNhatTheLoai.scss'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

export function CapNhatTheLoai ({ isOpen, onClose, idtheloai, fetchdata }) {
  const [name, setName] = useState('')
  const [manhinh, setManhinh] = useState('')
  const [chip, setChip] = useState('')
  const [ram, setRam] = useState('')
  const [dungluong, setdungluong] = useState('')
  const [camera, setCamera] = useState('')
  const [pinsac, setpinsac] = useState('')
  const [hang, sethang] = useState('')
  const [congsac, setcongsac] = useState('')
  const [thongtin, sethongtin] = useState('')

  const fetchtheloai = async () => {
    try {
      const response = await fetch(
        `http://localhost:3005/getchitiettl/${idtheloai}`
      )
      const data = await response.json()
      if (response.ok) {
        setName(data.name)
        setManhinh(data.manhinh)
        setChip(data.chip)
        setRam(data.ram)
        setdungluong(data.dungluong)
        setCamera(data.camera)
        setpinsac(data.pinsac)
        sethang(data.hang)
        setcongsac(data.congsac)
        sethongtin(data.thongtin)
      }
    } catch (error) {
      console.error(error)
    }
  }
  useEffect(() => {
    if (idtheloai && isOpen) {
      fetchtheloai()
    }
  }, [idtheloai, isOpen])

  const handleUpdate = async () => {
    try {
      const response = await fetch(
        `http://localhost:3005/putloaisp/${idtheloai}`,
        {
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
            thongtin
          })
        }
      )

      if (response.ok) {
        alert('Cập nhật thể loại thành công!')
        fetchdata()
        onClose()
      } else {
        alert('Cập nhật thất bại!')
      }
    } catch (error) {
      console.error(error)
      alert('Đã xảy ra lỗi!')
    }
  }

  if (!isOpen) return null

  return (
    <div className='modal-capnhat'>
      <div className='modal-content-capnhat'>
        <h2>Cập nhật thể loại</h2>
        <div className='div_input_group'>
          <div className='input-group'>
            <input
              type='text'
              value={name}
              onChange={e => setName(e.target.value)}
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
          </div>
        </div>

        <label>Mô tả sản phẩm:</label>
        <ReactQuill
          value={thongtin}
          onChange={sethongtin}
          placeholder='Nhập mô tả sản phẩm'
          theme='snow'
        />
        <div className='modal-actions'>
          <button onClick={handleUpdate}>Cập nhật</button>
          <button onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  )
}

import { Modal } from '../../../components/Modal'
import './ModalNhapThongTin.scss'
import { useState } from 'react'
function ModalNhapThongTin ({ isOpen, onClose, amount, product }) {
  const [name, setname] = useState('')
  const [phone, setphone] = useState('')
  const [diachi, setdiachi] = useState('')
  const [email, setemail] = useState('')
  const [bankCode, setBankCode] = useState('')
console.log(amount)
  const handlethanhtoan = async () => {
    try {
      const response = await fetch('http://localhost:8080/create_payment_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          phone,
          diachi,
          email,
          bankCode,
          amount,
          product,
          language:'vn'
        })
      })
      const data = await response.json()
      if (response.ok) {
        window.location.href = data
      } else {
        alert('Đã xảy ra lỗi. Vui lòng thử lại!')
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className='bodythanhtoan'>
        <h4>Thanh toán</h4>
        <input
          type='text'
          placeholder='Nhập họ và tên'
          value={name}
          onChange={e => setname(e.target.value)}
          className='inputthanhtoan'
        />
        <input
          type='text'
          placeholder='Nhập số điện thoại'
          value={phone}
          onChange={e => setphone(e.target.value)}
          className='inputthanhtoan'
        />
        <input
          type='text'
          placeholder='Nhập email'
          value={email}
          onChange={e => setemail(e.target.value)}
          className='inputthanhtoan'
        />
        <input
          type='text'
          placeholder='Nhập địa chỉ'
          value={diachi}
          onChange={e => setdiachi(e.target.value)}
          className='inputthanhtoan'
        />
        <div className='bankcode-select'>
          <label>Mã ngân hàng</label>
          <div className='manganhang'>
            <input
              type='radio'
              id='vnpay'
              name='bankCode'
              value=''
              checked={bankCode === ''}
              onChange={e => setBankCode(e.target.value)}
            />
            <label htmlFor='vnpay'>Cổng thanh toán VNPAYQR</label>
          </div>
          <div className='manganhang'>
            <input
              type='radio'
              id='vnbank'
              name='bankCode'
              value='VNBANK'
              checked={bankCode === 'VNBANK'}
              onChange={e => setBankCode(e.target.value)}
            />
            <label htmlFor='vnbank'>
              Thanh toán qua ATM-Tài khoản ngân hàng nội địa
            </label>
          </div>
          <div className='manganhang'>
            <input
              type='radio'
              id='intcard'
              name='bankCode'
              value='INTCARD'
              checked={bankCode === 'INTCARD'}
              onChange={e => setBankCode(e.target.value)}
            />
            <label htmlFor='intcard'>Thanh toán qua thẻ quốc tế</label>
          </div>
        </div>
        <button onClick={handlethanhtoan}>Thanh toán</button>
      </div>
    </Modal>
  )
}

export default ModalNhapThongTin

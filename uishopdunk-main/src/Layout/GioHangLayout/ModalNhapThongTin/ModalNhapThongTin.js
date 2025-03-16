import { Modal } from '../../../components/Modal'
import './ModalNhapThongTin.scss'
import { useState, useEffect } from 'react'

function ModalNhapThongTin ({
  isOpen,
  onClose,
  amount,
  sanphams,
  name,
  phone,
  sex,
  giaotannoi,
  address,
  ghichu,
  magiamgia
}) {
  const [bankCode, setBankCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [stockError, setStockError] = useState(null)
  const [isStockChecked, setIsStockChecked] = useState(false)

  // Check stock availability when modal opens
  useEffect(() => {
    if (isOpen && sanphams && sanphams.length > 0) {
      checkStockAvailability()
    }
  }, [isOpen, sanphams])

  // Function to check stock availability for all products in the cart
  const checkStockAvailability = async () => {
    setLoading(true)
    setStockError(null)
    setIsStockChecked(false)

    try {
      // Check stock for each product in the cart
      for (const item of sanphams) {
        const response = await fetch(`http://localhost:3005/stock/${item.idsp}/${item.dungluong}/${item.mausac}`)
        const stockInfo = await response.json()

        // If product has limited stock and quantity exceeds available stock
        if (!stockInfo.unlimitedStock && stockInfo.stock !== 'Không giới hạn' && stockInfo.stock < item.soluong) {
          setStockError({
            productId: item.idsp,
            available: stockInfo.stock,
            requested: item.soluong,
            message: `Sản phẩm không đủ số lượng trong kho. Hiện chỉ còn ${stockInfo.stock} sản phẩm.`
          })
          setIsStockChecked(true)
          setLoading(false)
          return
        }
      }

      // All products have sufficient stock
      setIsStockChecked(true)
      setLoading(false)
    } catch (error) {
      console.error('Error checking stock:', error)
      setStockError({
        message: 'Không thể kiểm tra tồn kho. Vui lòng thử lại sau.'
      })
      setIsStockChecked(true)
      setLoading(false)
    }
  }

  const handlethanhtoan = async () => {
    // If stock hasn't been checked yet, check it first
    if (!isStockChecked) {
      await checkStockAvailability()
      if (stockError) return // Don't proceed if there's a stock error
    }

    // Don't proceed if there's a stock error
    if (stockError) {
      alert(stockError.message)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3005/create_payment_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          phone,
          sex,
          giaotannoi,
          address,
          ghichu,
          magiamgia,
          bankCode,
          amount,
          sanphams,
          language:'vn'
        })
      })
      const data = await response.json()
      if (data.message) {
        alert(data.message)
      } else {
        window.location.href = data
      }
    } catch (error) {
      console.log(error)
      alert('Đã xảy ra lỗi khi thanh toán. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className='bodythanhtoan'>
        {stockError && (
          <div className='stock-error'>
            <p>{stockError.message}</p>
          </div>
        )}
        
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
        <button 
          className={`btndathang ${stockError || loading ? 'disabled' : ''}`} 
          onClick={handlethanhtoan}
          disabled={stockError || loading}
        >
          {loading ? 'Đang xử lý...' : 'Thanh toán'}
        </button>
      </div>
    </Modal>
  )
}

export default ModalNhapThongTin
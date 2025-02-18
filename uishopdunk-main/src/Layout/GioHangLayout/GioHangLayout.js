import './GioHangLayout.scss'
import { useState, useEffect } from 'react'
import { ModalNhapThongTin } from './ModalNhapThongTin'

function GioHangLayout() {
  const [cart, setCart] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [productid, setProductid] = useState([]) // Lưu ID của sản phẩm được chọn
  const [selected, setSelected] = useState([]) // Lưu trạng thái checkbox đã chọn
  const [selectAll, setSelectAll] = useState(false) // Lưu trạng thái của checkbox "Tất cả"

  useEffect(() => {
    const cartData = JSON.parse(localStorage.getItem('cart')) || []
    setCart(cartData)
    setSelected(new Array(cartData.length).fill(false)) // Tạo mảng trạng thái checkbox
  }, [])

  const handleSelectAll = () => {
    const newSelectAll = !selectAll // Đảo trạng thái của checkbox "Tất cả"
    setSelectAll(newSelectAll)
    setSelected(new Array(cart.length).fill(newSelectAll)) // Cập nhật trạng thái tất cả checkbox

    if (newSelectAll) {
      // Nếu chọn tất cả, lưu toàn bộ ID sản phẩm
      const allProductIds = cart.map(item => item._id)
      setProductid(allProductIds)
    } else {
      // Nếu bỏ chọn tất cả, xóa toàn bộ ID
      setProductid([])
    }
  }

  const handleCheckboxChange = index => {
    const newSelected = [...selected]
    newSelected[index] = !newSelected[index] // Đảo trạng thái checkbox cụ thể
    setSelected(newSelected)

    // Thêm hoặc xóa product ID dựa trên trạng thái checkbox
    const currentProductId = cart[index]._id
    if (newSelected[index]) {
      // Nếu được chọn, thêm ID vào mảng
      setProductid(prev => [...prev, currentProductId])
    } else {
      // Nếu bị bỏ chọn, loại bỏ ID khỏi mảng
      setProductid(prev => prev.filter(id => id !== currentProductId))
    }

    // Nếu tất cả checkbox con được chọn, thì chọn "Tất cả"
    const allSelected = newSelected.every(checked => checked === true)
    setSelectAll(allSelected)
  }

  // Tính tổng tiền của các sản phẩm đã chọn
  const totalPrice = cart.reduce((total, item, index) => {
    return selected[index] ? total + item.price : total // Chỉ cộng giá của sản phẩm được chọn
  }, 0)

  // Xử lý xóa sản phẩm
  const handleRemoveProduct = productId => {
    const updatedCart = cart.filter(item => item._id !== productId)
    setCart(updatedCart)
    setProductid(productid.filter(id => id !== productId))
    setSelected(new Array(updatedCart.length).fill(false)) // Cập nhật trạng thái checkbox
    setSelectAll(false) // Bỏ chọn trạng thái "Tất cả"

    // Cập nhật lại localStorage
    localStorage.setItem('cart', JSON.stringify(updatedCart))
  }

  return (
    <div style={{ marginTop: '70px' }}>
      <table className='tablenhap'>
        <thead className='theadnhap'>
          <tr>
            <td className='tdnhap'>
              <input
                type='checkbox'
                className='tatca'
                checked={selectAll}
                onChange={handleSelectAll} // Gọi hàm xử lý chọn tất cả
              />
            </td>
            <td className='tdnhap'>Ảnh</td>
            <td className='tdnhap'>Tên sản phẩm</td>
            <td className='tdnhap'>Chip</td>
            <td className='tdnhap'>Ram</td>
            <td className='tdnhap'>Dung lượng</td>
            <td className='tdnhap'>Đơn giá</td>
            <td className='tdnhap'>Hành động</td> {/* Cột thêm nút xóa */}
          </tr>
        </thead>
        <tbody className='tbodynhap'>
          {cart.length > 0 ? (
            cart.map((c, index) => (
              <tr key={c._id}>
                <td>
                  <input
                    type='checkbox'
                    checked={selected[index]} // Kiểm tra trạng thái checkbox
                    onChange={() => handleCheckboxChange(index)} // Xử lý chọn checkbox cụ thể
                  />
                </td>
                <td>
                  <img src={`${c.image}`} alt='' />
                </td>
                <td>{c.name}</td>
                <td>{c.chip}</td>
                <td>{c.ram}</td>
                <td>{c.dungluong}</td>
                <td>{c.price.toLocaleString()}</td>
                <td>
                  <button
                    className='btn-xoa'
                    onClick={() => handleRemoveProduct(c._id)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan='8'>Không có sản phẩm nào</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className='tongtienthanhtoan'>
        <h5>Tổng tiền: {totalPrice.toLocaleString()} đ</h5>
        <button className='btnthanhtoan' onClick={() => setIsOpen(true)}>
          Thanh toán
        </button>
      </div>
      <ModalNhapThongTin
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        amount={totalPrice}
        product={productid}
      />
    </div>
  )
}

export default GioHangLayout

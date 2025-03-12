/* eslint-disable react-hooks/exhaustive-deps */
import { ModalBig } from '../../../../components/ModalBig'
import { useState, useEffect } from 'react'
import './HoaDonChiTiet.scss'

function HoaDonChiTiet ({ isOpen, onClose, idhoadon }) {
  const [data, setdata] = useState([])

  const [loading, setloading] = useState(true)

  const fetchdata = async () => {
    if (idhoadon) {
      setloading(true)
      try {
        const response = await fetch(
          `http://localhost:3005/getchitiethd/${idhoadon}`
        )
        if (response.ok) {
          const data = await response.json()
          setdata(data)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setloading(false)
      }
    } else {
      setloading(false)
    }
  }

  useEffect(() => {
    if (idhoadon && isOpen) {
      fetchdata()
    }
  }, [idhoadon, isOpen])

  return (
    <ModalBig
      isOpen={isOpen}
      onClose={() => {
        onClose()
      }}
    >
      <div>
        <div className='hdchitiet_header'>
          <div className='hdchitiet_header_item'>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Tên khách hàng</label>
              <div className='hdchitiet_value'>{data.name}</div>
            </div>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Số điện thoại</label>
              <div className='hdchitiet_value'>{data.phone}</div>
            </div>
          </div>
          <div className='hdchitiet_header_item'>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Địa chỉ</label>
              <div className='hdchitiet_value'>{data.address}</div>
            </div>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Giới tính</label>
              <div className='hdchitiet_value'>{data.sex}</div>
            </div>
          </div>
          <div className='hdchitiet_header_item'>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Ghi chú</label>
              <div className='hdchitiet_value'>
                {data.ghichu ? data.ghichu : 'Không có'}
              </div>
            </div>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Mã giảm giá</label>
              <div className='hdchitiet_value'>
                {data.magiamgia ? data.magiamgia : 'Không có'}
              </div>
            </div>
          </div>
          <div className='hdchitiet_header_item'>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Ngày mua</label>
              <div className='hdchitiet_value'>
                {data.ngaymua ? data.ngaymua : 'Không có'}
              </div>
            </div>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Trạng thái thanh toán</label>
              <div className='hdchitiet_value'>
                {data.thanhtoan ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </div>
            </div>
          </div>
          <div className='hdchitiet_header_item'>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Trạng thái</label>
              <div className='hdchitiet_value'>
                {data.trangthai ? data.trangthai : 'Không có'}
              </div>
            </div>
            <div className='hdchitiet_item'>
              <label htmlFor=''>Tổng tiền</label>
              <div className='hdchitiet_value hdchitiet_tongtien'>
                {data.tongtien ? data.tongtien.toLocaleString() : 0}đ
              </div>
            </div>
          </div>
        </div>
        <table className='tablenhap'>
          <thead>
            <tr>
              <th>Tên sản phẩm</th>
              <th>Dung lượng</th>
              <th>Mã màu sắc</th>
              <th>Màu sắc</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan='6'>Đang tải dữ liệu...</td>
              </tr>
            ) : data.hoadonsanpham.length > 0 ? (
              data.hoadonsanpham.map((item, index) => (
                <tr key={index}>
                  <td>{item.namesanpham}</td>
                  <td>{item.dungluong}</td>
                  <td>{item.mausac}</td>
                  <td>
                    <div className='div_color_mausac'>
                      <div
                        className='color_mausac'
                        style={{ background: `${item.mausac}` }}
                      ></div>
                    </div>
                  </td>
                  <td>{item.soluong}</td>
                  <td>{item.price.toLocaleString()} VNĐ</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan='6'>không có sản phẩm</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ModalBig>
  )
}

export default HoaDonChiTiet

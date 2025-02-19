import './GioHangLayout.scss'
import { useState, useEffect } from 'react'
import { ModalNhapThongTin } from './ModalNhapThongTin'

function GioHangLayout () {
  const [cart, setCart] = useState([])

  useEffect(() => {
    const cartData = JSON.parse(localStorage.getItem('cart')) || []
    setCart(cartData)
  }, [])

  const callAPIsForEachObject = async cart => {
    try {
      // Gọi API cho từng object và gán kết quả
      const updatedData = await Promise.all(
        cart.map(async item => {
          const response = await fetch(
            `http://localhost:3005/getmausacgh/${item.iddungluong}`
          )
          if (!response.ok)
            throw new Error(`Lỗi khi gọi API với ${item.iddungluong}`)

          const data = await response.json()

          return {
            ...item,
            mangmausac: data
          }
        })
      )

      console.log('Dữ liệu sau khi gọi API:', updatedData)
      return updatedData
    } catch (error) {
      console.error('Lỗi khi gọi API:', error)
    }
  }

  useEffect(() => {
    if (cart) {
      callAPIsForEachObject(cart)
    }
  }, [cart])

  console.log(cart)

  return <div></div>
}

export default GioHangLayout
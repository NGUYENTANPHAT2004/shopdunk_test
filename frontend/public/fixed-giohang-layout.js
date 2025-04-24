/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/anchor-is-valid */
import './GioHangLayout.scss'
import { useState, useEffect, useReducer } from 'react'
import { ModalNhapThongTin } from './ModalNhapThongTin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartShopping } from '@fortawesome/free-solid-svg-icons'

// Action types for cart reducer
const CART_ACTIONS = {
  INITIALIZE: 'initialize',
  UPDATE_QUANTITY: 'update_quantity',
  REMOVE_ITEM: 'remove_item',
  UPDATE_COLOR: 'update_color',
  UPDATE_COLOR_OPTIONS: 'update_color_options'
}

// Cart reducer function
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.INITIALIZE:
      return action.payload

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { index, change } = action.payload
      const newCart = [...state]
      
      // Calculate new quantity
      const newQuantity = newCart[index].soluong + change
      
      // If quantity is 0 or less, remove the item
      if (newQuantity <= 0) {
        newCart.splice(index, 1)
      } else {
        newCart[index].soluong = newQuantity
      }
      
      // Update localStorage
      localStorage.setItem('cart', JSON.stringify(newCart))
      return newCart
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const newCart = state.filter((_, i) => i !== action.payload.index)
      localStorage.setItem('cart', JSON.stringify(newCart))
      return newCart
    }

    case CART_ACTIONS.UPDATE_COLOR: {
      const { index, mausac, price, colorId } = action.payload
      const newCart = [...state]
      newCart[index].mausac = mausac
      newCart[index].pricemausac = price
      newCart[index].idmausac = colorId
      
      // Update localStorage
      localStorage.setItem('cart', JSON.stringify(newCart))
      return newCart
    }

    case CART_ACTIONS.UPDATE_COLOR_OPTIONS: {
      const { index, colorOptions } = action.payload
      const newCart = [...state]
      newCart[index].mangmausac = colorOptions
      
      // Update localStorage
      localStorage.setItem('cart', JSON.stringify(newCart))
      return newCart
    }

    default:
      return state
  }
}

// Form reducer to handle form state
const formReducer = (state, action) => {
  switch (action.type) {
    case 'update_field':
      return { 
        ...state, 
        [action.field]: action.value,
        errors: {
          ...state.errors,
          [action.field]: '' // Clear error when field is updated
        }
      }
    case 'set_error':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.field]: action.error
        }
      }
    case 'reset_errors':
      return {
        ...state,
        errors: {
          name: '',
          phone: '',
          address: ''
        }
      }
    default:
      return state
  }
}

function GioHangLayout() {
  // Use reducers for complex state management
  const [cart, dispatchCart] = useReducer(cartReducer, [])
  const [formState, dispatchForm] = useReducer(formReducer, {
    sex: 'Anh',
    name: '',
    phone: '',
    giaotannoi: true,
    address: '',
    ghichu: '',
    magiamgia: '',
    errors: {
      name: '',
      phone: '',
      address: ''
    }
  })

  // UI states
  const [isOpenModaltt, setIsOpenModaltt] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  
  // Derived state
  const [sanphams, setSanphams] = useState([])
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.pricemausac * item.soluong,
    0
  )

  // Initialize cart from localStorage
  useEffect(() => {
    try {
      const cartData = JSON.parse(localStorage.getItem('cart')) || []
      dispatchCart({ 
        type: CART_ACTIONS.INITIALIZE, 
        payload: cartData 
      })
      
      if (cartData.length > 0) {
        fetchColorOptionsForCartItems(cartData)
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error loading cart data:', error)
      setApiError('Error loading cart data')
      setIsLoading(false)
    }
  }, [])

  // Update formatted products data for checkout when cart changes
  useEffect(() => {
    const formattedProducts = cart.map(item => ({
      idsp: item.idsanpham,
      soluong: item.soluong,
      price: item.pricemausac,
      dungluong: item.iddungluong,
      mausac: item.mausac,
      idmausac: item.idmausac,
    }))
    setSanphams(formattedProducts)
    
    // Also dispatch a cartUpdated event for other components
    window.dispatchEvent(new Event('cartUpdated'))
  }, [cart])

  // Fetch color options for all cart items in one batch
  const fetchColorOptionsForCartItems = async (cartItems) => {
    setIsLoading(true)
    setApiError('')
    
    try {
      await Promise.all(
        cartItems.map(async (item, index) => {
          try {
            const response = await fetch(
              `http://localhost:3005/getmausacgh/${item.iddungluong}`
            )
            
            if (!response.ok) {
              throw new Error(`Error fetching color options for ${item.namesanpham}`)
            }

            const colorOptions = await response.json()
            
            dispatchCart({ 
              type: CART_ACTIONS.UPDATE_COLOR_OPTIONS, 
              payload: { 
                index, 
                colorOptions: colorOptions.length > 0 ? colorOptions : [] 
              } 
            })
          } catch (error) {
            console.error('API Error:', error)
            dispatchCart({ 
              type: CART_ACTIONS.UPDATE_COLOR_OPTIONS, 
              payload: { index, colorOptions: [] } 
            })
          }
        })
      )
    } catch (error) {
      console.error('Error fetching color options:', error)
      setApiError('Error loading product information. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form field updates
  const handleInputChange = (field, value) => {
    dispatchForm({
      type: 'update_field',
      field,
      value
    })
  }

  // Validate phone number
  const validatePhone = (phone) => {
    const phoneRegex = /^(0|\+84)(\d{9,10})$/
    return phoneRegex.test(phone)
  }

  // Validate form before checkout
  const validateForm = () => {
    let isValid = true
    dispatchForm({ type: 'reset_errors' })

    if (!formState.name.trim()) {
      dispatchForm({
        type: 'set_error',
        field: 'name',
        error: 'Vui lòng nhập họ tên'
      })
      isValid = false
    }

    if (!formState.phone.trim()) {
      dispatchForm({
        type: 'set_error',
        field: 'phone',
        error: 'Vui lòng nhập số điện thoại'
      })
      isValid = false
    } else if (!validatePhone(formState.phone)) {
      dispatchForm({
        type: 'set_error',
        field: 'phone',
        error: 'Số điện thoại không hợp lệ'
      })
      isValid = false
    }

    if (!formState.address.trim()) {
      dispatchForm({
        type: 'set_error',
        field: 'address',
        error: 'Vui lòng nhập địa chỉ'
      })
      isValid = false
    }

    return isValid
  }

  // Handle checkout button click
  const handleCheckout = () => {
    if (validateForm()) {
      setIsOpenModaltt(true)
    }
  }

  // Handle quantity changes
  const handleQuantityChange = (index, change) => {
    dispatchCart({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { index, change }
    })
  }

  // Handle color selection
  const handleColorChange = (index, selectedColor, newPrice, colorId) => {
    dispatchCart({
      type: CART_ACTIONS.UPDATE_COLOR,
      payload: { 
        index, 
        mausac: selectedColor, 
        price: newPrice, 
        colorId 
      }
    })
  }

  // Render error message
  const renderErrorMessage = (fieldName) => {
    return formState.errors[fieldName] ? (
      <div className="error-message">{formState.errors[fieldName]}</div>
    ) : null
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="giohang_container loading">
        <div className="loading-spinner"></div>
        <p>Đang tải thông tin giỏ hàng...</p>
      </div>
    )
  }

  // Render API error
  if (apiError) {
    return (
      <div className="giohang_container error">
        <div className="error-message">
          <p>{apiError}</p>
          <button onClick={() => window.location.reload()}>Thử lại</button>
        </div>
      </div>
    )
  }

  // Render empty cart
  if (cart.length === 0) {
    return (
      <div className='giohang_container'>
        <div className='giohang_no'>
          <div className='giohang_no_icon'>
            <FontAwesomeIcon icon={faCartShopping} />
          </div>
          <div className='div_giohang_no_text'>
            <span className='giohang_no_text'>Giỏ hàng của bạn chưa có</span>
            <span className='giohang_no_text'>sản phẩm nào!</span>
          </div>
          <div>
            <p className='p_hotro'>
              Hỗ trợ: <a href='tel:1900.6626'>1900.6626 </a> (08h00 - 22h00)
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render cart with items
  return (
    <div className='giohang_container'>
      <div className='giohang_header_container'>
        {cart.map((item, index) => (
          <div className='giohang_header' key={`cart-item-${index}`}>
            <div className='giohang_header_top'>
              <div className='giohang_header_top_left'>
                <img
                  src={item.imgsanpham}
                  alt={item.namesanpham}
                  width={100}
                  height={110}
                />
              </div>
              <div className='giohang_header_top_right'>
                <div className='giohang_header_top_right_top'>
                  <span>{item.namesanpham}</span>
                  <div className='mausac_container'>
                    {item.mangmausac &&
                      item.mangmausac.map((mausac, row) => (
                        <div
                          className={
                            item.mausac === mausac.name
                              ? `border_mausac border_mausac1`
                              : `border_mausac`
                          }
                          key={`color-${index}-${row}`}
                          onClick={() =>
                            handleColorChange(index, mausac.name, mausac.price, mausac._id)
                          }
                          title={mausac.name}
                          role="button"
                          aria-label={`Chọn màu ${mausac.name}`}
                          aria-pressed={item.mausac === mausac.name}
                        >
                          <div
                            style={{ backgroundColor: `${mausac.name}` }}
                          ></div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className='giohang_header_top_right_bottom'>
                  <span>
                    {(item.pricemausac * item.soluong).toLocaleString()}đ
                  </span>
                  <div className='quantity'>
                    <button
                      className='quantity_minus'
                      onClick={() => handleQuantityChange(index, -1)}
                      aria-label="Giảm số lượng"
                    >
                      -
                    </button>
                    <div className='quantity_number'>{item.soluong}</div>
                    <button
                      className='quantity_plus'
                      onClick={() => handleQuantityChange(index, 1)}
                      aria-label="Tăng số lượng"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className='giohang_header_bottom'>
          <div className='giohang_header_bottom_left'>
            <span>
              <strong>Tạm tính </strong>({cart.length} sản phẩm)
            </span>
          </div>
          <div className='giohang_header_bottom_right'>
            <span>{totalPrice.toLocaleString()}đ</span>
          </div>
        </div>
      </div>
      
      <div className='giohang_content_container'>
        <h2>Thông tin khách hàng</h2>
        <div className='giohang_thongtin_sex'>
          <div className='giohang_thongtin_sex_item'>
            <input
              type='radio'
              id="sex-anh"
              name="sex"
              checked={formState.sex === 'Anh'}
              onChange={() => handleInputChange('sex', 'Anh')}
            />
            <label htmlFor='sex-anh'>Anh</label>
          </div>
          <div className='giohang_thongtin_sex_item'>
            <input
              type='radio'
              id="sex-chi"
              name="sex"
              checked={formState.sex === 'Chị'}
              onChange={() => handleInputChange('sex', 'Chị')}
            />
            <label htmlFor='sex-chi'>Chị</label>
          </div>
        </div>
        <div className='giohang_thongtin_input'>
          <div className='div_thongtin_input'>
            <input
              type='text'
              id="input-name"
              className={`input_giohang ${formState.errors.name ? 'error' : ''}`}
              placeholder='Họ và tên'
              value={formState.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              aria-required="true"
            />
            {renderErrorMessage('name')}
          </div>
          <div className='div_thongtin_input'>
            <input
              type='tel'
              id="input-phone"
              className={`input_giohang ${formState.errors.phone ? 'error' : ''}`}
              placeholder='Số điện thoại'
              value={formState.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              aria-required="true"
            />
            {renderErrorMessage('phone')}
          </div>
        </div>
      </div>
      
      <div className='giohang_content_container'>
        <h2>Hình thức nhận hàng</h2>
        <div className='giohang_thongtin_sex'>
          <div className='giohang_thongtin_sex_item'>
            <input
              type='radio'
              id="delivery-option"
              name="delivery"
              checked={formState.giaotannoi}
              onChange={() => handleInputChange('giaotannoi', true)}
            />
            <label htmlFor='delivery-option'>Giao tận nơi</label>
          </div>
        </div>
        <div className='giohang_thongtin_input'>
          <div className='div_thongtin_input'>
            <input
              type='text'
              id="input-address"
              className={`input_giohang ${formState.errors.address ? 'error' : ''}`}
              placeholder='Địa chỉ cụ thể'
              value={formState.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              aria-required="true"
            />
            {renderErrorMessage('address')}
          </div>
        </div>
        <div className='giohang_thongtin_input'>
          <div className='div_thongtin_input'>
            <input
              type='text'
              id="input-note"
              className='input_giohang'
              placeholder='Ghi chú (nếu có)'
              value={formState.ghichu}
              onChange={(e) => handleInputChange('ghichu', e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className='giohang_content_container'>
        <h2>Sử dụng mã giảm giá</h2>
        <div className='giohang_thongtin_input'>
          <div className='div_thongtin_input'>
            <input
              type='text'
              id="input-discount"
              className='input_giohang'
              placeholder='Mã giảm giá'
              value={formState.magiamgia}
              onChange={(e) => handleInputChange('magiamgia', e.target.value)}
            />
          </div>
        </div>
        <div className='giohang_thongtin_tongtien'>
          <div className='div_thongtin_tongtien'>
            <span>Tổng tiền:</span>
          </div>
          <div className='div_thongtin_tongtien'>
            <span className='thongtin_tongtien'>
              {totalPrice.toLocaleString()}đ
            </span>
          </div>
        </div>
      </div>
      
      <div className='giohang_content_container'>
        <button 
          className='btndathang' 
          onClick={handleCheckout}
          disabled={isLoading}
        >
          Tiến hành đặt hàng
        </button>
        <div className='div_text_hinhthuc'>
          Bạn có thể lựa chọn các hình thức thanh toán ở bước sau
        </div>
      </div>
      
      <ModalNhapThongTin
        isOpen={isOpenModaltt}
        onClose={() => setIsOpenModaltt(false)}
        amount={totalPrice}
        name={formState.name}
        phone={formState.phone}
        sex={formState.sex}
        giaotannoi={formState.giaotannoi}
        address={formState.address}
        ghichu={formState.ghichu}
        magiamgia={formState.magiamgia}
        sanphams={sanphams}
      />
    </div>
  )
}

export default GioHangLayout
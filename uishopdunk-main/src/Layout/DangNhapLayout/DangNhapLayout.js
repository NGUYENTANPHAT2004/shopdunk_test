import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './DangNhapLayout.scss'
import { useState } from 'react'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useUserContext } from '../../context/Usercontext'
import FacebookLogin from "react-facebook-login"

function DangNhap() {
  const [showPassword, setShowPassword] = useState(false)
  const { loginWithSocial } = useUserContext()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  const validate = () => {
    const { username, password } = formData
    let isValid = true

    if (!username.trim()) {
      toast.error('Vui lòng nhập tên đăng nhập', { position: 'top-right', autoClose: 2000 })
      isValid = false
    }

    if (!password.trim()) {
      toast.error('Vui lòng nhập mật khẩu', { position: 'top-right', autoClose: 2000 })
      isValid = false
    }
    return isValid
  }
  
  const handleFacebookResponse = (response) => {
    if (response.accessToken) {
      loginWithSocial('facebook', response.accessToken);
    }
  };

  // Xử lý đăng nhập Google
  const handleGoogleSuccess = (credentialResponse) => {
    if (credentialResponse.credential) {
      loginWithSocial('google', credentialResponse.credential);
    }
  };
  
  const handleRegister = async () => {
    try {
      if (!validate()) return

      const response = await fetch('http://localhost:3005/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'dang nhap that bai')
      }

      toast.success('Đăng nhap thành công!', { position: 'top-right', autoClose: 2000 })
      setTimeout(() => {
        window.location.href = '/login'
      }, 2500)

    } catch (error) {
      toast.error(error.message, { position: 'top-right', autoClose: 2000 })
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className='login_container'>
      <ToastContainer />
      <div className='login_main'>
        <div className='login_left'>
          <video autoPlay muted loop playsInline>
            <source src='/video.mp4' type='video/mp4' />
            Trình duyệt của bạn không hỗ trợ video.
          </video>
        </div>
        
        <div className='login_right'>
          <div className='login_logo'>
            <img src='/logo2.png' alt='logo' />
            <h2>ĐĂNG NHẬP TÀI KHOẢN</h2>
          </div>

          <div className='login_input'>
            <label>Tài khoản</label>
            <div className='divinput_login'>
              <input
                type='text'
                name='username'
                placeholder='Nhập tên đăng nhập'
                value={formData.username}
                onChange={handleInputChange}
                autoComplete='off'
              />
            </div>
          </div>

          <div className='login_input'>
            <label>Mật khẩu</label>
            <div className='divinput_login'>
              <input
                type={showPassword ? 'text' : 'password'}
                name='password'
                placeholder='Nhập mật khẩu'
                value={formData.password}
                onChange={handleInputChange}
                autoComplete='new-password'
              />
              <FontAwesomeIcon
                icon={showPassword ? faEyeSlash : faEye}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>
          <div className='login_button'>
            <button onClick={handleRegister}>Đăng Ký</button>
          </div>
          <div className="social-login">
            <FacebookLogin
              appId="1851667402259732"
              autoLoad={false}
              fields="name,email"
              callback={handleFacebookResponse}
              cssClass="facebook-btn"
              textButton="Đăng nhập với Facebook"
            />
            
            <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.log('Google Login Failed')}
                useOneTap
              />
            </GoogleOAuthProvider>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DangNhap
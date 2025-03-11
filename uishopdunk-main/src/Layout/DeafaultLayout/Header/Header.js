import React, { useState, useEffect } from 'react'
import './Header.scss'
import { useNavigate } from 'react-router-dom'
import { FaSearch } from 'react-icons/fa'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBagShopping, faUser } from '@fortawesome/free-solid-svg-icons'
import { Link } from "react-router-dom"
import { useUserContext } from '../../../context/Usercontext'

const Header = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [itemCount, setItemCount] = useState(0)
  const [isUserHovered, setIsUserHovered] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const { getUser, logout, user } = useUserContext()
  const [username, setUsername] = useState(null);
  const navigate = useNavigate()

  useEffect(() => {
    setUsername(getUser());
  }, [user])
  useEffect(() => {
    const updateUser = () => setUsername(getUser());
  
    window.addEventListener("userLogout", updateUser);
  
    return () => {
      window.removeEventListener("userLogout", updateUser);
    };
  }, []);
  
  
  const updateCartCount = () => {
    const cart = localStorage.getItem('cart')
    setItemCount(cart ? JSON.parse(cart).length : 0)
  }

  useEffect(() => {
    updateCartCount()

    const handleCartChange = () => updateCartCount()
    window.addEventListener('cartUpdated', handleCartChange)

    return () => {
      window.removeEventListener('cartUpdated', handleCartChange)
    }
  }, [])

  const handleSearch = () => {
    if (searchKeyword.trim() !== '') {
      navigate(`/search/${encodeURIComponent(searchKeyword)}`)
      setIsSearchExpanded(false)
    }
  }

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserHovered && !event.target.closest('.user-container')) {
        setIsUserHovered(false);
      }
      if (isSearchExpanded && !event.target.closest('.header-right') && !event.target.closest('.search-toggle')) {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isUserHovered, isSearchExpanded]);

  return (
    <div className='header-container'>
      <div className='header-controls'>
        <div className={`header-search ${isSearchExpanded ? 'expanded' : ''}`}>
          <input
            type='text'
            className='search-input'
            placeholder='Tìm kiếm'
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className='search-button' onClick={handleSearch}>
            <FaSearch style={{ color: '#fff', fontSize: '20px' }} />
          </button>
          
          {/* Mobile search toggle button */}
          <button className='search-toggle' onClick={toggleSearch}>
            <FaSearch className='search-toggle-icon' />
          </button>
        </div>

        <Link to="/cart" className='cart-container'>
          <FontAwesomeIcon icon={faBagShopping} className='cart-icon' />
          {itemCount > 0 && <span className='cart-badge'>{itemCount}</span>}
        </Link>
        
        <div
          className='user-container'
          onClick={() => setIsUserHovered(!isUserHovered)}
        >
          {!username ? (
            <FontAwesomeIcon icon={faUser} className='user-icon' />
          ) : (
            <div className='auth-username'>{username}</div>
          )}

          {isUserHovered && (
            <div className='auth-dropdown'>
              {username ? (
                <button onClick={logout} className='auth-link'>Đăng xuất</button>
              ) : (
                <>
                  <Link to='/login' className='auth-link'>Đăng nhập</Link>
                  <Link to='/register' className='auth-link'>Đăng ký</Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header
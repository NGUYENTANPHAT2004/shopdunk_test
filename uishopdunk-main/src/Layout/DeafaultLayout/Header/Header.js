import React, { useState, useEffect } from 'react'
import './Header.scss'
import { useNavigate } from 'react-router-dom'
import { FaSearch, FaTicketAlt, FaBell } from 'react-icons/fa'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBagShopping, faUser, faBars } from '@fortawesome/free-solid-svg-icons'
import { Link } from "react-router-dom"
import { useUserContext } from '../../../context/Usercontext'
import { ToastContainer, toast } from 'react-toastify'
import VoucherModal from '../../../components/VoucherModal/VoucherModal'
import VoucherNotification from '../../../notifi/VoucherNotification'
import WelcomeVoucher from '../../../notifi/WelcomeVoucher'

const Header = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [itemCount, setItemCount] = useState(0)
  const [isUserHovered, setIsUserHovered] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const { getUser, getUserPhone, logout, welcomeVoucher, dismissWelcomeVoucher } = useUserContext()
  const [username, setUsername] = useState(null)
  const [userPhone, setUserPhone] = useState(null)
  const [hasNewVouchers, setHasNewVouchers] = useState(false)
  const [lastVoucherCheck, setLastVoucherCheck] = useState(0)
  const navigate = useNavigate()

  // Initialize user data
  useEffect(() => {
    const user = getUser();
    setUsername(user);
    
    // Get phone from localStorage directly
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const phone = userData?.phone || userData?.user?.phone;
        setUserPhone(phone);
        console.log("Found user phone:", phone);
        // Check for new vouchers if phone exists
        if (phone) {
          checkForNewVouchers(phone);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, [])
  
  // Update user data when logout event occurs
  useEffect(() => {
    const updateUser = () => {
      const user = getUser();
      setUsername(user);
      
      // Update phone when user changes
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          const phone = userData?.phone || userData?.user?.phone;
          setUserPhone(phone);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      } else {
        setUserPhone(null);
      }
    };
  
    window.addEventListener("userLogout", updateUser);
  
    return () => {
      window.removeEventListener("userLogout", updateUser);
    };
  }, []);
  
  // Check for new vouchers with reduced frequency
  useEffect(() => {
    if (!userPhone) return;
    
    console.log("Setting up voucher checking for phone:", userPhone);
    
    // Initial check if we haven't checked recently
    const now = Date.now();
    if (now - lastVoucherCheck > 15 * 60 * 1000) { // 15 minutes between checks
      checkForNewVouchers(userPhone);
    }
    
    // Set up interval for checking (every 15 minutes instead of 5)
    const intervalId = setInterval(() => {
      checkForNewVouchers(userPhone);
    }, 15 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [userPhone, lastVoucherCheck]);
  
  // Check for new vouchers with throttling
  const checkForNewVouchers = async (phone) => {
    try {
      // Prevent checking too frequently
      const now = Date.now();
      if (now - lastVoucherCheck < 15 * 60 * 1000) { // 15 minutes throttle
        console.log("Skipping voucher check - checked recently");
        return;
      }
      
      setLastVoucherCheck(now);
      console.log("Checking for new vouchers for phone:", phone);
      
      const response = await fetch(`http://localhost:3005/checknewvouchers/${phone}`);
      const data = await response.json();
      
      if (response.ok && data.hasNewVouchers) {
        console.log("Found new vouchers:", data.vouchers);
        setHasNewVouchers(true);
      }
    } catch (error) {
      console.error('Error checking for new vouchers:', error);
    }
  };
  
  // Update cart count
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
  
  const closeSearch = () => {
    setIsSearchExpanded(false)
  }
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  
  const openVoucherModal = () => {
    if (username) {
      if (userPhone) {
        setIsVoucherModalOpen(true);
        // Reset new vouchers notification when modal is opened
        setHasNewVouchers(false);
      } else {
        toast.warning('Không tìm thấy thông tin số điện thoại của bạn', {
          position: "top-right",
          autoClose: 3000
        });
      }
    } else {
      toast.info('Vui lòng đăng nhập để xem mã giảm giá của bạn', {
        position: "top-right",
        autoClose: 3000
      });
      setTimeout(() => navigate('/login'), 1000);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserHovered && !event.target.closest('.user-container')) {
        setIsUserHovered(false);
      }
      if (isMenuOpen && !event.target.closest('.menu-container') && !event.target.closest('.menu-toggle')) {
        setIsMenuOpen(false);
      }
    };

    // Handle ESC key to close search
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isSearchExpanded) {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isUserHovered, isSearchExpanded, isMenuOpen]);

  return (
    <div className='header-container'>
      <ToastContainer />
      <div className='header-controls'>
        <div className={`header-search ${isSearchExpanded ? 'expanded' : ''}`}>
          <input
            type='text'
            className='search-input'
            placeholder='Tìm kiếm'
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus={isSearchExpanded}
          />
          <button className='search-button' onClick={isSearchExpanded ? handleSearch : closeSearch}>
            {isSearchExpanded ? (
              <FaSearch style={{ color: '#333', fontSize: '20px' }} />
            ) : (
              <FaSearch style={{ color: '#fff', fontSize: '20px' }} />
            )}
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
                <>
                  <button onClick={openVoucherModal} className='auth-link voucher-link'>
                    Mã giảm giá
                    {hasNewVouchers && <span className='notification-dot'></span>}
                  </button>
                  <Link to="/orders" className='auth-link'>Đơn hàng</Link>
                  <button onClick={logout} className='auth-link'>Đăng xuất</button>
                </>
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
      
      {/* Voucher Components */}
      <VoucherModal 
        isOpen={isVoucherModalOpen} 
        onClose={() => setIsVoucherModalOpen(false)}
        phone={userPhone}
      />
      
      {/* Voucher Notification for logged-in users */}
      {username && userPhone && (
        <VoucherNotification 
          phone={userPhone} 
          onVoucherClick={openVoucherModal}
        />
      )}
      
      {/* Welcome Voucher for new registrations */}
      {welcomeVoucher && (
        <WelcomeVoucher 
          voucher={welcomeVoucher} 
          onClose={dismissWelcomeVoucher}
        />
      )}
    </div>
  )
}

export default Header
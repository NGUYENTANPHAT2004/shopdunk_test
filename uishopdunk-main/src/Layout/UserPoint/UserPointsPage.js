import React, { useState, useEffect, useRef } from 'react';
import './UserPointsPage.scss';
import { Helmet } from 'react-helmet';
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong';
import { useUserContext } from '../../context/Usercontext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faGift, faHistory, faCoins, faCrown, faInfoCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/vi';
import RedemptionDetailModal from './RedemptionDetailModal';
import VoucherResultModal from './VoucherResultModal';

moment.locale('vi');
const UserPointsPage = () => {
  const { getUser, getUserPoints, refreshPoints } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [redemptionOptions, setRedemptionOptions] = useState([]);
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [loadingRedeem, setLoadingRedeem] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isFetchingRef = useRef(false);
  const hasPointsDataRef = useRef(false);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [voucherDetails, setVoucherDetails] = useState(null);
  const [currentVoucher, setCurrentVoucher] = useState(null);
  // Get user information from context and localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoggedIn(true);

        // Check and set points from context if available
        const contextPoints = getUserPoints();
        if (contextPoints) {
          setUserPoints(contextPoints);
          hasPointsDataRef.current = true;
          setLoading(false);
        } else {
          // Only refresh points if no data exists
          refreshPoints();
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []); // Only run once when component mounts

  // Fetch user points data with user ID
  useEffect(() => {
    // Don't fetch if not logged in, data already exists, or fetch in progress
    if (!isLoggedIn || hasPointsDataRef.current || isFetchingRef.current) return;

    const fetchUserPoints = async () => {
      try {
        setLoading(true);
        isFetchingRef.current = true;
        
        // Extract user ID from localStorage - only using user ID now
        const storedUser = localStorage.getItem('user');
        let userId = null;
        
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            // Try all possible paths to get userId
            userId = userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        if (!userId) {
          console.error('User ID not found in localStorage');
          setLoading(false);
          isFetchingRef.current = false;
          return;
        }
        
        // Get points using only user ID
        const response = await axios.get(`http://localhost:3005/loyalty/user-points/${userId}`);
        
        if (response.data.success) {
          if (response.data.hasPoints) {
            setUserPoints(response.data.points);
            hasPointsDataRef.current = true;
          } else {
            setUserPoints({
              totalPoints: 0,
              availablePoints: 0,
              tier: 'standard',
              yearToDatePoints: 0,
              history: []
            });
          }
        } else {
          toast.error('Lỗi khi tải thông tin điểm thưởng');
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
        toast.error('Lỗi khi tải thông tin điểm thưởng');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchUserPoints();
  }, [isLoggedIn, user]);

  // Fetch redemption options - using user ID only
  useEffect(() => {
    if (!isLoggedIn || !userPoints) return;
    
    const fetchRedemptionOptions = async () => {
      try {
        // Get user ID for the query
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
        
        console.log('Fetching redemption options for userId:', userId);
        
        if (!userId) {
          console.error('Cannot fetch redemption options: User ID not found');
          return;
        }
        
        // Create query params with user ID and tier
        const queryParams = new URLSearchParams();
        if (userPoints?.tier) {
          queryParams.append('tier', userPoints.tier);
        }
        queryParams.append('userId', userId);
        
        console.log('Request URL:', `http://localhost:3005/loyalty/redemption-options?${queryParams.toString()}`);
        
        const response = await axios.get(`http://localhost:3005/loyalty/redemption-options?${queryParams.toString()}`);
        
        console.log('API Response:', response.data);
        
        if (response.data.success) {
          console.log('Setting redemption options:', response.data.redemptionOptions);
          setRedemptionOptions(response.data.redemptionOptions || []);
        } else {
          console.error('API returned success: false');
        }
      } catch (error) {
        console.error('Error fetching redemption options:', error);
        
        // Log more details about the error
        if (error.response) {
          console.error('Error response data:', error.response.data);
          console.error('Error response status:', error.response.status);
        }
      }
    };

    fetchRedemptionOptions();
  }, [isLoggedIn, userPoints]);

  // Fetch redemption history - using user ID only
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchRedemptionHistory = async () => {
      try {
        // Get user ID from localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
        
        if (!userId) {
          console.error('Cannot fetch redemption history: User ID not found');
          return;
        }
        
        const response = await axios.get(`http://localhost:3005/loyalty/redemption-history/${userId}`);

        if (response.data.success) {
          setRedemptionHistory(response.data.history || []);
        }
      } catch (error) {
        console.error('Error fetching redemption history:', error);
      }
    };

    fetchRedemptionHistory();
  }, [isLoggedIn]); // Only depend on login status

  // Improved handleRedeem function using only User ID
  const handleRedeem = async (redemptionId) => {
    if (loadingRedeem) {
      return; // Prevent multiple submissions
    }

    // Get user ID from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
    
    if (!userId) {
      toast.error('Không thể xác định ID người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    // Find redemption option information
    const option = redemptionOptions.find(opt => opt._id === redemptionId);
    if (!option) {
      toast.error('Không tìm thấy thông tin quà đổi điểm');
      return;
    }
    
    // Check if user has enough points
    if (userPoints.availablePoints < option.pointsCost) {
      toast.error(`Bạn cần ${option.pointsCost} điểm để đổi quà này. Hiện bạn chỉ có ${userPoints.availablePoints} điểm khả dụng.`);
      return;
    }

    // Confirm redemption
    if (!window.confirm(`Bạn có chắc chắn muốn đổi ${option.pointsCost} điểm để nhận ${option.name}?`)) {
      return;
    }

    try {
      setLoadingRedeem(true);
      
      // Make API request with userId only
      const response = await axios.post('http://localhost:3005/loyalty/redeem', {
        userId, // Only send userId now
        redemptionId
      });
      
      if (response.data.success) {
        // Update user points immediately
        setUserPoints(prevPoints => ({
          ...prevPoints,
          availablePoints: prevPoints.availablePoints - option.pointsCost
        }));
        
        // Show success message
        toast.success('Đổi điểm thành công!');
        
        // Update redemption options status
        setRedemptionOptions(prevOptions => 
          prevOptions.map(opt => 
            opt._id === redemptionId 
              ? { ...opt, isRedeemed: true, canRedeem: opt.limitPerUser > 1 }
              : opt
          )
        );
        
        // Fetch updated data in background
        const fetchUpdates = async () => {
          try {
            // Update points from server
            refreshPoints();
            
            // Update redemption history
            const historyResponse = await axios.get(`http://localhost:3005/loyalty/redemption-history/${userId}`);
            if (historyResponse.data.success) {
              setRedemptionHistory(historyResponse.data.history || []);
            }
            
            // Update redemption options list
            const queryParams = new URLSearchParams();
            if (userPoints?.tier) {
              queryParams.append('tier', userPoints.tier);
            }
            queryParams.append('userId', userId);
            
            const optionsResponse = await axios.get(`http://localhost:3005/loyalty/redemption-options?${queryParams.toString()}`);
            if (optionsResponse.data.success) {
              setRedemptionOptions(optionsResponse.data.redemptionOptions || []);
            }
          } catch (error) {
            console.error('Error fetching updated data:', error);
          }
        };
        
        fetchUpdates();
        
        // Show voucher information
        toast.info(
          <div>
            <p><strong>Mã voucher:</strong> {response.data.voucher.code}</p>
            <p><strong>Giá trị:</strong> {response.data.voucher.type === 'percentage' 
              ? `${response.data.voucher.value}%` 
              : `${Number(response.data.voucher.value).toLocaleString('vi-VN')}đ`}
            </p>
            <p><strong>Hết hạn:</strong> {moment(response.data.voucher.expiryDate).format('DD/MM/YYYY')}</p>
            <p><strong>Điểm đã dùng:</strong> {response.data.voucher.pointsUsed}</p>
            <p><strong>Điểm còn lại:</strong> {response.data.remainingPoints}</p>
          </div>,
          {
            autoClose: 8000,
            className: 'voucher-toast'
          }
        );
        
        // Switch to history tab after a short delay
        setTimeout(() => {
          setActiveTab('history');
        }, 1000);
      } else {
        toast.error(response.data.message || 'Đổi điểm thất bại');
      }
    } catch (error) {
      console.error('Error redeeming points:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi đổi điểm';
      toast.error(errorMessage);
    } finally {
      setLoadingRedeem(false);
    }
  };

  // Get tier name in Vietnamese

  // Get tier name in Vietnamese
  const getTierName = (tier) => {
    switch (tier) {
      case 'silver': return 'Bạc';
      case 'gold': return 'Vàng';
      case 'platinum': return 'Bạch Kim';
      default: return 'Tiêu Chuẩn';
    }
  };

  // Get tier background color
  const getTierColor = (tier) => {
    switch (tier) {
      case 'silver': return 'var(--silver-gradient)';
      case 'gold': return 'var(--gold-gradient)';
      case 'platinum': return 'var(--platinum-gradient)';
      default: return 'var(--standard-gradient)';
    }
  };

  // Format points number with commas
  const formatPoints = (points) => {
    return Number(points).toLocaleString('vi-VN');
  };

  // Get progress percentage to next tier
  const getNextTierProgress = () => {
    if (!userPoints || userPoints.tier === 'platinum') return 100;

    const pointsToNextTier = userPoints.pointsToNextTier || 0;
    let percentage = 0;

    switch (userPoints.tier) {
      case 'standard':
        percentage = ((2000 - pointsToNextTier) / 2000) * 100;
        break;
      case 'silver':
        percentage = ((5000 - pointsToNextTier) / 5000) * 100;
        break;
      case 'gold':
        percentage = ((10000 - pointsToNextTier) / 10000) * 100;
        break;
      default:
        percentage = 0;
    }

    return Math.min(Math.max(percentage, 0), 100);
  };

  if (!isLoggedIn) {
    return (
      <div className="points-page">
        <Helmet>
          <title>Điểm Thưởng | ShopDunk</title>
        </Helmet>

        <ThanhDinhHuong
          breadcrumbs={[
            { label: 'Trang Chủ', link: '/' },
            { label: 'Điểm Thưởng', link: '/diem-thuong' }
          ]}
        />

        <div className="login-required">
          <FontAwesomeIcon icon={faInfoCircle} className="icon" />
          <h2>Vui lòng đăng nhập</h2>
          <p>Bạn cần đăng nhập để xem thông tin điểm thưởng</p>
          <button className="primary-btn" onClick={() => window.location.href = '/login'}>
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }
  const confirmRedemption = async () => {
    if (!selectedOption || loadingRedeem) {
      return;
    }
    
    // Get user ID from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
    
    if (!userId) {
      toast.error('Không thể xác định ID người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    
    try {
      setLoadingRedeem(true);
      
      // Make API request with userId only
      const response = await axios.post('http://localhost:3005/loyalty/redeem', {
        userId, // Only send userId now
        redemptionId: selectedOption._id
      });
      
      if (response.data.success) {
        // Update user points immediately
        setUserPoints(prevPoints => ({
          ...prevPoints,
          availablePoints: prevPoints.availablePoints - selectedOption.pointsCost
        }));
        
        // Show success message
        toast.success('Đổi điểm thành công!');
        
        // Update redemption options status
        setRedemptionOptions(prevOptions => 
          prevOptions.map(opt => 
            opt._id === selectedOption._id 
              ? { ...opt, isRedeemed: true, canRedeem: opt.limitPerUser > 1 }
              : opt
          )
        );
        
        // Đóng modal chi tiết
        setRedemptionModalOpen(false);
        
        // Hiển thị modal kết quả với thông tin voucher
        setCurrentVoucher({
          code: response.data.voucher.code,
          type: response.data.voucher.type,
          value: response.data.voucher.value,
          minOrderValue: response.data.voucher.minOrderValue,
          expiryDate: response.data.voucher.expiryDate,
          pointsUsed: response.data.voucher.pointsUsed
        });
        setVoucherModalOpen(true);
        
        // Fetch updated data in background
        refreshPoints();
      } else {
        toast.error(response.data.message || 'Đổi điểm thất bại');
      }
    } catch (error) {
      console.error('Error redeeming points:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi đổi điểm';
      toast.error(errorMessage);
    } finally {
      setLoadingRedeem(false);
    }
  };
  const openRedemptionModal = async (redemptionId) => {
    // Tìm thông tin quà đổi điểm
    const option = redemptionOptions.find(opt => opt._id === redemptionId);
    if (!option) {
      toast.error('Không tìm thấy thông tin quà đổi điểm');
      return;
    }
    
    setSelectedOption(option);
    setLoadingRedeem(true);
    
    try {
      // Lấy thông tin chi tiết của voucher gốc
      const response = await axios.get(`http://localhost:3005/getchitietmagg/${option.voucherId}`);
      
      if (response.data) {
        setVoucherDetails(response.data);
        setRedemptionModalOpen(true);
      } else {
        toast.error('Không thể lấy thông tin chi tiết mã giảm giá');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin chi tiết mã giảm giá:', error);
      toast.error('Không thể lấy thông tin chi tiết mã giảm giá');
    } finally {
      setLoadingRedeem(false);
    }
  };
  const handleSaveVoucher = () => {
    if (currentVoucher && currentVoucher.code) {
      // Copy voucher code to clipboard
      navigator.clipboard.writeText(currentVoucher.code)
        .then(() => {
          toast.success('Đã sao chép mã voucher vào clipboard');
        })
        .catch((err) => {
          console.error('Không thể sao chép mã: ', err);
          toast.error('Không thể sao chép mã voucher');
        });
    }
    
    // Đóng modal
    setVoucherModalOpen(false);
    
    // Switch to history tab
    setActiveTab('history');
  };
  return (
    <div className="points-page">
      <Helmet>
        <title>Điểm Thưởng | ShopDunk</title>
      </Helmet>

      <ToastContainer position="top-right" />

      <ThanhDinhHuong
        breadcrumbs={[
          { label: 'Trang Chủ', link: '/' },
          { label: 'Điểm Thưởng', link: '/diem-thuong' }
        ]}
      />

      <div className="points-container">
        {loading ? (
          <div className="loading-container">
            <FontAwesomeIcon icon={faSpinner} spin />
            <p>Đang tải thông tin điểm thưởng...</p>
          </div>
        ) : (
          <>
            <div className="points-header" style={{ background: getTierColor(userPoints?.tier) }}>
              <div className="user-info">
                <div className="user-avatar">
                  <FontAwesomeIcon icon={faCrown} />
                </div>
                <div className="user-details">
                  <h2>{getUser() || 'Khách hàng'}</h2>
                  <div className="tier-badge">
                    Hạng {getTierName(userPoints?.tier)}
                  </div>
                </div>
              </div>

              <div className="points-summary">
                <div className="points-value">
                  <FontAwesomeIcon icon={faCoins} className="points-icon" />
                  <span>{formatPoints(userPoints?.availablePoints || 0)}</span>
                </div>
                <div className="points-label">Điểm khả dụng</div>
              </div>
            </div>

            <div className="points-navigation">
              <button
                className={`nav-btn ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                <FontAwesomeIcon icon={faStar} />
                <span>Tổng quan</span>
              </button>
              <button
                className={`nav-btn ${activeTab === 'redeem' ? 'active' : ''}`}
                onClick={() => setActiveTab('redeem')}
              >
                <FontAwesomeIcon icon={faGift} />
                <span>Đổi điểm</span>
              </button>
              <button
                className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <FontAwesomeIcon icon={faHistory} />
                <span>Lịch sử</span>
              </button>
            </div>
            <div className="points-content">
              {activeTab === 'summary' && (
                <div className="tab-content-user summary-tab">
                  <div className="points-cards">
                    <div className="points-card">
                      <div className="card-header">Điểm của bạn</div>
                      <div className="card-content">
                        <div className="points-stat">
                          <div className="stat-label">Điểm khả dụng</div>
                          <div className="stat-value">{formatPoints(userPoints?.availablePoints || 0)}</div>
                        </div>

                        <div className="points-stat">
                          <div className="stat-label">Tổng điểm đã tích</div>
                          <div className="stat-value">{formatPoints(userPoints?.totalPoints || 0)}</div>
                        </div>

                        {userPoints?.soonExpiringPoints > 0 && (
                          <div className="points-stat points-expiring">
                            <div className="stat-label">Sắp hết hạn (trong 30 ngày)</div>
                            <div className="stat-value">{formatPoints(userPoints.soonExpiringPoints)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="points-card">
                      <div className="card-header">Cấp thành viên</div>
                      <div className="card-content">
                        <div className="tier-info">
                          <div className="current-tier" style={{ color: userPoints?.tier === 'standard' ? '#666' : '#0066cc' }}>
                            <FontAwesomeIcon icon={faCrown} />
                            <span>Hạng {getTierName(userPoints?.tier)}</span>
                          </div>

                          {userPoints?.tier !== 'platinum' && (
                            <div className="next-tier-progress">
                              <div className="progress-label">
                                <span>Tiến độ lên hạng {getTierName(userPoints?.nextTier)}</span>
                                <span>{formatPoints(userPoints?.yearToDatePoints || 0)} / {formatPoints(
                                  userPoints?.tier === 'standard' ? 2000 :
                                    userPoints?.tier === 'silver' ? 5000 : 10000
                                )} điểm</span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-bar-fill"
                                  style={{ width: `${getNextTierProgress()}%` }}
                                ></div>
                              </div>
                              <div className="progress-info">
                                Cần thêm {formatPoints(userPoints?.pointsToNextTier || 0)} điểm để lên hạng tiếp theo
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tier-benefits">
                    <h3>Quyền lợi thành viên</h3>
                    <div className="benefits-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Quyền lợi</th>
                            <th className="standard-col">Tiêu Chuẩn</th>
                            <th className="silver-col">Bạc</th>
                            <th className="gold-col">Vàng</th>
                            <th className="platinum-col">Bạch Kim</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Tỷ lệ tích điểm</td>
                            <td>1đ / 1.000đ</td>
                            <td>1đ / 1.000đ</td>
                            <td>1đ / 1.000đ</td>
                            <td>1đ / 1.000đ</td>
                          </tr>
                          <tr>
                            <td>Quà sinh nhật</td>
                            <td><span className="checkmark">✓</span></td>
                            <td><span className="checkmark">✓</span></td>
                            <td><span className="checkmark">✓</span></td>
                            <td><span className="checkmark">✓</span></td>
                          </tr>
                          <tr>
                            <td>Voucher đặc biệt</td>
                            <td><span className="crossmark">✗</span></td>
                            <td><span className="checkmark">✓</span></td>
                            <td><span className="checkmark">✓</span></td>
                            <td><span className="checkmark">✓</span></td>
                          </tr>
                          <tr>
                            <td>Ưu đãi riêng</td>
                            <td><span className="crossmark">✗</span></td>
                            <td><span className="crossmark">✗</span></td>
                            <td><span className="checkmark">✓</span></td>
                            <td><span className="checkmark">✓</span></td>
                          </tr>
                          <tr>
                            <td>Giao hàng ưu tiên</td>
                            <td><span className="crossmark">✗</span></td>
                            <td><span className="crossmark">✗</span></td>
                            <td><span className="crossmark">✗</span></td>
                            <td><span className="checkmark">✓</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="recent-activity">
                    <h3>Hoạt động gần đây</h3>
                    {userPoints?.history && userPoints.history.length > 0 ? (
                      <div className="activity-list">
                        {userPoints.history.map((item, index) => (
                          <div className="activity-item" key={index}>
                            <div className="activity-date">
                              {moment(item.date).format('DD/MM/YYYY')}
                            </div>
                            <div className="activity-details">
                              <div className="activity-reason">{item.reason}</div>
                              <div className={`activity-points ${item.amount > 0 ? 'positive' : 'negative'}`}>
                                {item.amount > 0 ? '+' : ''}{formatPoints(item.amount)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-activity">
                        <p>Chưa có hoạt động nào gần đây</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'redeem' && (
                <div className="tab-content-user redeem-tab">
                  <div className="available-points">
                    <span>Điểm khả dụng:</span>
                    <strong>{formatPoints(userPoints?.availablePoints || 0)}</strong>
                  </div>

                  {redemptionOptions.length > 0 ? (
                    <div className="redemption-options">
                      {redemptionOptions.map((option) => (
                        <div className={`redemption-card ${option.isRedeemed && !option.canRedeem ? 'redeemed' : ''}`} key={option._id}>
                          {option.imageUrl && (
                            <div className="redemption-image">
                              <img src={option.imageUrl} alt={option.name} />
                            </div>
                          )}
                          <div className="redemption-details">
                            <h3>{option.name}</h3>
                            {option.description && <p className="description">{option.description}</p>}

                            <div className="voucher-details">
                              <div className="voucher-value">
                                {option.voucherType === 'percentage'
                                  ? `Giảm ${option.voucherValue}%`
                                  : option.voucherType === 'fixed'
                                    ? `Giảm ${option.voucherValue.toLocaleString('vi-VN')}đ`
                                    : option.voucherType === 'shipping'
                                      ? 'Miễn phí vận chuyển'
                                      : `Giảm giá sản phẩm ${option.voucherValue}%`
                                }
                              </div>
                              <div className="voucher-points">
                                <span className="points-required">{formatPoints(option.pointsCost)} điểm</span>
                                {option.isRedeemed && !option.canRedeem ? (
                                  <button
                                  className={`redeem-btn ${userPoints?.availablePoints < option.pointsCost ? 'disabled' : ''}`}
                                  onClick={() => openRedemptionModal(option._id)}
                                  disabled={userPoints?.availablePoints < option.pointsCost || loadingRedeem}
                                >
                                  {loadingRedeem ? (
                                    <>
                                      <FontAwesomeIcon icon={faSpinner} spin />
                                      <span>Đang xử lý...</span>
                                    </>
                                  ) : (
                                    'Đổi điểm'
                                  )}
                                </button>
                                ) : (
                                  <button
                                  className={`redeem-btn ${userPoints?.availablePoints < option.pointsCost ? 'disabled' : ''}`}
                                  onClick={() => openRedemptionModal(option._id)}
                                  disabled={userPoints?.availablePoints < option.pointsCost || loadingRedeem}
                                >
                                  {loadingRedeem ? (
                                    <>
                                      <FontAwesomeIcon icon={faSpinner} spin />
                                      <span>Đang xử lý...</span>
                                    </>
                                  ) : (
                                    'Đổi điểm'
                                  )}
                                </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-redemption-options">
                      <p>Hiện không có ưu đãi nào để đổi điểm</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="tab-content-user history-tab">
                  {redemptionHistory.length > 0 ? (
                    <div className="history-list">
                      {redemptionHistory.map((item, index) => (
                        <div className="history-item" key={index}>
                          <div className="history-date">
                            {moment(item.date).format('DD/MM/YYYY HH:mm')}
                          </div>
                          <div className="history-details">
                            <div className="history-voucher">
                              <span className="voucher-name">{item.voucherName}</span>
                              <span className="voucher-value">
                                {item.voucherType === 'percentage'
                                  ? `Giảm ${item.voucherValue}%`
                                  : item.voucherType === 'fixed'
                                    ? `Giảm ${item.voucherValue.toLocaleString('vi-VN')}đ`
                                    : item.voucherType === 'shipping'
                                      ? 'Miễn phí vận chuyển'
                                      : `Giảm giá sản phẩm ${item.voucherValue}%`}
                              </span>
                            </div>
                            <div className="history-points">
                              -{formatPoints(item.pointsUsed)} điểm
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-history">
                      <p>Chưa có lịch sử đổi điểm</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <RedemptionDetailModal
        isOpen={redemptionModalOpen}
        onClose={() => setRedemptionModalOpen(false)}
        selectedOption={selectedOption}
        voucherDetails={voucherDetails}
        userPoints={userPoints}
        onConfirm={confirmRedemption}
        loadingRedeem={loadingRedeem}
      />
      
      <VoucherResultModal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        voucher={currentVoucher}
        onSave={handleSaveVoucher}
      />
    </div>
  );
};

export default UserPointsPage;
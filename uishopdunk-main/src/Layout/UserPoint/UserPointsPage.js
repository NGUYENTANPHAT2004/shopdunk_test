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

moment.locale('vi');


// Get user information from context and localStorage
const UserPointsPage = () => {
  const { getUser, getUserPhone, getUserPoints, refreshPoints } = useUserContext();
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

  // Get user information from context and localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoggedIn(true);

        // Kiểm tra và set điểm từ context nếu có
        const contextPoints = getUserPoints();
        if (contextPoints) {
          setUserPoints(contextPoints);
          hasPointsDataRef.current = true;
          setLoading(false);
        } else {
          // Chỉ refresh points nếu chưa có dữ liệu
          refreshPoints();
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []); // Chỉ chạy một lần khi component mount

  // Fetch user points data - will be called once user data is available
  useEffect(() => {
    // Không fetch nếu không đăng nhập hoặc đã có dữ liệu điểm hoặc đang trong quá trình fetch
    if (!isLoggedIn || hasPointsDataRef.current || isFetchingRef.current) return;

const fetchUserPoints = async () => {
  try {
    setLoading(true);
    
    // Lấy userId từ localStorage
    const storedUser = localStorage.getItem('user');
    let userId = null;
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        userId = userData?._id || userData?.user?._id || userData?.id || userData?.user?.id;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    if (!userId) {
      console.error('User ID not found in localStorage');
      setLoading(false);
      return;
    }
    
    // Lấy điểm thưởng bằng userId
    const response = await axios.get(`http://localhost:3005/loyalty/user-points/${userId}`);
    
    if (response.data.success) {
      if (response.data.hasPoints) {
        setUserPoints(response.data.points);
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
  }
};

    fetchUserPoints();
  }, [isLoggedIn, user, getUserPhone]); // Phụ thuộc vào các giá trị cần thiết

  // Fetch redemption options - Chỉ fetch một lần khi có dữ liệu điểm
  useEffect(() => {
    if (!isLoggedIn || !userPoints) return;
    
    const fetchRedemptionOptions = async () => {
      try {
        // Tạo query params với tất cả các định danh có thể có
        const queryParams = new URLSearchParams();
        
        // Thêm cấp thành viên
        if (userPoints?.tier) {
          queryParams.append('tier', userPoints.tier);
        }
        
        // Thêm số điện thoại nếu có
        const phone = getUserPhone();
        if (phone) {
          queryParams.append('phone', phone);
        }
        
        // Thêm email nếu có
        const email = user?.email || user?.user?.email;
        if (email) {
          queryParams.append('email', email);
        }
        
        // Thêm userId nếu có
        const userId = user?._id || user?.user?._id || user?.id || user?.user?.id;
        if (userId) {
          queryParams.append('userId', userId);
        }
        
        const response = await axios.get(`http://localhost:3005/loyalty/redemption-options?${queryParams.toString()}`);
        
        if (response.data.success) {
          setRedemptionOptions(response.data.redemptionOptions || []);
        }
      } catch (error) {
        console.error('Error fetching redemption options:', error);
      }
    };

    fetchRedemptionOptions();
  }, [isLoggedIn, userPoints, user, getUserPhone]);

  // Fetch redemption history - Chỉ fetch một lần
  useEffect(() => {
    if (!isLoggedIn) return;

    const phone = getUserPhone();
    if (!phone) return;

    const fetchRedemptionHistory = async () => {
      try {
        const response = await axios.get(`http://localhost:3005/loyalty/redemption-history/${phone}`);

        if (response.data.success) {
          setRedemptionHistory(response.data.history || []);
        }
      } catch (error) {
        console.error('Error fetching redemption history:', error);
      }
    };

    fetchRedemptionHistory();
  }, [isLoggedIn, getUserPhone]); // Chỉ phụ thuộc vào đăng nhập và số điện thoại

  // Handle redeeming points for a voucher
  // Improved handleRedeem function for UserPointsPage.js
 // Cập nhật hàm handleRedeem để hỗ trợ đăng nhập bằng social
// Cập nhật hàm handleRedeem để hỗ trợ đăng nhập bằng social
const handleRedeem = async (redemptionId) => {
  // Lấy các định danh người dùng có thể có
  const phone = getUserPhone();
  const email = user?.email || user?.user?.email;
  const userId = user?._id || user?.user?._id || user?.id || user?.user?.id;
  
  // Kiểm tra xem có bất kỳ định danh nào không
  if (!phone && !email && !userId) {
    toast.error('Không thể xác định thông tin tài khoản. Vui lòng đăng nhập lại hoặc cập nhật thông tin.');
    return;
  }
  
  if (loadingRedeem) {
    return;
  }

  // Tìm thông tin voucher đang đổi
  const option = redemptionOptions.find(opt => opt._id === redemptionId);
  if (!option) {
    toast.error('Không tìm thấy thông tin quà đổi điểm');
    return;
  }
  
  // Kiểm tra đủ điểm không
  if (userPoints.availablePoints < option.pointsCost) {
    toast.error(`Bạn cần ${option.pointsCost} điểm để đổi quà này. Hiện bạn chỉ có ${userPoints.availablePoints} điểm khả dụng.`);
    return;
  }

  // Xác nhận đổi điểm
  if (!window.confirm(`Bạn có chắc chắn muốn đổi ${option.pointsCost} điểm để nhận ${option.name}?`)) {
    return;
  }

  try {
    setLoadingRedeem(true);
    
    // Truyền cả 3 thông tin để API backend có thể sử dụng bất kỳ thông tin nào
    const response = await axios.post('http://localhost:3005/loyalty/redeem', {
      phone,
      email,
      userId,
      redemptionId
    });
    
    if (response.data.success) {
      // Cập nhật điểm người dùng ngay lập tức
      setUserPoints(prevPoints => ({
        ...prevPoints,
        availablePoints: prevPoints.availablePoints - option.pointsCost
      }));
      
      // Thông báo thành công
      toast.success('Đổi điểm thành công!');
      
      // Cập nhật trạng thái các option đổi điểm
      setRedemptionOptions(prevOptions => 
        prevOptions.map(opt => 
          opt._id === redemptionId 
            ? { ...opt, isRedeemed: true, canRedeem: opt.limitPerUser > 1 }
            : opt
        )
      );
      
      // Hàm lấy dữ liệu mới chạy ngầm
      const fetchUpdates = async () => {
        try {
          // Cập nhật điểm từ server
          refreshPoints();
          
          // Cập nhật lịch sử đổi điểm
          const identifier = phone || email || userId;
          if (identifier) {
            const historyResponse = await axios.get(`http://localhost:3005/loyalty/redemption-history/${identifier}`);
            if (historyResponse.data.success) {
              setRedemptionHistory(historyResponse.data.history || []);
            }
          }
          
          // Cập nhật danh sách quà đổi điểm
          const queryParams = new URLSearchParams();
          if (phone) queryParams.append('phone', phone);
          if (email) queryParams.append('email', email);
          if (userPoints?.tier) queryParams.append('tier', userPoints.tier);
          
          const optionsResponse = await axios.get(`http://localhost:3005/loyalty/redemption-options?${queryParams.toString()}`);
          if (optionsResponse.data.success) {
            setRedemptionOptions(optionsResponse.data.redemptionOptions || []);
          }
        } catch (error) {
          console.error('Error fetching updated data:', error);
        }
      };
      
      fetchUpdates();
      
      // Hiển thị thông tin voucher
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
      
      // Chuyển đến tab lịch sử sau một khoảng thời gian ngắn
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
    
    // Log lỗi chi tiết để debug
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
  } finally {
    setLoadingRedeem(false);
  }
};

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

  // If the user is not logged in at all, show the login required message
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
                <div className="tab-content summary-tab">
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
                <div className="tab-content redeem-tab">
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
                                  <button className="redeem-btn disabled" disabled>
                                    Đã đổi
                                  </button>
                                ) : (
                                  <button
                                    className={`redeem-btn ${userPoints?.availablePoints < option.pointsCost ? 'disabled' : ''}`}
                                    onClick={() => handleRedeem(option._id)}
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
                <div className="tab-content history-tab">
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
    </div>
  );
};

export default UserPointsPage;
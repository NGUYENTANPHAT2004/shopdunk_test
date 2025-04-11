import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from "sweetalert2";
const UserContext = createContext(null);

export const UserContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [welcomeVoucher, setWelcomeVoucher] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pointsLoading, setPointsLoading] = useState(false);
  
  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        loadUserPoints(userData);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
    
    // Check for stored welcome voucher
    const storedVoucher = localStorage.getItem("welcomeVoucher");
    if (storedVoucher) {
      try {
        setWelcomeVoucher(JSON.parse(storedVoucher));
      } catch (error) {
        console.error("Error parsing welcome voucher:", error);
        localStorage.removeItem("welcomeVoucher");
      }
    }
  }, []);
  
  // Enhanced user points loading function using ONLY user ID
  const loadUserPoints = async (userData, forceRefresh = false) => {
    try {
      if (!userData) return null;
      
      // Don't reload if we already have data and no refresh is requested
      if (userPoints && !forceRefresh) {
        return userPoints;
      }
      
      setPointsLoading(true);
      
      // Extract user ID - only using user ID now for point management
      let userId = null;
      
      if (userData?._id) userId = userData._id;
      else if (userData?.user?._id) userId = userData.user._id;
      else if (userData?.id) userId = userData.id;
      else if (userData?.user?.id) userId = userData.user.id;
      
      // No user ID available - can't fetch points
      if (!userId) {
        console.log("No user ID available to fetch user points");
        setPointsLoading(false);
        return null;
      }
      
      // Try fetching points using user ID
      try {
        const response = await axios.get(`http://localhost:3005/loyalty/user-points/${userId}`);
        if (response.data.success) {
          if (response.data.hasPoints) {
            const pointsData = response.data.points;
            setUserPoints(pointsData);
            setPointsLoading(false);
            return pointsData;
          } else {
            // User has no points yet
            const defaultPoints = {
              totalPoints: 0,
              availablePoints: 0,
              tier: 'standard',
              yearToDatePoints: 0,
              history: [],
              soonExpiringPoints: 0
            };
            setUserPoints(defaultPoints);
            setPointsLoading(false);
            return defaultPoints;
          }
        }
      } catch (error) {
        console.error('Error fetching user points by user ID:', error);
        
        if (error.response && error.response.status !== 404) {
          toast.error('Không thể kết nối đến máy chủ điểm thưởng', {
            position: "top-right",
            autoClose: 3000
          });
        }
        
        // Set default points if fetching fails
        const defaultPoints = {
          totalPoints: 0,
          availablePoints: 0,
          tier: 'standard',
          yearToDatePoints: 0,
          history: [],
          soonExpiringPoints: 0
        };
        setUserPoints(defaultPoints);
        setPointsLoading(false);
        return defaultPoints;
      }
    } catch (error) {
      console.error('Error in loadUserPoints:', error);
      setPointsLoading(false);
      return null;
    }
  };

  // Add points manipulation functions
  const updateUserPoints = (newPoints) => {
    if (!userPoints) return;
    
    setUserPoints(prevPoints => ({
      ...prevPoints,
      ...newPoints
    }));
  };
  const login = async (loginData) => {
    try {
      setIsLoading(true);
      const { data: responseData } = await axios.post('http://localhost:3005/login_auth', loginData);
      
      // Check for API errors
      if (!responseData || responseData.error) {
        throw new Error(responseData.message || "Tài khoản hoặc mật khẩu không đúng!");
      }
      
      // Normalize user data structure
      let userData = {};
      
      // Extract from either user object or direct response
      if (responseData.user) {
        userData = {
          ...responseData.user,
          token: responseData.token
        };
      } else {
        userData = responseData;
      }
      
      // Ensure phone is included (critical for loyalty system)
      userData.phone = userData.phone || loginData.phone;
      
      // Success notification
      toast.success("Đăng nhập thành công! Đang chuyển hướng...", {
        position: "top-right",
        autoClose: 2000
      });
  
      // Store user data in localStorage and state
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      
      // Load points data
      await loadUserPoints(userData);
      
      // Redirect after a delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
      
    } catch (error) {
      // Display specific API error or default error
      toast.error(error.response?.data?.message || "Đăng nhập thất bại! Kiểm tra lại tài khoản/mật khẩu.", {
        position: "top-right",
        autoClose: 3000
      });
  
      console.error("Lỗi đăng nhập:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const register = async (registerData) => {
    try {
      setIsLoading(true);
      const { data: responseData } = await axios.post('http://localhost:3005/register_auth', registerData);
      
      if (!responseData || responseData.error) {
        throw new Error(responseData.message || "Tài khoản hoặc mật khẩu đã tồn tại!");
      }
  
      // Handle welcome voucher if available
      if (responseData.welcomeVoucher) {
        console.log("Welcome voucher received:", responseData.welcomeVoucher);
        setWelcomeVoucher(responseData.welcomeVoucher);
        
        // Store welcome voucher in localStorage to persist through redirects
        localStorage.setItem("welcomeVoucher", JSON.stringify(responseData.welcomeVoucher));
      }
      
      // Success notification
      toast.success("Đăng ký thành công!", {
        position: "top-right",
        autoClose: 2000
      });
  
      // Normalize user data
      let userData = {};
      
      if (responseData.user) {
        userData = responseData.user;
      } else {
        userData = responseData;
      }
      
      // Ensure phone is stored correctly
      userData.phone = registerData.phone || userData.phone;
      
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      
      // Load initial points data
      await loadUserPoints(userData);
      
      // Don't redirect immediately to allow voucher to show
      setTimeout(() => {
        if (responseData.welcomeVoucher) {
          // If there's a welcome voucher, don't redirect automatically
          // User will dismiss the voucher to continue
          console.log("Not redirecting yet - welcome voucher is showing");
        } else {
          window.location.href = "/";
        }
      }, 2000);
      
    } catch (error) {
      // Display API error or default error
      toast.error(error.response?.data?.message || "Tài khoản đã tồn tại hoặc có lỗi xảy ra!", {
        position: "top-right",
        autoClose: 3000
      });
  
      console.error("Lỗi đăng ký:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserPhone = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      
      const userData = JSON.parse(storedUser);
      
      // Check different possible paths to the phone property
      return userData?.phone || userData?.user?.phone || null;
    } catch (error) {
      console.error("Error getting user phone:", error);
      return null;
    }
  };

  const getUser = () => {
    try {
      const user = localStorage.getItem("user");
      if (!user) return null;
  
      const parsedUser = JSON.parse(user);
  
      // Check username existence in different possible paths
      return parsedUser?.username || parsedUser?.user?.username || parsedUser?.name || null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };
  
  // Handles welcome voucher dismissal
  const dismissWelcomeVoucher = () => {
    console.log("Dismissing welcome voucher");
    setWelcomeVoucher(null);
    localStorage.removeItem("welcomeVoucher");
    
    // After dismissing, redirect to home if we're on register page
    if (window.location.pathname.includes('/register')) {
      window.location.href = "/";
    }
  };

  const logout = () => {
    if (localStorage.getItem('user')) {
      Swal.fire({
        title: "Bạn có chắc chắn muốn đăng xuất?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Đăng xuất",
        cancelButtonText: "Hủy"
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem("user");
          localStorage.removeItem("welcomeVoucher");
          setUser(null);
          setUserPoints(null);
          setWelcomeVoucher(null);
          window.dispatchEvent(new Event("userLogout"));
    
          toast.success("Đăng xuất thành công!", {
            position: "top-right",
            autoClose: 2000
          });
          
          // Redirect to home page
          window.location.href = "/";
        }
      });
    } else {
      toast.info("Bạn chưa đăng nhập", {
        position: "top-right",
        autoClose: 2000
      });
    }
  };
  
  const refreshPoints = async () => {
    const userData = user || JSON.parse(localStorage.getItem("user") || "null");
    if (userData) {
      await loadUserPoints(userData);
    }
  };
  
  // Get user points from context
  const getUserPoints = () => {
    return userPoints;
  };
  
  const loginWithSocial = async (provider, token, phone) => {
    try {
      setIsLoading(true);
      // Add phone parameter for social login
      const requestData = phone ? { token, phone } : { token };
      const { data } = await axios.post(`http://localhost:3005/auth/${provider}`, requestData);
      
      if(data) {
        // Normalize user data
        let userData = {};
        
        if (data.user) {
          userData = {
            ...data.user,
            token: data.token
          };
        } else {
          userData = data;
        }
        
        // Ensure phone is included (critical for loyalty system)
        userData.phone = phone || userData.phone || userData.user?.phone;
        
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        // Load points data
        await loadUserPoints(userData);
      }
      
      toast.success("Đăng nhập thành công! Đang chuyển hướng...", {
        position: "top-right",
        autoClose: 2000
      });
      
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
    } catch (error) {
      toast.error(`Đăng nhập với ${provider} thất bại`, {
        position: "top-right",
        autoClose: 2000
      });
      console.error(`Error with ${provider} login:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ 
      login, 
      register, 
      getUser, 
      getUserPhone,
      getUserPoints,
      refreshPoints,
      logout, 
      loginWithSocial, 
      user,
      userPoints,
      welcomeVoucher,
      dismissWelcomeVoucher,
      isLoading,
      updateUserPoints
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
};
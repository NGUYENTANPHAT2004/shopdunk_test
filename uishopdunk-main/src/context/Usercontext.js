import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
const UserContext = createContext(null);

export const UserContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const login = async (loginData) => {
    try {
      const { data: responseData } = await axios.post('http://localhost:3005/login_auth', loginData);
      
      // Kiểm tra nếu có lỗi từ API
      if (!responseData || responseData.error) {
        throw new Error(responseData.message || "Tài khoản hoặc mật khẩu không đúng!");
      }
  
      // Hiển thị thông báo đăng nhập thành công
      toast.success("Đăng nhập thành công! Đang chuyển hướng...", {
        position: "top-right",
        autoClose: 2000
      });
  
      // Lưu thông tin user vào localStorage
      localStorage.setItem("user", JSON.stringify(responseData));
      setUser(responseData);
  
      // Chuyển hướng sau khi lưu user
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
      
    } catch (error) {
      // Hiển thị lỗi cụ thể từ API hoặc lỗi mặc định
      toast.error(error.response?.data?.message || "Đăng nhập thất bại! Kiểm tra lại tài khoản/mật khẩu.", {
        position: "top-right",
        autoClose: 3000
      });
  
      console.error("Lỗi đăng nhập:", error);
    }
  };
  

  const register = async (registerData) => {
    try {
      const { data: responseData } = await axios.post('http://localhost:3005/register_auth', registerData);
      
      if (!responseData || responseData.error) {
        throw new Error(responseData.message || "Tài khoản hoặc mật khẩu đã tồn tại!");
      }
  
      // Hiển thị thông báo đăng ký thành công
      toast.success("Đăng ký thành công! Đang chuyển hướng...", {
        position: "top-right",
        autoClose: 2000
      });
  
      // Lưu user vào state
      setUser(responseData);
  
      // Chuyển hướng sau 2.5 giây
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
      
    } catch (error) {
      // Hiển thị lỗi từ API nếu có, hoặc thông báo mặc định
      toast.error(error.response?.data?.message || "Tài khoản đã tồn tại hoặc có lỗi xảy ra!", {
        position: "top-right",
        autoClose: 3000
      });
  
      console.error("Lỗi đăng ký:", error);
    }
  };
  

  const getUser = () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).user.username : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const logout = () => {
    if (localStorage.getItem('user')) {
      localStorage.removeItem('user');
      setUser(null);
      alert("Đăng xuất thành công");
    } else {
      alert("Bạn chưa đăng nhập");
    }
  };
  const loginWithSocial = async (provider, token) => {
    try {
      const { data } = await axios.post(`http://localhost:3005/auth/${provider}`, { token });
      alert("đăng nhập thành công")
      localStorage.setItem('user', JSON.stringify(data));
    } catch (error) {
      alert(`Đăng nhập với ${provider} thất bại`);
    }
  };

  return (
    <UserContext.Provider value={{ login, register, getUser, logout,loginWithSocial,user }}>
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
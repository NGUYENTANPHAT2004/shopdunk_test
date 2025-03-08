import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserContext = createContext(null);

export const UserContextProvider = ({ children }) => {
  const navigate = useNavigate();

  const login = async (loginData) => {
    try {
      const { data: responseData } = await axios.post('http://localhost:3000/login', loginData);
      localStorage.setItem('user', JSON.stringify(responseData));
      alert("Đăng nhập thành công");
      navigate("/");
    } catch (error) {
      alert("Tài khoản hoặc mật khẩu không đúng");
      console.error('Login error:', error);
    }
  };

  const register = async (registerData) => {
    try {
      await axios.post('http://localhost:3000/register', registerData);
      alert("Đăng ký thành công");
      navigate("/login");
    } catch (error) {
      alert("Tên tài khoản hoặc mật khẩu đã tồn tại");
      console.error('Registration error:', error);
    }
  };

  const getUser = () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const logout = () => {
    if (localStorage.getItem('user')) {
      localStorage.removeItem('user');
      alert("Đăng xuất thành công");
      navigate("/login");
    } else {
      alert("Bạn chưa đăng nhập");
    }
  };

  return (
    <UserContext.Provider value={{ login, register, getUser, logout }}>
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
import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../context/Usercontext';
import React from 'react';

// Component hiển thị khi đang loading
const LoadingScreen = () => (
  <div style={{ 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f9f9f9'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div className="spinner" style={{
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '50%',
        borderTop: '4px solid #0066cc',
        width: '40px',
        height: '40px',
        margin: '0 auto 20px',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h2 style={{ color: '#333', marginBottom: '8px' }}>Đang tải...</h2>
      <p style={{ color: '#666' }}>Vui lòng đợi trong giây lát</p>
    </div>
  </div>
);

// Component bảo vệ route cần phân quyền
const PrivateRoute = ({ component: Component, requiredRoles = [], ...rest }) => {
  const { user, isLoading, isAdmin, isInitialized } = useUserContext();
  const location = useLocation();
  
  console.log('PrivateRoute - Current state:', { 
    user: !!user, 
    isLoading, 
    isInitialized,
    requiredRoles,
    path: location.pathname
  });
  
  // Nếu đang loading thì hiển thị loading screen
  if (isLoading || !isInitialized) {
    return <LoadingScreen />;
  }
  
  // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
  if (!user) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // Kiểm tra quyền admin nếu cần
  const adminRequired = requiredRoles.includes('admin');
  
  if (adminRequired) {
    const hasAdminPermission = isAdmin();
    console.log('Admin check result:', hasAdminPermission);
    
    if (!hasAdminPermission) {
      console.log('Admin permission required but not granted');
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  // Người dùng có quyền truy cập
  console.log('Access granted');
  return <Component {...rest} />;
};

export default PrivateRoute;
import React from 'react';
import { Link } from 'react-router-dom';
import './Unauthorized.scss';

function Unauthorized() {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <h1>Bạn không có quyền truy cập</h1>
        <p>Rất tiếc, bạn không có quyền truy cập vào trang này.</p>
        <div className="action-buttons">
          <Link to="/" className="btn-home">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;
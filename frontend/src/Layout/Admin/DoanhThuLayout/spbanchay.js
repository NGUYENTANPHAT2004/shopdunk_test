// Enhanced SanPhamBanChay.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const SanPhamBanChay = ({ data }) => {
  const colors = ['#1976d2', '#2196f3', '#64b5f6', '#90caf9', '#bbdefb'];

  // Ensure data is an array
  const safeData = Array.isArray(data) ? data : [];

  // If no data, show message
  if (safeData.length === 0) {
    return (
      <div className='doanhthu-chart-wrapper'>
        <h3>Top sản phẩm bán chạy</h3>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Không có dữ liệu trong khoảng thời gian này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='doanhthu-chart-wrapper'>
      <h3>Top sản phẩm bán chạy</h3>
      
      <div className="stats-table-container">
        <table className="stats-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên sản phẩm</th>
              <th>Dung lượng</th>
              <th>Số lượng</th>
              <th>Doanh thu</th>
              <th>% Tổng SL</th>
              <th>% Tổng DT</th>
              <th>Đơn giá TB</th>
            </tr>
          </thead>
          <tbody>
            {safeData.map((sp, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{sp.tensp || 'N/A'}</td>
                <td>{sp.dungluongName || 'N/A'}</td>
                <td>{sp.soluong || 0}</td>
                <td>{(sp.doanhthu || 0).toLocaleString('vi-VN')}đ</td>
                <td>{sp.percentOfTotalSales || 0}%</td>
                <td>{sp.percentOfTotalRevenue || 0}%</td>
                <td>{Math.round(sp.averagePrice || 0).toLocaleString('vi-VN')}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-container" style={{ marginTop: '20px', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tensp" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                return [
                  (value || 0).toLocaleString('vi-VN'), 
                  name === 'doanhthu' ? 'Doanh thu (đ)' : 'Số lượng'
                ];
              }}
            />
            <Bar dataKey="soluong" name="Số lượng" fill="#2196f3">
              {safeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SanPhamBanChay;
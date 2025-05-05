import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faChartBar, 
  faBox, 
  faCheck, 
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import './FlashSaleStats.scss';

const FlashSaleStats = ({ flashSale, onClose }) => {
  if (!flashSale) {
    return (
      <div className="flash-sale-stats">
        <div className="stats-header">
          <h3>Thống kê Flash Sale</h3>
          <button className="close-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="no-stats">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <p>Không có thông tin thống kê</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flash-sale-stats">
      <div className="stats-header">
        <h3>Thống kê Flash Sale</h3>
        <button className="close-button" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      
      <div className="stats-body">
        <div className="sale-info">
          <h4>{flashSale.name}</h4>
          <div className="sale-dates">
            <span>{moment(flashSale.startTime).format('DD/MM/YYYY HH:mm')}</span>
            <span> - </span>
            <span>{moment(flashSale.endTime).format('DD/MM/YYYY HH:mm')}</span>
          </div>
          <div className={`sale-status ${flashSale.status}`}>
            {flashSale.status === 'active' ? 'Đang diễn ra' : 
              flashSale.status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc'}
          </div>
        </div>
        
        <div className="stats-overview">
          <div className="stat-card-fs">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faBox} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{flashSale.stats.totalProducts}</div>
              <div className="stat-label">Sản phẩm</div>
            </div>
          </div>
        </div>
        
        <div className="stats-details">
          <div className="stats-section">
            <h5>Trạng thái sản phẩm</h5>
            <div className="status-distribution">
              <div className="status-item">
                <div className="status-label">
                  <div className="status-indicator available"></div>
                  <span>Có sẵn</span>
                </div>
                <div className="status-value">{flashSale.stats.productStats.available}</div>
              </div>
              
              <div className="status-item">
                <div className="status-label">
                  <div className="status-indicator soldout"></div>
                  <span>Đã hết</span>
                </div>
                <div className="status-value">{flashSale.stats.productStats.soldout}</div>
              </div>
              
              <div className="status-item">
                <div className="status-label">
                  <div className="status-indicator upcoming"></div>
                  <span>Sắp có</span>
                </div>
                <div className="status-value">{flashSale.stats.productStats.upcoming}</div>
              </div>
              
              <div className="status-item">
                <div className="status-label">
                  <div className="status-indicator ended"></div>
                  <span>Đã kết thúc</span>
                </div>
                <div className="status-value">{flashSale.stats.productStats.ended}</div>
              </div>
            </div>
          </div>
          
          <div className="stats-section">
            <h5>Top sản phẩm</h5>
            
            {!flashSale.topProducts || flashSale.topProducts.length === 0 ? (
              <div className="no-top-products">
                <p>Chưa có sản phẩm nào</p>
              </div>
            ) : (
              <table className="top-products-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Giá gốc</th>
                    <th>Giá sale</th>
                    <th>Giảm</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {flashSale.topProducts.map((product, index) => (
                    <tr key={product._id || index}>
                      <td className="product-cell">
                        <div className="product-info">
                          <div className="product-image">
                            {product.image && <img src={product.image} alt={product.name} />}
                          </div>
                          <span className="product-name">{product.name}</span>
                        </div>
                      </td>
                      <td>{product.originalPrice?.toLocaleString('vi-VN')}đ</td>
                      <td>{product.salePrice?.toLocaleString('vi-VN')}đ</td>
                      <td>{product.discountPercent}%</td>
                      <td>
                        <div className={`product-status ${product.status}`}>
                          {product.status === 'available' ? 'Còn hàng' : 
                            product.status === 'soldout' ? 'Hết hàng' : 
                            product.status === 'upcoming' ? 'Sắp có' : 'Kết thúc'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      <div className="stats-footer">
        <button className="close-btn" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
};

export default FlashSaleStats;
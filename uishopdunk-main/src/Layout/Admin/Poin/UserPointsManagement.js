import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEdit, faPlus, faSpinner, faTimes, faHistory } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';

const UserPointsManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsAdjustment, setPointsAdjustment] = useState({
    amount: 0,
    reason: ''
  });
  const [pointsHistory, setPointsHistory] = useState([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Lấy danh sách tài khoản điểm thưởng khi component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Lọc kết quả tìm kiếm khi searchTerm thay đổi
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults(users);
    } else {
      const results = users.filter(user => 
        (user.phone && user.phone.includes(searchTerm)) || 
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSearchResults(results);
    }
  }, [searchTerm, users]);

  // Lấy danh sách tài khoản điểm thưởng
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3005/admin/loyalty/users');
      
      if (response.data && response.data.success) {
        setUsers(response.data.data);
        setSearchResults(response.data.data);
      } else {
        toast.error('Không thể tải danh sách thành viên');
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách thành viên:', error);
      toast.error('Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (searchTerm.trim() === '') {
      setSearchResults(users);
      return;
    }
    
    // Nếu searchTerm giống SĐT, tìm chính xác
    if (/^\d{10,11}$/.test(searchTerm.trim())) {
      const exactResult = users.find(user => user.phone === searchTerm.trim());
      
      if (exactResult) {
        setSearchResults([exactResult]);
      } else {
        // Thử tìm qua API nếu không tìm thấy trong danh sách hiện tại
        searchUserByPhone(searchTerm.trim());
      }
    } else {
      // Tìm theo từng phần với các trường khác
      const results = users.filter(user => 
        (user.phone && user.phone.includes(searchTerm)) || 
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSearchResults(results);
      
      if (results.length === 0) {
        // Thử tìm qua API nếu không tìm thấy trong danh sách hiện tại
        searchUserByEmail(searchTerm.trim());
      }
    }
  };

  // Tìm kiếm người dùng theo số điện thoại qua API
  const searchUserByPhone = async (phone) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3005/loyalty/user-points/${phone}`);
      
      if (response.data && response.data.success) {
        const user = response.data.data;
        setUsers(prevUsers => [...prevUsers, user]);
        setSearchResults([user]);
      } else {
        toast.error('Không tìm thấy thành viên với số điện thoại này');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm thành viên:', error);
      toast.error('Không tìm thấy thành viên với số điện thoại này');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Tìm kiếm người dùng theo email qua API
  const searchUserByEmail = async (email) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3005/loyalty/user-points-by-email/${email}`);
      
      if (response.data && response.data.success) {
        const user = response.data.data;
        setUsers(prevUsers => [...prevUsers, user]);
        setSearchResults([user]);
      } else {
        toast.error('Không tìm thấy thành viên với email này');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm thành viên:', error);
      toast.error('Không tìm thấy thành viên với email này');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal chỉnh sửa điểm thưởng
  const openEditModal = (user) => {
    setSelectedUser(user);
    setPointsAdjustment({
      amount: 0,
      reason: ''
    });
    setEditModalOpen(true);
  };

  // Mở modal lịch sử điểm thưởng
  const openHistoryModal = async (user) => {
    setSelectedUser(user);
    fetchPointsHistory(user);
    setHistoryModalOpen(true);
  };

  // Lấy lịch sử điểm thưởng
  const fetchPointsHistory = async (user) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3005/admin/loyalty/user-points-history/${user._id}`);
      
      if (response.data && response.data.success) {
        setPointsHistory(response.data.data);
      } else {
        toast.error('Không thể tải lịch sử điểm thưởng');
      }
    } catch (error) {
      console.error('Lỗi khi tải lịch sử điểm thưởng:', error);
      toast.error('Không thể tải lịch sử điểm thưởng');
    } finally {
      setLoading(false);
    }
  };

  // Điều chỉnh điểm thưởng
  const handleAdjustPoints = async () => {
    if (!selectedUser) return;
    
    if (!pointsAdjustment.reason) {
      toast.error('Vui lòng nhập lý do điều chỉnh điểm');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:3005/admin/loyalty/adjust-points', {
        userId: selectedUser._id,
        pointsAdjustment: parseInt(pointsAdjustment.amount),
        reason: pointsAdjustment.reason
      });
      
      if (response.data && response.data.success) {
        const updatedUser = response.data.data;
        
        // Cập nhật danh sách người dùng
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === selectedUser._id ? updatedUser : user
          )
        );
        
        // Cập nhật kết quả tìm kiếm
        setSearchResults(prevResults => 
          prevResults.map(user => 
            user._id === selectedUser._id ? updatedUser : user
          )
        );
        
        toast.success(`Đã điều chỉnh ${pointsAdjustment.amount} điểm cho thành viên`);
        setEditModalOpen(false);
      } else {
        toast.error('Không thể điều chỉnh điểm thưởng');
      }
    } catch (error) {
      console.error('Lỗi khi điều chỉnh điểm thưởng:', error);
      toast.error('Không thể điều chỉnh điểm thưởng');
    } finally {
      setLoading(false);
    }
  };

  // Tính toán phân trang
  const paginatedResults = searchResults.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);

  // Hiển thị tên cấp thành viên
  const getTierName = (tier) => {
    switch (tier) {
      case 'silver': return 'Bạc';
      case 'gold': return 'Vàng';
      case 'platinum': return 'Bạch Kim';
      default: return 'Tiêu Chuẩn';
    }
  };

  // Hiển thị loại giao dịch điểm
  const getTransactionType = (type) => {
    switch (type) {
      case 'earned': return 'Tích điểm';
      case 'redeemed': return 'Đổi điểm';
      case 'adjusted': return 'Điều chỉnh';
      case 'expired': return 'Hết hạn';
      default: return 'Khác';
    }
  };

  return (
    <div className="user-points-management">
      <div className="search-section">
        <h3>Tìm kiếm thành viên</h3>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Tìm theo số điện thoại hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faSearch} />
            )}
            <span>Tìm kiếm</span>
          </button>
        </form>
      </div>

      <div className="results-section">
        <h3>Danh sách thành viên ({searchResults.length})</h3>
        
        {loading ? (
          <div className="loading-container">
            <FontAwesomeIcon icon={faSpinner} spin />
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="no-results">
            <p>Không tìm thấy thành viên nào</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Số điện thoại</th>
                    <th>Email</th>
                    <th>Tổng điểm</th>
                    <th>Điểm khả dụng</th>
                    <th>Hạng thành viên</th>
                    <th>Cập nhật lần cuối</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.map(user => (
                    <tr key={user._id}>
                      <td>{user.phone}</td>
                      <td>{user.email}</td>
                      <td>{user.totalPoints.toLocaleString('vi-VN')}</td>
                      <td>{user.availablePoints.toLocaleString('vi-VN')}</td>
                      <td>
                        <span className={`tier-badge ${user.tier}`}>
                          {getTierName(user.tier)}
                        </span>
                      </td>
                      <td>{moment(user.lastUpdated).format('DD/MM/YYYY')}</td>
                      <td>
                        <button 
                          className="action-button edit"
                          onClick={() => openEditModal(user)}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button 
                          className="action-button history"
                          onClick={() => openHistoryModal(user)}
                        >
                          <FontAwesomeIcon icon={faHistory} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setPage(1)} 
                  disabled={page === 1}
                >
                  &laquo;
                </button>
                <button 
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                  disabled={page === 1}
                >
                  &lt;
                </button>
                
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setPage(index + 1)}
                    className={page === index + 1 ? 'active' : ''}
                  >
                    {index + 1}
                  </button>
                ))}
                
                <button 
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={page === totalPages}
                >
                  &gt;
                </button>
                <button 
                  onClick={() => setPage(totalPages)} 
                  disabled={page === totalPages}
                >
                  &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal điều chỉnh điểm */}
      {editModalOpen && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Điều chỉnh điểm thưởng</h3>
              <button 
                className="close-button"
                onClick={() => setEditModalOpen(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="user-info">
                <p><strong>Thành viên:</strong> {selectedUser.phone}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Điểm hiện tại:</strong> {selectedUser.availablePoints.toLocaleString('vi-VN')}</p>
                <p><strong>Hạng thành viên:</strong> {getTierName(selectedUser.tier)}</p>
              </div>
              
              <div className="form-group">
                <label>Số điểm điều chỉnh:</label>
                <input
                  type="number"
                  value={pointsAdjustment.amount}
                  onChange={(e) => setPointsAdjustment({...pointsAdjustment, amount: e.target.value})}
                  placeholder="Nhập số điểm (dương hoặc âm)"
                />
                <small>Nhập số âm để trừ điểm</small>
              </div>
              
              <div className="form-group">
                <label>Lý do điều chỉnh:</label>
                <textarea
                  value={pointsAdjustment.reason}
                  onChange={(e) => setPointsAdjustment({...pointsAdjustment, reason: e.target.value})}
                  placeholder="Nhập lý do điều chỉnh điểm"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel"
                onClick={() => setEditModalOpen(false)}
              >
                Hủy
              </button>
              <button 
                className="submit"
                onClick={handleAdjustPoints}
                disabled={loading}
              >
                {loading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lịch sử điểm */}
      {historyModalOpen && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Lịch sử điểm thưởng</h3>
              <button 
                className="close-button"
                onClick={() => setHistoryModalOpen(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="user-info">
                <p><strong>Thành viên:</strong> {selectedUser.phone}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Điểm hiện tại:</strong> {selectedUser.availablePoints.toLocaleString('vi-VN')}</p>
              </div>
              
              {loading ? (
                <div className="loading-container">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <p>Đang tải lịch sử điểm...</p>
                </div>
              ) : pointsHistory.length === 0 ? (
                <div className="no-results">
                  <p>Chưa có lịch sử điểm thưởng</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Loại</th>
                        <th>Số điểm</th>
                        <th>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsHistory.map(history => (
                        <tr key={history._id}>
                          <td>{moment(history.date).format('DD/MM/YYYY')}</td>
                          <td>{getTransactionType(history.type)}</td>
                          <td className={history.amount >= 0 ? 'positive' : 'negative'}>
                            {history.amount >= 0 ? '+' : ''}{history.amount.toLocaleString('vi-VN')}
                          </td>
                          <td>{history.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="submit"
                onClick={() => setHistoryModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPointsManagement;
import { useState, useEffect } from 'react';
import { FaEdit, FaPlus, FaSearch,FaGift } from 'react-icons/fa';
import { FaTrashCan } from 'react-icons/fa6';
import './UserLayout.scss';

function UserLayout() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch dữ liệu từ API
  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:3005/auth/userlist');
      if (response.ok) {
        const users = await response.json();
        setData(users);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // API cập nhật trạng thái user
  const updateUserStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3005/auth/updateStatus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setData((prevData) =>
          prevData.map((user) =>
            user._id === id ? { ...user, status: newStatus } : user
          )
        );
      } else {
        console.error('Cập nhật trạng thái thất bại');
      }
    } catch (error) {
      console.error('Lỗi server:', error);
    }
  };

  // Xử lý bật/tắt trạng thái
  const toggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    updateUserStatus(id, newStatus);
  };

  // Xử lý tìm kiếm
  const filteredData = data.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Xử lý phân trang
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  return (
    <div className="blog_container">
      <div className="nav_chucnang">
      <button className="btn-voucher">
          <FaGift /> Add Voucher
        </button>
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button>
            <FaSearch />
          </button>
        </div>
      </div>
      <table className="tablenhap">
        <thead>
          <tr>
            <th>STT</th>
            <th>ID</th>
            <th>Tên</th>
            <th>Email</th>
            <th>Phương thức</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map((item, index) => (
            <tr key={index}>
              <td>{indexOfFirstItem + index + 1}</td>
              <td>{item._id}</td>
              <td>{item.username}</td>
              <td>{item.email}</td>
              <td>{item.socialLogins ? 'Google/Facebook' : 'Email'}</td>
              <td>{item.status}</td>
              <td>
                <button
                  className={item.status === 'Active' ? 'btn-active' : 'btn-inactive'}
                  onClick={() => toggleStatus(item._id, item.status)}
                >
                  {item.status === 'Active' ? 'ẩn' : 'hiện'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phân trang */}
      <div className="pagination">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
          Previous
        </button>
        <span>Trang {currentPage} / {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export default UserLayout;

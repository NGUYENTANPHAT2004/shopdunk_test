import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faTimes, 
  faSpinner, 
  faGift, 
  faPercent, 
  faShippingFast, 
  faTag
} from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';

const RedemptionOptions = () => {
  const [options, setOptions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsCost: '',
    voucherType: 'percentage',
    voucherValue: '',
    voucherId: '',
    minOrderValue: '0',
    availableTiers: [],
    limitPerUser: '1',
    totalQuantity: '100',
    startDate: '',
    endDate: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchOptions();
    fetchVouchers();
  }, []);

  // Lấy danh sách tùy chọn đổi điểm
  const fetchOptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3005/admin/loyalty/redemption-options');
      
      if (response.data && response.data.success) {
        setOptions(response.data.data);
      } else {
        toast.error('Không thể tải danh sách tùy chọn đổi điểm');
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách tùy chọn đổi điểm:', error);
      toast.error('Không thể tải danh sách tùy chọn đổi điểm');
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách voucher có sẵn
  const fetchVouchers = async () => {
    try {
      const response = await axios.get('http://localhost:3005/getmagg');
      
      if (response.data && response.data.success) {
        setVouchers(response.data.data);
      } else {
        toast.error('Không thể tải danh sách voucher');
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách voucher:', error);
      toast.error('Không thể tải danh sách voucher');
    }
  };

  // Mở modal tạo mới
  const openCreateModal = () => {
    setEditMode(false);
    setFormData({
      name: '',
      description: '',
      pointsCost: '',
      voucherType: 'percentage',
      voucherValue: '',
      voucherId: '',
      minOrderValue: '0',
      availableTiers: [],
      limitPerUser: '1',
      totalQuantity: '100',
      startDate: moment().format('YYYY-MM-DD'),
      endDate: moment().add(3, 'months').format('YYYY-MM-DD'),
      imageUrl: ''
    });
    setModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const openEditModal = (option) => {
    setEditMode(true);
    setFormData({
      _id: option._id,
      name: option.name,
      description: option.description || '',
      pointsCost: option.pointsCost.toString(),
      voucherType: option.voucherType,
      voucherValue: option.voucherValue.toString(),
      voucherId: option.voucherId,
      minOrderValue: option.minOrderValue.toString(),
      availableTiers: option.availableTiers || [],
      limitPerUser: option.limitPerUser.toString(),
      totalQuantity: option.totalQuantity.toString(),
      remainingQuantity: option.remainingQuantity,
      startDate: moment(option.startDate).format('YYYY-MM-DD'),
      endDate: moment(option.endDate).format('YYYY-MM-DD'),
      isActive: option.isActive,
      imageUrl: option.imageUrl || ''
    });
    setModalOpen(true);
  };

  // Xử lý thay đổi form
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'availableTiers') {
      // Xử lý cho multi-select checkbox
      let updatedTiers = [...formData.availableTiers];
      
      if (checked) {
        updatedTiers.push(value);
      } else {
        updatedTiers = updatedTiers.filter(tier => tier !== value);
      }
      
      setFormData(prev => ({
        ...prev,
        availableTiers: updatedTiers
      }));
    } else {
      // Xử lý cho các trường input thông thường
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Lưu tùy chọn đổi điểm
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra các trường bắt buộc
    if (!formData.name || !formData.pointsCost || !formData.voucherValue || !formData.voucherId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    
    try {
      setLoading(true);
      
      if (editMode) {
        const response = await axios.put(`http://localhost:3005/admin/loyalty/update-redemption/${formData._id}`, formData);
        
        if (response.data && response.data.success) {
          const updatedOptions = options.map(option => 
            option._id === formData._id ? response.data.data : option
          );
          
          setOptions(updatedOptions);
          toast.success('Cập nhật tùy chọn đổi điểm thành công');
        } else {
          toast.error('Không thể cập nhật tùy chọn đổi điểm');
        }
      } else {
        const response = await axios.post('http://localhost:3005/admin/loyalty/create-redemption', formData);
        
        if (response.data && response.data.success) {
          setOptions([...options, response.data.data]);
          toast.success('Tạo tùy chọn đổi điểm thành công');
        } else {
          toast.error('Không thể tạo tùy chọn đổi điểm');
        }
      }
      
      setModalOpen(false);
    } catch (error) {
      console.error('Lỗi khi lưu tùy chọn đổi điểm:', error);
      toast.error('Không thể lưu tùy chọn đổi điểm');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa tùy chọn đổi điểm
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tùy chọn đổi điểm này?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.delete(`http://localhost:3005/admin/loyalty/delete-redemption/${id}`);
      
      if (response.data && response.data.success) {
        setOptions(options.filter(option => option._id !== id));
        toast.success('Xóa tùy chọn đổi điểm thành công');
      } else {
        toast.error('Không thể xóa tùy chọn đổi điểm');
      }
    } catch (error) {
      console.error('Lỗi khi xóa tùy chọn đổi điểm:', error);
      toast.error('Không thể xóa tùy chọn đổi điểm');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý kích hoạt/vô hiệu hóa tùy chọn đổi điểm
  const handleToggleActive = async (id, currentStatus) => {
    try {
      setLoading(true);
      const response = await axios.patch(`http://localhost:3005/admin/loyalty/toggle-redemption/${id}`, { 
        isActive: !currentStatus 
      });
      
      if (response.data && response.data.success) {
        setOptions(options.map(option => 
          option._id === id ? response.data.data : option
        ));
        
        toast.success(`Đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'} tùy chọn đổi điểm`);
      } else {
        toast.error('Không thể thay đổi trạng thái tùy chọn đổi điểm');
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi trạng thái tùy chọn đổi điểm:', error);
      toast.error('Không thể thay đổi trạng thái tùy chọn đổi điểm');
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị icon tương ứng với loại voucher
  const getVoucherTypeIcon = (type) => {
    switch (type) {
      case 'percentage': return <FontAwesomeIcon icon={faPercent} />;
      case 'fixed': return <FontAwesomeIcon icon={faTag} />;
      case 'shipping': return <FontAwesomeIcon icon={faShippingFast} />;
      case 'product': return <FontAwesomeIcon icon={faGift} />;
      default: return <FontAwesomeIcon icon={faGift} />;
    }
  };

  // Hiển thị tên loại voucher
  const getVoucherTypeName = (type) => {
    switch (type) {
      case 'percentage': return 'Giảm %';
      case 'fixed': return 'Giảm tiền';
      case 'shipping': return 'Miễn phí vận chuyển';
      case 'product': return 'Giảm giá sản phẩm';
      default: return 'Khác';
    }
  };

  // Hiển thị tên cấp thành viên
  const getTierName = (tier) => {
    switch (tier) {
      case 'silver': return 'Bạc';
      case 'gold': return 'Vàng';
      case 'platinum': return 'Bạch Kim';
      default: return 'Tiêu Chuẩn';
    }
  };

  return (
    <div className="redemption-options">
      <div className="header-actions">
        <h3>Quản lý tùy chọn đổi điểm</h3>
        <button 
          className="create-button"
          onClick={openCreateModal}
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Tạo mới</span>
        </button>
      </div>

      {loading && !modalOpen ? (
        <div className="loading-container">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : options.length === 0 ? (
        <div className="no-results">
          <p>Chưa có tùy chọn đổi điểm nào</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tên quà</th>
                <th>Loại</th>
                <th>Giá trị</th>
                <th>Điểm</th>
                <th>Cấp thành viên</th>
                <th>Còn lại</th>
                <th>Hạn sử dụng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {options.map(option => (
                <tr key={option._id} className={!option.isActive ? 'inactive' : ''}>
                  <td className="option-name">
                    <span className="name">{option.name}</span>
                    {option.description && (
                      <span className="description">{option.description}</span>
                    )}
                  </td>
                  <td className="option-type">
                    {getVoucherTypeIcon(option.voucherType)}
                    <span>{getVoucherTypeName(option.voucherType)}</span>
                  </td>
                  <td>
                    {option.voucherType === 'percentage' || option.voucherType === 'product'
                      ? `${option.voucherValue}%`
                      : option.voucherType === 'fixed'
                      ? `${option.voucherValue.toLocaleString('vi-VN')}đ`
                      : 'Miễn phí'}
                  </td>
                  <td>{option.pointsCost.toLocaleString('vi-VN')}</td>
                  <td>
                    {option.availableTiers && option.availableTiers.length > 0 
                      ? option.availableTiers.map(tier => getTierName(tier)).join(', ')
                      : 'Tất cả'}
                  </td>
                  <td>
                    {option.remainingQuantity}/{option.totalQuantity}
                    <br />
                    <small>({Math.round(option.remainingQuantity / option.totalQuantity * 100)}%)</small>
                  </td>
                  <td>{moment(option.endDate).format('DD/MM/YYYY')}</td>
                  <td>
                    <span className={`status-badge ${option.isActive ? 'active' : 'inactive'}`}>
                      {option.isActive ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="action-button edit"
                      onClick={() => openEditModal(option)}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button 
                      className="action-button delete"
                      onClick={() => handleDelete(option._id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                    <button 
                      className={`action-button toggle ${option.isActive ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleActive(option._id, option.isActive)}
                    >
                      {option.isActive ? 'Tắt' : 'Bật'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal tạo/chỉnh sửa tùy chọn đổi điểm */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editMode ? 'Chỉnh sửa tùy chọn đổi điểm' : 'Tạo tùy chọn đổi điểm mới'}</h3>
              <button 
                className="close-button"
                onClick={() => setModalOpen(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="availableTiers"
                      value="gold"
                      checked={formData.availableTiers.includes('gold')}
                      onChange={handleChange}
                    />
                    Vàng
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="availableTiers"
                      value="platinum"
                      checked={formData.availableTiers.includes('platinum')}
                      onChange={handleChange}
                    />
                    Bạch Kim
                  </label>
                </div>
                <small>Để trống để cho phép tất cả các cấp</small>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Giới hạn đổi điểm/người:</label>
                  <input
                    type="number"
                    name="limitPerUser"
                    value={formData.limitPerUser}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
                
                <div className="form-group">
                  <label>Tổng số lượng:</label>
                  <input
                    type="number"
                    name="totalQuantity"
                    value={formData.totalQuantity}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày bắt đầu:</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Ngày kết thúc:</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Hình ảnh (URL):</label>
                <input
                  type="text"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="Nhập URL hình ảnh (tùy chọn)"
                />
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button"
                  className="cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="submit"
                  disabled={loading}
                >
                  {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : (editMode ? 'Cập nhật' : 'Tạo mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedemptionOptions;
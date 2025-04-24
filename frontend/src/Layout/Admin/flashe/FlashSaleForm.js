import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faCalendarAlt, 
  faImage, 
  faPlus, 
  faTrash, 
  faSpinner,
  faSearch,
  faExclamationTriangle,
  faMemory,
  faPalette
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import moment from 'moment';
import { toast } from 'react-toastify';
import './FlashSaleForm.scss';

const FlashSaleForm = ({ isEdit, flashSale, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    endTime: moment().add(1, 'day').format('YYYY-MM-DDTHH:mm'),
    isActive: true,
    priority: 0,
    bannerImage: null
  });
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  
  // Thêm state cho dung lượng và màu sắc
  const [productVariants, setProductVariants] = useState({});
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Populate form data if editing
  useEffect(() => {
    if (isEdit && flashSale) {
      setFormData({
        name: flashSale.name || '',
        description: flashSale.description || '',
        startTime: moment(flashSale.startTime).format('YYYY-MM-DDTHH:mm'),
        endTime: moment(flashSale.endTime).format('YYYY-MM-DDTHH:mm'),
        isActive: flashSale.isActive !== undefined ? flashSale.isActive : true,
        priority: flashSale.priority || 0,
        bannerImage: null // Can't populate file input
      });
      
      // If there's an existing banner image
      if (flashSale.bannerImage) {
        setFilePreview(flashSale.bannerImage);
      }
      
      // Populate selected products
      if (flashSale.products && flashSale.products.length > 0) {
        const formattedProducts = flashSale.products.map(product => ({
          id: product.productId._id,
          name: product.productId.name,
          image: product.productId.image,
          originalPrice: product.originalPrice,
          salePrice: product.salePrice,
          discountPercent: product.discountPercent,
          quantity: product.quantity,
          limit: product.limit || 5,
          dungluongId: product.dungluongId || null,
          dungluongName: product.dungluongId ? product.dungluongId.name : 'Tất cả',
          mausacId: product.mausacId || null,
          mausacName: product.mausacId ? product.mausacId.name : 'Tất cả'
        }));
        
        setSelectedProducts(formattedProducts);
      }
    }
  }, [isEdit, flashSale]);

  // Search products function
  const searchProducts = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3005/search-suggestions?keyword=${encodeURIComponent(searchTerm)}`);
      
      if (response.data && response.data.success) {
        setSearchResults(response.data.suggestions || []);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm sản phẩm:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Throttled search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchProducts();
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      // Handle file input
      const file = files[0];
      setFormData(prev => ({
        ...prev,
        [name]: file
      }));
      
      // Create preview URL
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreview(previewUrl);
      } else {
        setFilePreview(null);
      }
    } else if (type === 'checkbox') {
      // Handle checkbox
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      // Handle other inputs
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Fetch product variants (dungluong and mausac)
  const fetchProductVariants = async (productId) => {
    try {
      setLoadingVariants(true);
      
      // Sử dụng endpoint lấy biến thể của sản phẩm thay vì thể loại
      const response = await axios.get(`http://localhost:3005/getchitietsp-variants/${productId}`);
      
      if (response.data && response.data.dungluongs) {
        setProductVariants(prev => ({
          ...prev,
          [productId]: response.data.dungluongs
        }));
      }
    } catch (error) {
      console.error('Lỗi khi lấy biến thể sản phẩm:', error);
      toast.error('Không thể lấy biến thể sản phẩm');
    } finally {
      setLoadingVariants(false);
    }
  };

  // Add product to selected list
  const addProduct = (product) => {
    // Check if product is already selected
    if (selectedProducts.some(p => p.id === product._id)) {
      toast.info('Sản phẩm đã được thêm vào danh sách');
      return;
    }
    
    // Fetch product variants nếu có nametheloai
    if (product.nametheloai) {
      fetchProductVariants(product._id, product.nametheloai);
    } else {
      console.log('Không có thông tin nametheloai cho sản phẩm:', product.name);
    }
    
    // Add product with default values
    setSelectedProducts(prev => [...prev, {
      id: product._id,
      name: product.name,
      image: product.image,
      originalPrice: product.price,
      salePrice: Math.round(product.price * 0.9), // Default 10% off
      discountPercent: 10,
      quantity: 50, // Default quantity
      limit: 5, // Default limit per customer
      dungluongId: null,
      dungluongName: 'Tất cả',
      mausacId: null,
      mausacName: 'Tất cả',
      nametheloai: product.nametheloai // Lưu trữ nametheloai
    }]);
    
    // Clear search
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Remove product from selected list
  const removeProduct = (id) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  // Update product info
  const updateProductInfo = (id, field, value) => {
    setSelectedProducts(prev => prev.map(product => {
      if (product.id === id) {
        const updatedProduct = { ...product, [field]: value };
        
        // Automatically calculate discount percent when price changes
        if (field === 'salePrice') {
          const discountPercent = Math.round((1 - value / product.originalPrice) * 100);
          updatedProduct.discountPercent = discountPercent;
        } else if (field === 'originalPrice') {
          const discountPercent = Math.round((1 - product.salePrice / value) * 100);
          updatedProduct.discountPercent = discountPercent;
        } else if (field === 'discountPercent') {
          // Recalculate sale price when discount percent changes
          const salePrice = Math.round(product.originalPrice * (1 - value / 100));
          updatedProduct.salePrice = salePrice;
        } else if (field === 'dungluongId') {
          // Reset mausac when dungluong changes
          updatedProduct.mausacId = null;
          updatedProduct.mausacName = 'Tất cả';
          
          // Update dungluongName
          const productId = product.id;
          const variants = productVariants[productId] || [];
          const dungluong = variants.find(d => d._id === value);
          updatedProduct.dungluongName = dungluong ? dungluong.name : 'Tất cả';
          
          // Update original price based on dung lượng if needed
          if (dungluong && dungluong.mausac && dungluong.mausac.length > 0) {
            // Use the price of the first color variant as default
            const defaultPrice = dungluong.mausac[0].giagoc || product.originalPrice;
            updatedProduct.originalPrice = defaultPrice;
            updatedProduct.salePrice = Math.round(defaultPrice * (1 - updatedProduct.discountPercent / 100));
          }
        } else if (field === 'mausacId') {
          // Update mausacName
          const productId = product.id;
          const variants = productVariants[productId] || [];
          const dungluong = variants.find(d => d._id === product.dungluongId);
          
          if (dungluong) {
            const mausac = dungluong.mausac.find(m => m._id === value);
            updatedProduct.mausacName = mausac ? mausac.name : 'Tất cả';
            
            // Update original price based on màu sắc
            if (mausac) {
              updatedProduct.originalPrice = mausac.giagoc || product.originalPrice;
              updatedProduct.salePrice = Math.round(mausac.giagoc * (1 - updatedProduct.discountPercent / 100));
            }
          }
        }
        
        return updatedProduct;
      }
      return product;
    }));
  };

  // Get available colors for a selected capacity
  const getAvailableColors = (productId, dungluongId) => {
    if (!productId || !dungluongId || !productVariants[productId]) {
      return [];
    }
    
    const dungluong = productVariants[productId].find(d => d._id === dungluongId);
    return dungluong ? dungluong.mausac : [];
  };

  // Validate form before submission
  const validateForm = () => {
    // Check required fields
    if (!formData.name) {
      toast.error('Vui lòng nhập tên Flash Sale');
      return false;
    }
    
    // Check date validity
    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    
    if (startTime >= endTime) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      return false;
    }
    
    // Check if any products are selected
    if (selectedProducts.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm vào Flash Sale');
      return false;
    }
    
    // Validate product info
    for (const product of selectedProducts) {
      if (!product.originalPrice || !product.salePrice || !product.quantity) {
        toast.error('Vui lòng nhập đầy đủ thông tin cho tất cả sản phẩm');
        return false;
      }
      
      if (product.originalPrice <= 0 || product.salePrice <= 0 || product.quantity <= 0) {
        toast.error('Giá và số lượng sản phẩm phải lớn hơn 0');
        return false;
      }
      
      if (product.salePrice >= product.originalPrice) {
        toast.error('Giá Flash Sale phải thấp hơn giá gốc');
        return false;
      }
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare form data
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description);
      formDataObj.append('startTime', formData.startTime);
      formDataObj.append('endTime', formData.endTime);
      formDataObj.append('isActive', formData.isActive);
      formDataObj.append('priority', formData.priority);
      
      // Add banner image if present
      if (formData.bannerImage) {
        formDataObj.append('bannerImage', formData.bannerImage);
      }
      
      // Add products as JSON string
      const productsData = selectedProducts.map(async (product) => {
        // Kiểm tra tồn kho
        const stockResponse = await axios.get(`http://localhost:3005/stock/${product.id}/${product.dungluongId || 'null'}/${product.mausacId || 'null'}`);
        const stockData = stockResponse.data;
        
        return {
          productId: product.id,
          originalPrice: parseFloat(product.originalPrice),
          salePrice: parseFloat(product.salePrice),
          discountPercent: parseFloat(product.discountPercent),
          quantity: parseInt(product.quantity),
          limit: parseInt(product.limit) || 5,
          dungluongId: product.dungluongId,
          mausacId: product.mausacId,
          originalStock: stockData.unlimitedStock ? null : stockData.stock
        };
      })
      const resolvedProductsData = await Promise.all(productsData);
      formDataObj.append('products', JSON.stringify(resolvedProductsData));
      
      let response;
      if (isEdit && flashSale) {
        // Update existing Flash Sale
        response = await axios.put(`http://localhost:3005/admin/flash-sales/${flashSale._id}`, formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Create new Flash Sale
        response = await axios.post('http://localhost:3005/admin/flash-sales', formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      if (response.data && response.data.success) {
        toast.success(isEdit ? 'Cập nhật Flash Sale thành công' : 'Tạo Flash Sale thành công');
        onSubmit();
      } else {
        toast.error(response.data?.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Lỗi khi lưu Flash Sale:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi lưu Flash Sale');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flash-sale-form">
      <div className="form-header">
        <h3>{isEdit ? 'Chỉnh sửa Flash Sale' : 'Tạo Flash Sale mới'}</h3>
        <button className="close-button" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-body">
          <div className="form-section">
            <h4>Thông tin cơ bản</h4>
            
            <div className="form-group">
              <label htmlFor="name">Tên Flash Sale <span className="required">*</span></label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nhập tên Flash Sale"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Mô tả</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Nhập mô tả (không bắt buộc)"
                rows="3"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Thời gian bắt đầu <span className="required">*</span></label>
                <div className="input-with-icon">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="endTime">Thời gian kết thúc <span className="required">*</span></label>
                <div className="input-with-icon">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="isActive">Trạng thái</label>
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <label htmlFor="isActive" className="checkbox-label">Kích hoạt</label>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="priority">Mức ưu tiên</label>
                <input
                  type="number"
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  min="0"
                  max="100"
                />
                <small>Giá trị cao hơn sẽ hiển thị trước</small>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="bannerImage">Ảnh banner</label>
              <div className="file-input-container">
                <div className="file-input">
                  <input
                    type="file"
                    id="bannerImage"
                    name="bannerImage"
                    onChange={handleChange}
                    accept="image/*"
                  />
                  <div className="file-input-label">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Chọn ảnh</span>
                  </div>
                </div>
                
                {filePreview && (
                  <div className="image-preview">
                    <img src={filePreview} alt="Banner preview" />
                    <button 
                      type="button" 
                      className="remove-image" 
                      onClick={() => {
                        setFilePreview(null);
                        setFormData(prev => ({ ...prev, bannerImage: null }));
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h4>Sản phẩm Flash Sale</h4>
            
            <div className="product-search">
              <div className="search-container-flashe">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                />
                <button type="button" onClick={searchProducts}>
                  <FontAwesomeIcon icon={faSearch} />
                </button>
              </div>
              
              {showSearchResults && (
                <div className="search-results">
                  {loading ? (
                    <div className="loading">
                      <FontAwesomeIcon icon={faSpinner} spin />
                      <span>Đang tìm kiếm...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="no-results">
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                      <span>Không tìm thấy sản phẩm</span>
                    </div>
                  ) : (
                    <ul>
                      {searchResults.map(product => (
                        <li key={product._id} onClick={() => addProduct(product)}>
                          <div className="product-image">
                            <img src={product.image} alt={product.name} />
                          </div>
                          <div className="product-info">
                            <span className="product-name">{product.name}</span>
                            <span className="product-price">{product.price?.toLocaleString('vi-VN')}đ</span>
                          </div>
                          <button type="button" className="add-button">
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            
            <div className="selected-products">
              {selectedProducts.length === 0 ? (
                <div className="no-products">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  <p>Chưa có sản phẩm nào được thêm vào Flash Sale</p>
                  <p className="help-text">Tìm kiếm và thêm sản phẩm vào Flash Sale</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Dung lượng</th>
                      <th>Màu sắc</th>
                      <th>Giá gốc (đ)</th>
                      <th>Giá Flash Sale (đ)</th>
                      <th>Giảm (%)</th>
                      <th>Số lượng</th>
                      <th>Giới hạn</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map(product => (
                      <tr key={`${product.id}-${product.dungluongId || 'all'}-${product.mausacId || 'all'}`}>
                        <td className="product-cell">
                          <div className="product-info">
                            <div className="product-image">
                              <img src={product.image} alt={product.name} />
                            </div>
                            <span className="product-name">{product.name}</span>
                          </div>
                        </td>
                        <td className="variant-cell">
                          <select
                            value={product.dungluongId || ''}
                            onChange={(e) => updateProductInfo(product.id, 'dungluongId', e.target.value || null)}
                          >
                            <option value="">Tất cả</option>
                            {productVariants[product.id]?.map(dungluong => (
                              <option key={dungluong._id} value={dungluong._id}>
                                {dungluong.name}
                              </option>
                            ))}
                          </select>
                          {loadingVariants && (
                            <div className="variant-loading">
                              <FontAwesomeIcon icon={faSpinner} spin />
                            </div>
                          )}
                        </td>
                        <td className="variant-cell">
                          <select
                            value={product.mausacId || ''}
                            onChange={(e) => updateProductInfo(product.id, 'mausacId', e.target.value || null)}
                            disabled={!product.dungluongId}
                          >
                            <option value="">Tất cả</option>
                            {getAvailableColors(product.id, product.dungluongId)?.map(mausac => (
                              <option key={mausac._id} value={mausac._id}>
                                {mausac.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.originalPrice}
                            onChange={(e) => updateProductInfo(product.id, 'originalPrice', e.target.value)}
                            min="1000"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.salePrice}
                            onChange={(e) => updateProductInfo(product.id, 'salePrice', e.target.value)}
                            min="1000"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.discountPercent}
                            onChange={(e) => updateProductInfo(product.id, 'discountPercent', e.target.value)}
                            min="1"
                            max="99"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => updateProductInfo(product.id, 'quantity', e.target.value)}
                            min="1"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={product.limit}
                            onChange={(e) => updateProductInfo(product.id, 'limit', e.target.value)}
                            min="1"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="remove-button"
                            onClick={() => removeProduct(product.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        
        <div className="form-footer">
          <button type="button" className="cancel-button" onClick={onClose}>
            Hủy
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>{isEdit ? 'Cập nhật' : 'Tạo mới'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FlashSaleForm;
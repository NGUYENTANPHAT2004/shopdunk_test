import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ProductFlashSale from '../../components/flashe/ProductFlashSale';
import { useFlashSale } from '../../context/Flashecontext';
import { toast } from 'react-toastify';
import './ChiTietLayout.scss';

const ChiTietLayout = () => {
  const { loaisp, tieude } = useParams();
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dungLuongs, setDungLuongs] = useState([]);
  const [selectedDungLuong, setSelectedDungLuong] = useState(null);
  const [mauSacs, setMauSacs] = useState([]);
  const [selectedMauSac, setSelectedMauSac] = useState(null);
  const [stockInfo, setStockInfo] = useState({ status: 'loading', quantity: 0 });
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  // State cho Flash Sale
  const [isInFlashSale, setIsInFlashSale] = useState(false);
  const [flashSalePrice, setFlashSalePrice] = useState(null);
  const [flashSaleVariants, setFlashSaleVariants] = useState({});
  const [hasFlashSaleVariant, setHasFlashSaleVariant] = useState(false);
  const [flashSaleInfo, setFlashSaleInfo] = useState(null);
  
  const { checkProductInFlashSale, updateProductQuantity, getProductFlashSaleVariants } = useFlashSale();

  // Fetch dữ liệu sản phẩm
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch thông tin sản phẩm
        const response = await axios.get(`http://localhost:3005/chitietsanpham/${tieude}`);
        setProductData(response.data);
        
        // Lấy dung lượng của sản phẩm
        const dlResponse = await axios.get(`http://localhost:3005/dungluongmay/${loaisp}`);
        const availableDungLuongs = dlResponse.data.filter(dl => dl.mausac && dl.mausac.length > 0);
        setDungLuongs(availableDungLuongs);
        
        if (availableDungLuongs.length > 0) {
          // Kiểm tra biến thể Flash Sale
          const flashSaleResponse = await getProductFlashSaleVariants(response.data._id);
          
          if (flashSaleResponse.success && flashSaleResponse.variants.length > 0) {
            // Map biến thể Flash Sale để dễ tìm kiếm
            const variantMap = {};
            flashSaleResponse.variants.forEach(variant => {
              const key = `${variant.dungluongId}-${variant.mausacId}`;
              variantMap[key] = variant;
            });
            
            setFlashSaleVariants(variantMap);
            setHasFlashSaleVariant(true);
            
            // Nếu có biến thể Flash Sale mặc định, chọn nó
            if (flashSaleResponse.defaultVariant) {
              const { dungluongId, mausacId } = flashSaleResponse.defaultVariant;
              
              // Tìm dung lượng Flash Sale
              const flashSaleDungLuong = availableDungLuongs.find(dl => dl._id === dungluongId);
              
              if (flashSaleDungLuong) {
                setSelectedDungLuong(flashSaleDungLuong);
                setMauSacs(flashSaleDungLuong.mausac);
                
                // Tìm màu sắc Flash Sale
                const flashSaleMauSac = flashSaleDungLuong.mausac.find(ms => ms._id === mausacId);
                if (flashSaleMauSac) {
                  setSelectedMauSac(flashSaleMauSac);
                  
                  // Kiểm tra tồn kho và Flash Sale
                  checkStock(response.data._id, dungluongId, mausacId);
                  checkFlashSale(response.data._id, dungluongId, mausacId);
                  return; // Thoát sớm vì đã xử lý chọn biến thể
                }
              }
            }
          }
          
          // Nếu không có Flash Sale hoặc không tìm thấy biến thể Flash Sale, chọn biến thể đầu tiên
          setSelectedDungLuong(availableDungLuongs[0]);
          setMauSacs(availableDungLuongs[0].mausac);
          
          if (availableDungLuongs[0].mausac && availableDungLuongs[0].mausac.length > 0) {
            setSelectedMauSac(availableDungLuongs[0].mausac[0]);
            
            // Kiểm tra tồn kho và Flash Sale
            checkStock(response.data._id, availableDungLuongs[0]._id, availableDungLuongs[0].mausac[0]._id);
            checkFlashSale(response.data._id, availableDungLuongs[0]._id, availableDungLuongs[0].mausac[0]._id);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        toast.error('Có lỗi xảy ra khi tải thông tin sản phẩm');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [loaisp, tieude, getProductFlashSaleVariants]);

  // Hàm kiểm tra tồn kho
  const checkStock = async (productId, dungluongId, mausacId) => {
    try {
      setStockInfo({ status: 'loading', quantity: 0 });
      const response = await axios.get(`http://localhost:3005/stock/${productId}/${dungluongId}/${mausacId}`);
      
      if (response.data.unlimitedStock) {
        setStockInfo({ status: 'in-stock', quantity: 'Không giới hạn' });
      } else if (response.data.stock > 10) {
        setStockInfo({ status: 'in-stock', quantity: response.data.stock });
      } else if (response.data.stock > 0) {
        setStockInfo({ status: 'low-stock', quantity: response.data.stock });
      } else {
        setStockInfo({ status: 'out-of-stock', quantity: 0 });
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra tồn kho:', error);
      setStockInfo({ status: 'error', quantity: 0 });
    }
  };
  
  // Kiểm tra Flash Sale
  const checkFlashSale = async (productId, dungluongId, mausacId) => {
    try {
      const result = await checkProductInFlashSale(productId, dungluongId, mausacId);
      
      if (result.inFlashSale) {
        setIsInFlashSale(true);
        setFlashSalePrice(result.flashSaleInfo.salePrice);
        setFlashSaleInfo(result.flashSaleInfo);
      } else {
        setIsInFlashSale(false);
        setFlashSalePrice(null);
        setFlashSaleInfo(null);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra Flash Sale:', error);
      setIsInFlashSale(false);
      setFlashSaleInfo(null);
    }
  };

  // Xử lý khi thay đổi dung lượng
  const handleDungLuongChange = (dungluong) => {
    setSelectedDungLuong(dungluong);
    setMauSacs(dungluong.mausac);
    
    // Reset màu sắc khi thay đổi dung lượng
    if (dungluong.mausac && dungluong.mausac.length > 0) {
      // Tìm màu sắc có Flash Sale
      const flashSaleMauSac = dungluong.mausac.find(ms => {
        const key = `${dungluong._id}-${ms._id}`;
        return !!flashSaleVariants[key];
      });
      
      // Nếu có màu sắc Flash Sale, chọn nó
      if (flashSaleMauSac) {
        setSelectedMauSac(flashSaleMauSac);
      } else {
        // Nếu không, chọn màu sắc đầu tiên
        setSelectedMauSac(dungluong.mausac[0]);
      }
      
      // Kiểm tra tồn kho và Flash Sale
      if (productData) {
        const mauSacToCheck = flashSaleMauSac || dungluong.mausac[0];
        checkStock(productData._id, dungluong._id, mauSacToCheck._id);
        checkFlashSale(productData._id, dungluong._id, mauSacToCheck._id);
      }
    } else {
      setSelectedMauSac(null);
      setStockInfo({ status: 'out-of-stock', quantity: 0 });
      setIsInFlashSale(false);
      setFlashSaleInfo(null);
    }
  };

  // Xử lý khi thay đổi màu sắc
  const handleMauSacChange = (mausac) => {
    setSelectedMauSac(mausac);
    
    // Kiểm tra tồn kho và Flash Sale khi thay đổi màu sắc
    if (productData && selectedDungLuong) {
      checkStock(productData._id, selectedDungLuong._id, mausac._id);
      checkFlashSale(productData._id, selectedDungLuong._id, mausac._id);
    }
  };

  // Xử lý khi thêm vào giỏ hàng
  const handleAddToCart = async () => {
    if (!productData || !selectedDungLuong || !selectedMauSac) {
      toast.error('Vui lòng chọn dung lượng và màu sắc');
      return;
    }
    
    if (stockInfo.status === 'out-of-stock') {
      toast.error('Sản phẩm đã hết hàng');
      return;
    }
    
    setIsAddingToCart(true);
    
    try {
      let cartItem = {
        idsanpham: productData._id,
        namesanpham: productData.name,
        imgsanpham: productData.image,
        iddungluong: selectedDungLuong._id,
        tendungluong: selectedDungLuong.name,
        idmausac: selectedMauSac._id,
        mausac: selectedMauSac.name,
        soluong: 1
      };
      
      // Nếu sản phẩm đang trong Flash Sale
      if (isInFlashSale && flashSaleInfo) {
        cartItem = {
          ...cartItem,
          pricemausac: flashSalePrice,
          isFlashSale: true,
          flashSaleId: flashSaleInfo.flashSaleId,
          originalPrice: selectedMauSac.price
        };
        
        // Cập nhật số lượng Flash Sale
        const updateResult = await updateProductQuantity(
          flashSaleInfo.flashSaleId,
          productData._id,
          selectedDungLuong._id,
          selectedMauSac._id,
          1
        );
        
        if (!updateResult.success) {
          toast.error(updateResult.message || 'Không thể cập nhật số lượng Flash Sale');
          setIsAddingToCart(false);
          return;
        }
      } else {
        cartItem.pricemausac = selectedMauSac.price;
        cartItem.isFlashSale = false;
      }
      
      // Cập nhật tồn kho sản phẩm (chỉ khi không phải Flash Sale)
      if (!isInFlashSale) {
        await axios.post('http://localhost:3005/stock/update', {
          productId: productData._id,
          dungluongId: selectedDungLuong._id,
          mausacId: selectedMauSac._id,
          quantity: 1
        });
      }
      
      // Thêm vào giỏ hàng
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      
      // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
      const existingItemIndex = cart.findIndex(
        item => 
          item.idsanpham === productData._id && 
          item.iddungluong === selectedDungLuong._id && 
          item.idmausac === selectedMauSac._id &&
          item.isFlashSale === cartItem.isFlashSale
      );
      
      if (existingItemIndex !== -1) {
        // Nếu sản phẩm đã có trong giỏ hàng, tăng số lượng
        cart[existingItemIndex].soluong += 1;
      } else {
        // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
        cart.push(cartItem);
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Thông báo thành công
      toast.success('Đã thêm sản phẩm vào giỏ hàng');
      
      // Cập nhật lại thông tin tồn kho sau khi thêm vào giỏ hàng
      checkStock(productData._id, selectedDungLuong._id, selectedMauSac._id);
      
      // Kích hoạt sự kiện cập nhật giỏ hàng
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ hàng:', error);
      toast.error('Lỗi khi thêm vào giỏ hàng');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Render component
  if (loading) {
    return <div className="loading-container">Đang tải...</div>;
  }

  if (!productData) {
    return <div className="error-container">Không tìm thấy sản phẩm</div>;
  }

  return (
    <div className="container-chitiet">
      {/* Các phần Header và Navigation */}
      
      <div className="main">
        <div className="product-detail">
          <div className="product-image">
            {/* Hiển thị hình ảnh sản phẩm */}
            <img src={productData.image} alt={productData.name} className="pdt-img" />
            
            {/* Đánh dấu Flash Sale nếu có */}
            {hasFlashSaleVariant && (
              <div className="flash-sale-badge">
                <span>Flash Sale</span>
              </div>
            )}
          </div>
          
          <div className="product-info">
            <h1 className="product-name-chitiet">{productData.name}</h1>
            
            {/* Hiển thị Flash Sale nếu sản phẩm đang trong Flash Sale */}
            {isInFlashSale && flashSaleInfo && (
              <ProductFlashSale 
                productId={productData._id} 
                dungluongId={selectedDungLuong?._id}
                mausacId={selectedMauSac?._id}
              />
            )}
            
            {/* Hiển thị giá */}
            <div className="chitietprice">
              {isInFlashSale ? (
                <>
                  <span className="current-price">{flashSalePrice.toLocaleString('vi-VN')}đ</span>
                  <span className="old-price">{selectedMauSac ? selectedMauSac.price.toLocaleString('vi-VN') : productData.price.toLocaleString('vi-VN')}đ</span>
                </>
              ) : (
                <span className="current-price">
                  {selectedMauSac 
                    ? selectedMauSac.price.toLocaleString('vi-VN') 
                    : productData.price.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>
            
            {/* Hiển thị trạng thái tồn kho */}
            <div className="stock-status">
              {stockInfo.status === 'loading' && (
                <span className="loading-stock">Đang kiểm tra tồn kho</span>
              )}
              {stockInfo.status === 'in-stock' && (
                <span className="in-stock">Còn hàng {stockInfo.quantity !== 'Không giới hạn' ? `(${stockInfo.quantity})` : ''}</span>
              )}
              {stockInfo.status === 'low-stock' && (
                <span className="low-stock">Sắp hết hàng (Chỉ còn {stockInfo.quantity})</span>
              )}
              {stockInfo.status === 'out-of-stock' && (
                <span className="out-of-stock">Hết hàng</span>
              )}
            </div>
            
            {/* Phần chọn dung lượng và màu sắc */}
            <div className="mausac_dungluong">
              {dungLuongs.length > 0 && (
                <div className="dungluong_container">
                  <div className="mausac_chitiet">
                    <p>Dung lượng:</p>
                  </div>
                  <div className="dungluong_chitiet">
                    {dungLuongs.map((dungluong) => {
                      // Kiểm tra xem dung lượng này có biến thể Flash Sale không
                      const hasFlashSale = dungluong.mausac && dungluong.mausac.some(ms => {
                        const key = `${dungluong._id}-${ms._id}`;
                        return !!flashSaleVariants[key];
                      });
                      
                      return (
                        <div
                          key={dungluong._id}
                          className={`dungluong_item ${selectedDungLuong && selectedDungLuong._id === dungluong._id ? 'dungluong_item_active' : ''} ${hasFlashSale ? 'flash-sale-variant' : ''}`}
                          onClick={() => handleDungLuongChange(dungluong)}
                        >
                          <span>{dungluong.name}</span>
                          {hasFlashSale && <span className="flash-sale-badge">Flash Sale</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {mauSacs && mauSacs.length > 0 && (
                <div className="mausac_container">
                  <div className="mausac_chitiet">
                    <p>Màu sắc:</p>
                  </div>
                  <div className="mausac_chitiet">
                    {mauSacs.map((mausac) => {
                      // Kiểm tra xem màu sắc này có trong Flash Sale không
                      const key = `${selectedDungLuong?._id}-${mausac._id}`;
                      const isFlashSale = !!flashSaleVariants[key];
                      
                      return (
                        <div
                          key={mausac._id}
                          className={`border_mausac ${selectedMauSac && selectedMauSac._id === mausac._id ? 'border_mausac1' : ''} ${stockInfo.status === 'out-of-stock' ? 'out-of-stock' : ''} ${isFlashSale ? 'flash-sale-variant' : ''}`}
                          onClick={() => handleMauSacChange(mausac)}
                          title={mausac.name}
                        >
                          <div style={{ backgroundColor: mausac.name }}></div>
                          {isFlashSale && <div className="flash-sale-indicator"></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Nút mua hàng */}
            <button
              className={`divbtn_muagay ${stockInfo.status === 'out-of-stock' || isAddingToCart ? 'disabled' : ''}`}
              onClick={stockInfo.status !== 'out-of-stock' && !isAddingToCart ? handleAddToCart : undefined}
              disabled={stockInfo.status === 'out-of-stock' || isAddingToCart}
            >
              {isAddingToCart 
                ? 'ĐANG XỬ LÝ...' 
                : stockInfo.status === 'out-of-stock' 
                  ? 'HẾT HÀNG' 
                  : isInFlashSale 
                    ? 'MUA NGAY - GIÁ FLASH SALE' 
                    : 'MUA NGAY'}
            </button>
            
            {/* Mô tả sản phẩm */}
            <div className="product-description">
              <h3>Mô tả sản phẩm</h3>
              <div dangerouslySetInnerHTML={{ __html: productData.mota }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiTietLayout;
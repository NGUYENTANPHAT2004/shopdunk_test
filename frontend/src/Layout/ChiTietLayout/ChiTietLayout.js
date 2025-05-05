import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ChiTietLayout.scss'
import axios from 'axios'
import io from 'socket.io-client';
import ListBlog from '../../components/ListBlog/ListBlog'
import ThanhDinhHuong from '../../components/ThanhDinhHuong/ThanhDinhHuong'
import ProductRating from '../../components/ProductRating/ProductRating'
import { Helmet } from 'react-helmet'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faGift } from '@fortawesome/free-solid-svg-icons'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { RelatedProducts } from '../Splienquan'
import ProductRatingsContainer from '../../components/ProductRating/ProductRatingcontainer'
import ProductFlashSale from '../../components/flashe/ProductFlashSale'
import { useFlashSale } from '../../context/Flashecontext'

const ChiTietLayout = () => {
  const { tieude, loaisp } = useParams()
  const navigate = useNavigate()
  const { checkProductInFlashSale } = useFlashSale()
  
  // States for product data
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStockLoading, setIsStockLoading] = useState(false)
  const [variantsLoaded, setVariantsLoaded] = useState(false)
  
  // States for product variants
  const [dungluong, setdungluong] = useState([])
  const [dungluong1, setdungluong1] = useState('')
  const [mausac1, setmausac1] = useState('')
  const [annhmausac, setanhmausac] = useState([])
  
  // States for pricing
  const [pricemausac, setpricemausac] = useState(0)
  const [khuyenmai, setkhuyenmai] = useState(0)
  const [giagoc, setgiagoc] = useState(0)
  
  // IDs and Flash Sale information
  const [idmausac, setidmausac] = useState('')
  const [idsanpham, setidsanpham] = useState('')
  const [iddungluong, setiddungluong] = useState('')
  const [flashSaleInfo, setFlashSaleInfo] = useState(null)
  
  // Active tab and product details
  const [activeTab, setActiveTab] = useState('mota')
  const [techSpecs, setTechSpecs] = useState(null)
  const [productRatings, setProductRatings] = useState(null)
  
  // Product display info
  const [imgsanpham, setimgsanpham] = useState('')
  const [namesanpham, setnamesanpham] = useState('')

  // Helper function to ensure numeric values
  const ensureNumber = (value) => {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return 0;
    }
    return Number(value);
  };

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1
        }
      }
    ]
  }

  // Kiểm tra Flash Sale khi sản phẩm, dung lượng, màu sắc thay đổi
  useEffect(() => {
    const checkForFlashSale = async () => {
      if (!idsanpham || !iddungluong || !idmausac) {
        setFlashSaleInfo(null);
        return;
      }

      try {
        console.log('Kiểm tra Flash Sale cho:', { idsanpham, iddungluong, idmausac });
        const result = await checkProductInFlashSale(idsanpham, iddungluong, idmausac);
        
        if (result.inFlashSale) {
          console.log('Sản phẩm đang trong Flash Sale:', result.flashSaleInfo);
          setFlashSaleInfo(result.flashSaleInfo);
        } else {
          console.log('Sản phẩm không trong Flash Sale');
          setFlashSaleInfo(null);
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra Flash Sale:', error);
        setFlashSaleInfo(null);
      }
    };

    checkForFlashSale();
  }, [idsanpham, iddungluong, idmausac, checkProductInFlashSale]);

  // Sử dụng useCallback để tối ưu hàm fetchStock
  const fetchStock = useCallback(async () => {
    // Chỉ fetch stock nếu có đủ thông tin
    if (!idsanpham || !iddungluong || !idmausac) {
      console.log('Thiếu thông tin để lấy tồn kho:', { idsanpham, iddungluong, idmausac });
      setQuantity(null);
      return;
    }

    console.log('Bắt đầu lấy tồn kho cho:', { idsanpham, iddungluong, idmausac });
    setIsStockLoading(true);
    try {
      const response = await fetch(`http://localhost:3005/stock/${idsanpham}/${iddungluong}/${idmausac}`);
      console.log('Kết quả API stock:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Dữ liệu tồn kho nhận được:', data);
        if (data.unlimitedStock) {
          setQuantity('Không giới hạn');
        } else {
          setQuantity(data.stock);
        }
      } else {
        console.error('Không thể lấy thông tin tồn kho, status:', response.status);
        try {
          const errorData = await response.json();
          console.error('Chi tiết lỗi:', errorData);
        } catch (e) {
          console.error('Không thể đọc chi tiết lỗi');
          setQuantity(0);
        }
      }
    } catch (error) {
      console.error('Lỗi khi lấy tồn kho:', error);
      setQuantity(0);
    } finally {
      setIsStockLoading(false);
      console.log('Đã hoàn thành việc lấy tồn kho');
    }
  }, [idsanpham, iddungluong, idmausac]);
  
  useEffect(() => {
    // Khởi tạo socket mà không cần kiểm tra user
    const socketInstance = io('http://localhost:3005/store', {
      transports: ['websocket'],
      reconnection: true
    });
    
    console.log('Đang kết nối socket để lắng nghe cập nhật tồn kho...');
    
    // Khi kết nối thành công
    socketInstance.on('connect', () => {
      console.log('Socket đã kết nối thành công, ID:', socketInstance.id);
    });
    
    // Lắng nghe sự kiện cập nhật tồn kho
    socketInstance.on('stock_updated', (data) => {
      console.log('Nhận được cập nhật tồn kho:', data);
      
      // Kiểm tra xem cập nhật có phải cho sản phẩm hiện tại không
      if (data.productId === idsanpham && 
          data.dungluongId === iddungluong && 
          data.mausacId === idmausac) {
        
        console.log('Cập nhật số lượng trên màn hình...');
        
        // Cập nhật số lượng trong state
        if (data.quantity === 0) {
          setQuantity('Hết hàng');
        } else {
          setQuantity(data.quantity);
        }
      }
    });
    
    // Dọn dẹp khi unmount
    return () => {
      console.log('Ngắt kết nối socket');
      socketInstance.off('stock_updated');
      socketInstance.disconnect();
    };
  }, [idsanpham, iddungluong, idmausac, dungluong1, mausac1]); 

  // Fetch technical specifications
  const fetchTechSpecs = useCallback(async () => {
    try {
      if (!loaisp) return;

      const response = await fetch(`http://localhost:3005/getchitiet-theloai/${loaisp}`);
      if (response.ok) {
        const data = await response.json();
        setTechSpecs(data);
      } else {
        console.error('Không thể lấy thông số kỹ thuật');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông số kỹ thuật:', error);
    }
  }, [loaisp]);

  // Monitor changes to product selection and fetch stock accordingly
  useEffect(() => {
    const fetchStockIfReady = async () => {
      // Only fetch if we have all required IDs
      if (idsanpham && iddungluong && idmausac) {
        console.log('Tất cả ID đã sẵn sàng, lấy thông tin tồn kho:', {
          idsanpham,
          iddungluong, 
          idmausac
        });
        await fetchStock();
      } else {
        console.log('Chưa đủ thông tin để lấy tồn kho:', {
          idsanpham: idsanpham || 'chưa có',
          iddungluong: iddungluong || 'chưa có',
          idmausac: idmausac || 'chưa có'
        });
      }
    };

    fetchStockIfReady();
  }, [idsanpham, iddungluong, idmausac, fetchStock]);

  // Set initial selection when dungluong data loads
  useEffect(() => {
    if (dungluong.length > 0) {
      setdungluong1(dungluong[0].name);
      setiddungluong(dungluong[0]._id);
      if (dungluong[0].mausac && dungluong[0].mausac.length > 0) {
        setmausac1(dungluong[0].mausac[0].name);
        setidmausac(dungluong[0].mausac[0]._id);
        setpricemausac(ensureNumber(dungluong[0].mausac[0].price));
        setkhuyenmai(ensureNumber(dungluong[0].mausac[0].khuyenmai));
        setgiagoc(ensureNumber(dungluong[0].mausac[0].giagoc));
      }
    }
  }, [dungluong]);

  // Tối ưu hàm handleChangeDungLuong
  const handleChangeDungLuong = useCallback((id, name) => {
    // Lưu trữ giá trị cũ để so sánh
    const oldDungLuongId = iddungluong;

    // Cập nhật giá trị dung lượng mới
    setiddungluong(id);
    setdungluong1(name);

    const dungLuongMoi = dungluong.find(dl => dl.name === name);
    if (!dungLuongMoi) return;

    const mauHienTai = dungLuongMoi.mausac.find(mau => mau.name === mausac1);

    if (mauHienTai) {
      // Nếu màu hiện tại vẫn tồn tại trong dung lượng mới
      setidmausac(mauHienTai._id);
      setpricemausac(ensureNumber(mauHienTai.price));
      setkhuyenmai(ensureNumber(mauHienTai.khuyenmai));
      setgiagoc(ensureNumber(mauHienTai.giagoc));
    } else if (dungLuongMoi.mausac && dungLuongMoi.mausac.length > 0) {
      // Nếu không, dùng màu đầu tiên trong dung lượng mới
      setmausac1(dungLuongMoi.mausac[0].name);
      setidmausac(dungLuongMoi.mausac[0]._id);
      setpricemausac(ensureNumber(dungLuongMoi.mausac[0].price));
      setkhuyenmai(ensureNumber(dungLuongMoi.mausac[0].khuyenmai));
      setgiagoc(ensureNumber(dungLuongMoi.mausac[0].giagoc));
    }

    // Flash Sale và tồn kho sẽ được cập nhật tự động qua useEffect
  }, [dungluong, mausac1, iddungluong]);

  const fetchdungluong = useCallback(async () => {
    try {
      console.log('Fetching dungluong từ API cũ...');
      const response = await fetch(
        `http://localhost:3005/dungluongmay/${loaisp}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log('dungluong từ API cũ:', data);
        setdungluong(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dung lượng:', error);
    }
  }, [loaisp]);

  const fetchProduct = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Đầu tiên, thử lấy dữ liệu chi tiết với variants từ API mới
      try {
        console.log('Thử lấy dữ liệu từ API mới...');
        const variantsResponse = await fetch(
          `http://localhost:3005/chitietsanpham-variants/${tieude}`
        );
        
        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          console.log('Dữ liệu từ API mới:', variantsData);
          
          // Lưu thông tin sản phẩm cơ bản
          setProduct(variantsData);
          setidsanpham(variantsData._id);
          setnamesanpham(variantsData.name);
          setimgsanpham(variantsData.image);
          
          // Kiểm tra xem có dữ liệu dung lượng và màu sắc không
          if (variantsData.dungluongs && variantsData.dungluongs.length > 0) {
            console.log('Đã tìm thấy dữ liệu biến thể:', variantsData.dungluongs);
            setdungluong(variantsData.dungluongs);
            setVariantsLoaded(true);
            setIsLoading(false);
            return; // Thoát sớm nếu đã tải thành công
          }
        }
      } catch (variantError) {
        console.warn('Không thể lấy dữ liệu từ API mới:', variantError);
      }
      
      // Fallback sang API cũ nếu API mới không hoạt động
      console.log('Fallback sang API cũ...');
      const response = await fetch(
        `http://localhost:3005/chitietsanpham/${tieude}`
      );
      const data = await response.json();
      if (response.ok) {
        setProduct(data);
        setidsanpham(data._id);
        setnamesanpham(data.name);
        setimgsanpham(data.image);
        
        // Khi dùng API cũ, cần gọi fetchdungluong riêng
        fetchdungluong();
      } else {
        console.error('Không tìm thấy sản phẩm');
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
      // Fallback về API cũ nếu có lỗi
      fetchdungluong();
    } finally {
      setIsLoading(false);
    }
  }, [tieude, fetchdungluong]);

  const fetchanhmausac = useCallback(async () => {
    try {
      if (!idmausac) return;

      const response = await fetch(
        `http://localhost:3005/getanhmausac/${idmausac}`
      );
      const data = await response.json();
      if (response.ok) {
        setanhmausac(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy ảnh màu sắc:', error);
    }
  }, [idmausac]);

  // Tối ưu hàm fetch đánh giá sản phẩm
  const fetchProductRatings = useCallback(async () => {
    if (!idsanpham) return;

    try {
      const response = await axios.get(`http://localhost:3005/product-rating/${idsanpham}`);
      if (response.data && response.data.success) {
        setProductRatings(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy đánh giá sản phẩm:', error);
    }
  }, [idsanpham]);

  // Test API connectivity when component mounts
  useEffect(() => {
    const testApiConnectivity = async () => {
      try {
        console.log('Testing API connectivity...');
        const response = await fetch('http://localhost:3005/api-status');
        if (response.ok) {
          console.log('API server is responding correctly');
        } else {
          console.warn('API server responded with status:', response.status);
        }
      } catch (error) {
        console.error('Could not connect to API server:', error);
      }
    };

    testApiConnectivity();
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchProduct();
    fetchTechSpecs();
  }, [fetchProduct, fetchTechSpecs]);

  useEffect(() => {
    fetchanhmausac();
  }, [fetchanhmausac]);

  useEffect(() => {
    if (idsanpham) {
      fetchProductRatings();
    }
  }, [idsanpham, fetchProductRatings]);

  // Tối ưu hóa handleBuyNow - bao gồm xử lý Flash Sale
  const handleBuyNow = useCallback(async () => {
    if (!dungluong1) {
      alert('Vui lòng chọn dung lượng!');
      return;
    }

    if (!mausac1) {
      alert('Vui lòng chọn màu sắc!');
      return;
    }

    const dungLuongHienTai = dungluong.find(dl => dl.name === dungluong1);
    const validColors = dungLuongHienTai && dungLuongHienTai.mausac
      ? dungLuongHienTai.mausac.map(mau => mau.name)
      : [];

    if (!validColors.includes(mausac1)) {
      alert('Màu sắc không hợp lệ với dung lượng đã chọn!');
      return;
    }

    if (!pricemausac && !flashSaleInfo) {
      alert('Vui lòng chọn giá phù hợp với màu sắc!');
      return;
    }

    // Kiểm tra tồn kho mới nhất trước khi thêm vào giỏ hàng
    try {
      await fetchStock();

      // Kiểm tra lại sau khi lấy thông tin tồn kho mới nhất
      if (quantity === 0 || quantity === '0' || quantity === 'Hết hàng') {
        alert('Sản phẩm đã hết hàng!');
        return;
      }

      // Xác định giá dựa trên thông tin Flash Sale
      let finalPrice = pricemausac;
      let isInFlashSale = false;
      let flashSaleId = null;

      if (flashSaleInfo) {
        finalPrice = flashSaleInfo.salePrice;
        isInFlashSale = true;
        flashSaleId = flashSaleInfo.flashSaleId;
      }

      const newItem = {
        idsanpham,
        namesanpham,
        imgsanpham,
        iddungluong,
        dungluong: dungluong1,
        mausac: mausac1,
        idmausac: idmausac,
        pricemausac: finalPrice,
        isFlashSale: isInFlashSale,
        flashSaleId: flashSaleId,
        quantity: 1
      };

      let cart = JSON.parse(localStorage.getItem('cart')) || [];

      const isExist = cart.some(
        item =>
          item.idsanpham === idsanpham &&
          item.dungluong === dungluong1 &&
          item.mausac === mausac1
      );

      if (!isExist) {
        cart.push(newItem);
        localStorage.setItem('cart', JSON.stringify(cart));
        navigate('/cart');
      } else {
        alert('Sản phẩm này đã có trong giỏ hàng!');
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Lỗi khi kiểm tra tồn kho:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại sau!');
    }
  }, [dungluong1, mausac1, pricemausac, dungluong, idsanpham, namesanpham, imgsanpham, iddungluong, idmausac, quantity, fetchStock, navigate, flashSaleInfo]);

  // Function to display stock status with appropriate styling
  const renderStockStatus = useCallback(() => {
    if (isStockLoading) {
      return <span className="loading-stock">Đang tải...</span>;
    } else if (quantity === null) {
      return <span className="loading-stock">Chưa có thông tin</span>;
    } else if (quantity === 0 || quantity === '0' || quantity === 'Hết hàng') {
      return <span className="out-of-stock">Hết hàng</span>;
    } else if (quantity < 5 && quantity !== 'Không giới hạn') {
      return <span className="low-stock">Sắp hết hàng (Còn {quantity})</span>;
    } else {
      return <span className="in-stock">Còn hàng</span>;
    }
  }, [quantity, isStockLoading]);

  if (isLoading) {
    return <div className="loading-container">Đang tải dữ liệu...</div>;
  }

  if (!product) {
    return <div className="error-container">Không tìm thấy sản phẩm!</div>;
  }

  return (
    <div className='container-chitiet'>
      <div className='stock-status'>
        Tình trạng: <strong>{renderStockStatus()}</strong>
      </div>

      <Helmet>
        <title>{product.name} - Shopdunk</title>
      </Helmet>
      <ThanhDinhHuong
        breadcrumbs={[
          { label: 'Trang Chủ', link: '/' },
          { label: product.name, link: `/chitietsanpham/${tieude}` }
        ]}
      />

      <div className='main'>
        <div className='product-image'>
          <div>
            <img src={product.image} alt={product.name} className='pdt-img' />
          </div>
          <div className='anhchay'>
            <Slider {...settings}>
              {annhmausac.map((anh, index) => (
                <div className='banner_item' key={index}>
                  <img src={`${anh}`} alt='Banner 1' className='anhchay-img' />
                </div>
              ))}
            </Slider>
          </div>
        </div>

        <div className='product-detail'>
          <div className='product-info'>
            <div className='product-name-chitiet'>{product.name}</div>
            <div className='divratedanhgia_container'>
              <div className='divratedanhgia'>
                <ProductRating productId={idsanpham} size="medium" showCount={true} />
                <div className='danhgiarate'>
                  Đánh giá
                  {productRatings && productRatings.totalRatings > 0 && (
                    <span className="rating-number"> ({productRatings.totalRatings})</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Hiển thị component Flash Sale nếu có đủ thông tin */}
            {idsanpham && iddungluong && idmausac && (
              <ProductFlashSale 
                productId={idsanpham} 
                dungluongId={iddungluong} 
                mausacId={idmausac} 
              />
            )}
            
            {/* Hiển thị giá dựa trên Flash Sale hoặc giá thông thường */}
            <div className='chitietprice'>
              <span className='current-price'>
                {flashSaleInfo 
                  ? flashSaleInfo.salePrice.toLocaleString('vi-VN')
                  : (ensureNumber(pricemausac)).toLocaleString('vi-VN')}đ
              </span>
              {flashSaleInfo ? (
                <span className='old-price'>{flashSaleInfo.originalPrice.toLocaleString('vi-VN')}đ</span>
              ) : (
                khuyenmai !== 0 && <span className='old-price'>{ensureNumber(giagoc).toLocaleString('vi-VN')}đ</span>
              )}
            </div>
            <div className='note_VAT'>(Đã bao gồm VAT)</div>

            <div className='mausac_dungluong'>
              <div className='note_tieude'>Dung lượng:</div>

              <div className='dungluong_chitiet'>
                {dungluong.map((item, index) => (
                  <div className='dungluong_container' key={index}>
                    <div
                      className={
                        dungluong1 === item.name
                          ? 'dungluong_item dungluong_item_active'
                          : 'dungluong_item'
                      }
                      onClick={() =>
                        handleChangeDungLuong(item._id, item.name)
                      }
                    >
                      <span>{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className='note_tieude'>Màu sắc:</div>

              <div className='mausac_chitiet'>
                {dungluong.map((item, index) => (
                  <div className='dungluong_container' key={index}>
                    <div className='mausac_container'>
                      {dungluong1 === item.name &&
                        item.mausac && item.mausac.map((mau, row) => (
                          <div
                            className={
                              mausac1 === mau.name
                                ? `border_mausac border_mausac1`
                                : `border_mausac`
                            }
                            key={row}
                            onClick={() => {
                              console.log('Chọn màu:', mau.name, 'ID:', mau._id, 'Giá:', mau.price);

                              // Cập nhật tất cả state liên quan đến màu sắc trong một batch
                              setmausac1(mau.name);
                              setidmausac(mau._id);
                              setpricemausac(ensureNumber(mau.price));
                              setkhuyenmai(ensureNumber(mau.khuyenmai));
                              setgiagoc(ensureNumber(mau.giagoc));
                              // Không cần gọi fetchStock ở đây vì useEffect sẽ xử lý khi idmausac thay đổi
                            }}
                          >
                            <div className="mausac-display"
                              style={{ 
                                backgroundColor: mau.name.startsWith('#') ? mau.name : '', 
                                position: 'relative'
                              }}
                            >
                              {!mau.name.startsWith('#') && (
                                <span style={{ 
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  fontSize: '10px'
                                }}>
                                  {mau.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Tabs Navigation */}
          <div className='product-tabs'>
            <div 
              className={`product-tab ${activeTab === 'mota' ? 'active' : ''}`}
              onClick={() => setActiveTab('mota')}
            >
              Mô tả sản phẩm
            </div>
            <div 
              className={`product-tab ${activeTab === 'thongso' ? 'active' : ''}`}
              onClick={() => setActiveTab('thongso')}
            >
              Thông số kỹ thuật
            </div>
            <div 
              className={`product-tab ${activeTab === 'chitiet' ? 'active' : ''}`}
              onClick={() => setActiveTab('chitiet')}
            >
              Chi tiết sản phẩm
            </div>
            <div 
              className={`product-tab ${activeTab === 'danhgia' ? 'active' : ''}`}
              onClick={() => setActiveTab('danhgia')}
            >
              Đánh giá ({productRatings?.totalRatings || 0})
            </div>
          </div>

          {/* Mô tả tab content */}
          <div className={`tab-content ${activeTab === 'mota' ? 'active' : ''}`}>
            <div className='short-des'>
              <p className='title'>
                <FontAwesomeIcon icon={faGift} />
                Ưu đãi
              </p>
              <div className='short-description'>
                <div className='short-description-header'>
                  <span>
                    ( Khuyến mãi dự kiến áp dụng{' '}
                    <strong>đến 23h59 | 28/2/2025</strong>&nbsp;)
                  </span>
                </div>
                <hr />
                <div style={{ display: 'flex' }}>
                  <div className='short-description-content'>
                    <div className='event_price'>
                      Ưu đãi mùa yêu Valentine 10/2 - 17/2 giảm thêm
                    </div>
                    <div className='event_value'>100,000 ₫</div>
                    <div>
                      Áp dụng màu Ultramarine (Xanh Lưu Ly). Được áp dụng cùng
                      ZaloPay. Không áp dụng cùng CTKM khác.
                    </div>
                  </div>
                </div>
                <hr />
                <p className='pchitiet'>
                  <strong className='pstrong'>I. Ưu đãi thanh toán&nbsp;</strong>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    Hỗ trợ trả góp
                    <strong> 0% </strong>
                    lãi suất, 0 phụ phí
                    <span style={{ color: '#007edb' }}> (xem chi tiết)</span>
                  </span>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    Giảm đến
                    <strong> 400.000đ </strong>
                    khi thanh toán qua
                    <strong> QR ZaloPay </strong>
                    (SL có hạn)
                  </span>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    Giảm đến
                    <strong> 200.000đ </strong>
                    khi thanh toán qua
                    <strong> Kredivo </strong>
                  </span>
                </p>
                <p className='pchitiet'>
                  <strong className='pstrong'>II. Ưu đãi mua kèm &nbsp;</strong>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    <strong> Ốp chính hãng Apple iPhone 16 series </strong>
                    giảm
                    <strong> 100.000đ </strong>
                  </span>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    <strong> Sản phẩm Apple, phụ kiên </strong>
                    giảm đến
                    <strong> 80% </strong>
                    <span style={{ color: '#007edb' }}>(xem chi tiết)</span>
                  </span>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    Mua combo phụ kiện
                    <strong> Non Apple </strong>
                    giảm đến
                    <strong> 200.000đ </strong>
                  </span>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    Giảm đến
                    <strong> 20% </strong>
                    khi mua các gói bảo hành
                    <span style={{ color: '#007edb' }}> (xem chi tiết)</span>
                  </span>
                </p>
                <p className='pchitiet'>
                  <strong className='pstrong'>III. Ưu đãi khác &nbsp;</strong>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    Duy nhất tại ShopDunk, hỗ trợ mở thẻ tín dụng Sacombank hạn
                    mức lên tới
                    <strong> 25 triệu </strong>
                    dành cho HS-SV
                  </span>
                </p>
                <p className='pchitiet lh-2'>
                  <span style={{ color: '#000000' }}>
                    <img src='/tichxanh.jpe' alt='' width={16} height={17} />
                    Trợ giá lên đời đến
                    <strong> 20% </strong>
                    <span style={{ color: '#007edb' }}>(xem chi tiết)</span>
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Thông số kỹ thuật tab content */}
          <div className={`tab-content ${activeTab === 'thongso' ? 'active' : ''}`}>
            <div className="tech-specs">
              <h3 className="tech-specs-title">Thông số kỹ thuật</h3>
              <div className="tech-specs-content">
                {!techSpecs ? (
                  <p style={{ padding: '15px', textAlign: 'center' }}>Đang tải thông số kỹ thuật...</p>
                ) : (
                  <table className="tech-specs-table">
                    <tbody>
                      {techSpecs.manhinh && (
                        <tr className="even-row">
                          <td className="spec-name">Công nghệ màn hình</td>
                          <td className="spec-value">{techSpecs.manhinh}</td>
                        </tr>
                      )}
                      {techSpecs.chip && (
                        <tr className="odd-row">
                          <td className="spec-name">Chip xử lý</td>
                          <td className="spec-value">{techSpecs.chip}</td>
                        </tr>
                      )}
                      {techSpecs.ram && (
                        <tr className="even-row">
                          <td className="spec-name">RAM</td>
                          <td className="spec-value">{techSpecs.ram}</td>
                        </tr>
                      )}
                      {techSpecs.dungluong && (
                        <tr className="odd-row">
                          <td className="spec-name">Dung lượng</td>
                          <td className="spec-value">{techSpecs.dungluong}</td>
                        </tr>
                      )}
                      {techSpecs.camera && (
                        <tr className="even-row">
                          <td className="spec-name">Camera</td>
                          <td className="spec-value">{techSpecs.camera}</td>
                        </tr>
                      )}
                      {techSpecs.pinsac && (
                        <tr className="odd-row">
                          <td className="spec-name">Pin và sạc</td>
                          <td className="spec-value">{techSpecs.pinsac}</td>
                        </tr>
                      )}
                      {techSpecs.congsac && (
                        <tr className="even-row">
                          <td className="spec-name">Cổng sạc</td>
                          <td className="spec-value">{techSpecs.congsac}</td>
                        </tr>
                      )}
                      {techSpecs.hang && (
                        <tr className="odd-row">
                          <td className="spec-name">Hãng sản xuất</td>
                          <td className="spec-value">{techSpecs.hang}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Chi tiết sản phẩm tab content */}
          <div className={`tab-content ${activeTab === 'chitiet' ? 'active' : ''}`}>
            <div className="product-details">
              <div className="product-details-content">
                {product && product.content ? (
                  <div dangerouslySetInnerHTML={{ __html: product.content }} />
                ) : (
                  <p style={{ padding: '15px', textAlign: 'center' }}>Không có thông tin chi tiết.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Đánh giá sản phẩm tab content */}
          <div className={`tab-content ${activeTab === 'danhgia' ? 'active' : ''}`}>
            <div className="product-ratings">
              <h3 className="ratings-title">Đánh giá từ khách hàng</h3>
              {productRatings?.totalRatings > 0 ? (
                <ProductRatingsContainer productId={idsanpham} />
              ) : (
                <p className="no-ratings">Chưa có đánh giá nào cho sản phẩm này</p>
              )}
            </div>
          </div>

          {/* Nút mua ngay - điều chỉnh theo tình trạng hàng và Flash Sale */}
          <div 
            className={`divbtn_muagay ${(quantity === 0 || quantity === '0' || quantity === 'Hết hàng' || isStockLoading) ? 'disabled' : ''}`} 
            onClick={handleBuyNow}
          >
            {isStockLoading 
              ? 'ĐANG KIỂM TRA KHO' 
              : (quantity === 0 || quantity === '0' || quantity === 'Hết hàng') 
                ? 'HẾT HÀNG' 
                : flashSaleInfo ? 'MUA NGAY - FLASH SALE' : 'MUA NGAY'}
          </div>
          
          <div className='short-des'>
            <p className='pchitiet lh-2'>
              <span style={{ color: '#000000' }}>
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className='icontichxanh'
                />
                <span>
                  {' '}
                  Bộ sản phẩm gồm: Hộp, Sách hướng dẫn, Cây lấy sim, Cáp Type C
                </span>
              </span>
            </p>
            <p className='pchitiet lh-2'>
              <span style={{ color: '#000000' }}>
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className='icontichxanh'
                />
                <span>
                  {' '}
                  Miễn phí 1 đổi 1 trong 30 ngày đầu tiên (nếu có lỗi do NSX)
                </span>
              </span>
            </p>
            <p className='pchitiet lh-2'>
              <span style={{ color: '#000000' }}>
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className='icontichxanh'
                />
                <span> Bảo hành chính hãng 1 năm</span>
                <span style={{ color: '#007edb' }}> (chi tiết)</span>
              </span>
            </p>
            <p className='pchitiet lh-2'>
              <span style={{ color: '#000000' }}>
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className='icontichxanh'
                />
                <span> Giao hàng nhanh toàn quốc</span>
                <span style={{ color: '#007edb' }}> (chi tiết)</span>
              </span>
            </p>
            <p className='pchitiet lh-2'>
              <span style={{ color: '#000000' }}>
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className='icontichxanh'
                />
                <span> Tax Refund For Foreingers</span>
                <span style={{ color: '#007edb' }}> (chi tiết)</span>
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className='category-sidebar'>
        <ListBlog />
      </div>
      <RelatedProducts category={loaisp} currentProductId={idsanpham} />
    </div>
  )
}
export default ChiTietLayout
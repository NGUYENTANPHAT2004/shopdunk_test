import './AdminLayout.scss'
import { SideBar } from './SideBar'
import { data, useSearchParams } from 'react-router-dom'
import { TheLoaiLayoutAdmin } from '../TheLoaiLayout'
import { BlogLayout } from '../BlogLayout'
import { DanhmucLayout } from '../Danhmuclayout'
import { MaGiamGiaLayout } from '../MaGiamGiaLayout'
import { DanhGiaAdminLayout } from '../DanhGiaAdminLayout'
import { HoaDonLayout } from '../HoaDonLayout'
import { DoanhThuLayout } from '../DoanhThuLayout'
import TonKhoLayout  from '../TonKhoLayout/TonKhoLayout'
import { useEffect, useState } from 'react'
import { io } from "socket.io-client";
import { toast,ToastContainer } from 'react-toastify'
import { 
  initializeSocket, 
  registerStockListeners, 
  checkStock 
} from '../../../untils/socketUtils';
function TrangChuLayout() {
  const [searchParams] = useSearchParams()
  const [lowStockAlert, setLowStockAlert] = useState(null);
  const tabFromUrl = searchParams.get('tab') || 'Trang chủ'
  useEffect(() => {
    // Initialize socket
    initializeSocket();
    
    // Register stock alert listeners
    const unregisterListeners = registerStockListeners(
      // onLowStock
      (data) => {
        console.log('Received low stock alert:', data);
        setLowStockAlert(data);
        
        // Hiển thị thông báo
        if (data.products && data.products.length > 0) {
          alert(`Cảnh báo: Có ${data.products.length} sản phẩm có số lượng tồn kho thấp (<5)!`);
        }
      },
      // onStockStatus
      (data) => {
        console.log('Stock status:', data);
        // Reset low stock alert if all is good
        setLowStockAlert(null);
      },
      // onStockError
      (error) => {
        console.error('Stock check error:', error);
        alert(`Lỗi khi kiểm tra tồn kho: ${error.message}`);
      }
    );
    
    // Check stock levels immediately
    checkStock();
    
    // Clean up listeners when component unmounts
    return () => {
      unregisterListeners();
    };
  }, []);
  return (
    <div className='trangchu_container'>
      <ToastContainer />
      <SideBar activeTab={tabFromUrl} />
      <div className='admin_body'>
        {tabFromUrl === 'Sản Phẩm' && <TheLoaiLayoutAdmin />}
        {tabFromUrl === 'Blog' && <BlogLayout />}
        {tabFromUrl === 'Danh Mục' && <DanhmucLayout />}
        {tabFromUrl === 'Đánh giá' && <DanhGiaAdminLayout />}
        {tabFromUrl === 'Mã Giảm Giá' && <MaGiamGiaLayout />}
        {tabFromUrl === 'Hóa đơn' && <HoaDonLayout />}
        {tabFromUrl === 'Doanh Thu' && <DoanhThuLayout />}
        {tabFromUrl === 'Kho' && < TonKhoLayout />}
      </div>
    </div>
  )
}

export default TrangChuLayout

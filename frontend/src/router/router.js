import { TrangChuLayout } from '../Layout/TrangChuLayout'
import { GioHangLayout } from '../Layout/GioHangLayout'
import { PaySuccess } from '../Layout/ThanhToanThanhCong'
import { TheLoaiLayout } from '../Layout/TheLoaiLayout'
import { ChiTietLayout } from '../Layout/ChiTietLayout'
import ChiTietBlog from '../components/ListBlog/ChiTietBlog'
import LienHe from '../Layout/DeafaultLayout/LienHe/LienHe'
import ChinhSachVanChuyen from '../Layout/DeafaultLayout/HuongDan/ChinhSachVanChuyen/ChinhSachVanChuyen'
import HuongDanThanhToan from '../Layout/DeafaultLayout/HuongDan/HuongDanThanhToan/HuongDanThanhToan'
import HuongDanMuaHang from '../Layout/DeafaultLayout/HuongDan/HuongDanMuaHang/HuongDanMuaHang'
import DoiTra from '../Layout/DeafaultLayout/HuongDan/DoiTra/DoiTra'
import CamKet from '../Layout/DeafaultLayout/HuongDan/CamKet/CamKet'
import BaoMat from '../Layout/DeafaultLayout/HuongDan/BaoMat/BaoMat'
import GioiThieu from '../Layout/DeafaultLayout/GioiThieu/GioiThieu'
import TiemKiemTheoSDT from '../Layout/lichsudonhang/TimKiemdonhang'
import { AdminLayout } from '../Layout/Admin/TrangChuLayout'
import { DangNhapLayout } from '../Layout/Admin/DangNhapLayout'
import DangKiLayout from '../Layout/DangKiLayout/DangKiLayout'
import { DangNhap } from '../Layout/DangNhapLayout'
import { TimKiemSanPhamLayout } from '../Layout/TimKiemSanPhamLayout'
import { DanhMucLayout } from '../Layout/DanhMucLayout'
import LichSuDonHangLayout from '../Layout/lichsudonhang/lichsudonhang'
import UserPointsPage from '../Layout/UserPoint/UserPointsPage'
import FlashSalePage from '../components/flashe/flashepage'
import UpcomingFlashSalePage from '../components/flashe/UpcomingFlashSalePage'
import Unauthorized from './Unautho'
import ProductPage from '../Layout/sanphamlayout/sanphamlayout'


// Route công khai - không cần đăng nhập
const publicRoutes = [
  { path: '/', component: TrangChuLayout },
  { path: '/san-pham/:slug', component: TheLoaiLayout },
  { path: '/danh-muc/:slug', component: DanhMucLayout },
  { path: '/chitietsanpham/:loaisp/:tieude', component: ChiTietLayout },
  { path: '/chitietblog/:tieude', component: ChiTietBlog },
  { path: '/lien-he', component: LienHe },
  { path: '/chinh-sach-van-chuyen', component: ChinhSachVanChuyen },
  { path: '/huong-dan-thanh-toan', component: HuongDanThanhToan },
  { path: '/huong-dan-mua-hang', component: HuongDanMuaHang },
  { path: '/doi-tra', component: DoiTra },
  { path: '/cam-ket', component: CamKet },
  { path: '/bao-mat', component: BaoMat },
  { path: '/gioi-thieu', component: GioiThieu },
  { path: '/login-admin', component: DangNhapLayout, layout: null },
  { path: '/login', component: DangNhap, layout: null },
  { path: '/register', component: DangKiLayout, layout: null },
  { path: '/search-sanpham/:keyword', component: TimKiemSanPhamLayout },
  { path: '/locsanpham', component: TimKiemSanPhamLayout },
  { path: '/flash-sale/:id', component: FlashSalePage },
  { path: '/flash-sale/upcoming', component: UpcomingFlashSalePage },
  { path: '/unauthorized', component: Unauthorized },
  { path: '/cart', component: GioHangLayout },
  { path: '/search/:keyword', component: TiemKiemTheoSDT},
  { path: '/san-pham', component: ProductPage},
  { path: '/chitietflashe/:tieude', component: ChiTietLayout },
]

// Route yêu cầu đăng nhập
const userRoutes = [
  { path: '/thanhcong', component: PaySuccess, adminOnly: false },
  { path: '/orders', component: LichSuDonHangLayout, adminOnly: false },
  { path: '/diem-thuong', component: UserPointsPage, adminOnly: false },
]

// Route dành riêng cho admin
const adminRoutes = [
  { path: '/admin', component: AdminLayout, layout: null, adminOnly: true }
]

// Kết hợp tất cả các route
const privateRoutes = [...userRoutes, ...adminRoutes]

export { publicRoutes, privateRoutes }
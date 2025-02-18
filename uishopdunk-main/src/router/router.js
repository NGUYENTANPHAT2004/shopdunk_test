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
import TimKiemLayout from '../Layout/TimKiemLayout/TiemKiemLayout'
import { AdminLayout } from '../Layout/Admin/TrangChuLayout'
import { DangNhapLayout } from '../Layout/Admin/DangNhapLayout'

const publicRoutes = [
  { path: '/', component: TrangChuLayout },
  { path: '/cart', component: GioHangLayout },
  { path: '/thanhcong', component: PaySuccess },
  { path: '/san-pham/:slug', component: TheLoaiLayout },
  { path: '/chitietsanpham/:loaisp/:tieude', component: ChiTietLayout },
  { path: '/chitietblog/:tieude', component: ChiTietBlog },
  { path: '/lien-he', component: LienHe },
  { path: '/chinh-sach-van-chuyen', component: ChinhSachVanChuyen },
  { path: '/huong-dan-thanh-toan', component: HuongDanThanhToan },
  { path: '/huong-dan-mua-hang', component: HuongDanMuaHang },
  { path: '/doi-tra', component: DoiTra },
  { path: '/cam-ket', component: CamKet },
  { path: '/bao-mat', component: BaoMat },
  { path: '/gioi-thieu-do-tho-y-yen', component: GioiThieu },
  { path: '/admin', component: AdminLayout, layout: null },
  { path: '/login-admin', component: DangNhapLayout, layout: null },
  { path: '/search/:keyword', component: TimKiemLayout }
]
const privateRoutes = []
export { publicRoutes, privateRoutes }

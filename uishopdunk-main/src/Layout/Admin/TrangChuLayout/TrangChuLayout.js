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
import { UserLayout } from '../UserLayout'
import AdminChatTraining from '../Chat/Chatlayout'
function TrangChuLayout() {
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'Trang chủ'
  return (
    <div className='trangchu_container'>
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
        {tabFromUrl === 'Người dùng' && < UserLayout />}
        {tabFromUrl === 'Chat' && < AdminChatTraining />}
      </div>
    </div>
  )
}

export default TrangChuLayout

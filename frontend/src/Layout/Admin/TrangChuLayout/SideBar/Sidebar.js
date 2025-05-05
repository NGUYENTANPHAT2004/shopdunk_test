import {
  faBars,
  faBlog,
  faHouse,
  faMobile,
  faPercent,
  faChartLine,
  faComments,
  faReceipt,
  faBuilding,
  faWarehouse,
  faUser,
  faChainBroken,
  faStar,
  faBolt // Thêm icon cho Flash Sale
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './SideBar.scss'
import { useState } from 'react'

function Sidebar ({ activeTab }) {
  const [istoggle, setIstoggle] = useState(true)

  const menus = [
    { name: 'Trang chủ', icon: faHouse },
    { name: 'Sản Phẩm', icon: faMobile },
    { name: 'Blog', icon: faBlog },
    { name: 'Danh Mục', icon: faBuilding },
    { name: 'Mã Giảm Giá', icon: faPercent },
    { name: 'Flash Sale', icon: faBolt }, // Thêm mục Flash Sale
    { name: 'Đánh giá', icon: faComments },
    { name: 'Doanh Thu', icon: faChartLine },
    { name: 'Hóa đơn', icon: faReceipt },
    { name: 'Kho', icon: faWarehouse },
    { name: 'Người dùng', icon: faUser },
    { name: 'Chat', icon: faChainBroken },
    { name: 'Điểm Thưởng', icon: faStar },
  ]

  return (
    <div className={`sidebar_container ${istoggle ? 'open' : 'closed'}`}>
      <div className='sidebar_header'>
        <div className={`sidebar_logo ${istoggle ? 'show' : 'hide'}`}>
        </div>
        <div className='sidebar_toggle' onClick={() => setIstoggle(!istoggle)}>
          <FontAwesomeIcon icon={faBars} />
        </div>
      </div>

      <div className='sidebar_body'>
        {menus.map((menu, index) => (
          <a href={`/admin?tab=${menu.name}`} key={index}>
            <div
              className={
                activeTab === menu.name
                  ? 'sidebar_item sidebar_item_active'
                  : 'sidebar_item'
              }
            >
              <FontAwesomeIcon icon={menu.icon} className='sidebar_icon' />
              <span className={`sidebar_text ${istoggle ? 'show' : 'hide'}`}>
                {menu.name}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
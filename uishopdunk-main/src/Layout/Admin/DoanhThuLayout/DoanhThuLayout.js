import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList
} from 'recharts'
import axios from 'axios'
import moment from 'moment'
import './DoanhThuLayout.scss' // Import file CSS

function DoanhThuLayout () {
  const [doanhThu, setDoanhThu] = useState([])
  const [startDate, setStartDate] = useState(
    moment().subtract(7, 'days').format('YYYY-MM-DD')
  )
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'))

  const fetchDoanhThu = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3005/getdoanhthu?startDate=${startDate}&endDate=${endDate}`
      )
      setDoanhThu(response.data)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu doanh thu:', error)
    }
  }

  useEffect(() => {
    fetchDoanhThu()
  }, [])

  return (
    <div className='doanhthu-container'>
      <h2 className='doanhthu-title'>Báo Cáo Doanh Thu</h2>

      {/* Bộ lọc ngày */}
      <div className='doanhthu-filter'>
        <input
          type='date'
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className='doanhthu-input'
        />
        <input
          type='date'
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className='doanhthu-input'
        />
        <button className='doanhthu-button' onClick={fetchDoanhThu}>
          Lọc
        </button>
      </div>

      <div className='doanhthu-chart-wrapper'>
        <h3 className='doanhthu-chart-title'>Biểu Đồ Doanh Thu</h3>
        <ResponsiveContainer width='80%' height={600}>
          <BarChart data={doanhThu}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='ngay' />
            <YAxis
              width={80}
              tickFormatter={value => (value / 1e6).toFixed(1) + 'M'}
            />
            
            <Tooltip
              formatter={value => [(value / 1e6).toFixed(1) + 'M', 'Doanh thu']}
            />
            <Bar dataKey='doanhthu' fill='#1092FC'>
              <LabelList
                dataKey='doanhthu'
                position='top'
                formatter={value => (value / 1e6).toFixed(1) + 'M'}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default DoanhThuLayout

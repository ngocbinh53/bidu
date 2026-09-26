import { useEffect, useMemo, useState } from 'react'
import scheduleSeed from '../data/schedule.json'
import {
  getSheetApiUrl,
  loadAppointmentsFromSheet,
  saveAppointmentsToSheet
} from './services/sheetService'

const navItems = [
  { id: 'home', label: 'Trang chủ', icon: '🏠' },
  { id: 'kidu', label: 'KiDu', icon: '💙' },
  { id: 'medical', label: 'Lịch hẹn', icon: '🗓️' },
  { id: 'clinic', label: 'Bệnh viện', icon: '🏥' },
  { id: 'files', label: 'Tài liệu', icon: '📁' }
]

function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return dateString

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function getDayName(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return 'Thứ'

  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date)
}

export default function App() {
  const sheetUrl = getSheetApiUrl()
  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('myClinicScheduleData')

    if (!saved) {
      return scheduleSeed
    }

    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) && parsed.length ? parsed : scheduleSeed
    } catch {
      return scheduleSeed
    }
  })
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    if (!sheetUrl) return

    let isMounted = true

    loadAppointmentsFromSheet(sheetUrl)
      .then((sheetAppointments) => {
        if (!isMounted) return

        if (sheetAppointments.length) {
          setAppointments(sheetAppointments)
          localStorage.setItem('myClinicScheduleData', JSON.stringify(sheetAppointments))
          setSyncMessage('Đã đồng bộ dữ liệu từ Google Sheet.')
        }
      })
      .catch(() => {
        if (isMounted) {
          setSyncMessage('Chưa thể đồng bộ với Google Sheet. Đang dùng dữ liệu local.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [sheetUrl])

  const nextAppointment = useMemo(
    () => appointments[0] || scheduleSeed[0],
    [appointments]
  )

  const timeline = appointments.slice(0, 4)

  const handleCreateAppointment = async () => {
    const baseDate = new Date()
    const nextDate = new Date(baseDate.getTime() + 86400000)
    const dateValue = nextDate.toISOString().slice(0, 10)
    const newAppointment = {
      id: Date.now(),
      label: 'KiDu',
      day: 'Thứ ' + ['Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Chủ nhật'][nextDate.getDay() === 0 ? 6 : nextDate.getDay() - 1],
      date: dateValue,
      location: 'Bệnh viện Đa khoa Hoàn Mỹ'
    }

    const updated = [newAppointment, ...appointments]
    setAppointments(updated)
    localStorage.setItem('myClinicScheduleData', JSON.stringify(updated))

    if (sheetUrl) {
      try {
        setSyncMessage('Đang ghi lên Google Sheet...')
        await saveAppointmentsToSheet(sheetUrl, updated)
        setSyncMessage('Đã ghi lịch mới lên Google Sheet thành công.')
      } catch {
        setSyncMessage('Ghi local thành công nhưng chưa đồng bộ được lên Google Sheet.')
      }
    }
  }

  return (
    <div className="care-app">
      <aside className="care-sidebar">
        <div className="brand-block">
          <div className="brand-badge">K</div>
          <div>
            <p className="eyebrow">Care dashboard</p>
            <h1>KiDu</h1>
          </div>
        </div>

        <nav className="side-menu" aria-label="Side menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item ${item.id === 'kidu' ? 'active' : ''}`}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="small-label">Lịch tiếp theo</p>
          <h3>{nextAppointment?.label || 'KiDu'}</h3>
          <p>{formatDate(nextAppointment?.date || '2026-09-26')}</p>
          <span>{nextAppointment?.location || 'Bệnh viện'}</span>
        </div>
      </aside>

      <main className="care-main">
        <header className="main-header">
          <div>
            <p className="eyebrow">Hôm nay</p>
            <h2>{getDayName(nextAppointment?.date || '2026-09-26')}</h2>
          </div>
          <button type="button" className="primary-btn" onClick={handleCreateAppointment}>+ Tạo lịch</button>
        </header>

        {syncMessage && (
          <div className="sync-banner">{syncMessage}</div>
        )}

        <section className="summary-grid">
          <div className="summary-card accent">
            <span>Buổi hẹn kế tiếp</span>
            <strong>{nextAppointment?.label || 'KiDu'}</strong>
            <small>
              {formatDate(nextAppointment?.date || '2026-09-26')} • {nextAppointment?.location || 'Bệnh viện'}
            </small>
          </div>

          <div className="summary-card">
            <span>Tổng số lịch</span>
            <strong>{appointments.length}</strong>
            <small>Đã lên lịch</small>
          </div>

          <div className="summary-card">
            <span>Địa điểm</span>
            <strong>{nextAppointment?.location || 'Bệnh viện'}</strong>
            <small>Phòng khám</small>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Timeline</h3>
            <button type="button" className="ghost-btn">Xem tất cả</button>
          </div>

          <div className="timeline">
            {timeline.map((item, index) => (
              <div key={`${item.date}-${item.location}`} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-date">{getDayName(item.date)}</div>
                  <h4>{item.label}</h4>
                  <p>{formatDate(item.date)}</p>
                  <span>{item.location}</span>
                </div>
                <div className="timeline-tag">
                  {index === 0 ? 'Sắp tới' : 'Đã đặt'}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

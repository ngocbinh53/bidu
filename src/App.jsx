import { useEffect, useMemo, useState } from 'react'
import scheduleSeed from '../data/schedule.json'
import {
  getSheetApiUrl,
  loadAppointmentsFromSheet,
  saveAppointmentsToSheet
} from './services/sheetService'

const navItems = [
  { id: 'clinic', label: 'Bệnh viện', icon: '🏥' }
]

function parseDateValue(dateString) {
  if (!dateString) return null

  const text = String(dateString).trim()

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return new Date(`${year}-${month}-${day}T00:00:00+07:00`)
  }

  const dmyMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`)
  }

  const value = new Date(text.includes('T') ? text : `${text}T00:00:00+07:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

function formatLocalDate(date) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function formatDate(dateString) {
  const date = parseDateValue(dateString)
  if (!date) return dateString || '—'

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function getDayName(dateString) {
  const date = parseDateValue(dateString)
  if (!date) return 'Thứ'

  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long'
  })
  return formatter.format(date)
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    label: 'KiDu',
    date: formatLocalDate(new Date()),
    location: 'Bệnh viện'
  })

  useEffect(() => {
    if (!sheetUrl) return

    let isMounted = true

    loadAppointmentsFromSheet(sheetUrl)
      .then((sheetAppointments) => {
        if (!isMounted) return
        console.log('Loaded appointments from Google Sheet:', sheetAppointments)
        console.log(sheetAppointments)

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

  const resetCreateForm = () => {
    setFormData({
      label: 'KiDu',
      date: formatLocalDate(new Date()),
      location: 'Bệnh viện'
    })
  }

  const handleCreateAppointment = async (event) => {
    event.preventDefault()

    const dateValue = formData.date || formatLocalDate(new Date())
    const newAppointment = {
      id: Date.now(),
      label: formData.label.trim() || 'KiDu',
      day: getDayName(dateValue),
      date: dateValue,
      location: formData.location.trim() || 'Bệnh viện'
    }

    const updated = [newAppointment, ...appointments]
    setAppointments(updated)
    localStorage.setItem('myClinicScheduleData', JSON.stringify(updated))
    setIsCreateModalOpen(false)
    resetCreateForm()

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
        </header>

        {syncMessage && (
          <div className="sync-banner">{syncMessage}</div>
        )}

        <section className="calendar-shell">
          <div className="calendar-header">
            <div>
              <p className="eyebrow pink">Lịch bệnh viện</p>
              <h3>Timeline</h3>
            </div>
          </div>

          <div className="timeline calendar-timeline">
            {timeline.map((item, index) => (
              <div key={`${item.date}-${item.location}`} className={`timeline-item calendar-card ${index === 0 ? 'highlight' : ''}`}>
                <div className="timeline-date-col">
                  <span className="timeline-day">{getDayName(item.date)}</span>
                  <strong>{new Date(`${item.date}T00:00:00+07:00`).getDate()}</strong>
                </div>

                <div className="timeline-content">
                  <div className="timeline-meta">
                    <span className="timeline-tag">{index === 0 ? 'Sắp tới' : 'Đã đặt'}</span>
                    <span className="timeline-time">{formatDate(item.date)}</span>
                  </div>
                  <h4>{item.label}</h4>
                  <p>{item.location}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Tạo lịch mới</p>
                <h3>Thêm lịch hẹn</h3>
              </div>
              <button type="button" className="icon-close" onClick={() => setIsCreateModalOpen(false)} aria-label="Đóng popup">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="create-form">
              <div className="form-grid">
                <label className="field-group">
                  <span>Ngày</span>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                    required
                  />
                </label>

                <label className="field-group">
                  <span>Loại lịch</span>
                  <input
                    type="text"
                    name="label"
                    value={formData.label}
                    onChange={(event) => setFormData((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Ví dụ: KiDu"
                    required
                  />
                </label>

                <label className="field-group full-width">
                  <span>Địa điểm</span>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Ví dụ: Bệnh viện 115"
                    required
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setIsCreateModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary-btn">
                  Lưu lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import scheduleSeed from '../data/schedule.json'
import {
  getSheetApiUrl,
  loadAppointmentsFromSheet,
  saveAppointmentsToSheet
} from './services/sheetService'

const navItems = [
  { id: 'clinic', label: 'Bệnh viện', icon: '🩺' }
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

function getTodayDateValue() {
  return formatLocalDate(new Date())
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function formatHeaderDate(dateString) {
  const date = parseDateValue(dateString)
  if (!date) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function formatLongDate(dateString) {
  const date = parseDateValue(dateString)
  if (!date) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function formatShortDate(dateString) {
  const date = parseDateValue(dateString)
  if (!date) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
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

function formatCountdown(dateString) {
  const targetDate = parseDateValue(dateString)
  if (!targetDate) return 'Chưa có lịch'

  const today = new Date(`${getTodayDateValue()}T00:00:00+07:00`)
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return 'Hôm nay'
  if (diffDays > 0) return `Còn ${diffDays} ngày`
  return `${Math.abs(diffDays)} ngày trước`
}

function getAppointmentStatus(item, todayDateValue) {
  const date = parseDateValue(item?.date)
  if (!date) return 'Cần chú ý'

  const today = parseDateValue(todayDateValue)
  if (date < today) return 'Đã hoàn thành'
  if (date.getTime() === today.getTime()) return 'Hôm nay'

  const label = String(item?.label || '').toLowerCase()
  if (label.includes('trực') || label.includes('mổ') || label.includes('24h')) return 'Cần chú ý'
  return 'Đã xác nhận'
}

function getStatusClass(status) {
  if (status === 'Đã hoàn thành') return 'success'
  if (status === 'Cần chú ý') return 'warning'
  if (status === 'Hôm nay') return 'today'
  return 'neutral'
}

function getTimelineIcon(item) {
  const label = String(item?.label || '').toLowerCase()
  if (label.includes('trực') || label.includes('24h') || label.includes('suốt')) return '🏥'
  if (label.includes('mổ') || label.includes('phẫu thuật') || label.includes('surgery')) return '🩺'
  if (label.includes('khám') || label.includes('nha') || label.includes('xét nghiệm')) return '🦷'
  return '📅'
}

export default function App() {
  const sheetUrl = getSheetApiUrl()
  const todayDateValue = useMemo(() => getTodayDateValue(), [])
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
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [formData, setFormData] = useState({
    label: 'KiDu',
    date: getTodayDateValue(),
    location: 'Bệnh viện'
  })

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

  const sortedAppointments = useMemo(
    () => [...appointments].sort((first, second) => {
      const firstDate = parseDateValue(first?.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const secondDate = parseDateValue(second?.date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return firstDate - secondDate
    }),
    [appointments]
  )

  const nextAppointment = useMemo(() => {
    const todayTimestamp = parseDateValue(todayDateValue)?.getTime() ?? Date.now()

    const upcoming = sortedAppointments.find((item) => {
      const itemDate = parseDateValue(item?.date)?.getTime()
      return Number.isFinite(itemDate) && itemDate >= todayTimestamp
    })

    return upcoming || {
      label: 'KiDu',
      date: todayDateValue,
      location: 'Bệnh viện'
    }
  }, [sortedAppointments, todayDateValue])

  const upcomingAppointments = useMemo(
    () => sortedAppointments.filter((item) => {
      const itemDate = parseDateValue(item?.date)
      const today = parseDateValue(todayDateValue)
      return itemDate && today && itemDate >= today
    }),
    [sortedAppointments, todayDateValue]
  )

  const completedAppointments = useMemo(
    () => [...sortedAppointments].filter((item) => {
      const itemDate = parseDateValue(item?.date)
      const today = parseDateValue(todayDateValue)
      return itemDate && today && itemDate < today
    }).reverse(),
    [sortedAppointments, todayDateValue]
  )

  const timeline = useMemo(
    () => sortedAppointments.filter((item) => {
      const itemDate = parseDateValue(item?.date)
      const today = parseDateValue(todayDateValue)
      return itemDate && today && itemDate >= today
    }).slice(0, 8),
    [sortedAppointments, todayDateValue]
  )

  const resetCreateForm = () => {
    setFormData({
      label: 'KiDu',
      date: getTodayDateValue(),
      location: 'Bệnh viện'
    })
  }

  const handleCreateAppointment = async (event) => {
    event.preventDefault()

    const dateValue = formData.date || getTodayDateValue()
    const newAppointment = {
      id: Date.now(),
      label: formData.label.trim() || 'Khám nha khoa',
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

  const syncTime = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return (
    <div className="care-app">
      <main className="care-main">
        <header className="dashboard-header">
          <div className="brand-block">
            <div className="brand-badge">✚</div>
            <div className="brand-copy">
              <p className="eyebrow">Care dashboard</p>
              <h1>KiDu</h1>
            </div>
          </div>

          {/* <nav className="side-menu" aria-label="Side menu"> */}
            {/* {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`menu-item ${item.id === 'clinic' ? 'active' : ''}`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav> */}
        </header>

        {/* <div className="date-row">
          <h1>{formatHeaderDate(todayDateValue)}</h1>
        </div>

        <section className="next-appointment-card">
          <div className="next-appointment-content">
            <div className="next-icon">🩺</div>

            <div className="next-main">
              <div className="next-label">{nextAppointment?.label || 'Khám nha khoa'}</div>
              <h2>{nextAppointment?.location || 'Bệnh viện 115'}</h2>
              <div className="next-meta-row only-countdown">
                <span className="mini-tag countdown-tag">{formatCountdown(nextAppointment?.date || todayDateValue)}</span>
              </div>
            </div>
          </div>

        </section> */}

        <section className="timeline-section">
          <div className="section-heading-row">
            <h3>Lịch trình đi bệnh viện</h3>
          </div>

          <div className="care-grid">
            {timeline.map((item) => {
              const status = getAppointmentStatus(item, todayDateValue)
              const isPast = status === 'Đã hoàn thành'

              if (isPast) return null

              const isUrgent = status === 'Cần chú ý' || status === 'Hôm nay'

              return (
                <div key={`${item.date}-${item.location}`} className={`care-card ${isUrgent ? 'urgent' : ''}`}>
                  <div className="care-card-icon">{getTimelineIcon(item)}</div>

                  

                  <div className="care-card-title">{item.label}</div>
                  <div className="care-card-location">{item.location}</div>
                  <div className="care-card-date">{formatLongDate(item.date)}</div>
                  <div className="care-card-countdown">{formatCountdown(item.date)}</div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {selectedDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedDetail(null)}>
          <div className="modal-card detail-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Chi tiết lịch</p>
                <h3>{selectedDetail.label}</h3>
              </div>
              <button type="button" className="icon-close" onClick={() => setSelectedDetail(null)}>×</button>
            </div>

            <div className="detail-body">
              <div className="detail-row">
                <span>Bệnh viện</span>
                <strong>{selectedDetail.location}</strong>
              </div>
              <div className="detail-row">
                <span>Ngày</span>
                <strong>{formatLongDate(selectedDetail.date)}</strong>
              </div>
              <div className="detail-row">
                <span>Trạng thái</span>
                <strong className={`detail-status ${getStatusClass(getAppointmentStatus(selectedDetail, todayDateValue))}`}>
                  {getAppointmentStatus(selectedDetail, todayDateValue)}
                </strong>
              </div>
              <div className="detail-row">
                <span>Countdown</span>
                <strong>{formatCountdown(selectedDetail.date)}</strong>
              </div>
            </div>

            <div className="modal-actions detail-actions">
              <button type="button" className="primary-btn" onClick={() => setSelectedDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

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
                    placeholder="Ví dụ: Khám nha khoa"
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

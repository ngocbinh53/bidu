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
  if (label.includes('trực') || label.includes('mổ') || label.includes('24h')) return '✚'
  if (label.includes('khám') || label.includes('xét nghiệm')) return '✓'
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

    return upcoming || sortedAppointments[0] || {
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

  const timeline = sortedAppointments.slice(0, 6)

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

  const syncTime = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return (
    <div className="care-app">
      <aside className="care-sidebar">
        <div className="brand-block">
          <div className="brand-badge">✚</div>
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
              className={`menu-item ${item.id === 'clinic' ? 'active' : ''}`}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="care-main">
        <header className="dashboard-header">
          <div className="header-copy">
            <h1>{formatHeaderDate(todayDateValue)}</h1>
          </div>

          <div className="sync-status">
            <button type="button" className="sync-button" aria-label="Đồng bộ dữ liệu">↻</button>
            <span>Đồng bộ {syncTime} · Google Sheets</span>
            <span className="sync-dot" aria-label="Connected" />
          </div>
        </header>

        {syncMessage && (
          <div className="sync-banner">{syncMessage}</div>
        )}

        <section className="next-appointment-card">
          <div className="section-kicker">Lần đi bệnh viện tiếp theo</div>

          <div className="next-appointment-content">
            <div className="next-icon">🩺</div>

            <div className="next-main">
              <div className="next-label">{nextAppointment?.label || 'Phòng Khám'}</div>
              <h2>{nextAppointment?.location || 'Bệnh viện 115'}</h2>
              <div className="next-date">{formatLongDate(nextAppointment?.date || todayDateValue)}</div>
              <div className="next-countdown">{formatCountdown(nextAppointment?.date || todayDateValue)}</div>
            </div>

            <div className="next-meta">
              <span className={`status-badge ${getStatusClass(getAppointmentStatus(nextAppointment, todayDateValue))}`}>
                {getAppointmentStatus(nextAppointment, todayDateValue)}
              </span>
            </div>
          </div>

          <div className="next-actions">
            <button type="button" className="action-btn primary" onClick={() => setSelectedDetail(nextAppointment)}>
              Xem chi tiết
            </button>
          </div>
        </section>

        <section className="timeline-section">
          <div className="section-heading-row">
            <h3>Lộ trình điều trị</h3>
          </div>

          <div className="care-timeline">
            {timeline.map((item) => {
              const status = getAppointmentStatus(item, todayDateValue)
              const isPast = status === 'Đã hoàn thành'
              const isSoon = status === 'Cần chú ý' || status === 'Hôm nay'

              return (
                <div key={`${item.date}-${item.location}`} className={`timeline-item ${isPast ? 'finished' : isSoon ? 'alert' : 'upcoming'}`}>
                  <div className="timeline-date-wrap">
                    <span className="timeline-date">{formatShortDate(item.date)}</span>
                  </div>

                  <div className="timeline-node">
                    <span className="timeline-marker">{getTimelineIcon(item)}</span>
                  </div>

                  <div className="timeline-body">
                    <div className="timeline-title-row">
                      <h4>{item.label}</h4>
                      <span className={`timeline-status ${getStatusClass(status)}`}>{status}</span>
                    </div>
                    <p>{item.location}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="list-panels">
          <div className="mini-panel">
            <div className="panel-header-row">
              <h3>Sắp tới</h3>
            </div>

            <div className="entry-list">
              {upcomingAppointments.slice(0, 4).map((item) => (
                <button type="button" key={`${item.date}-${item.location}-up`} className="entry-item" onClick={() => setSelectedDetail(item)}>
                  <div className="entry-date">{formatShortDate(item.date)}</div>
                  <div className="entry-text">
                    <strong>{item.label}</strong>
                    <span>{item.location}</span>
                  </div>
                  <div className="entry-arrow">→</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mini-panel">
            <div className="panel-header-row">
              <h3>Đã hoàn thành</h3>
            </div>

            <div className="entry-list">
              {completedAppointments.slice(0, 4).map((item) => (
                <button type="button" key={`${item.date}-${item.location}-done`} className="entry-item muted" onClick={() => setSelectedDetail(item)}>
                  <div className="entry-date">{formatShortDate(item.date)}</div>
                  <div className="entry-text">
                    <strong>{item.label}</strong>
                    <span>{item.location}</span>
                  </div>
                  <div className="entry-arrow">→</div>
                </button>
              ))}
            </div>
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

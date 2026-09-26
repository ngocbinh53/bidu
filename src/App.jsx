import { useMemo, useState } from 'react'
import scheduleSeed from '../data/schedule.json'

const navItems = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'kidu', label: 'KiDu', icon: '💙' },
  { id: 'medical', label: 'Lịch hẹn', icon: '🗓️' },
  { id: 'clinic', label: 'Bệnh viện', icon: '🏥' },
  { id: 'saved', label: 'Đã lưu', icon: '📚' }
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

  const nextAppointment = useMemo(
    () => appointments[0] || scheduleSeed[0],
    [appointments]
  )

  const stories = useMemo(
    () => [
      { name: 'Tạo tin', accent: 'creator', isAdd: true },
      ...appointments.map((item) => ({
        name: item.label || 'Lịch',
        accent: item.location?.includes('Y Dược') ? 'blue' : item.location?.includes('Hoàn Mỹ') ? 'pink' : 'purple',
        isAdd: false
      }))
    ],
    [appointments]
  )

  const composerText = nextAppointment
    ? `${nextAppointment.label} • ${formatDate(nextAppointment.date)}`
    : 'Bạn đang nghĩ gì thế?'

  return (
    <div className="facebook-app">
      <header className="fb-topbar">
        <div className="fb-topbar-left">
          <div className="logo-mark">f</div>
          <div className="top-mini-icons">
            <span>◀</span>
            <span>→</span>
            <span>⟳</span>
          </div>
        </div>

        <div className="fb-browser-bar">
          <span className="browser-lock">🔒</span>
          <span>https://www.facebook.com</span>
        </div>

        <div className="fb-topbar-right">
          <div className="avatar-thread">N</div>
          <button className="top-icon" type="button">⎈</button>
          <button className="top-icon" type="button">☰</button>
          <button className="top-icon alert" type="button">🔔</button>
          <button className="top-icon profile" type="button">👤</button>
        </div>
      </header>

      <div className="fb-main-shell">
        <aside className="fb-left-rail">
          <div className="user-mini-card">
            <div className="avatar-lg">N</div>
            <span>Nguyen Ngoc Binh</span>
          </div>

          <nav className="fb-menu">
            {navItems.map((item) => (
              <button key={item.id} type="button" className={`rail-item ${item.id === 'home' ? 'active' : ''}`}>
                <span className="rail-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="rail-divider" />

          <div className="shortcut-list">
            <button type="button" className="rail-item compact">
              <span className="rail-icon">🧑‍⚕️</span>
              <span>KiDu</span>
            </button>
            <button type="button" className="rail-item compact">
              <span className="rail-icon">📍</span>
              <span>{nextAppointment?.location || 'Bệnh viện'}</span>
            </button>
            <button type="button" className="rail-item compact">
              <span className="rail-icon">🗂️</span>
              <span>Hồ sơ bệnh án</span>
            </button>
          </div>
        </aside>

        <main className="fb-feed">
          <div className="composer-box">
            <div className="composer-row">
              <div className="avatar-md">N</div>
              <div className="composer-input">{composerText}</div>
            </div>
            <div className="composer-actions">
              <button type="button">🎥 Video trực tiếp</button>
              <button type="button">📷 Ảnh/video</button>
              <button type="button">😊 Cảm xúc</button>
            </div>
          </div>

          <div className="stories-row">
            {stories.map((story) => (
              <div key={`${story.name}-${story.isAdd ? 'add' : 'story'}`} className={`story-card ${story.isAdd ? 'add' : ''}`}>
                <div className={`story-ring ${story.accent}`}>
                  {story.isAdd ? '+' : '•'}
                </div>
                <div className="story-label">{story.name}</div>
              </div>
            ))}
          </div>

          <article className="post-card">
            <div className="post-header">
              <div className="avatar-sm brand">N</div>
              <div className="post-meta">
                <div className="post-author">{nextAppointment?.label || 'KiDu'}</div>
                <div className="post-time">{getDayName(nextAppointment?.date || '2026-09-26')} · {formatDate(nextAppointment?.date || '2026-09-26')}</div>
              </div>
              <div className="post-menu">⋯</div>
            </div>

            <div className="post-content">
              <p>
                Lịch khám sắp tới: <strong>{nextAppointment?.label || 'KiDu'}</strong> vào{' '}
                <strong>{getDayName(nextAppointment?.date || '2026-09-26')}</strong>,{' '}
                {formatDate(nextAppointment?.date || '2026-09-26')}.{' '}
                Địa điểm: <strong>{nextAppointment?.location || 'Bệnh viện'}</strong>.
              </p>
            </div>

            <div className="post-visual" aria-label="Medical schedule visual">
              <div className="promo-overlay" />
            </div>
          </article>
        </main>

        <aside className="fb-right-panel">
          <div className="ads-card">
            <div className="ads-title">Lịch tiếp theo</div>
            <div className="ad-thumb" />
            <div className="ad-copy">{nextAppointment?.location || 'Bệnh viện'}</div>
          </div>

          <div className="chat-card">
            <div className="chat-header">{nextAppointment?.label || 'KiDu'}</div>
            <div className="chat-body">
              <div className="bubble self">{formatDate(nextAppointment?.date || '2026-09-26')}</div>
              <div className="bubble friend">{nextAppointment?.location || 'Bệnh viện'}</div>
            </div>
            <div className="chat-actions">
              <button type="button">🎙</button>
              <button type="button">📎</button>
              <button type="button">😊</button>
              <button type="button" className="send-btn">♥</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

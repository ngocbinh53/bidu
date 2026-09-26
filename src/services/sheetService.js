const DEFAULT_HEADERS = ['label', 'day', 'date', 'location', 'createdAt']

function normalizeAppointment(item) {
  const next = {
    id: item.id || `${item.date || 'date'}-${item.location || 'location'}-${Date.now()}`,
    label: item.label || 'KiDu',
    day: item.day || 'Thứ',
    date: item.date || new Date().toISOString().slice(0, 10),
    location: item.location || 'Bệnh viện'
  }

  return next
}

export async function loadAppointmentsFromSheet(url) {
  if (!url) {
    return []
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Không thể tải dữ liệu từ Google Sheet')
  }

  const data = await response.json()

  if (!Array.isArray(data)) {
    return []
  }

  return data.map(normalizeAppointment)
}

export async function saveAppointmentsToSheet(url, appointments) {
  if (!url) {
    return appointments
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: appointments.map((item) => ({
        ...normalizeAppointment(item),
        createdAt: new Date().toISOString()
      }))
    })
  })

  if (!response.ok) {
    throw new Error('Không thể ghi dữ liệu lên Google Sheet')
  }

  return appointments
}

export function getSheetApiUrl() {
  return import.meta.env.VITE_SHEET_API_URL || ''
}

export function ensureHeaders() {
  return DEFAULT_HEADERS
}

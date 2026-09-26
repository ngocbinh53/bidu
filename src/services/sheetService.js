import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/vi'

const DEFAULT_HEADERS = ['Date', 'Position', 'Location']

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('vi')
dayjs.tz.setDefault('Asia/Ho_Chi_Minh')

function parseDateValue(value) {
  const fallback = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')

  if (value === null || value === undefined || value === '') return fallback

  const text = String(value).trim()
  if (!text) return fallback

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const dmyMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD')
  }

  const parsed = dayjs(text, ['YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'D/M/YYYY', 'MM/DD/YYYY', 'M/D/YYYY', 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'YYYY-MM-DDTHH:mm:ssZ'], true)
  if (parsed.isValid()) {
    return parsed.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')
  }

  return fallback
}

function getDayLabel(dateValue) {
  if (!dateValue) return 'Thứ'

  const parsed = dayjs(dateValue, 'YYYY-MM-DD', true).tz('Asia/Ho_Chi_Minh')
  if (!parsed.isValid()) return 'Thứ'

  return parsed.locale('vi').format('dddd')
}

function normalizeAppointment(item = {}) {
  const dateValue = parseDateValue(item.date ?? item.Date)
  const labelValue = item.label ?? item.Position ?? item.position ?? 'KiDu'
  const locationValue = item.location ?? item.Location ?? 'Bệnh viện'

  return {
    id: item.id || `${dateValue}-${labelValue}-${locationValue}-${Date.now()}`,
    label: labelValue,
    day: item.day || item.Day || getDayLabel(dateValue),
    date: dateValue,
    location: locationValue
  }
}

function unwrapSheetPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  if ('Date' in payload || 'Position' in payload || 'Location' in payload) {
    return [payload]
  }

  const candidates = [payload.items, payload.data, payload.rows, payload.result, payload.appointments]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function looksLikeHtmlOrRedirect(rawText) {
  const trimmed = rawText.trim()
  return !trimmed || /^<!doctype|^<html|^<script|^DOCTYPE/i.test(trimmed)
}

async function readJsonResponse(response, url, label) {
  const contentType = response.headers.get('content-type') || ''
  const rawText = await response.text()

  console.debug(`[sheet-debug] ${label} url=`, url)
  console.debug(`[sheet-debug] ${label} status=`, response.status, 'content-type=', contentType)
  console.debug(`[sheet-debug] ${label} redirected=`, response.redirected)
  console.debug(`[sheet-debug] ${label} raw=`, rawText.slice(0, 500))

 
  try {
    const parsed = JSON.parse(rawText)
    console.debug(`[sheet-debug] ${label} parsed=`, parsed)
    return unwrapSheetPayload(parsed)
  } catch {
    try {
      const maybe = JSON.parse(rawText.replace(/\n/g, ''))
      return unwrapSheetPayload(maybe)
    } catch {
      console.warn(`[sheet-debug] ${label} response is not valid JSON`, rawText.slice(0, 300))
      return []
    }
  }
}

export async function loadAppointmentsFromSheet(url) {
  if (!url) {
    console.warn('[sheet-debug] no sheet URL configured')
    return []
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    console.error('[sheet-debug] GET failed', response.status, url)
    throw new Error('Không thể tải dữ liệu từ Google Sheet')
  }

  const data = await readJsonResponse(response, url, 'GET')
  console.debug('[sheet-debug] GET data=', data)

  if (!data.length) {
    throw new Error('Google Sheet trả về rỗng hoặc URL chưa deploy đúng. Kiểm tra Web App deployment.')
  }
  const result =  data.map(normalizeAppointment)
  console.debug('[sheet-debug] Normalized appointments from sheet:', result)

  return result
}

export async function saveAppointmentsToSheet(url, appointments) {
  if (!url) {
    return appointments
  }

  const body = JSON.stringify({
    items: appointments.map((item) => ({
      ...normalizeAppointment(item),
      createdAt: new Date().toISOString()
    }))
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })

  console.debug('[sheet-debug] POST url=', url)
  console.debug('[sheet-debug] POST payload=', body)

  if (!response.ok) {
    console.error('[sheet-debug] POST failed', response.status, url)
    throw new Error('Không thể ghi dữ liệu lên Google Sheet')
  }

  return appointments
}

export function getSheetApiUrl() {
  const url = import.meta.env.VITE_SHEET_API_URL || ''
  console.debug('[sheet-debug] env url=', url)
  return url
  return import.meta.env.VITE_SHEET_API_URL || ''
}

export function ensureHeaders() {
  return DEFAULT_HEADERS
}

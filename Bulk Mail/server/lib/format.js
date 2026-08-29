// Date/number formatting helpers shared by services (server-side formatting
// keeps the existing UI components untouched).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(n) { return String(n).padStart(2, '0') }

/** "1/8/2026, 5:37:19 pm" (D/M/YYYY, h:MM:SS am/pm) */
export function fmtDateTime(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T') + (String(value).includes('Z') || String(value).includes('+') ? '' : 'Z'))
  if (Number.isNaN(d.getTime())) return String(value)
  let h = d.getHours()
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`
}

/** "1 Aug 2026" */
export function fmtDateHuman(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return String(value)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "2026-08-01" in local time */
export function fmtDay(value) {
  const d = value instanceof Date ? value : new Date(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fmtMoney(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export function pct(num, den) {
  if (!den) return '0%'
  return Math.round((num / den) * 100) + '%'
}

/** ISO datetime for SQLite, local-time based with seconds */
export function nowSql(offsetDays = 0, offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000 + offsetMinutes * 60000)
  return `${fmtDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** ISO datetime for SQLite, local-time based with seconds, offset by ms */
export function nowSqlMs(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs)
  return `${fmtDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

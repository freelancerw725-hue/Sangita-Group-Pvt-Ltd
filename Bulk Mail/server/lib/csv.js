// Minimal dependency-free CSV utilities (RFC-4180-ish: quotes, commas, CRLF)

export function parseCsv(text) {
  if (typeof text !== 'string') return []
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '') // strip BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === ',') { row.push(field); field = ''; continue }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
      continue
    }
    field += ch
  }
  row.push(field)
  if (row.length > 1 || row[0] !== '') rows.push(row)
  return rows
}

export function rowsToObjects(rows) {
  if (!rows.length) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  return rows.slice(1).map((r) => {
    const obj = {}
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
}

export function objectsToCsv(items, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.join(',')]
  for (const item of items) {
    lines.push(columns.map((c) => esc(item[c])).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

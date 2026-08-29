export function normalizeEmail(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

export function normalizeText(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

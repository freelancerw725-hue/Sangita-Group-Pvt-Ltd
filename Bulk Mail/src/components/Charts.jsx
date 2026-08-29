import { useMemo, useState } from 'react'

// ---------- Bar chart (Emails Sent style) ----------
export function BarChart({ data, height = 260, color = '#3b82f6' }) {
  const [hover, setHover] = useState(null)
  const W = 560
  const H = height
  const padL = 42
  const padR = 16
  const padT = 14
  const padB = 30
  const iw = W - padL - padR
  const ih = H - padT - padB
  const max = 80
  const ticks = [0, 20, 40, 60, 80]
  const bw = Math.min(70, (iw / data.length) * 0.55)
  const x = (i) => padL + (iw / data.length) * (i + 0.5)
  const y = (v) => padT + ih - (v / max) * ih

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={t === 0 ? '0' : '3 4'} />
          <text x={padL - 9} y={y(t) + 4} textAnchor="end" fontSize="11.5" fill="#9ca3af">{t}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={d.date}>
          <rect
            x={x(i) - bw / 2} y={y(d.count)} width={bw} height={Math.max(2, ih - (y(d.count) - padT))}
            fill={color} rx="2" opacity={hover === null || hover === i ? 1 : 0.85}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}
          />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#9ca3af">{d.date}</text>
        </g>
      ))}
      {hover !== null && (
        <g pointerEvents="none">
          <rect x={x(hover) - 62} y={y(data[hover].count) - 62} width="124" height="52" rx="7" fill="#fff" stroke="#e5e7eb" />
          <text x={x(hover)} y={y(data[hover].count) - 41} textAnchor="middle" fontSize="12.5" fill="#111827" fontWeight="600">{data[hover].date}</text>
          <text x={x(hover)} y={y(data[hover].count) - 22} textAnchor="middle" fontSize="12" fill="#2563eb">count : {data[hover].count}</text>
        </g>
      )}
    </svg>
  )
}

// ---------- Smooth line chart (New Leads style) ----------
export function LineChart({ data, height = 260, color = '#10b981' }) {
  const [hover, setHover] = useState(null)
  const W = 560
  const H = height
  const padL = 42
  const padR = 18
  const padT = 14
  const padB = 30
  const iw = W - padL - padR
  const ih = H - padT - padB
  const max = 80
  const ticks = [0, 20, 40, 60, 80]
  const pts = data.map((d, i) => ({
    cx: padL + (iw / (data.length - 1)) * i,
    cy: padT + ih - (d.count / max) * ih,
    ...d,
  }))

  const path = useMemo(() => {
    if (pts.length < 2) return ''
    let p = `M ${pts[0].cx} ${pts[0].cy}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      const mx = (p0.cx + p1.cx) / 2
      p += ` C ${mx} ${p0.cy}, ${mx} ${p1.cy}, ${p1.cx} ${p1.cy}`
    }
    return p
  }, [pts])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={padT + ih - (t / max) * ih} y2={padT + ih - (t / max) * ih} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={t === 0 ? '0' : '3 4'} />
          <text x={padL - 9} y={padT + ih - (t / max) * ih + 4} textAnchor="end" fontSize="11.5" fill="#9ca3af">{t}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((pt, i) => (
        <g key={pt.date}>
          <circle
            cx={pt.cx} cy={pt.cy} r={hover === i ? 5.5 : 4}
            fill="#fff" stroke={color} strokeWidth="2"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}
          />
          <text x={pt.cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#9ca3af">{pt.date}</text>
        </g>
      ))}
      {hover !== null && (
        <g pointerEvents="none">
          <rect x={pts[hover].cx - 62} y={pts[hover].cy - 62} width="124" height="52" rx="7" fill="#fff" stroke="#e5e7eb" />
          <text x={pts[hover].cx} y={pts[hover].cy - 41} textAnchor="middle" fontSize="12.5" fill="#111827" fontWeight="600">{pts[hover].date}</text>
          <text x={pts[hover].cx} y={pts[hover].cy - 22} textAnchor="middle" fontSize="12" fill="#059669">count : {pts[hover].count}</text>
        </g>
      )}
    </svg>
  )
}

// ---------- Sparkline ----------
export function Sparkline({ points = [], width = 90, height = 36 }) {
  if (!points.length) points = [4, 9, 6, 12, 8, 14, 10, 16, 12]
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)
  const coords = points.map((p, i) => [i * step, height - 4 - ((p - min) / range) * (height - 8)])
  let d = `M ${coords[0][0]} ${coords[0][1]}`
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i]
    const [x1, y1] = coords[i + 1]
    const mx = (x0 + x1) / 2
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

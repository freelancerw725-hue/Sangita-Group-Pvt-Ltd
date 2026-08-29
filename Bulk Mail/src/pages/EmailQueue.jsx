import { useMemo, useState } from 'react'
import { ConfirmDialog, useToast } from '../components/UI.jsx'
import {
  IconSearch, IconPlay, IconPause, IconRotate, IconTrash, IconSend, IconClock, IconCheckCircle, IconXCircle,
} from '../components/Icons.jsx'
import { emailQueue as seed } from '../data/mock.js'

const BADGES = {
  pending: { cls: 'badge-amber', label: 'pending' },
  sending: { cls: 'badge-purple', label: 'sending' },
  sent: { cls: 'badge-green', label: 'sent' },
  failed: { cls: 'badge-red', label: 'failed' },
}

export default function EmailQueue() {
  const toast = useToast()
  const [rows, setRows] = useState(seed)
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    sent: rows.filter((r) => r.status === 'sent').length,
    failed: rows.filter((r) => r.status === 'failed').length,
  }), [rows])

  const filtered = rows.filter((r) =>
    (tab === 'all' || r.status === tab) &&
    (!q || (r.to + r.company + r.subject).toLowerCase().includes(q.toLowerCase()))
  )

  const setStatus = (id, status) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, status } : r)))
    toast(`Email marked as ${status} (demo)`)
  }

  const summary = [
    { icon: IconClock, tone: { background: '#fef3c7', color: '#d97706' }, value: counts.pending, label: 'Pending' },
    { icon: IconSend, tone: { background: '#ede9fe', color: '#7c3aed' }, value: rows.filter((r) => r.status === 'sending').length, label: 'Sending' },
    { icon: IconCheckCircle, tone: { background: '#dcfce7', color: '#16a34a' }, value: counts.sent, label: 'Sent' },
    { icon: IconXCircle, tone: { background: '#fee2e2', color: '#dc2626' }, value: counts.failed, label: 'Failed' },
  ]

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {summary.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={s.tone}><s.icon /></div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['all', 'All'], ['pending', 'Pending'], ['sending', 'Sending'], ['sent', 'Sent'], ['failed', 'Failed']].map(([k, label]) => (
          <button key={k} className={`tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
            {label}<span className="badge badge-gray">{counts[k] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <IconSearch />
          <input className="input" placeholder="Search queue..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={() => toast('Queue processor started (demo)')}><IconPlay /> Process Queue</button>
        <button className="btn btn-secondary" onClick={() => toast('Queue paused (demo)')}><IconPause /> Pause</button>
      </div>

      <div className="card table-wrap">
        <table className="table" style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th>To</th><th>Company</th><th>Campaign</th><th>Template</th><th>Subject</th><th>Scheduled</th><th>Status</th><th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.to}</td>
                <td className="cell-strong">{r.company}</td>
                <td className="cell-muted">{r.campaign}</td>
                <td className="cell-muted">{r.template}</td>
                <td className="break cell-muted">{r.subject}</td>
                <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{r.scheduled}</td>
                <td><span className={`badge ${BADGES[r.status].cls}`}>{BADGES[r.status].label}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {r.status === 'pending' && (
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setStatus(r.id, 'sent')} aria-label="Send now"><IconPlay size={14} /></button>
                    )}
                    {r.status === 'failed' && (
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setStatus(r.id, 'pending')} aria-label="Retry"><IconRotate size={14} /></button>
                    )}
                    <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red)' }} onClick={() => setConfirm(r.id)} aria-label="Remove"><IconTrash size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td className="table-empty" colSpan={8}>Queue is empty.</td></tr>}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        title="Remove from queue"
        message="Remove this email from the queue? This is a UI demo — nothing is saved."
        onConfirm={() => { setRows(rows.filter((r) => r.id !== confirm)); toast('Removed from queue (demo)') }}
      />
    </>
  )
}

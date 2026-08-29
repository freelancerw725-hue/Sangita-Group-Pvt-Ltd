import { useMemo, useState } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { IconSearch, IconPlus, IconPlay, IconTrash, IconClock } from '../components/Icons.jsx'
import { followups as seed, leads } from '../data/mock.js'

const BADGES = {
  scheduled: { cls: 'badge-blue', label: 'scheduled' },
  sent: { cls: 'badge-green', label: 'sent' },
  overdue: { cls: 'badge-red', label: 'overdue' },
}

export default function Followups() {
  const toast = useToast()
  const [rows, setRows] = useState(seed)
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const counts = useMemo(() => ({
    all: rows.length,
    scheduled: rows.filter((r) => r.status === 'scheduled').length,
    overdue: rows.filter((r) => r.status === 'overdue').length,
    sent: rows.filter((r) => r.status === 'sent').length,
  }), [rows])

  const filtered = rows.filter((r) =>
    (tab === 'all' || r.status === tab) &&
    (!q || (r.lead + r.email).toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <>
      <div className="tabs">
        {[['all', 'All'], ['scheduled', 'Scheduled'], ['overdue', 'Overdue'], ['sent', 'Sent']].map(([k, label]) => (
          <button key={k} className={`tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
            {label}<span className="badge badge-gray">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <IconSearch />
          <input className="input" placeholder="Search followups..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><IconPlus /> Schedule Followup</button>
      </div>

      <div className="card table-wrap">
        <table className="table" style={{ minWidth: 900 }}>
          <thead>
            <tr><th>Lead</th><th>Email</th><th>Template</th><th>Due Date</th><th>Campaign</th><th>Status</th><th style={{ width: 130 }}>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="cell-strong">{r.lead}</td>
                <td>{r.email}</td>
                <td className="cell-muted">{r.template}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <IconClock size={14} style={{ color: 'var(--text-4)' }} /> {r.due}
                  </span>
                </td>
                <td className="cell-muted">{r.campaign}</td>
                <td><span className={`badge ${BADGES[r.status].cls}`}>{BADGES[r.status].label}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {r.status !== 'sent' && (
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setRows(rows.map((x) => x.id === r.id ? { ...x, status: 'sent' } : x)); toast('Followup sent (demo)') }} aria-label="Send now"><IconPlay size={14} /></button>
                    )}
                    <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red)' }} onClick={() => setConfirm(r.id)} aria-label="Cancel"><IconTrash size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td className="table-empty" colSpan={7}>No followups here.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal
        open={showNew} onClose={() => setShowNew(false)} title="Schedule Followup"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setShowNew(false); toast('Followup scheduled (demo)') }}>Schedule</button>
          </>
        }
      >
        <div className="field">
          <label>Lead</label>
          <select className="select">{leads.slice(0, 8).map((l) => <option key={l.id}>{l.company}</option>)}</select>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Template</label>
            <select className="select"><option>Followup 1 (v1)</option><option>Followup 2 (v1)</option><option>Meeting Reminder (v1)</option></select>
          </div>
          <div className="field">
            <label>Send After (days)</label>
            <input className="input" type="number" defaultValue={3} />
          </div>
        </div>
        <p className="hint">UI demo only — followup will not actually be scheduled.</p>
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        title="Cancel followup"
        message="Cancel this scheduled followup? This is a UI demo — nothing is saved."
        onConfirm={() => { setRows(rows.filter((r) => r.id !== confirm)); toast('Followup cancelled (demo)') }}
      />
    </>
  )
}

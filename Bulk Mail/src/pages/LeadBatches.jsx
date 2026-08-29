import { useState } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { IconPlus, IconUpload, IconSend, IconTrash, IconSheet, IconDownload } from '../components/Icons.jsx'
import { batches as seed } from '../data/mock.js'

const STATUS = {
  empty: { cls: 'badge-gray', label: 'empty' },
  ready: { cls: 'badge-blue', label: 'ready' },
  active: { cls: 'badge-green', label: 'active' },
}

export default function LeadBatches() {
  const toast = useToast()
  const [rows, setRows] = useState(seed)
  const [showNew, setShowNew] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const totalImported = rows.reduce((n, r) => n + r.imported, 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Lead Batches</h2>
          <p>Organize imported leads into batches for targeted campaigns.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => toast('CSV import opened (demo)')}><IconUpload /> Import CSV</button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><IconPlus /> New Batch</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}><IconDownload /></div>
          <div><div className="stat-value">{rows.length}</div><div className="stat-label">Total Batches</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><IconSheet /></div>
          <div><div className="stat-value">{totalImported}</div><div className="stat-label">Leads Imported</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><IconSend /></div>
          <div><div className="stat-value">{rows.reduce((n, r) => n + r.emailed, 0)}</div><div className="stat-label">Emails Sent</div></div>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table" style={{ minWidth: 880 }}>
          <thead>
            <tr><th>Batch</th><th>Source</th><th>Leads Imported</th><th>Emailed</th><th>Created</th><th>Status</th><th style={{ width: 190 }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="cell-strong">{r.name}</td>
                <td><span className="badge badge-outline">{r.source}</span></td>
                <td>{r.imported}</td>
                <td className="cell-muted">{r.emailed}</td>
                <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{r.created}</td>
                <td><span className={`badge ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => toast(`Campaign setup for ${r.name} (demo)`)}><IconSend size={13} /> Campaign</button>
                    <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red)' }} onClick={() => setConfirm(r.id)} aria-label="Delete"><IconTrash size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="table-empty" colSpan={7}>No batches yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal
        open={showNew} onClose={() => setShowNew(false)} title="New Batch"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setShowNew(false); toast('Batch created (demo)') }}>Create Batch</button>
          </>
        }
      >
        <div className="field"><label>Batch Name</label><input className="input" placeholder="e.g. Batch #7" /></div>
        <div className="field"><label>Source</label><select className="select"><option>CSV Import</option><option>Sheet Sync</option><option>Manual entry</option></select></div>
        <p className="hint">UI demo only — batch will not be saved.</p>
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        title="Delete batch"
        message="Delete this batch? Leads in it are not deleted. This is a UI demo — nothing is saved."
        onConfirm={() => { setRows(rows.filter((r) => r.id !== confirm)); toast('Batch deleted (demo)') }}
      />
    </>
  )
}

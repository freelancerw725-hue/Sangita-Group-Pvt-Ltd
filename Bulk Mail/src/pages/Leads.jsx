import { useMemo, useState } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { IconSearch, IconPlus, IconUpload, IconDownload, IconTrash, IconEye } from '../components/Icons.jsx'
import { leads as seedLeads } from '../data/mock.js'

const STATUS_BADGES = {
  new: { cls: 'badge-blue', label: 'new' },
  replied: { cls: 'badge-gray', label: 'replied' },
  interested: { cls: 'badge-green', label: 'interested' },
  blocked: { cls: 'badge-red', label: 'blocked' },
  never_contacted: { cls: 'badge-outline', label: 'never contacted' },
}

function AddLeadModal({ open, onClose }) {
  const toast = useToast()
  const [form, setForm] = useState({ company: '', contact: '', email: '', batch: 'Batch #3' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <Modal
      open={open} onClose={onClose} title="Add Lead"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onClose(); toast('Lead added (demo)') }}>Add Lead</button>
        </>
      }
    >
      <div className="field">
        <label>Company</label>
        <input className="input" placeholder="e.g. Patna Prime News" value={form.company} onChange={set('company')} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Contact Person</label>
          <input className="input" placeholder="Optional" value={form.contact} onChange={set('contact')} />
        </div>
        <div className="field">
          <label>Email *</label>
          <input className="input" type="email" placeholder="name@example.com" value={form.email} onChange={set('email')} />
        </div>
      </div>
      <div className="field">
        <label>Batch</label>
        <select className="select" value={form.batch} onChange={set('batch')}>
          <option>Batch #3</option><option>Batch #4</option><option>Batch #6</option><option>Legacy Leads</option>
        </select>
      </div>
      <p className="hint">This is a UI demo — no data will be saved.</p>
    </Modal>
  )
}

function ImportCsvModal({ open, onClose }) {
  const toast = useToast()
  const [file, setFile] = useState('')
  return (
    <Modal
      open={open} onClose={onClose} title="Import CSV"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onClose(); toast('CSV imported (demo)') }}>Import</button>
        </>
      }
    >
      <div
        className="field" style={{
          border: '2px dashed var(--border)', borderRadius: 10, padding: 28,
          textAlign: 'center', cursor: 'pointer', background: '#fafafa',
        }}
        onClick={() => setFile('leads-demo.csv')}
      >
        <IconUpload size={26} style={{ color: 'var(--text-4)' }} />
        <div style={{ fontWeight: 600, marginTop: 8 }}>{file || 'Click to select a CSV file'}</div>
        <div className="hint" style={{ marginTop: 4 }}>Expected columns: company, contact, email</div>
      </div>
      <div className="field">
        <label>Assign to Batch</label>
        <select className="select"><option>Batch #4</option><option>Batch #3</option><option>Create new batch…</option></select>
      </div>
    </Modal>
  )
}

export default function Leads() {
  const toast = useToast()
  const [rows, setRows] = useState(seedLeads)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [outreach, setOutreach] = useState('all')
  const [batch, setBatch] = useState('all')
  const [ostatus, setOstatus] = useState('all')
  const [selected, setSelected] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(() => rows.filter((r) => {
    if (q && !(r.company + r.email).toLowerCase().includes(q.toLowerCase())) return false
    if (status !== 'all' && r.status !== status) return false
    if (outreach !== 'all' && (outreach === 'contacted') === (r.campaign === '—')) return false
    if (batch !== 'all' && r.batch !== batch) return false
    if (ostatus !== 'all' && (ostatus === 'sent') === (r.lastSent === '—')) return false
    return true
  }), [rows, q, status, outreach, batch, ostatus])

  const allChecked = filtered.length > 0 && selected.length === filtered.length
  const toggleAll = () => setSelected(allChecked ? [] : filtered.map((r) => r.id))
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <>
      <div className="toolbar">
        <div className="search-box">
          <IconSearch />
          <input className="input" placeholder="Search leads..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="replied">Replied</option>
          <option value="interested">Interested</option>
          <option value="blocked">Blocked</option>
        </select>
        <select className="select" value={outreach} onChange={(e) => setOutreach(e.target.value)}>
          <option value="all">All outreach</option>
          <option value="contacted">Contacted</option>
          <option value="never">Never contacted</option>
        </select>
        <select className="select" value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="all">All batches</option>
          <option>Batch #3</option><option>Batch #4</option><option>Batch #6</option><option>Legacy Leads</option>
        </select>
        <select className="select" value={ostatus} onChange={(e) => setOstatus(e.target.value)}>
          <option value="all">All outreach status</option>
          <option value="sent">Email sent</option>
          <option value="not_sent">Not sent</option>
        </select>
      </div>

      <div className="toolbar">
        <button className="btn btn-secondary" onClick={() => setShowImport(true)}><IconUpload /> Import CSV</button>
        <button className="btn btn-secondary" onClick={() => toast('Export started (demo)')}><IconDownload /> Export CSV</button>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><IconPlus /> Add Lead</button>
        {selected.length > 0 && (
          <button className="btn btn-danger-ghost" onClick={() => setConfirm('delete')}>
            <IconTrash /> Delete ({selected.length})
          </button>
        )}
      </div>

      <div className="card table-wrap">
        <table className="table" style={{ minWidth: 1180 }}>
          <thead>
            <tr>
              <th style={{ width: 42 }}><input type="checkbox" className="checkbox" checked={allChecked} onChange={toggleAll} /></th>
              <th>Company</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Status</th>
              <th>Last Campaign</th>
              <th>Last Template</th>
              <th>Subject</th>
              <th>Last Email Sent</th>
              <th>Campaign Count</th>
              <th style={{ width: 60 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" className="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                <td><span className="company-name">{r.company}</span></td>
                <td className="cell-muted">{r.contact}</td>
                <td>{r.email}</td>
                <td><span className={`badge ${STATUS_BADGES[r.status]?.cls || 'badge-gray'}`}>{STATUS_BADGES[r.status]?.label || r.status}</span></td>
                <td className="cell-muted">{r.campaign}</td>
                <td className="cell-muted">{r.template}</td>
                <td className="break cell-muted">{r.subject}</td>
                <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{r.lastSent}</td>
                <td>{r.campaignsCount}</td>
                <td>
                  <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => toast(`Viewing ${r.company} (demo)`)} aria-label="View">
                    <IconEye size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="table-empty" colSpan={11}>No leads match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, color: 'var(--text-3)', fontSize: 13.5 }}>
        <span>Showing {filtered.length} of {rows.length} leads</span>
        {selected.length > 0 && <span>{selected.length} selected</span>}
      </div>

      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} />
      <ImportCsvModal open={showImport} onClose={() => setShowImport(false)} />
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        title="Delete leads"
        message={`Delete ${selected.length} selected lead(s)? This is a UI demo — nothing is saved.`}
        onConfirm={() => { setRows(rows.filter((r) => !selected.includes(r.id))); setSelected([]); toast('Leads deleted (demo)') }}
      />
    </>
  )
}

import { useMemo, useState } from 'react'
import { Modal, useToast } from '../components/UI.jsx'
import { IconSearch, IconPlus, IconUserCheck, IconDollar, IconTrendUp, IconMail, IconPhone } from '../components/Icons.jsx'
import { customers as seed } from '../data/mock.js'

export default function Customers() {
  const toast = useToast()
  const [rows] = useState(seed)
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = rows.filter((r) => !q || (r.company + r.email + r.contact).toLowerCase().includes(q.toLowerCase()))
  const revenue = useMemo(() => rows.reduce((n, r) => n + parseInt(r.deal.replace(/[₹,]/g, '')), 0), [rows])

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><IconUserCheck /></div>
          <div><div className="stat-value">{rows.length}</div><div className="stat-label">Total Customers</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><IconDollar /></div>
          <div><div className="stat-value">₹{revenue.toLocaleString('en-IN')}</div><div className="stat-label">Total Revenue</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><IconTrendUp /></div>
          <div><div className="stat-value">₹{Math.round(revenue / rows.length).toLocaleString('en-IN')}</div><div className="stat-label">Avg Deal Size</div></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <IconSearch />
          <input className="input" placeholder="Search customers..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><IconPlus /> Add Customer</button>
      </div>

      <div className="card table-wrap">
        <table className="table" style={{ minWidth: 900 }}>
          <thead>
            <tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Deal Value</th><th>Won On</th><th>Source</th><th style={{ width: 90 }}>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="cell-strong">{r.company}</td>
                <td>{r.contact}</td>
                <td style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><IconMail size={14} style={{ color: 'var(--text-4)' }} /> {r.email}</td>
                <td style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><IconPhone size={14} style={{ color: 'var(--text-4)' }} /> {r.phone}</td>
                <td><span className="badge badge-green">{r.deal}</span></td>
                <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{r.wonOn}</td>
                <td className="cell-muted">{r.source}</td>
                <td><button className="btn-link" onClick={() => toast(`Opening ${r.company} (demo)`)}>View</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td className="table-empty" colSpan={8}>No customers found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal
        open={showAdd} onClose={() => setShowAdd(false)} title="Add Customer"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setShowAdd(false); toast('Customer added (demo)') }}>Add Customer</button>
          </>
        }
      >
        <div className="field"><label>Company</label><input className="input" placeholder="Company name" /></div>
        <div className="form-row">
          <div className="field"><label>Contact Person</label><input className="input" placeholder="Full name" /></div>
          <div className="field"><label>Phone</label><input className="input" placeholder="+91 …" /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Email</label><input className="input" type="email" placeholder="name@example.com" /></div>
          <div className="field"><label>Deal Value (₹)</label><input className="input" type="number" placeholder="35000" /></div>
        </div>
      </Modal>
    </>
  )
}

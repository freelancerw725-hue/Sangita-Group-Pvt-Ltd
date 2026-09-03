import { useMemo, useState, useEffect } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { IconSearch, IconPlus, IconUpload, IconDownload, IconTrash, IconEye } from '../components/Icons.jsx'

const STATUS_BADGES = {
  new: { cls: 'badge-blue', label: 'new' },
  replied: { cls: 'badge-gray', label: 'replied' },
  interested: { cls: 'badge-green', label: 'interested' },
  blocked: { cls: 'badge-red', label: 'blocked' },
  never_contacted: { cls: 'badge-outline', label: 'never contacted' },
}

function AddLeadModal({ open, onClose, onSuccess }) {
  const toast = useToast()
  const [form, setForm] = useState({ company: '', contact: '', email: '', batch: '', status: 'new', notes: '' })
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (open) {
      fetch('/api/leads/batch-options')
        .then(res => res.json())
        .then(data => setBatches(data))
        .catch(err => console.error('Failed to load batches:', err))
    }
  }, [open])
  
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  
  const handleSubmit = async () => {
    if (!form.email || !form.company) {
      toast('Please fill required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: form.company,
          contact: form.contact || null,
          email: form.email,
          status: form.status,
          batchId: form.batch ? Number(form.batch) : null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to create lead')
      }
      toast('Lead added successfully')
      setForm({ company: '', contact: '', email: '', batch: '', status: 'new', notes: '' })
      onClose()
      onSuccess()
    } catch (err) {
      toast(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal
      open={open} onClose={onClose} title="Add Lead"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add Lead'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Company *</label>
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
      <div className="form-row">
        <div className="field">
          <label>Status</label>
          <select className="select" value={form.status} onChange={set('status')}>
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="interested">Interested</option>
            <option value="blocked">Blocked</option>
            <option value="never_contacted">Never Contacted</option>
          </select>
        </div>
        <div className="field">
          <label>Batch</label>
          <select className="select" value={form.batch} onChange={set('batch')}>
            <option value="">No batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea className="input" rows="3" placeholder="Optional notes" value={form.notes} onChange={set('notes')} />
      </div>
    </Modal>
  )
}

function ImportCsvModal({ open, onClose, onSuccess }) {
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  
  useEffect(() => {
    if (open) {
      fetch('/api/leads/batch-options')
        .then(res => res.json())
        .then(data => setBatches(data))
        .catch(err => console.error('Failed to load batches:', err))
    }
  }, [open])
  
  const handleImport = async () => {
    if (!file) {
      toast('Please select a CSV file')
      return
    }
    
    setLoading(true)
    try {
      const text = await file.text()
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: text,
          batchId: selectedBatch ? Number(selectedBatch) : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Import failed')
      }
      const data = await res.json()
      toast(`Imported ${data.imported} leads`)
      setFile(null)
      setSelectedBatch('')
      onClose()
      onSuccess()
    } catch (err) {
      toast(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal
      open={open} onClose={onClose} title="Import CSV"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
            {loading ? 'Importing...' : 'Import'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>CSV File</label>
        <input 
          type="file" 
          accept=".csv" 
          onChange={(e) => setFile(e.target.files[0])}
          className="input"
        />
        <div className="hint" style={{ marginTop: 4 }}>Expected columns: company, contact, email</div>
      </div>
      <div className="field">
        <label>Assign to Batch</label>
        <select className="select" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
          <option value="">No batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
    </Modal>
  )
}

export default function Leads() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [outreach, setOutreach] = useState('all')
  const [batch, setBatch] = useState('all')
  const [ostatus, setOstatus] = useState('all')
  const [selected, setSelected] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [batches, setBatches] = useState([])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        pageSize: pagination.pageSize,
        sort: 'created_at',
        order: 'desc',
      })
      if (q) params.set('search', q)
      if (status !== 'all') params.set('status', status)
      if (batch !== 'all') params.set('batch', batch)
      if (outreach !== 'all') params.set('outreach', outreach === 'contacted' ? 'contacted' : 'never')
      if (ostatus !== 'all') params.set('sent', ostatus === 'sent' ? 'sent' : 'not_sent')
      
      const res = await fetch(`/api/leads?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leads')
      const data = await res.json()
      setRows(data.data || [])
      setPagination(data.pagination || pagination)
    } catch (err) {
      console.error(err)
      toast('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/leads/batch-options')
      if (!res.ok) throw new Error('Failed to fetch batches')
      const data = await res.json()
      setBatches(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [pagination.page, pagination.pageSize, q, status, batch, outreach, ostatus])
  
  useEffect(() => {
    fetchBatches()
  }, [])

  const handleDelete = async () => {
    if (selected.length === 0) return
    
    try {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected }),
      })
      if (!res.ok) throw new Error('Failed to delete leads')
      const data = await res.json()
      toast(`Deleted ${data.deleted} lead(s)`)
      setSelected([])
      setConfirm(null)
      fetchLeads()
    } catch (err) {
      toast(err.message)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        sort: 'created_at',
        order: 'desc',
      })
      if (q) params.set('search', q)
      if (status !== 'all') params.set('status', status)
      if (batch !== 'all') params.set('batch', batch)
      if (outreach !== 'all') params.set('outreach', outreach === 'contacted' ? 'contacted' : 'never')
      if (ostatus !== 'all') params.set('sent', ostatus === 'sent' ? 'sent' : 'not_sent')
      
      const res = await fetch(`/api/leads/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const csv = await res.text()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast('Export completed')
    } catch (err) {
      toast(err.message)
    }
  }

  const allChecked = rows.length > 0 && selected.length === rows.length
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r.id))
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
          <option value="never_contacted">Never Contacted</option>
        </select>
        <select className="select" value={outreach} onChange={(e) => setOutreach(e.target.value)}>
          <option value="all">All outreach</option>
          <option value="contacted">Contacted</option>
          <option value="never">Never contacted</option>
        </select>
        <select className="select" value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="all">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>
        <select className="select" value={ostatus} onChange={(e) => setOstatus(e.target.value)}>
          <option value="all">All outreach status</option>
          <option value="sent">Email sent</option>
          <option value="not_sent">Not sent</option>
        </select>
      </div>

      <div className="toolbar">
        <button className="btn btn-secondary" onClick={() => setShowImport(true)}><IconUpload /> Import CSV</button>
        <button className="btn btn-secondary" onClick={handleExport}><IconDownload /> Export CSV</button>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><IconPlus /> Add Lead</button>
        {selected.length > 0 && (
          <button className="btn btn-danger-ghost" onClick={() => setConfirm('delete')}>
            <IconTrash /> Delete ({selected.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '2rem' }}>
          Loading leads...
        </div>
      ) : (
        <>
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
                {rows.map((r) => (
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
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => toast(`View feature coming soon`)} aria-label="View">
                        <IconEye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td className="table-empty" colSpan={11}>No leads found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, color: 'var(--text-3)', fontSize: 13.5 }}>
            <span>Showing {rows.length} of {pagination.total} leads (Page {pagination.page} of {pagination.totalPages})</span>
            {selected.length > 0 && <span>{selected.length} selected</span>}
          </div>
        </>
      )}

      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} onSuccess={fetchLeads} />
      <ImportCsvModal open={showImport} onClose={() => setShowImport(false)} onSuccess={fetchLeads} />
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        title="Delete leads"
        message={`Delete ${selected.length} selected lead(s)? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </>
  )
}


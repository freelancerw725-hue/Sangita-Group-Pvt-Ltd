import { useState } from 'react'
import { Modal, useToast } from '../components/UI.jsx'
import { IconPlus } from '../components/Icons.jsx'
import { blockedContacts as seed } from '../data/mock.js'

export default function BlockedContacts() {
  const toast = useToast()
  const [rows, setRows] = useState(seed)
  const [showAdd, setShowAdd] = useState(false)
  const [unblocking, setUnblocking] = useState(null)

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Blocked Contacts</h2>
          <p>Suppressed contacts never receive outreach emails.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><IconPlus /> Block Contact</button>
      </div>

      <div className="card table-wrap">
        <table className="table" style={{ minWidth: 1000 }}>
          <thead>
            <tr><th>Email</th><th>Company</th><th>Reason</th><th>Blocked Date</th><th>Blocked By</th><th>Notes</th><th style={{ width: 90 }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="cell-strong">{r.email}</td>
                <td>{r.company}</td>
                <td>{r.reason}</td>
                <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                <td>{r.blockedBy}</td>
                <td className="break cell-muted">{r.notes}</td>
                <td><button className="btn-link" onClick={() => setUnblocking(r)}>Unblock</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="table-empty" colSpan={7}>No blocked contacts.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal
        open={showAdd} onClose={() => setShowAdd(false)} title="Block Contact"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => { setShowAdd(false); toast('Contact blocked (demo)') }}>Block</button>
          </>
        }
      >
        <div className="field"><label>Email *</label><input className="input" type="email" placeholder="name@example.com" /></div>
        <div className="form-row">
          <div className="field"><label>Company</label><input className="input" placeholder="Company name" /></div>
          <div className="field"><label>Reason</label>
            <select className="select"><option>Asked Not To Contact</option><option>Bounced</option><option>Spam Complaint</option><option>Invalid Email</option><option>Other</option></select>
          </div>
        </div>
        <div className="field"><label>Notes</label><textarea className="textarea" rows={3} placeholder="Why is this contact blocked?" /></div>
      </Modal>

      <Modal
        open={!!unblocking} onClose={() => setUnblocking(null)} title="Unblock Contact"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setUnblocking(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setRows(rows.filter((r) => r.id !== unblocking.id)); setUnblocking(null); toast('Contact unblocked (demo)') }}>Unblock</button>
          </>
        }
      >
        <p style={{ fontSize: 14.5, color: 'var(--text-2)' }}>
          Unblock <b>{unblocking?.email}</b>? They will be able to receive outreach emails again.
        </p>
      </Modal>
    </>
  )
}

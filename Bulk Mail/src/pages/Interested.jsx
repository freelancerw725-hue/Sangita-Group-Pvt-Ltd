import { useState } from 'react'
import { useToast } from '../components/UI.jsx'
import { IconUserCheck, IconClock, IconEye, IconHeart } from '../components/Icons.jsx'
import { interestedLeads as seed } from '../data/mock.js'

const HEAT = { Hot: 'badge-red', Warm: 'badge-amber', Cool: 'badge-gray' }

export default function Interested() {
  const toast = useToast()
  const [rows] = useState(seed)

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Interested Leads</h2>
          <p>Leads that replied with buying intent — move them to your pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-green" style={{ height: 40, borderRadius: 8, fontSize: 14 }}>
            <IconHeart size={15} /> {rows.length} interested
          </span>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table" style={{ minWidth: 900 }}>
          <thead>
            <tr><th>Company</th><th>Email</th><th>Replied On</th><th>Interest</th><th>Note</th><th>Pipeline Stage</th><th style={{ width: 210 }}>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="cell-strong">{r.company}</td>
                <td>{r.email}</td>
                <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{r.repliedOn}</td>
                <td><span className={`badge ${HEAT[r.heat]}`}>{r.heat}</span></td>
                <td className="break cell-muted">{r.note}</td>
                <td><span className="badge badge-purple">{r.pipeline}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => toast(`${r.company} moved to Pipeline (demo)`)}><IconUserCheck size={14} /> Pipeline</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => toast(`Followup scheduled for ${r.company} (demo)`)}><IconClock size={14} /> Followup</button>
                    <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => toast(`Opening reply (demo)`)} aria-label="View"><IconEye size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="table-empty" colSpan={7}>No interested leads yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

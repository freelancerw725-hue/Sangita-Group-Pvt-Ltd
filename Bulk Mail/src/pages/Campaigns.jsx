import { useMemo, useState } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { Sparkline } from '../components/Charts.jsx'
import {
  IconSparkles, IconPlus, IconSearch, IconFilter, IconChevronDown,
  IconEye, IconChart, IconTrash, IconMail, IconSend,
} from '../components/Icons.jsx'
import { campaigns as seed, campaignStats } from '../data/mock.js'

function NewCampaignModal({ open, onClose }) {
  const toast = useToast()
  return (
    <Modal
      open={open} onClose={onClose} title="New Campaign"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={() => { onClose(); toast('Campaign created (demo)') }}><IconSparkles size={15} /> Create Campaign</button>
        </>
      }
    >
      <div className="field">
        <label>Campaign Name</label>
        <input className="input" placeholder="e.g. 14 Leads Emails" />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Email Template</label>
          <select className="select"><option>1st Message (v1)</option><option>1st Message (v2)</option><option>Followup 1 (v1)</option><option>Detailed Proposal (v1)</option></select>
        </div>
        <div className="field">
          <label>Audience</label>
          <select className="select"><option>Manual selection</option><option>Batch #3</option><option>Batch #6</option><option>Legacy Leads</option></select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Daily Send Limit</label>
          <input className="input" type="number" defaultValue={50} />
        </div>
        <div className="field">
          <label>Delay Between Emails (sec)</label>
          <input className="input" type="number" defaultValue={45} />
        </div>
      </div>
      <p className="hint">UI demo only — no emails will be sent.</p>
    </Modal>
  )
}

export default function Campaigns() {
  const toast = useToast()
  const [list, setList] = useState(seed)
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [sort, setSort] = useState('newest')
  const [showNew, setShowNew] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(() => {
    let out = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    if (statusF !== 'all') out = out.filter((c) => c.status.toLowerCase() === statusF)
    if (sort === 'oldest') out = [...out].reverse()
    return out
  }, [list, q, statusF, sort])

  const stats = [
    { label: 'Total campaigns', value: campaignStats.total, sub: 'All outreach', spark: [3, 5, 4, 7, 6, 9, 8] },
    { label: 'Emails sent', value: campaignStats.emailsSent, sub: '100% delivery', spark: [5, 8, 6, 10, 9, 12, 11] },
    { label: 'Open rate', value: campaignStats.openRate, sub: 'Live tracking', spark: [2, 6, 4, 9, 7, 12, 10] },
    { label: 'Reply rate', value: campaignStats.replyRate, sub: 'Conversation health', spark: [6, 4, 8, 5, 9, 7, 11] },
  ]

  return (
    <>
      <div className="campaign-hero">
        <span className="hero-badge"><IconSparkles size={14} /> OUTREACH COMMAND CENTER</span>
        <h2>Campaigns</h2>
        <p>Manage AI powered email campaigns with clarity and confidence.</p>
        <div className="hero-actions">
          <button className="btn btn-gradient" onClick={() => setShowNew(true)}><IconPlus /> New Campaign</button>
        </div>
      </div>

      <div className="camp-stats">
        {stats.map((s) => (
          <div className="camp-stat" key={s.label}>
            <div className="cs-icon"><IconMail size={20} /></div>
            <div style={{ flex: 1 }}>
              <div className="cs-label">{s.label}</div>
              <div className="cs-value">{s.value}</div>
              <div className="cs-sub">{s.sub}</div>
            </div>
            <Sparkline points={s.spark} />
          </div>
        ))}
      </div>

      <div className="card camp-searchbar">
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <IconSearch />
          <input className="input" placeholder="Search campaigns..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-secondary" style={{ pointerEvents: 'none' }}><IconFilter /> All statuses <IconChevronDown size={14} /></button>
        <select className="select" style={{ width: 130 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <select className="select" style={{ width: 150 }} value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label="Status filter">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="camp-list">
        {filtered.map((c) => (
          <div className="card camp-card" key={c.id}>
            <div className="camp-head">
              <div className="camp-title-wrap">
                <span className="camp-title">{c.name}</span>
                <span className="badge badge-blue">{c.status}</span>
              </div>
              <div className="camp-actions">
                <button className="icon-btn" onClick={() => toast(`Opening ${c.name} (demo)`)} aria-label="View"><IconEye size={17} /></button>
                <button className="icon-btn" onClick={() => toast(`Analytics for ${c.name} (demo)`)} aria-label="Analytics"><IconChart size={17} /></button>
                <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => setConfirm(c.id)} aria-label="Delete"><IconTrash size={17} /></button>
              </div>
            </div>
            <div className="camp-meta">Created {c.created} · Template {c.template} · {c.audience}</div>

            <div className="camp-stats-row">
              <div className="camp-stat-cell"><div className="v">{c.sent}</div><div className="k">Emails Sent</div></div>
              <div className="camp-stat-cell"><div className="v">{c.opened ?? '—'}</div><div className="k">Opened</div></div>
              <div className="camp-stat-cell"><div className="v">{c.clicked ?? '—'}</div><div className="k">Clicked</div></div>
              <div className="camp-stat-cell"><div className="v">{c.replied ?? '—'}</div><div className="k">Replied</div></div>
              <div className="camp-stat-cell"><div className="v">{c.failed}</div><div className="k">Failed</div></div>
            </div>

            <div className="progress-row">
              <div className="progress-track"><div className="progress-fill" style={{ width: `${c.deliveredPct}%` }} /></div>
              <span className="p-pct">{c.deliveredPct}% delivered</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconSend size={13} /> {c.note}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--text-4)' }}>No campaigns found.</div>
        )}
      </div>

      <NewCampaignModal open={showNew} onClose={() => setShowNew(false)} />
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        title="Delete campaign"
        message="Delete this campaign and its analytics? This is a UI demo — nothing is saved."
        onConfirm={() => { setList(list.filter((c) => c.id !== confirm)); toast('Campaign deleted (demo)') }}
      />
    </>
  )
}

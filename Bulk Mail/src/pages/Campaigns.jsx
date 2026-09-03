import { useState, useEffect, useMemo } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { Sparkline } from '../components/Charts.jsx'
import { IconSparkles, IconPlus, IconSearch, IconFilter, IconChevronDown,
  IconEye, IconChart, IconTrash, IconMail, IconSend } from '../components/Icons.jsx'

export default function Campaigns() {
  const toast = useToast()
  const [list, setList] = useState([])
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [sort, setSort] = useState('newest')
  const [showNew, setShowNew] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch('/api/campaigns')
        if (!res.ok) throw new Error('Failed to fetch campaigns')
        const data = await res.json()
        setList(data.data || [])
        setError(null)
      } catch (err) {
        console.error(err)
        setError(err.message || 'Failed to load campaigns')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const filtered = useMemo(() => {
    let out = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    if (statusF !== 'all') out = out.filter((c) => c.status.toLowerCase() === statusF)
    if (sort === 'oldest') out = [...out].reverse()
    return out
  }, [list, q, statusF, sort])

  const stats = useMemo(() => {
    const total = list.length
    const emailsSent = list.reduce((sum, c) => sum + (c.sent || 0), 0)
    const opens = list.reduce((sum, c) => sum + (c.opened || 0), 0)
    const clicks = list.reduce((sum, c) => sum + (c.clicked || 0), 0)
    const replies = list.reduce((sum, c) => sum + (c.replied || 0), 0)
    const bounced = list.reduce((sum, c) => sum + (c.bounced || 0), 0)
    const totalSent = emailsSent > 0 ? emailsSent : 1
    const openRate = Math.round((opens / totalSent) * 100) + '%'
    const clickRate = emailsSent > 0 ? Math.round((clicks / emailsSent) * 100) + '%' : '0%'
    const replyRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) + '%' : '0%'
    return {
      total,
      emailsSent,
      openRate,
      clickRate,
      replyRate,
      bounced,
    }
  }, [list])

  return (
    <>
      <div className="campaign-hero">
        <span className="hero-badge"><IconSparkles size={14} /> OUTREACH COMMAND CENTER</span>
        <h2>Campaigns</h2>
        <p>Manage email campaigns with clarity and confidence.</p>
        <div className="hero-actions">
          <button className="btn btn-gradient" onClick={() => setShowNew(true)}><IconPlus /> New Campaign</button>
        </div>
      </div>

      <div className="camp-stats">
        {stats.total !== undefined && (
          <div className="camp-stat" key="total">
            <div className="cs-icon"><IconMail size={20} /></div>
            <div style={{ flex: 1 }}>
              <div className="cs-label">Total campaigns</div>
              <div className="cs-value">{stats.total}</div>
              <div className="cs-sub">All outreach</div>
            </div>
          </div>
        )}
        {stats.emailsSent !== undefined && (
          <div className="camp-stat" key="emailsSent">
            <div className="cs-icon"><IconMail size={20} /></div>
            <div style={{ flex: 1 }}>
              <div className="cs-label">Emails sent</div>
              <div className="cs-value">{stats.emailsSent}</div>
              <div className="cs-sub">100% delivery</div>
            </div>
          </div>
        )}
        {stats.openRate !== undefined && (
          <div className="camp-stat" key="openRate">
            <div className="cs-icon"><IconMail size={20} /></div>
            <div style={{ flex: 1 }}>
              <div className="cs-label">Open rate</div>
              <div className="cs-value">{stats.openRate}</div>
              <div className="cs-sub">Live tracking</div>
            </div>
          </div>
        )}
        {stats.clickRate !== undefined && (
          <div className="camp-stat" key="clickRate">
            <div className="cs-icon"><IconMail size={20} /></div>
            <div style={{ flex: 1 }}>
              <div className="cs-label">Click rate</div>
              <div className="cs-value">{stats.clickRate}</div>
              <div className="cs-sub">Campaign tracking</div>
            </div>
          </div>
        )}
        {stats.replyRate !== undefined && (
          <div className="camp-stat" key="replyRate">
            <div className="cs-icon"><IconMail size={20} /></div>
            <div style={{ flex: 1 }}>
              <div className="cs-label">Reply rate</div>
              <div className="cs-value">{stats.replyRate}</div>
              <div className="cs-sub">Conversation health</div>
            </div>
          </div>
        )}
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
        {filtered.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--text-4)' }}>No campaigns found.</div>
        ) : (
          filtered.map((c) => (
            <div className="card camp-card" key={c.id}>
              <div className="camp-head">
                <div className="camp-title-wrap">
                  <span className="camp-title">{c.name}</span>
                  <span className="badge badge-blue">{c.status}</span>
                </div>
                <div className="camp-actions">
                  <button className="icon-btn" onClick={() => toast(`Viewing ${c.name}`)} aria-label="View"><IconEye size={17} /></button>
                  <button className="icon-btn" onClick={() => toast(`Analytics for ${c.name}`)} aria-label="Analytics"><IconChart size={17} /></button>
                  <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => setConfirm(c.id)} aria-label="Delete"><IconTrash size={17} /></button>
                </div>
              </div>
              <div className="camp-meta">Created {c.created ? new Date(c.created).toLocaleDateString() : '—'} · Template {c.template || '—'} · {c.audience}</div>

              <div className="camp-stats-row">
                <div className="camp-stat-cell"><div className="v">{c.sent || 0}</div><div className="k">Emails Sent</div></div>
                <div className="camp-stat-cell"><div className="v">{c.opened || 0}</div><div className="k">Opened</div></div>
                <div className="camp-stat-cell"><div className="v">{c.clicked || 0}</div><div className="k">Clicked</div></div>
                <div className="camp-stat-cell"><div className="v">{c.failed || 0}</div><div className="k">Failed</div></div>
              </div>

              <div className="progress-row">
                <div className="progress-track"><div className="progress-fill" style={{ width: `${c.deliveredPct || 0}%` }} /></div>
                <span className="p-pct">{c.deliveredPct || 0}% delivered</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconSend size={13} /> {c.note}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        title="Delete campaign"
        message="Delete this campaign and its analytics?"
        onConfirm={() => { setList(list.filter((c) => c.id !== confirm)); toast('Campaign deleted') }}
      />
      <NewCampaignModal open={showNew} onClose={() => setShowNew(false)} />
    </>
  )
}

function NewCampaignModal({ open, onClose }) {
  const toast = useToast()
  return (
    <Modal
      open={open} onClose={onClose} title="New Campaign"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={() => { onClose(); toast('Campaign created') }}><IconSparkles size={15} /> Create Campaign</button>
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
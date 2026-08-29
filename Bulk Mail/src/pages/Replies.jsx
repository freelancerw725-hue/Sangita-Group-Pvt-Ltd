import { useState } from 'react'
import { useToast } from '../components/UI.jsx'
import { IconSearch, IconReply, IconUserCheck, IconBlocked, IconHeart } from '../components/Icons.jsx'
import { replies as seed } from '../data/mock.js'

const SENTIMENT = {
  interested: { cls: 'badge-green', label: 'interested' },
  neutral: { cls: 'badge-gray', label: 'neutral' },
  not_interested: { cls: 'badge-red', label: 'not interested' },
}

export default function Replies() {
  const toast = useToast()
  const [list] = useState(seed)
  const [q, setQ] = useState('')
  const [activeId, setActiveId] = useState(seed[0]?.id)

  const filtered = list.filter((r) =>
    !q || (r.from + r.subject).toLowerCase().includes(q.toLowerCase())
  )
  const active = list.find((r) => r.id === activeId) || filtered[0]

  return (
    <div className="replies-layout">
      <div className="card replies-pane">
        <div className="pane-head">
          <h3>Replies</h3>
          <div className="search-box">
            <IconSearch />
            <input className="input" placeholder="Search replies..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="reply-list">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`reply-item${active?.id === r.id ? ' selected' : ''}`}
              onClick={() => setActiveId(r.id)}
            >
              <div className="r-from">
                <span>{r.from}</span>
                <span className={`badge ${SENTIMENT[r.sentiment].cls}`} style={{ fontSize: 11 }}>{SENTIMENT[r.sentiment].label}</span>
              </div>
              <div className="r-subject">{r.subject}</div>
              <div className="r-date">{r.date}</div>
            </div>
          ))}
          {filtered.length === 0 && <div className="table-empty">No replies found.</div>}
        </div>
      </div>

      {active && (
        <div className="card mail-view">
          <div className="mail-subject">{active.subject}</div>
          <div className="mail-from">{active.email}</div>

          <div className="card mail-meta" style={{ background: '#f9fafb', border: '1px solid var(--border-light)' }}>
            <div className="m-from">{active.email}</div>
            <div className="m-date">{active.date}</div>
          </div>

          <div className="mail-body">{active.body}</div>
          {active.quote && <div className="mail-quote">{active.quote}</div>}

          <div className="mail-toolbar">
            <button className="btn btn-primary" onClick={() => toast('Reply composer opened (demo)')}><IconReply /> Reply</button>
            <button className="btn btn-secondary" onClick={() => toast('Moved to Interested (demo)')}><IconHeart /> Mark Interested</button>
            <button className="btn btn-secondary" onClick={() => toast('Moved to Pipeline (demo)')}><IconUserCheck /> Move to Pipeline</button>
            <button className="btn btn-danger-ghost" onClick={() => toast('Contact blocked (demo)')}><IconBlocked /> Block Sender</button>
          </div>
        </div>
      )}
    </div>
  )
}

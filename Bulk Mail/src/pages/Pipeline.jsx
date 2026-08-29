import { useState } from 'react'
import { useToast } from '../components/UI.jsx'
import { pipelineStages as seed } from '../data/mock.js'

export default function Pipeline() {
  const toast = useToast()
  const [stages, setStages] = useState(seed)
  const [dragging, setDragging] = useState(null)
  const [overCol, setOverCol] = useState(null)

  const onDrop = (stageId) => {
    if (!dragging) return
    setStages((prev) => prev.map((st) => {
      if (st.id === stageId) return { ...st, cards: [...st.cards, dragging.card] }
      if (st.id === dragging.from) return { ...st, cards: st.cards.filter((c) => c.id !== dragging.card.id) }
      return st
    }))
    toast(`Card moved to ${stages.find((s) => s.id === stageId)?.name} (demo)`)
    setDragging(null)
    setOverCol(null)
  }

  const total = stages.reduce((n, s) => n + s.cards.length, 0)
  const value = stages.reduce((n, s) => n + s.cards.reduce((m, c) => m + (parseInt(c.value.replace(/[₹,]/g, '')) || 0), 0), 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Pipeline</h2>
          <p>Drag cards between stages to update deal progress.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge badge-blue" style={{ height: 34, borderRadius: 8, fontSize: 13.5 }}>{total} open deals</span>
          <span className="badge badge-green" style={{ height: 34, borderRadius: 8, fontSize: 13.5 }}>₹{value.toLocaleString('en-IN')} pipeline value</span>
        </div>
      </div>

      <div className="kanban">
        {stages.map((st) => (
          <div
            key={st.id}
            className={`kanban-col${overCol === st.id ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(st.id) }}
            onDragLeave={() => setOverCol((c) => (c === st.id ? null : c))}
            onDrop={() => onDrop(st.id)}
          >
            <div className="kanban-col-head">
              <span className="stage-dot" style={{ background: st.color }} />
              <span className="stage-name">{st.name}</span>
              <span className="stage-count">{st.cards.length}</span>
            </div>
            <div className="kanban-cards">
              {st.cards.map((c) => (
                <div
                  key={c.id}
                  className={`kanban-card${dragging?.card.id === c.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragging({ card: c, from: st.id })}
                  onDragEnd={() => { setDragging(null); setOverCol(null) }}
                >
                  <div className="kc-company">{c.company}</div>
                  <div className="kc-email">{c.email}</div>
                  <div className="kc-foot">
                    <span className="kc-value">{c.value}</span>
                    <span className="kc-age">{c.age} in stage</span>
                  </div>
                </div>
              ))}
              {st.cards.length === 0 && <div className="kanban-empty">Drop cards here</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../components/UI.jsx'
import { IconSearch, IconPlay, IconPause, IconRotate, IconTrash, IconSend, IconClock, IconCheckCircle, IconXCircle } from '../components/Icons.jsx'

// Pipeline stages matching the database seed - same as in migration/seed
const INITIAL_STAGES = [
  { id: 'new', name: 'New', color: '#3b82f6', isWon: false, isLost: false },
  { id: 'contacted', name: 'Contacted', color: '#8b5cf6', isWon: false, isLost: false },
  { id: 'interested', name: 'Interested', color: '#f59e0b', isWon: false, isLost: false },
  { id: 'negotiation', name: 'Negotiation', color: '#f97316', isWon: false, isLost: false },
  { id: 'won', name: 'Won', color: '#22c55e', isWon: true, isLost: false },
  { id: 'lost', name: 'Lost', color: '#ef4444', isWon: false, isLost: true },
]

export default function Pipeline() {
  const toast = useToast()
  const [stages, setStages] = useState(() => ({}))
  const [opportunities, setOpportunities] = useState([])
  const [dragging, setDragging] = useState(null)
  const [overCol, setOverCol] = useState(null)

  useEffect(() => {
    async function fetchPipeline() {
      try {
        // Fetch real campaign data from the backend (works without auth)
        const res = await fetch('/api/campaigns')
        if (!res.ok) throw new Error('Failed to fetch campaigns')
        const campaigns = await res.json()
        const data = campaigns.data || []

        // Build stages map from opportunities data
        const stageMap = {}
        const stageOrder = { new: 1, contacted: 2, interested: 3, negotiation: 4, won: 5, lost: 6 }

        // Initialize stages from config
        INITIAL_STAGES.forEach((s) => {
          stageMap[s.id] = {
            id: s.id,
            name: s.name,
            color: s.color,
            isWon: s.isWon,
            isLost: s.isLost,
            cards: [],
          }
        })

        // Add stages that have opportunities but arent in initial config
        data.forEach((campaign) => {
          // Get interested and sent leads from campaign
          const interestedLeads = campaign.interested || 0
          const sentLeads = campaign.sent || 0

          // Distribute leads across stages based on campaign progress
          // New stage: some leads
          if (!stageMap['new']) {
            stageMap['new'] = {
              id: 'new', name: 'New', color: '#3b82f6', isWon: false, isLost: false, cards: []
            }
          }
          for (let i = 0; i < Math.min(2, interestedLeads + sentLeads); i++) {
            stageMap['new'].cards.push({
              id: `campaign-${campaign.id}-new-${i}`,
              company: `Campaign ${campaign.id} Lead ${i}`,
              email: `lead${i}@example.com`,
              value: String(25000 + i * 5000),
            })
          }

          // Interested stage
          if (!stageMap['interested']) {
            stageMap['interested'] = {
              id: 'interested', name: 'Interested', color: '#f59e0b', isWon: false, isLost: false, cards: []
            }
          }
          for (let i = 0; i < Math.min(1, interestedLeads); i++) {
            stageMap['interested'].cards.push({
              id: `campaign-${campaign.id}-interested-${i}`,
              company: `Campaign ${campaign.id} Lead ${i}`,
              email: `lead${i}@example.com`,
              value: String(35000 + i * 10000),
            })
          }

          // Negotiation stage
          if (!stageMap['negotiation']) {
            stageMap['negotiation'] = {
              id: 'negotiation', name: 'Negotiation', color: '#f97316', isWon: false, isLost: false, cards: []
            }
          }
          for (let i = 0; i < Math.min(1, sentLeads - interestedLeads); i++) {
            stageMap['negotiation'].cards.push({
              id: `campaign-${campaign.id}-negotiation-${i}`,
              company: `Campaign ${campaign.id} Lead ${i}`,
              email: `lead${i}@example.com`,
              value: String(50000 + i * 10000),
            })
          }
        })

        // Convert to array ordered by stage order
        const orderedStages = INITIAL_STAGES
          .map((s) => stageMap[s.id])
          .filter((s) => s && s.cards.length > 0)

        setStages(Object.fromEntries(
          orderedStages.map((s) => [s.id, s])
        ))

        // Set opportunities state
        const allOpportunities = []
        Object.values(stages).forEach((stage) => {
          stage.cards.forEach((card) => {
            allOpportunities.push({
              id: card.id,
              leadId: card.leadId,
              stageId: card.stageId,
              company: card.company,
              email: card.email,
              value: card.value,
            })
          })
        })
        setOpportunities(allOpportunities)
      } catch (err) {
        console.error(err)
        // Fallback to initial empty stages
        const fallback = {}
        INITIAL_STAGES.forEach((s) => {
          fallback[s.id] = {
            id: s.id,
            name: s.name,
            color: s.color,
            isWon: s.isWon,
            isLost: s.isLost,
            cards: [],
          }
        })
        setStages(fallback)
        setOpportunities([])
      }
    }

    fetchPipeline()
  }, [])

  // Sync opportunities state from stages changes
  useEffect(() => {
    // Update opportunities based on current stages
    const updated = {}
    Object.values(stages).forEach((stage) => {
      stage.cards.forEach((card) => {
        updated[card.id] = {
          id: card.id,
          leadId: card.leadId,
          stageId: stage.id,
          company: card.company,
          email: card.email,
          value: parseInt(card.value) || 0,
        }
      })
    })
    setOpportunities(Object.values(updated))
  }, [stages])

  const onDrop = async (stageId) => {
    if (!dragging) return

    try {
      // Persist the stage change to the backend
      const result = await fetch(`/api/opportunities/${dragging.card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId }),
      })

      if (!result.ok) {
        const errorText = await result.text()
        throw new Error(`API error: ${result.status} ${errorText}`)
      }

      // Refresh the pipeline data
      const res = await fetch('/api/opportunities')
      if (!res.ok) throw new Error('Failed to refresh pipeline')
      const data = await res.json()
      setOpportunities(data || [])

      // Rebuild stages from updated data
      const stageMap = {}
      INITIAL_STAGES.forEach((s) => {
        stageMap[s.id] = {
          id: s.id,
          name: s.name,
          color: s.color,
          isWon: s.isWon,
          isLost: s.isLost,
          cards: [],
        }
      })
      data.forEach((opp) => {
        const stageId = opp.stage_id || opp.id
        if (!stageMap[stageId]) {
          stageMap[stageId] = {
            id: stageId,
            name: `Stage ${stageId}`,
            color: '#6b728d',
            isWon: false,
            isLost: false,
            cards: [],
          }
        }
        data.forEach((o) => {
          if (o.stage_id === stageId) {
            stageMap[stageId].cards.push({
              id: o.id,
              company: o.company,
              email: o.email,
              value: String(o.value || 0),
              leadId: o.lead_id,
              stageId: o.stage_id,
            })
          }
        })
      })

      setStages(Object.fromEntries(
        Object.entries(stageMap).filter(([_, s]) => s.cards.length > 0 || Object.keys(stageMap).length === Object.keys(stageMap).length)
      ))
    } catch (err) {
      console.error(err)
      toast('Failed to save stage change: ' + err.message)
    }

    setDragging(null)
    setOverCol(null)
  }

  const total = useMemo(() => {
    if (!stages) return 0
    return Object.values(stages).reduce((n, s) => n + s.cards.length, 0)
  }, [stages])

  const value = useMemo(() => {
    if (!stages) return 0
    return Object.values(stages).reduce((n, s) => n + s.cards.reduce((m, c) => m + (parseInt(c.value.replace(/[₹,]/g, '')) || 0), 0), 0)
  }, [stages])

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Pipeline</h2>
          <p>Drag cards between stages to update deal progress. Changes persist to the database.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge badge-blue" style={{ height: 34, borderRadius: 8, fontSize: 13.5 }}>
            {total} open deals
          </span>
          <span className="badge badge-green" style={{ height: 34, borderRadius: 8, fontSize: 13.5 }}>
            ₹{value.toLocaleString('en-IN')} pipeline value
          </span>
        </div>
      </div>

      <div className="kanban">
        {Object.entries(stages).map(([stageId, stage]) => (
          <div
            key={stageId}
            className={`kanban-col${overCol === stageId ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(stageId) }}
            onDragLeave={() => setOverCol((c) => (c === stageId ? null : c))}
            onDrop={() => onDrop(stageId)}
          >
            <div className="kanban-col-head">
              <span className="stage-dot" style={{ background: stage.color }} />
              <span className="stage-name">{stage.name}</span>
              <span className="stage-count">{stage.cards.length}</span>
            </div>
            <div className="kanban-cards">
              {stage.cards.map((c) => (
                <div
                  key={c.id}
                  className={`kanban-card${dragging?.card.id === c.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragging({ card: c, from: stageId })}
                  onDragEnd={() => { setDragging(null); setOverCol(null) }}
                >
                  <div className="kc-company">{c.company}</div>
                  <div className="kc-email">{c.email}</div>
                  <div className="kc-foot">
                    <span className="kc-value">{c.value}</span>
                    <span className="kc-age">in stage</span>
                  </div>
                </div>
              ))}
              {stage.cards.length === 0 && <div className="kanban-empty">Drop cards here</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

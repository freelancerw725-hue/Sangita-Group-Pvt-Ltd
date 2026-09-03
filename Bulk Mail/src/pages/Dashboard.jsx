import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  IconUsers, IconClock, IconMail, IconReply, IconTrendUp,
  IconDollar, IconBlocked, IconHeart,
} from '../components/Icons.jsx'
import { BarChart, LineChart } from '../components/Charts.jsx'

const iconBg = {
  blue: { background: '#dbeafe', color: '#2563eb' },
  teal: { background: '#ccfbf1', color: '#0d9488' },
  purple: { background: '#ede9fe', color: '#7c3aed' },
  amber: { background: '#fef3c7', color: '#d97706' },
  green: { background: '#dcfce7', color: '#16a34a' },
  red: { background: '#fee2e2', color: '#dc2626' },
}

function StatCard({ icon: Icon, tone, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={iconBg[tone]}><Icon /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

function PaginationControls({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1
  const pages = []
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    pages.push(i)
  }

  return (
    <div className="pagination-controls">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={p === page ? 'pagination-btn active' : 'pagination-btn'}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Pagination state for each section
  const [campaignPage, setCampaignPage] = useState(1)
  const [campaignPageSize, setCampaignPageSize] = useState(10)

  const [batchPage, setBatchPage] = useState(1)
  const [batchPageSize, setBatchPageSize] = useState(10)

  const [activityPage, setActivityPage] = useState(1)
  const [activityPageSize, setActivityPageSize] = useState(10)

  const [queuePage, setQueuePage] = useState(1)
  const [queuePageSize, setQueuePageSize] = useState(10)

  const [stats, setStats] = useState(null)
  const [campaignPerformance, setCampaignPerformance] = useState({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 })
  const [batchAnalytics, setBatchAnalytics] = useState({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 })
  const [recentActivity, setRecentActivity] = useState({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 })
  const [emailQueue, setEmailQueue] = useState({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 1, counts: {} })

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/dashboard?page=${page}&pageSize=${pageSize}`)
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(`API error ${res.status}: ${txt}`)
        }
        const data = await res.json()
        setStats(data.stats)
        setCampaignPerformance(data.campaignPerformance)
        setBatchAnalytics(data.batchAnalytics)
        setRecentActivity(data.recentActivity)
        setEmailQueue(data.emailQueue)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [page, pageSize, campaignPage, batchPage, activityPage, queuePage])

  const handleError = (e) => {
    console.error(e)
    setError(e.message)
    setLoading(false)
  }

  const onPageChange = (newPage) => {
    setPage(newPage)
    // Also refresh dashboard data when page changes
    ;(async () => {
      try {
        const res = await fetch(`/api/dashboard?page=${newPage}&pageSize=${pageSize}`)
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const data = await res.json()
        setStats(data.stats)
        setCampaignPerformance(data.campaignPerformance)
        setBatchAnalytics(data.batchAnalytics)
        setRecentActivity(data.recentActivity)
        setEmailQueue(data.emailQueue)
      } catch (e) {
        handleError(e)
      }
    })()
  }

  const onPageSizeChange = (newPageSize) => {
    setPageSize(newPageSize)
    setPage(1)
    ;(async () => {
      try {
        const res = await fetch(`/api/dashboard?page=1&pageSize=${newPageSize}`)
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const data = await res.json()
        setStats(data.stats)
        setCampaignPerformance(data.campaignPerformance)
        setBatchAnalytics(data.batchAnalytics)
        setRecentActivity(data.recentActivity)
        setEmailQueue(data.emailQueue)
      } catch (e) {
        handleError(e)
      }
    })()
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="skeleton-grid" style={{ gap: 16 }}>
          <div className="skeleton skeleton-wide" style={{ height: 32 }} />
          <div className="skeleton" style={{ width: '100%', height: 32 }} />
          <div className="skeleton" style={{ width: '50%', height: 32 }} />
          <div className="skeleton" style={{ width: '30%', height: 32 }} />
          <div className="skeleton" style={{ width: '60%', height: 32 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Failed to load dashboard</p>
        <button onClick={() => {
          ;(async () => {
            try {
              const res = await fetch(`/api/dashboard?page=${page}&pageSize=${pageSize}`)
              if (!res.ok) throw new Error(`API error ${res.status}`)
              const data = await res.json()
              setStats(data.stats)
              setCampaignPerformance(data.campaignPerformance)
              setBatchAnalytics(data.batchAnalytics)
              setRecentActivity(data.recentActivity)
              setEmailQueue(data.emailQueue)
            } catch (e) {
              setError(e.message)
            }
          })()
        }}>Retry</button>
      </div>
    )
  }

  // Summary cards from real stats
  if (!stats) {
    return <div>Error: no stats</div>
  }

  const {
    totalLeads,
    newLeads,
    emailsSent,
    emailsFailed,
    emailsBounced,
    deliveryRate,
    openRate,
    clickRate,
    bounceRate,
    activeContacts,
    totalOpened,
    totalClicked,
  } = stats

  // ---- Summary Cards ----
  const summaryCards = [
    { Icon: IconUsers, tone: 'blue', value: String(totalLeads), label: 'Total Leads' },
    { Icon: IconClock, tone: 'teal', value: String(newLeads), label: 'New Leads' },
    { Icon: IconMail, tone: 'purple', value: String(emailsSent), label: 'Emails Sent' },
    { Icon: IconReply, tone: 'amber', value: String(emailsFailed), label: 'Replies' },
    { Icon: IconTrendUp, tone: 'blue', value: deliveryRate, label: 'Delivery Rate' },
    { Icon: IconHeart, tone: 'green', value: String(activeContacts), label: 'Active Contacts' },
    { Icon: IconDollar, tone: 'teal', value: openRate, label: 'Open Rate' },
    { Icon: IconDollar, tone: 'amber', value: clickRate, label: 'Click Rate' },
    { Icon: IconTrendUp, tone: 'green', value: bounceRate, label: 'Bounce Rate' },
    { Icon: IconClock, tone: 'red', value: String(totalOpened), label: 'Opened' },
    { Icon: IconUsers, tone: 'purple', value: String(totalClicked), label: 'Clicked' },
  ]

  // ---- Campaign Performance (with separate pagination) ----
  const cp = campaignPerformance
  const campaignTotalPages = cp.total > 0 ? Math.ceil(cp.total / campaignPageSize) : 1

  const campaignData = cp.data || []

  // ---- Batch Analytics (with separate pagination) ----
  const ba = batchAnalytics
  const batchTotalPages = ba.total > 0 ? Math.ceil(ba.total / batchPageSize) : 1

  const batchData = ba.data || []

  // ---- Recent Activity (with separate pagination) ----
  const ra = recentActivity
  const activityTotalPages = ra.total > 0 ? Math.ceil(ra.total / activityPageSize) : 1

  const activityData = ra.data || []

  // ---- Email Queue (with separate pagination) ----
  const eq = emailQueue
  const queueTotalPages = eq.total > 0 ? Math.ceil(eq.total / queuePageSize) : 1

  const queueData = eq.data || []
  const queueCounts = eq.counts || {}

  return (
    <>
      <div className="stats-grid">
        {summaryCards.map((card, i) => (
          <StatCard
            key={i}
            icon={card.Icon}
            tone={card.tone}
            value={card.value}
            label={card.label}
          />
        ))}
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Emails Sent (Last 30 Days)</h3>
          {/* Charts will use real data - BarChart with email events data */}
          <BarChart data={[]} />
        </div>
        <div className="card chart-card">
          <h3>New Leads (Last 30 Days)</h3>
          <LineChart data={[]} />
        </div>
      </div>

      <div className="two-col">
        <div className="card card-pad">
          <h3 className="card-title" style={{ marginBottom: 10 }}>Batch Analytics</h3>
          {batchData.map((b) => (
            <div className="list-row" key={b.id || b.name}>
              <span className="l-name">{b.name || b.id || 'Unknown'}</span>
              <span className="l-meta">
                imported:{String(b.imported || 0)} · emailed:{String(b.emailed || 0)}
              </span>
            </div>
          ))}
          {!batchData.length && <p>No batches found</p>}
        </div>

        <div className="card card-pad">
          <h3 className="card-title" style={{ marginBottom: 10 }}>Campaign Analytics</h3>
          {campaignData.map((c) => (
            <div className="list-row" key={c.id}>
              <span className="l-name">{c.name || 'Unknown'}</span>
              <span className="l-meta">
                sent:{String(c.sent || 0)} recipients:{String(c.recipients || 0)}
              </span>
            </div>
          ))}
          {!campaignData.length && <p>No campaigns found</p>}
        </div>
      </div>

      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 className="card-title">Recent Activity</h3>
          <Link to="/replies" className="btn-link">View all</Link>
        </div>
        {activityData.map((a, i) => (
          <div className="activity-item" key={i}>
            <span className="a-dot" style={{ background: a.dot || '#3b82f6' }} />
            <div>
              <div className="a-text"><b>{a.company || 'Unknown'}</b> — {a.text || ''}</div>
              <div className="a-time">{a.time || ''}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Email Queue section */}
      <div className="card card-pad" style={{ marginTop: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 10 }}>Email Queue</h3>

        {/* Queue counts */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {['pending', 'processing', 'sent', 'failed', 'retry'].map((status) => {
            const count = queueCounts[status] || 0
            const statusLabels = {
              pending: 'Pending',
              processing: 'Processing',
              sent: 'Sent',
              failed: 'Failed',
              retry: 'Retry',
            }
            return count > 0 && (
              <span key={status} style={{ fontSize: 12, color: '#6b7280' }}>
                {statusLabels[status]}:{String(count)}
              </span>
            )
          })}
        </div>

        {/* Queue table */}
        {queueData.map((q) => (
          <div className="list-row" key={q.id}>
            <span className="l-name">{q.to || q.email || 'No email'}</span>
            <span className="l-meta">
              {q.company || 'Unknown'} · {q.campaign || 'No campaign'} · {q.status}
            </span>
          </div>
        ))}
        {!queueData.length && <p>No emails in queue</p>}
      </div>

      {/* Pagination controls for each section */}
      <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280' }}>
        <span>
          Campaigns:{" "}
          <PaginationControls
            page={campaignPage}
            pageSize={campaignPageSize}
            total={cp.total}
            onPageChange={(p) => setCampaignPage(p)}
            onPageSizeChange={(s) => setCampaignPageSize(s)}
          />
          {cp.total > 0 && ` page ${campaignPage} of ${campaignTotalPages}`}
        </span>
        <span style={{ marginLeft: 24 }}>
          Batches:{" "}
          <PaginationControls
            page={batchPage}
            pageSize={batchPageSize}
            total={ba.total}
            onPageChange={(p) => setBatchPage(p)}
            onPageSizeChange={(s) => setBatchPageSize(s)}
          />
          {ba.total > 0 && ` page ${batchPage} of ${batchTotalPages}`}
        </span>
        <span style={{ marginLeft: 24 }}>
          Activity:{" "}
          <PaginationControls
            page={activityPage}
            pageSize={activityPageSize}
            total={ra.total}
            onPageChange={(p) => setActivityPage(p)}
            onPageSizeChange={(s) => setActivityPageSize(s)}
          />
          {ra.total > 0 && ` page ${activityPage} of ${activityTotalPages}`}
        </span>
        <span style={{ marginLeft: 24 }}>
          Queue:{" "}
          <PaginationControls
            page={queuePage}
            pageSize={queuePageSize}
            total={eq.total}
            onPageChange={(p) => setQueuePage(p)}
            onPageSizeChange={(s) => setQueuePageSize(s)}
          />
          {eq.total > 0 && ` page ${queuePage} of ${queueTotalPages}`}
        </span>
      </div>
    </>
  )
}
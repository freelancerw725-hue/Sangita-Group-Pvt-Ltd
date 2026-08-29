import { Link } from 'react-router-dom'
import {
  IconUsers, IconClock, IconMail, IconReply, IconTrendUp,
  IconDollar, IconBlocked, IconHeart,
} from '../components/Icons.jsx'
import { BarChart, LineChart } from '../components/Charts.jsx'
import {
  dashboardStats, emailsSentChart, newLeadsChart,
  batchAnalytics, campaignAnalytics, recentActivity,
} from '../data/mock.js'

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

export default function Dashboard() {
  const s = dashboardStats
  return (
    <>
      <div className="stats-grid">
        <StatCard icon={IconUsers} tone="blue" value={s.totalLeads} label="Total Leads" />
        <StatCard icon={IconClock} tone="teal" value={s.newLeads} label="New Leads" />
        <StatCard icon={IconMail} tone="purple" value={s.emailsSent} label="Emails Sent" />
        <StatCard icon={IconReply} tone="amber" value={s.replies} label="Replies" />
        <StatCard icon={IconTrendUp} tone="blue" value={s.replyRate} label="Reply Rate" />

        <StatCard icon={IconHeart} tone="green" value={s.interested} label="Interested" />
        <StatCard icon={IconDollar} tone="teal" value={s.wonDeals} label="Won Deals" />
        <StatCard icon={IconDollar} tone="amber" value={s.revenue} label="Revenue" />
        <StatCard icon={IconClock} tone="red" value={s.followupsPending} label="Followups Pending" />
        <StatCard icon={IconTrendUp} tone="green" value={s.conversion} label="Conversion" />

        <StatCard icon={IconUsers} tone="purple" value={s.todaysImports} label="Today's Imports" />
        <StatCard icon={IconMail} tone="red" value={s.neverContacted} label="Never Contacted" />
        <StatCard icon={IconBlocked} tone="red" value={s.blockedContacts} label="Blocked Contacts" />
        <StatCard icon={IconBlocked} tone="amber" value={s.emailsPrevented} label="Emails Prevented" />
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Emails Sent (Last 30 Days)</h3>
          <BarChart data={emailsSentChart} />
        </div>
        <div className="card chart-card">
          <h3>New Leads (Last 30 Days)</h3>
          <LineChart data={newLeadsChart} />
        </div>
      </div>

      <div className="two-col">
        <div className="card card-pad">
          <h3 className="card-title" style={{ marginBottom: 10 }}>Batch Analytics</h3>
          {batchAnalytics.map((b) => (
            <div className="list-row" key={b.name}>
              <span className="l-name">{b.name}</span>
              <span className="l-meta">{b.imported} imported · {b.emailed} emailed</span>
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ marginBottom: 10 }}>Campaign Analytics</h3>
          {campaignAnalytics.map((c) => (
            <div className="list-row" key={c.name}>
              <span className="l-name">{c.name}</span>
              <span className="l-meta">{c.sent}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 className="card-title">Recent Activity</h3>
          <Link to="/replies" className="btn-link">View all</Link>
        </div>
        {recentActivity.map((a, i) => (
          <div className="activity-item" key={i}>
            <span className="a-dot" style={{ background: a.dot }} />
            <div>
              <div className="a-text"><b>{a.company}</b> — {a.text}</div>
              <div className="a-time">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

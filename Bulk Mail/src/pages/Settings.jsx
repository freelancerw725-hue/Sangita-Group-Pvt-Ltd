import { useState, useEffect } from 'react'
import { useToast } from '../components/UI.jsx'
import { IconSave, IconZap, IconLock, IconMail, IconClock, IconGlobe } from '../components/Icons.jsx'

const TABS = [
  { id: 'sender', label: 'Sender Profile' },
  { id: 'smtp', label: 'SMTP Settings' },
  { id: 'outreach', label: 'Outreach Defaults' },
  { id: 'notifications', label: 'Notifications' },
]

export default function Settings() {
  const toast = useToast()

  // Hooks called unconditionally and in the same order on every render
  const [tab, setTab] = useState('sender')
  const [loading, setLoading] = useState({ sender: true, smtp: true, outreach: true, notifications: true })
  const [settings, setSettings] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings/' + tab, {
        credentials: 'include'
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error?.message || `Failed to load settings (status ${res.status})`)
      }
      const data = await res.json()
      setSettings({ [tab]: data })
      setLoading({ sender: false, smtp: false, outreach: false, notifications: false })
      setError(null)
      return data
    } catch (err) {
      console.error('Failed to fetch settings:', err)
      setLoading({ sender: false, smtp: false, outreach: false, notifications: false })
      setError(err.message || 'Failed to load settings')
    }
  }

  async function handleSave(tabName, values) {
    try {
      const res = await fetch('/api/settings/' + tabName, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error?.message || 'Save failed')
        return false
      }
      const data = await res.json()
      toast('Settings saved successfully')
      fetchSettings()
      return true
    } catch (err) {
      toast('Save failed: ' + (err.message || 'Unknown error'))
      return false
    }
  }

  function renderSenderProfile() {
    const data = settings.sender
    if (loading.sender) return renderLoading()
    if (!data) return (
      <div className="settings-grid">
        <div className="card settings-section">
          <h3><IconMail size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Sender Profile</h3>
          <p className="sec-desc">No sender account configured. <button className="btn btn-primary" onClick={() => setTab('sender')}>Add Sender Account</button></p>
        </div>
      </div>
    )
    return (
      <div className="settings-grid">
        <div className="card settings-section">
          <h3><IconMail size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Sender Profile</h3>
          <p className="sec-desc">How your name and email appear to leads.</p>
          <div className="form-row">
            <div className="field"><label>Sender Name</label><input className="input" defaultValue={data.name || ''} /></div>
            <div className="field"><label>Business Name</label><input className="input" defaultValue={data.businessName || ''} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>From Email</label><input className="input" defaultValue={data.fromEmail || ''} /></div>
            <div className="field"><label>Reply-To Email</label><input className="input" defaultValue={data.replyToEmail || ''} /></div>
          </div>
          <div className="field">
            <label>Email Signature</label>
            <textarea className="textarea" rows={4} defaultValue={data.emailSignature || ''} />
          </div>
        </div>
        <div className="card settings-section">
          <h3><IconGlobe size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Brand Footer</h3>
          <p className="sec-desc">Shown at the bottom of every outreach email.</p>
          <div className="field"><label>Website</label><input className="input" defaultValue={data.website || ''} /></div>
          <div className="field"><label>Unsubscribe Text</label><input className="input" defaultValue={data.unsubscribeText || ''} /></div>
          <div className="setting-toggle-row">
            <div><div className="t-label">Add footer to all emails</div><div className="t-desc">Appends signature + unsubscribe line</div></div>
            <label className="toggle"><input type="checkbox" defaultChecked={data.footerEnabled !== false} /><span className="track" /></label>
          </div>
          <div className="settings-footer" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => handleSave('footer', { website: data.website || '', unsubscribeText: data.unsubscribeText || '', footerEnabled: data.footerEnabled })}><IconSave /> Save Changes</button>
          </div>
        </div>
      </div>
    )
  }

  function renderSMTP() {
    const data = settings.smtp
    if (loading.smtp) return renderLoading()
    if (!data) return renderEmptyState('SMTP Settings', 'No SMTP settings configured.')
    return (
      <div className="settings-grid">
        <div className="card settings-section">
          <h3><IconLock size={17} style={{ verticalAlign: -3, marginRight: 6 }} />SMTP Configuration</h3>
          <p className="sec-desc">Server used to send outreach emails.</p>
          <div className="field"><label>SMTP Host</label><input className="input" defaultValue={data.smtpHost || 'smtp.gmail.com'} /></div>
          <div className="form-row">
            <div className="field"><label>Port</label><input className="input" defaultValue={data.smtpPort || '587'} /></div>
            <div className="field"><label>Security</label>
              <select className="select" defaultValue={data.securityMode || 'TLS'}>
                <option>TLS</option>
                <option>SSL</option>
                <option>None</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Username</label><input className="input" defaultValue={data.username || 'hello@swiftgrowthdigital.com'} /></div>
          <div className="settings-footer">
            <button className="btn btn-secondary" onClick={() => testSMTPConnection()}>
              <IconZap /> Test Connection
            </button>
            <button className="btn btn-primary" onClick={() => handleSave('smtp', { smtpHost: data.smtpHost, smtpPort: data.smtpPort, username: data.username, securityMode: data.securityMode })}><IconSave /> Save</button>
          </div>
        </div>
        <div className="card settings-section">
          <h3>Sending Limits</h3>
          <p className="sec-desc">Protect your domain reputation.</p>
          <div className="field"><label>Daily Email Limit</label><input className="input" type="number" defaultValue={data.dailyLimit || 200} /></div>
          <div className="field"><label>Delay Between Emails (seconds)</label><input className="input" type="number" defaultValue={data.hourlyLimit || 50} /></div>
          <div className="setting-toggle-row">
            <div><div className="t-label">Stop on bounce spike</div><div className="t-desc">Pause queue if 5+ bounces in an hour</div></div>
            <label className="toggle"><input type="checkbox" defaultChecked /><span className="track" /></label>
          </div>
          <div className="setting-toggle-row">
            <div><div className="t-label">Skip blocked contacts</div><div className="t-desc">Never email suppressed addresses</div></div>
            <label className="toggle"><input type="checkbox" defaultChecked /><span className="track" /></label>
          </div>
        </div>
      </div>
    )
  }

  function renderOutreachDefaults() {
    const data = settings.outreach
    if (loading.outreach) return renderLoading()
    if (!data) return renderEmptyState('Outreach Defaults', 'No outreach defaults configured.')
    return (
      <div className="card settings-section" style={{ maxWidth: 640 }}>
        <h3><IconClock size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Outreach Defaults</h3>
        <p className="sec-desc">Default behaviour for campaigns and followups.</p>
        <div className="form-row">
          <div className="field"><label>Followup 1 After (days)</label><input className="input" type="number" defaultValue={data.followup1Days || 3} /></div>
          <div className="field"><label>Followup 2 After (days)</label><input className="input" type="number" defaultValue={data.followup2Days || 7} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Send Window Start</label><input className="input" defaultValue={data.sendWindowStart || '09:00'} /></div>
          <div className="field"><label>Send Window End</label><input className="input" defaultValue={data.sendWindowEnd || '19:00'} /></div>
        </div>
        <div className="field"><label>Working Days</label>
          <select className="select" defaultValue={data.workingDays || 'Mon-Sat'}>
            <option>Mon-Fri</option>
            <option>Mon-Sat</option>
            <option>Every day</option>
          </select>
        </div>
        <div className="settings-footer">
          <button className="btn btn-primary" onClick={() => handleSave('outreach', { followup1Days: data.followup1Days, followup2Days: data.followup2Days, sendWindowStart: data.sendWindowStart, sendWindowEnd: data.sendWindowEnd, workingDays: data.workingDays })}><IconSave /> Save Changes</button>
        </div>
      </div>
    )
  }

  function renderNotifications() {
    const data = settings.notifications
    if (loading.notifications) return renderLoading()
    if (!data) return renderEmptyState('Notifications', 'No notification settings configured.')
    return (
      <div className="settings-grid">
        <div className="card settings-section">
          <h3>Notifications</h3>
          <p className="sec-desc">Choose what you want to be alerted about.</p>
          {[['New replies', 'Notify when a lead replies to outreach'], ['Interested leads', 'Notify when sentiment is detected as interested'], ['Campaign completed', 'Notify when all emails in a campaign are sent'], ['Bounce alerts', 'Notify when an email fails permanently'], ['Daily summary', 'Morning digest of leads, sends and replies']].map(([label, desc], i) => (
            <div className="setting-toggle-row" key={label}>
              <div><div className="t-label">{label}</div><div className="t-desc">{desc}</div></div>
              <label className="toggle"><input type="checkbox" defaultChecked={data['newReplies'] !== false ? [true, true, true, true, true][i] : i < 3} /><span className="track" /></label>
            </div>
          ))}
          <div className="settings-footer">
            <button className="btn btn-primary" onClick={() => handleSave('notifications', { newReplies: data.newReplies, interestedLeads: data.interestedLeads, campaignCompleted: data.campaignCompleted, bounceAlerts: data.bounceAlerts, dailySummary: data.dailySummary })}><IconSave /> Save Changes</button>
          </div>
        </div>
      </div>
    )
  }

  function renderLoading() {
    return (
      <div className="settings-grid">
        <div className="card settings-section">
          <h3>Loading...</h3>
          <p>Fetching settings from database...</p>
        </div>
      </div>
    )
  }

  function renderEmptyState(title, message) {
    return (
      <div className="settings-grid">
        <div className="card settings-section">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
      </div>
    )
  }

  function testSMTPConnection() {
    fetch('/api/settings/smtp/test', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeoutMs: 10000 })
    })
    .then(async (res) => {
      const data = await res.json()
      if (data.ok) {
        toast('SMTP connection test successful')
      } else {
        toast('SMTP connection test failed: ' + (data.error || 'Unknown error'))
      }
    })
    .catch(() => toast('SMTP test failed: Network error'))
  }

  // Initial data fetch
  useEffect(() => {
    fetchSettings()
  }, [])

  if (tab === 'sender') return renderSenderProfile()
  if (tab === 'smtp') return renderSMTP()
  if (tab === 'outreach') return renderOutreachDefaults()
  if (tab === 'notifications') return renderNotifications()

  return null
}
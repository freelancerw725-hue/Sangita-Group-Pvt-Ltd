import { useState } from 'react'
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
  const [tab, setTab] = useState('sender')

  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'sender' && (
        <div className="settings-grid">
          <div className="card settings-section">
            <h3><IconMail size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Sender Profile</h3>
            <p className="sec-desc">How your name and email appear to leads.</p>
            <div className="form-row">
              <div className="field"><label>Sender Name</label><input className="input" defaultValue="Sonu" /></div>
              <div className="field"><label>Business Name</label><input className="input" defaultValue="SwiftGrowthDigital" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>From Email</label><input className="input" defaultValue="hello@swiftgrowthdigital.com" /></div>
              <div className="field"><label>Reply-To Email</label><input className="input" defaultValue="sonu@swiftgrowthdigital.com" /></div>
            </div>
            <div className="field">
              <label>Email Signature</label>
              <textarea className="textarea" rows={4} defaultValue={'Thanks & Regards,\nSonu\nSwiftGrowthDigital\n+91 98765 43210'} />
            </div>
          </div>
          <div className="card settings-section">
            <h3><IconGlobe size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Brand Footer</h3>
            <p className="sec-desc">Shown at the bottom of every outreach email.</p>
            <div className="field"><label>Website</label><input className="input" defaultValue="https://swiftgrowthdigital.com" /></div>
            <div className="field"><label>Unsubscribe Text</label><input className="input" defaultValue="Reply 'NO' and I will never email again." /></div>
            <div className="setting-toggle-row">
              <div><div className="t-label">Add footer to all emails</div><div className="t-desc">Appends signature + unsubscribe line</div></div>
              <label className="toggle"><input type="checkbox" defaultChecked /><span className="track" /></label>
            </div>
            <div className="settings-footer" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => toast('Settings saved (demo)')}><IconSave /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'smtp' && (
        <div className="settings-grid">
          <div className="card settings-section">
            <h3><IconLock size={17} style={{ verticalAlign: -3, marginRight: 6 }} />SMTP Configuration</h3>
            <p className="sec-desc">Server used to send outreach emails.</p>
            <div className="field"><label>SMTP Host</label><input className="input" defaultValue="smtp.gmail.com" /></div>
            <div className="form-row">
              <div className="field"><label>Port</label><input className="input" defaultValue="587" /></div>
              <div className="field"><label>Security</label>
                <select className="select" defaultValue="TLS"><option>TLS</option><option>SSL</option><option>None</option></select>
              </div>
            </div>
            <div className="field"><label>Username</label><input className="input" defaultValue="hello@swiftgrowthdigital.com" /></div>
            <div className="field"><label>Password / App Password</label><input className="input" type="password" defaultValue="password123" /></div>
            <div className="settings-footer">
              <button className="btn btn-secondary" onClick={() => toast('SMTP test passed (demo)')}><IconZap /> Test Connection</button>
              <button className="btn btn-primary" onClick={() => toast('SMTP settings saved (demo)')}><IconSave /> Save</button>
            </div>
          </div>
          <div className="card settings-section">
            <h3>Sending Limits</h3>
            <p className="sec-desc">Protect your domain reputation.</p>
            <div className="field"><label>Daily Email Limit</label><input className="input" type="number" defaultValue={200} /></div>
            <div className="field"><label>Delay Between Emails (seconds)</label><input className="input" type="number" defaultValue={45} /></div>
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
      )}

      {tab === 'outreach' && (
        <div className="card settings-section" style={{ maxWidth: 640 }}>
          <h3><IconClock size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Outreach Defaults</h3>
          <p className="sec-desc">Default behaviour for campaigns and followups.</p>
          <div className="form-row">
            <div className="field"><label>Followup 1 After (days)</label><input className="input" type="number" defaultValue={3} /></div>
            <div className="field"><label>Followup 2 After (days)</label><input className="input" type="number" defaultValue={7} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Send Window Start</label><input className="input" defaultValue="09:00" /></div>
            <div className="field"><label>Send Window End</label><input className="input" defaultValue="19:00" /></div>
          </div>
          <div className="field"><label>Working Days</label>
            <select className="select" defaultValue="Mon–Sat"><option>Mon–Fri</option><option>Mon–Sat</option><option>Every day</option></select>
          </div>
          <div className="settings-footer">
            <button className="btn btn-primary" onClick={() => toast('Defaults saved (demo)')}><IconSave /> Save Changes</button>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card settings-section" style={{ maxWidth: 640 }}>
          <h3>Notifications</h3>
          <p className="sec-desc">Choose what you want to be alerted about.</p>
          {[
            ['New replies', 'Notify when a lead replies to outreach'],
            ['Interested leads', 'Notify when sentiment is detected as interested'],
            ['Campaign completed', 'Notify when all emails in a campaign are sent'],
            ['Bounce alerts', 'Notify when an email fails permanently'],
            ['Daily summary', 'Morning digest of leads, sends and replies'],
          ].map(([label, desc], i) => (
            <div className="setting-toggle-row" key={label}>
              <div><div className="t-label">{label}</div><div className="t-desc">{desc}</div></div>
              <label className="toggle"><input type="checkbox" defaultChecked={i < 3} /><span className="track" /></label>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

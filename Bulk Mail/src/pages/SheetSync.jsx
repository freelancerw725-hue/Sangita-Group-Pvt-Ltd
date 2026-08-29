import { useState } from 'react'
import { Modal, useToast } from '../components/UI.jsx'
import { IconSheet, IconZap, IconRefresh, IconUnlink, IconClock, IconCheckCircle, IconXCircle, IconLink } from '../components/Icons.jsx'
import { sheetSync as seed, syncHistory as seedHistory } from '../data/mock.js'

export default function SheetSync() {
  const toast = useToast()
  const [conn, setConn] = useState(seed)
  const [history, setHistory] = useState(seedHistory)
  const [busy, setBusy] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [showConnect, setShowConnect] = useState(false)

  const syncNow = () => {
    setBusy(true)
    setTimeout(() => {
      setHistory((h) => [{ id: Date.now(), status: 'success', imported: 0, skipped: conn.rows, failed: 0, time: 'Just now' }, ...h])
      setConn({ ...conn, lastSync: 'Just now' })
      setBusy(false)
      toast('Sheet sync completed (demo)')
    }, 1200)
  }

  return (
    <>
      <div className="card">
        <div className="sync-connection">
          <div className="sheet-icon"><IconSheet /></div>
          <div className="sync-info">
            <div className="sync-title-row">
              <span className="name">{conn.name}</span>
              {conn.connected
                ? <span className="badge badge-green">Connected</span>
                : <span className="badge badge-gray">Disconnected</span>}
            </div>
            {conn.connected && (
              <>
                <div className="sync-worksheet">Worksheet: <b>{conn.worksheet}</b></div>
                <div className="sync-meta">
                  <span>Rows: {conn.rows}</span><span className="sep">·</span>
                  <span>Imported: {conn.imported} leads</span><span className="sep">·</span>
                  <span>Last sync: {conn.lastSync}</span><span className="sep">·</span>
                  <span>Connected: {conn.connectedOn}</span>
                </div>
              </>
            )}
          </div>
          {conn.connected ? (
            <div className="sync-buttons">
              <button className="btn btn-secondary" onClick={() => toast('Connection test passed (demo)')}><IconZap /> Test</button>
              <button className="btn btn-primary" disabled={busy} onClick={syncNow}>
                <IconRefresh className={busy ? 'spin' : ''} /> {busy ? 'Syncing…' : 'Sync Now'}
              </button>
              <button className="btn btn-danger" onClick={() => setConfirmDisconnect(true)}><IconUnlink /> Disconnect</button>
            </div>
          ) : (
            <div className="sync-buttons">
              <button className="btn btn-primary" onClick={() => setShowConnect(true)}><IconLink /> Connect Google Sheet</button>
            </div>
          )}
        </div>
        {conn.connected && (
          <div className="autosync-row">
            <IconClock />
            <span>Auto-Sync every 5 minutes</span>
            <label className="toggle">
              <input type="checkbox" checked={conn.autoSync} onChange={(e) => { setConn({ ...conn, autoSync: e.target.checked }); toast(e.target.checked ? 'Auto-sync enabled (demo)' : 'Auto-sync disabled (demo)') }} />
              <span className="track" />
            </label>
          </div>
        )}
      </div>

      {conn.connected && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-pad" style={{ paddingBottom: 8 }}>
            <h3 className="card-title">Sync History</h3>
          </div>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 760 }}>
              <thead>
                <tr><th>Status</th><th>Imported</th><th>Skipped</th><th>Failed</th><th>Time</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {h.status === 'success'
                          ? <IconCheckCircle size={17} style={{ color: '#16a34a' }} />
                          : <IconXCircle size={17} style={{ color: '#dc2626' }} />}
                        <span style={{ color: h.status === 'success' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                          {h.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </span>
                    </td>
                    <td style={{ color: h.imported > 0 ? '#16a34a' : 'var(--text-3)' }}>{h.imported}</td>
                    <td style={{ color: h.skipped > 0 ? '#d97706' : 'var(--text-3)' }}>{h.skipped}</td>
                    <td style={{ color: h.failed > 0 ? '#dc2626' : 'var(--text-3)' }}>{h.failed}</td>
                    <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={confirmDisconnect} onClose={() => setConfirmDisconnect(false)} title="Disconnect Sheet"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDisconnect(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => { setConn({ ...conn, connected: false }); setConfirmDisconnect(false); toast('Sheet disconnected (demo)') }}>Disconnect</button>
          </>
        }
      >
        <p style={{ fontSize: 14.5, color: 'var(--text-2)' }}>
          Disconnect sheet <b>"{conn.name}"</b>? Leads already imported will remain, but future syncs will stop.
        </p>
      </Modal>

      <Modal
        open={showConnect} onClose={() => setShowConnect(false)} title="Connect Google Sheet"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowConnect(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setConn({ ...conn, connected: true }); setShowConnect(false); toast('Sheet connected (demo)') }}>Connect</button>
          </>
        }
      >
        <div className="field"><label>Sheet URL *</label><input className="input" placeholder="https://docs.google.com/spreadsheets/…" /></div>
        <div className="field"><label>Worksheet</label><select className="select"><option>Sheet1</option><option>Leads</option><option>Contacts</option></select></div>
        <p className="hint">UI demo only — no real connection is made.</p>
      </Modal>
    </>
  )
}

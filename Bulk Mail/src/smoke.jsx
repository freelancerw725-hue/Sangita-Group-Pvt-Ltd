import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from './components/UI.jsx'
import App from './App.jsx'

const routes = ['/', '/leads', '/templates', '/campaigns', '/queue', '/replies', '/interested', '/followups', '/pipeline', '/customers', '/blocked', '/sheets', '/batches', '/settings']

let failed = 0
for (const r of routes) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[r]}>
        <ToastProvider><App /></ToastProvider>
      </MemoryRouter>
    )
    if (!html || html.length < 500) throw new Error('suspiciously small output')
    console.log('OK  ', r, `(${html.length} chars)`)
  } catch (e) {
    failed++
    console.log('FAIL', r, '-', e.message)
  }
}
console.log(failed === 0 ? 'ALL ROUTES RENDER OK' : `${failed} ROUTES FAILED`)
process.exit(failed === 0 ? 0 : 1)

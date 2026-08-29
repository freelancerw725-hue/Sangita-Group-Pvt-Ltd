import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import Templates from './pages/Templates.jsx'
import Campaigns from './pages/Campaigns.jsx'
import EmailQueue from './pages/EmailQueue.jsx'
import Replies from './pages/Replies.jsx'
import Interested from './pages/Interested.jsx'
import Followups from './pages/Followups.jsx'
import Pipeline from './pages/Pipeline.jsx'
import Customers from './pages/Customers.jsx'
import BlockedContacts from './pages/BlockedContacts.jsx'
import SheetSync from './pages/SheetSync.jsx'
import LeadBatches from './pages/LeadBatches.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/queue" element={<EmailQueue />} />
        <Route path="/replies" element={<Replies />} />
        <Route path="/interested" element={<Interested />} />
        <Route path="/followups" element={<Followups />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/blocked" element={<BlockedContacts />} />
        <Route path="/sheets" element={<SheetSync />} />
        <Route path="/batches" element={<LeadBatches />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

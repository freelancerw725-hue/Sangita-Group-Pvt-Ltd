// Development seed: wipes all tables and inserts realistic demo data.
// Run: npm run seed
import { db, transaction } from './connection.js'
import { logger } from '../lib/logger.js'
import { hashPassword } from '../lib/password.js'

const day = (n, h = 10, m = 0, s = 0) => {
  const d = new Date(Date.now() + n * 86400000)
  d.setHours(h, m, s, 0)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const render = (tpl, company) => tpl.replaceAll('{{company}}', company)
const extractVars = (text) => [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))]

// ---------------------------------------------------------------- companies
const NAMED = {
  b3: [
    ['Local News Bihar', 'sanjeevsinghnaini@gmail.com', 'replied'],
    ['Buxar Samachar_', 'sanjayupadhyay6622@gmail.com', 'new'],
    ['BSR News Hindi', 'danishabbasi4280@gmail.com', 'new'],
    ['BHOJPURI NEWS TIME', 'abhiindia05@gmail.com', 'new'],
    ['Patna Prime News', 'patnaprimenews24@gmail.com', 'new'],
    ['AMS LIVE NEWS PATNA', 'amslivenewspatna@gmail.com', 'new'],
  ],
  b6: [
    ['Gorakhpur Live', 'gorakhpurlive.org@gmail.com', 'interested'],
    ['UP News 9', 'anupsrivastava36@gmail.com', 'blocked'],
    ['Raina News', 'rainanews@gmail.com', 'replied'],
    ['Gorakhpur Times', 'gorakhpurtimes@gmail.com', 'replied'],
  ],
  legacy: [
    ['Patna Dastak News', 'patnadastaknews@gmail.com', 'replied'],
    ['Chapra Khabar', 'chaprakhabar@gmail.com', 'new'],
    ['Siwan Live News', 'siwanlivenews@gmail.com', 'new'],
    ['Bhojpur Aaj Tak', 'bhojpuraajtak@gmail.com', 'new'],
  ],
}

const PLACES = ['Arrah', 'Motihari', 'Katihar', 'Purnia', 'Darbhanga', 'Muzaffarpur', 'Gaya', 'Bhagalpur', 'Hajipur', 'Sitamarhi', 'Munger', 'Samastipur', 'Dehri', 'Bagaha', 'Kishanganj', 'Saharsa', ' Sasaram', 'Bettiah', 'Lakhisarai', 'Jehanabad', 'Aurangabad', 'Nawada', 'Banka', 'Sheikhpura', 'Raxaul', 'Forbesganj', 'Bhabua', 'Jamui', 'Supaul', 'Araria', 'Madhubani', 'Begusarai', 'Khagaria', 'Rohtas', 'Kaimur', 'Gopalganj', 'Siwan', 'Saran', 'Vaishali', 'Nalanda']
const KINDS = ['News', 'Samachar', 'Khabar', 'Live News', 'News Time', 'Aaj Tak', 'Bulletin', 'Updates', 'Media', 'Times']
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'rediffmail.com']

function companyEmail(name, i) {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '')
  return `${slug}${i}@${DOMAINS[i % DOMAINS.length]}`
}

function buildLeads() {
  const rows = [...NAMED.b3.map((r) => ({ ...r, batch: 'b3' })), ...NAMED.b6.map((r) => ({ ...r, batch: 'b6' })), ...NAMED.legacy.map((r) => ({ ...r, batch: 'legacy' }))]
  let i = 0
  const need = { b3: 14, b6: 23, legacy: 63 }
  const statusPlan = {
    b3: Array(13).fill('new'), // named leads already carry 1 replied
    b6: Array(19).fill('new'), // named leads already carry interested/blocked/replied
    legacy: [...Array(9).fill('interested'), ...Array(6).fill('replied'), ...Array(48).fill('new')],
  }
  const usedStatus = { b3: 0, b6: 0, legacy: 0 }
  for (const batch of ['b3', 'b6', 'legacy']) {
    while (rows.filter((r) => r.batch === batch).length < need[batch]) {
      const name = `${PLACES[i % PLACES.length].trim()} ${KINDS[i % KINDS.length]}`
      rows.push({ 0: name, 1: companyEmail(name, i), 2: statusPlan[batch][usedStatus[batch]++], batch })
      i++
    }
  }
  return rows
}

// ---------------------------------------------------------------- main
transaction(() => {
  for (const t of ['activities', 'sync_history', 'sheet_connections', 'blocked_contacts', 'customers', 'opportunities', 'pipeline_stages', 'followups', 'replies', 'conversations', 'email_events', 'emails', 'campaign_recipients', 'leads', 'campaigns', 'templates', 'lead_batches', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
    db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(t)
  }

  // -- user ----------------------------------------------------------------
  const adminId = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, created_at) VALUES ('Administrator', 'admin@swiftgrowthdigital.com', ?, 'admin', ?)`
  ).run(hashPassword(process.env.DEFAULT_ADMIN_PASSWORD || 'admin12345'), day(-40)).lastInsertRowid

  // -- batches ---------------------------------------------------------------
  const insBatch = db.prepare(`INSERT INTO lead_batches (name, source, status, created_at) VALUES (?, ?, ?, ?)`)
  const b4 = insBatch.run('Batch #4', 'CSV Import', 'empty', day(-22)).lastInsertRowid
  const b3 = insBatch.run('Batch #3', 'Sheet Sync', 'ready', day(-15)).lastInsertRowid
  const b6 = insBatch.run('Batch #6', 'Sheet Sync', 'ready', day(-7)).lastInsertRowid
  const legacy = insBatch.run('Legacy Leads', 'CSV Import', 'active', day(-26)).lastInsertRowid
  const batchId = { b3, b6, legacy, b4 }
  const batchCreated = { b3: day(-14, 17, 30), b6: day(-6, 17, 30), legacy: day(-25, 16, 10) }

  // -- templates ---------------------------------------------------------------
  const tplV1 = `Hello {{company}} Team,\n\nI hope aap sab theek honge.\n\nMaine dekha ki aapka news platform bahut achha kaam kar raha hai. Main aapke liye ek professional website & mobile app bana sakta hoon jisse aapki audience badhegi.\n\nKya main aapko ek live demo bhej sakta hoon?\n\nThanks & Regards,\nSonu\nSwiftGrowthDigital`
  const tplV2 = `Hello {{company}} Team,\n\nGreetings from SwiftGrowthDigital!\n\nWe help news platforms like {{company}} go digital with a modern website and mobile app. Our live demo is ready — would you like to see it?\n\nThanks & Regards,\nSonu\nSwiftGrowthDigital`
  const insTpl = db.prepare(`INSERT INTO templates (name, category, subject, body, variables, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  const t1 = insTpl.run('1st Message (v1)', 'Initial Outreach', '{{company}} Ji ke liye ek chhoti si idea…', tplV1, JSON.stringify(extractVars(tplV1)), day(-30), day(-19)).lastInsertRowid
  const t2 = insTpl.run('1st Message (v2)', 'Initial Outreach', '{{company}} – Website & App Proposal', tplV2, JSON.stringify(extractVars(tplV2)), day(-28), day(-25)).lastInsertRowid
  const t3body = `Hello {{company}} Team,\n\nBas is email ke through follow-up kar raha hoon regarding woh proposal jo maine aapke Live Demo Website & App ke liye share kiya tha.\n\nHum aapke response ka wait kar rahe hain.\n\nThanks & Regards,\nSonu`
  insTpl.run('Followup 1 (v1)', 'Followup 1', 'Just Following Up – Waiting for Your Response', t3body, JSON.stringify(extractVars(t3body)), day(-27), day(-20))
  const t4body = `Hello {{company}} Team,\n\nAttached is our detailed proposal for your new website & app:\n\n• Modern responsive design\n• Push notifications for breaking news\n• Admin panel & analytics\n\nLooking forward to your thoughts.\n\nThanks & Regards,\nSonu`
  insTpl.run('Detailed Proposal (v1)', 'Proposal', 'Live Demo Website & App – Detailed Proposal', t4body, JSON.stringify(extractVars(t4body)), day(-24), day(-22))

  // -- leads ----------------------------------------------------------------
  const insLead = db.prepare(`INSERT INTO leads (company, contact, email, normalized_email, status, batch_id, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`)
  const leadRows = buildLeads() // [{0:name, 1:email, 2:status, batch}]
  const leadIds = [] // {id, email, company, status, batch}
  for (const r of leadRows) {
    const id = insLead.run(r[0], r[1], r[1].trim().toLowerCase(), r[2], batchId[r.batch], batchCreated[r.batch], batchCreated[r.batch]).lastInsertRowid
    leadIds.push({ id, company: r[0], email: r[1], status: r[2], batch: r.batch })
  }
  const byBatch = (b) => leadIds.filter((l) => l.batch === b)

  // -- campaigns + recipients + emails + events ------------------------------
  const insCamp = db.prepare(`INSERT INTO campaigns (name, status, template_id, audience_type, audience_ref, created_at, completed_at) VALUES (?, 'completed', ?, ?, ?, ?, ?)`)
  const insRcpt = db.prepare(`INSERT INTO campaign_recipients (campaign_id, lead_id, status, sent_at) VALUES (?, ?, ?, ?)`)
  const insEmail = db.prepare(`INSERT INTO emails (campaign_id, recipient_id, lead_id, template_id, from_email, to_email, subject, body, status, scheduled_at, sent_at, created_at) VALUES (?, ?, ?, ?, 'hello@swiftgrowthdigital.com', ?, ?, ?, ?, ?, ?, ?)`)
  const insEvent = db.prepare(`INSERT INTO email_events (email_id, campaign_id, lead_id, type, occurred_at) VALUES (?, ?, ?, ?, ?)`)
  const updLead = db.prepare(`UPDATE leads SET last_campaign_id = ?, last_template = ?, last_subject = ?, last_email_sent_at = ?, campaign_count = campaign_count + 1, updated_at = ? WHERE id = ?`)

  const FROM = 'hello@swiftgrowthdigital.com'
  const subjV1 = (c) => render('{{company}} Ji ke liye ek chhoti si idea…', c)
  const subjV2 = (c) => render('{{company}} – Website & App Proposal', c)

  function runCampaign({ name, templateId, tplSubject, batchKey, leadList, createdDay, sentDay, pendingCount = 0 }) {
    const cid = insCamp.run(name, templateId, batchKey ? 'batch' : 'manual', batchKey ? batchId[batchKey] : null, createdDay, sentDay).lastInsertRowid
    let n = 0
    for (const lead of leadList) {
      const pending = n >= leadList.length - pendingCount
      const sentAt = pending ? null : `${sentDay.split(' ')[0]} ${String(17 + Math.floor(n / 12)).padStart(2, '0')}:${String(36 - (n % 12) * 15 > 0 ? 36 - (n % 12) * 15 : 1).padStart(2, '0')}:00`
      const subject = render(tplSubject, lead.company)
      const rid = insRcpt.run(cid, lead.id, pending ? 'pending' : 'sent', sentAt).lastInsertRowid
      if (pending) {
        insEmail.run(cid, rid, lead.id, templateId, lead.email, subject, render(tplV1, lead.company), 'queued', sentDay, null, sentDay)
      } else {
        const eid = insEmail.run(cid, rid, lead.id, templateId, lead.email, subject, render(templateId === t2 ? tplV2 : tplV1, lead.company), 'sent', sentAt, sentAt, sentAt).lastInsertRowid
        insEvent.run(eid, cid, lead.id, 'sent', sentAt)
        updLead.run(cid, templateId === t2 ? '1st Message (v2)' : '1st Message (v1)', subject, sentAt, sentAt, lead.id)
      }
      n++
    }
    return cid
  }

  // First 50 Customer's — Legacy batch, 63 sent (day -25)
  runCampaign({ name: "First 50 Customer's", templateId: t2, tplSubject: '{{company}} – Website & App Proposal', batchKey: 'legacy', leadList: byBatch('legacy'), createdDay: day(-26, 9), sentDay: day(-25, 16, 10) })
  // Testing — single lead (day -20)
  const bhojpur = leadIds.find((l) => l.company === 'Bhojpur Aaj Tak')
  runCampaign({ name: 'Testing', templateId: t1, tplSubject: '{{company}} Ji ke liye ek chhoti si idea…', batchKey: null, leadList: [bhojpur], createdDay: day(-21, 10), sentDay: day(-20, 11, 2) })
  // 14 Leads Emails — Batch #3, 14 sent (day -14)
  runCampaign({ name: '14 Leads Emails', templateId: t1, tplSubject: '{{company}} Ji ke liye ek chhoti si idea…', batchKey: 'b3', leadList: byBatch('b3'), createdDay: day(-15, 12), sentDay: day(-14, 17, 30) })
  // 26 Leads Emails — Batch #6 + 3 extra (manual adds), 23 sent + 3 pending (day -6)
  const extras = byBatch('legacy').slice(0, 3) // already emailed before → pending here
  runCampaign({ name: '26 Leads Emails', templateId: t1, tplSubject: '{{company}} Ji ke liye ek chhoti si idea…', batchKey: 'b6', leadList: [...byBatch('b6'), ...extras], createdDay: day(-7, 14), sentDay: day(-6, 17, 30), pendingCount: 3 })

  // -- opens / clicks ---------------------------------------------------------
  const campEmails = (campaignId) => db.prepare(`SELECT e.id, e.campaign_id, e.lead_id FROM emails e WHERE e.status = 'sent' AND e.campaign_id = ? ORDER BY e.id`).all(campaignId)
  const addEvents = (campaignId, opens, clicks, when) => {
    const rows = campEmails(campaignId)
    rows.slice(0, opens).forEach((r, i) => insEvent.run(r.id, r.campaign_id, r.lead_id, 'open', `${when} ${String(9 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`))
    rows.slice(0, clicks).forEach((r, i) => insEvent.run(r.id, r.campaign_id, r.lead_id, 'click', `${when} ${String(12 + (i % 8)).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}:00`))
  }
  const campId = (name) => db.prepare(`SELECT id FROM campaigns WHERE name = ?`).get(name)?.id
  const c1 = campId('14 Leads Emails')
  const c2 = campId('26 Leads Emails')
  const c3 = campId('Testing')
  const c4 = campId("First 50 Customer's")
  addEvents(c2, 11, 4, day(-5).split(' ')[0])
  addEvents(c3, 1, 0, day(-19).split(' ')[0])
  addEvents(c4, 31, 12, day(-24).split(' ')[0])

  // -- conversations + replies (29 total) --------------------------------------
  // Note: replies do NOT mutate lead status — the seeded status distribution
  // (79 new / 10 interested / 10 replied / 1 blocked) is kept exact.
  const insConv = db.prepare(`INSERT INTO conversations (lead_id, subject, status, last_message_at, created_at) VALUES (?, ?, 'open', ?, ?)`)
  const insReply = db.prepare(`INSERT INTO replies (conversation_id, lead_id, campaign_id, from_name, from_email, subject, body, quote, sentiment, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  const REPLY_TEXTS = {
    interested: 'Hi Sonu, Thanks for your email, we are discussing with our team of this matter, if things are going well, we will connect with you soon.\n\nThanks & Regards.',
    neutral: 'Proposal dekh liya. Thoda budget tight hai is quarter. Agla quarter mein baat kar sakte hain.',
    not_interested: 'Abhi website ki zaroorat nahi hai. Baad mein sampark karenge.',
  }
  function addReply(lead, campaignId, sentiment, when, subject) {
    const convId = insConv.run(lead.id, subject, when, when).lastInsertRowid
    insReply.run(convId, lead.id, campaignId, lead.company, lead.email, `Re: ${subject}`, REPLY_TEXTS[sentiment], `Hello ${lead.company} Team,\n\nI hope aap sab theek honge.`, sentiment, when)
  }

  // 3 replies on campaign 2 leads (Batch #6)
  const b6Leads = byBatch('b6')
  addReply(b6Leads.find((l) => l.company === 'Gorakhpur Live'), c2, 'interested', day(-5, 10, 44), 'Just Following Up – Waiting for Your Response')
  addReply(b6Leads.find((l) => l.company === 'Raina News'), c2, 'neutral', day(-3, 10, 21), 'Website & App Demo for Raina News')
  addReply(b6Leads.find((l) => l.company === 'Gorakhpur Times'), c2, 'neutral', day(-2, 5, 9), 'Delivery Status Notification (Failure)')

  // 26 replies on campaign 4 leads (Legacy) → total 29
  const legacyLeads = byBatch('legacy').filter((l) => l.company !== 'Bhojpur Aaj Tak')
  const sentForC4 = db.prepare(`SELECT DISTINCT lead_id FROM campaign_recipients WHERE campaign_id = ? AND status = 'sent'`).all(c4).map((r) => r.lead_id)
  const cycle = ['neutral', 'not_interested', 'neutral']
  let sentCount = 0
  for (const lead of legacyLeads) {
    if (sentCount >= 26) break
    if (!sentForC4.includes(lead.id)) continue
    const sentiment = lead.company === 'Patna Dastak News'
      ? 'neutral'
      : lead.status === 'interested' ? 'interested' : cycle[sentCount % cycle.length]
    const when = day(-(2 + (sentCount % 18)), 9 + (sentCount % 8), (sentCount * 13) % 60)
    addReply(lead, c4, sentiment, when, 'Website & App Proposal')
    sentCount++
  }

  // -- pipeline ----------------------------------------------------------------
  const insStage = db.prepare(`INSERT INTO pipeline_stages (name, color, position, is_won, is_lost) VALUES (?, ?, ?, ?, ?)`)
  const stages = {}
  ;[['New', '#3b82f6'], ['Contacted', '#8b5cf6'], ['Interested', '#f59e0b'], ['Negotiation', '#f97316'], ['Won', '#22c55e'], ['Lost', '#ef4444']].forEach(([name, color], i) => {
    stages[name] = insStage.run(name, color, i, name === 'Won' ? 1 : 0, name === 'Lost' ? 1 : 0).lastInsertRowid
  })
  const insOpp = db.prepare(`INSERT INTO opportunities (lead_id, stage_id, title, value, position, status) VALUES (?, ?, ?, ?, ?, 'open')`)
  const leadByCompany = (name) => leadIds.find((l) => l.company === name)
  ;[
    ['Chapra Khabar', 'New', 25000, 0], ['Bhojpur Aaj Tak', 'New', 15000, 1],
    ['Buxar Samachar_', 'Contacted', 20000, 0], ['BSR News Hindi', 'Contacted', 20000, 1],
    ['Gorakhpur Live', 'Interested', 45000, 0], ['Raina News', 'Interested', 30000, 1],
    ['Patna Dastak News', 'Negotiation', 35000, 0],
  ].forEach(([company, stage, value, pos]) => insOpp.run(leadByCompany(company).id, stages[stage], `${company} – Website & App`, value, pos))
  db.prepare(`INSERT INTO opportunities (lead_id, stage_id, title, value, position, status, closed_at) VALUES (?, ?, ?, 0, 0, 'lost', ?)`)
    .run(leadByCompany('UP News 9').id, stages['Lost'], 'UP News 9 – Website & App', day(-5, 18))

  // -- customers ----------------------------------------------------------------
  const insCust = db.prepare(`INSERT INTO customers (company, contact, email, phone, deal_value, won_on, source) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  ;[
    ['Ara News Portal', 'Ravi Singh', 'ravi@aranews.in', '+91 98765 43210', 45000, '2026-06-12'],
    ['Muzaffarpur Today', 'Priya Gupta', 'priya@mztoday.in', '+91 98123 45678', 60000, '2026-06-28'],
    ['Begusarai Khabar', 'Amit Kumar', 'amit@begusaraikhabar.in', '+91 97654 32109', 35000, '2026-07-05'],
    ['Gopalganj News', 'Sunita Devi', 'sunita@gopalganjnews.in', '+91 96543 21098', 40000, '2026-07-15'],
    ['Arrah Live', 'Vikram Yadav', 'vikram@arrahlive.in', '+91 95432 10987', 50000, '2026-07-22'],
  ].forEach((c) => insCust.run(...c))

  // -- blocked contacts ----------------------------------------------------------
  db.prepare(`INSERT INTO blocked_contacts (email, normalized_email, company, reason, notes, blocked_by, created_at) VALUES (?, ?, ?, 'Asked Not To Contact', ?, ?, ?)`)
    .run('anupsrivastava36@gmail.com', 'anupsrivastava36@gmail.com', 'UP News 9', 'Sorry Mera Youtube Channel hai.Website Nahi chahiye. Please aage koi email na karein.', adminId, day(-5, 5, 40))

  // -- sheet sync ------------------------------------------------------------------
  const connId = db.prepare(`INSERT INTO sheet_connections (name, spreadsheet_id, worksheet_title, status, auto_sync, rows_count, imported_count, last_synced_at, connected_at) VALUES ('demo', '1demoSpreadsheetId_placeholder', 'Sheet1', 'connected', 0, 113, 109, ?, ?)`)
    .run(day(-25, 17, 35), day(-38, 9)).lastInsertRowid
  const insSync = db.prepare(`INSERT INTO sync_history (connection_id, status, imported, skipped, failed, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
  insSync.run(connId, 'success', 0, 113, 0, day(-25, 17, 35, 4))
  insSync.run(connId, 'success', 14, 99, 0, day(-25, 17, 31, 48))
  insSync.run(connId, 'failed', 0, 0, 0, day(-25, 17, 31, 2))
  insSync.run(connId, 'failed', 0, 0, 0, day(-25, 17, 30, 54))
  insSync.run(connId, 'failed', 0, 0, 0, day(-25, 17, 30, 1))
  insSync.run(connId, 'failed', 0, 0, 0, day(-25, 17, 25, 1))
  insSync.run(connId, 'failed', 0, 0, 0, day(-25, 17, 20, 1))
  insSync.run(connId, 'failed', 0, 0, 0, day(-25, 17, 15, 2))
  insSync.run(connId, 'failed', 0, 0, 0, day(-25, 17, 10, 2))
  insSync.run(connId, 'success', 23, 90, 0, day(-25, 17, 5, 11))

  // -- activities ----------------------------------------------------------------
  const insAct = db.prepare(`INSERT INTO activities (type, company, message, created_at) VALUES (?, ?, ?, ?)`)
  insAct.run('reply_received', 'Patna Dastak News', 'Reply received: neutral', day(-1, 5, 0, 31))
  insAct.run('contact_blocked', 'UP News 9', 'Contact blocked by admin', day(-5, 5, 40, 29))
  insAct.run('reply_received', 'Gorakhpur Live', 'Reply received: interested', day(-5, 10, 44, 20))
  insAct.run('campaign_completed', "First 50 Customer's", 'Campaign completed · 63 emails sent', day(-24, 18, 12, 44))
  insAct.run('sync_imported', 'Sheet "demo"', 'Sync imported 14 new leads', day(-25, 17, 31, 48))
  insAct.run('campaign_completed', '26 Leads Emails', 'Campaign completed · 23 emails sent', day(-6, 17, 45, 1))
})

// ---------------------------------------------------------------- report
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c
logger.info('Seed complete:', {
  users: count('users'), batches: count('lead_batches'), leads: count('leads'),
  templates: count('templates'), campaigns: count('campaigns'),
  recipients: count('campaign_recipients'), emailsSent: db.prepare(`SELECT COUNT(*) c FROM emails WHERE status='sent'`).get().c,
  emailsQueued: db.prepare(`SELECT COUNT(*) c FROM emails WHERE status='queued'`).get().c,
  replies: count('replies'), customers: count('customers'), blocked: count('blocked_contacts'),
  activities: count('activities'),
})

// ---- Mock data for SwiftGrowth Outreach CRM (UI only) ----

export const dashboardStats = {
  totalLeads: 100,
  newLeads: 79,
  emailsSent: 101,
  replies: 29,
  replyRate: '29%',
  interested: 10,
  wonDeals: 0,
  revenue: '₹0',
  followupsPending: 0,
  conversion: '0%',
  todaysImports: 0,
  neverContacted: 0,
  blockedContacts: 1,
  emailsPrevented: 0,
}

export const emailsSentChart = [
  { date: '2026-07-21', count: 63 },
  { date: '2026-07-29', count: 24 },
  { date: '2026-08-01', count: 14 },
]

export const newLeadsChart = [
  { date: '2026-07-19', count: 0 },
  { date: '2026-07-21', count: 62 },
  { date: '2026-07-27', count: 23 },
  { date: '2026-08-01', count: 13 },
]

export const batchAnalytics = [
  { name: 'Batch #4', imported: 0, emailed: 0 },
  { name: 'Batch #3', imported: 14, emailed: 0 },
  { name: 'Batch #6', imported: 23, emailed: 0 },
  { name: 'Legacy Leads', imported: 86, emailed: 0 },
]

export const campaignAnalytics = [
  { name: '14 Leads Emails', sent: '14/14 sent' },
  { name: '26 Leads Emails', sent: '23/23 sent' },
  { name: 'Testing', sent: '1/1 sent' },
  { name: "First 50 Customer's", sent: '63/63 sent' },
]

export const recentActivity = [
  { company: 'Patna Dastak News', text: 'Reply received: neutral', time: '8/8/2026, 5:00:31 am', dot: '#3b82f6' },
  { company: 'UP News 9', text: 'Contact blocked by admin', time: '30/7/2026, 5:40:29 am', dot: '#ef4444' },
  { company: 'Gorakhpur Live', text: 'Reply received: interested', time: '23/7/2026, 10:44:20 am', dot: '#22c55e' },
  { company: "First 50 Customer's", text: 'Campaign completed · 63 emails sent', time: '19/7/2026, 6:12:44 pm', dot: '#3b82f6' },
  { company: 'Sheet "demo"', text: 'Sync imported 14 new leads', time: '1/8/2026, 5:31:48 pm', dot: '#10b981' },
  { company: '26 Leads Emails', text: 'Campaign completed · 23 emails sent', time: '1/8/2026, 5:20:01 pm', dot: '#3b82f6' },
]

export const leads = [
  { id: 1, company: 'Local News Bihar', contact: '—', email: 'sanjeevsinghnaini@gmail.com', status: 'replied', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'Local News Bihar Ji ke liye ek chhoti si idea…', lastSent: '1/8/2026, 5:37:19 pm', campaignsCount: 0, batch: 'Batch #3' },
  { id: 2, company: 'Buxar Samachar_', contact: '—', email: 'sanjayupadhyay6622@gmail.com', status: 'new', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'Buxar Samachar_ Ji ke liye ek chhoti si idea…', lastSent: '1/8/2026, 5:37:03 pm', campaignsCount: 0, batch: 'Batch #3' },
  { id: 3, company: 'BSR News Hindi', contact: '—', email: 'danishabbasi4280@gmail.com', status: 'new', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'BSR News Hindi Ji ke liye ek chhoti si idea…', lastSent: '1/8/2026, 5:36:50 pm', campaignsCount: 0, batch: 'Batch #3' },
  { id: 4, company: 'BHOJPURI NEWS TIME', contact: '—', email: 'abhiindia05@gmail.com', status: 'new', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'BHOJPURI NEWS TIME Ji ke liye ek chhoti si…', lastSent: '1/8/2026, 5:36:35 pm', campaignsCount: 0, batch: 'Batch #3' },
  { id: 5, company: 'Patna Prime News', contact: '—', email: 'patnaprimenews24@gmail.com', status: 'new', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'Patna Prime News Ji ke liye ek chhoti si idea…', lastSent: '1/8/2026, 5:36:19 pm', campaignsCount: 0, batch: 'Batch #3' },
  { id: 6, company: 'AMS LIVE NEWS PATNA', contact: '—', email: 'amslivenewspatna@gmail.com', status: 'new', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'AMS LIVE NEWS PATNA Ji ke liye ek chhoti…', lastSent: '1/8/2026, 5:36:04 pm', campaignsCount: 0, batch: 'Batch #3' },
  { id: 7, company: 'Gorakhpur Live', contact: '—', email: 'gorakhpurlive.org@gmail.com', status: 'interested', campaign: '26 Leads Emails', template: 'Followup 1 (v1)', subject: 'Re: Just Following Up – Waiting for Your Response', lastSent: '23/7/2026, 9:59:12 am', campaignsCount: 2, batch: 'Batch #6' },
  { id: 8, company: 'UP News 9', contact: '—', email: 'anupsrivastava36@gmail.com', status: 'blocked', campaign: '26 Leads Emails', template: '1st Message (v1)', subject: 'Live Demo Website & App – Detailed Proposal', lastSent: '22/7/2026, 10:38:30 pm', campaignsCount: 1, batch: 'Batch #6' },
  { id: 9, company: 'Raina News', contact: '—', email: 'rainanews@gmail.com', status: 'replied', campaign: '26 Leads Emails', template: 'Followup 1 (v1)', subject: 'Re: Website & App Demo for Raina News', lastSent: '30/7/2026, 10:21:42 am', campaignsCount: 2, batch: 'Batch #6' },
  { id: 10, company: 'Gorakhpur Times', contact: '—', email: 'gorakhpurtimes@gmail.com', status: 'new', campaign: '26 Leads Emails', template: '1st Message (v1)', subject: 'Gorakhpur Times Ji ke liye digital growth idea…', lastSent: '25/7/2026, 5:09:11 pm', campaignsCount: 1, batch: 'Batch #6' },
  { id: 11, company: 'Patna Dastak News', contact: '—', email: 'patnadastaknews@gmail.com', status: 'replied', campaign: "First 50 Customer's", template: '1st Message (v2)', subject: 'Patna Dastak News – Website & App Proposal', lastSent: '8/8/2026, 5:00:31 am', campaignsCount: 1, batch: 'Legacy Leads' },
  { id: 12, company: 'Chapra Khabar', contact: '—', email: 'chaprakhabar@gmail.com', status: 'new', campaign: "First 50 Customer's", template: '1st Message (v2)', subject: 'Chapra Khabar Ji ke liye ek chhoti si idea…', lastSent: '18/7/2026, 4:12:09 pm', campaignsCount: 1, batch: 'Legacy Leads' },
  { id: 13, company: 'Saran Samachar', contact: '—', email: 'saransamachar@gmail.com', status: 'never_contacted', campaign: '—', template: '—', subject: '—', lastSent: '—', campaignsCount: 0, batch: 'Legacy Leads' },
  { id: 14, company: 'Siwan Live News', contact: '—', email: 'siwanlivenews@gmail.com', status: 'never_contacted', campaign: '—', template: '—', subject: '—', lastSent: '—', campaignsCount: 0, batch: 'Legacy Leads' },
  { id: 15, company: 'Bhojpur Aaj Tak', contact: '—', email: 'bhojpuraajtak@gmail.com', status: 'new', campaign: 'Testing', template: '1st Message (v1)', subject: 'Testing campaign – demo email', lastSent: '19/7/2026, 11:02:45 am', campaignsCount: 1, batch: 'Legacy Leads' },
]

export const templateCategories = ['Initial Outreach', 'Followup 1', 'Followup 2', 'Proposal', 'Meeting Reminder']

export const templates = [
  { id: 1, name: '1st Message (v1)', category: 'Initial Outreach', subject: '{{company}} Ji ke liye ek chhoti si idea…', body: 'Hello {{company}} Team,\n\nI hope aap sab theek honge.\n\nMaine dekha ki aapka news platform bahut achha kaam kar raha hai. Main aapke liye ek professional website & mobile app bana sakta hoon jisse aapki audience badhegi.\n\nKya main aapko ek live demo bhej sakta hoon?\n\nThanks & Regards,\nSonu\nSwiftGrowthDigital', variables: ['{{company}}'], updatedAt: '19/7/2026' },
  { id: 2, name: '1st Message (v2)', category: 'Initial Outreach', subject: '{{company}} – Website & App Proposal', body: 'Hello {{company}} Team,\n\nGreetings from SwiftGrowthDigital!\n\nWe help news platforms like {{company}} go digital with a modern website and mobile app. Our live demo is ready — would you like to see it?\n\nThanks & Regards,\nSonu\nSwiftGrowthDigital', variables: ['{{company}}'], updatedAt: '1/8/2026' },
  { id: 3, name: 'Followup 1 (v1)', category: 'Followup 1', subject: 'Just Following Up – Waiting for Your Response', body: 'Hello {{company}} Team,\n\nBas is email ke through follow-up kar raha hoon regarding woh proposal jo maine aapke Live Demo Website & App ke liye share kiya tha.\n\nHum aapke response ka wait kar rahe hain.\n\nThanks & Regards,\nSonu', variables: ['{{company}}'], updatedAt: '20/7/2026' },
  { id: 4, name: 'Detailed Proposal (v1)', category: 'Proposal', subject: 'Live Demo Website & App – Detailed Proposal', body: 'Hello {{company}} Team,\n\nAttached is our detailed proposal for your new website & app:\n\n• Modern responsive design\n• Push notifications for breaking news\n• Admin panel & analytics\n\nLooking forward to your thoughts.\n\nThanks & Regards,\nSonu', variables: ['{{company}}'], updatedAt: '22/7/2026' },
]

export const campaigns = [
  { id: 1, name: '14 Leads Emails', status: 'Completed', created: '1 Aug 2026', template: 'selected template', audience: 'Manual audience', sent: 14, opened: null, clicked: null, replied: null, failed: 0, deliveredPct: 100, note: 'Ready when you are' },
  { id: 2, name: '26 Leads Emails', status: 'Completed', created: '1 Aug 2026', template: 'selected template', audience: 'Manual audience', sent: 23, opened: 11, clicked: 4, replied: 3, failed: 0, deliveredPct: 100, note: 'Ready when you are' },
  { id: 3, name: 'Testing', status: 'Completed', created: '19 Jul 2026', template: '1st Message (v1)', audience: 'Manual audience', sent: 1, opened: 1, clicked: 0, replied: 0, failed: 0, deliveredPct: 100, note: 'Ready when you are' },
  { id: 4, name: "First 50 Customer's", status: 'Completed', created: '10 Jul 2026', template: '1st Message (v2)', audience: 'Batch · Legacy Leads', sent: 63, opened: 31, clicked: 12, replied: 9, failed: 0, deliveredPct: 100, note: 'Ready when you are' },
]

export const campaignStats = {
  total: 4,
  emailsSent: 101,
  openRate: '—',
  replyRate: '0%',
}

export const emailQueue = [
  { id: 1, to: 'sanjayupadhyay6622@gmail.com', company: 'Buxar Samachar_', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'Buxar Samachar_ Ji ke liye ek chhoti si idea…', scheduled: '1/8/2026, 5:37:03 pm', status: 'sent' },
  { id: 2, to: 'danishabbasi4280@gmail.com', company: 'BSR News Hindi', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'BSR News Hindi Ji ke liye ek chhoti si idea…', scheduled: '1/8/2026, 5:36:50 pm', status: 'sent' },
  { id: 3, to: 'abhiindia05@gmail.com', company: 'BHOJPURI NEWS TIME', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'BHOJPURI NEWS TIME Ji ke liye ek chhoti…', scheduled: '1/8/2026, 5:36:35 pm', status: 'sent' },
  { id: 4, to: 'patnaprimenews24@gmail.com', company: 'Patna Prime News', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'Patna Prime News Ji ke liye ek chhoti si idea…', scheduled: '1/8/2026, 5:36:19 pm', status: 'failed' },
  { id: 5, to: 'amslivenewspatna@gmail.com', company: 'AMS LIVE NEWS PATNA', campaign: '14 Leads Emails', template: '1st Message (v1)', subject: 'AMS LIVE NEWS PATNA Ji ke liye ek chhoti…', scheduled: '1/8/2026, 5:36:04 pm', status: 'sent' },
  { id: 6, to: 'chaprakhabar@gmail.com', company: 'Chapra Khabar', campaign: "First 50 Customer's", template: '1st Message (v2)', subject: 'Chapra Khabar Ji ke liye ek chhoti si idea…', scheduled: '18/7/2026, 4:12:09 pm', status: 'sent' },
  { id: 7, to: 'bhojpuraajtak@gmail.com', company: 'Bhojpur Aaj Tak', campaign: 'Testing', template: '1st Message (v1)', subject: 'Testing campaign – demo email', scheduled: '19/7/2026, 11:02:45 am', status: 'sent' },
  { id: 8, to: 'siwanlivenews@gmail.com', company: 'Siwan Live News', campaign: '26 Leads Emails', template: 'Followup 1 (v1)', subject: 'Just Following Up – Waiting for Your Response', scheduled: '26/8/2026, 9:00:00 am', status: 'pending' },
  { id: 9, to: 'saransamachar@gmail.com', company: 'Saran Samachar', campaign: '26 Leads Emails', template: 'Followup 1 (v1)', subject: 'Just Following Up – Waiting for Your Response', scheduled: '26/8/2026, 9:05:00 am', status: 'pending' },
]

export const replies = [
  {
    id: 1, from: 'Gorakhpur Live', email: 'gorakhpurlive.org@gmail.com', subject: 'Re: Just Following Up – Waiting for Your Response', date: '23/7/2026, 10:44:20 am',
    body: 'Hi Sonu, Thanks for your email, we are discussing with our team of this matter, if things are going well, we are connect with you soon.\n\nThanks & Regards.\n\nOn Thu, 23 Jul, 2026, 9:59 am SwiftGrowthDigital, <hello@swiftgrowthdigital.com> wrote:',
    quote: 'Hello Gorakhpur Live Team,\n\nI hope aap sab theek honge.\n\nBas is email ke through follow-up kar raha hoon regarding woh proposal jo maine aapke Live Demo Website & App ke liye share kiya tha.\n\nHum aapke response ka wait kar rahe hain. Agar proposal se related koi question ho, koi changes chahiye ho, ya project ko lekar discuss karna ho, to please hume reply karein. Hume aapse baat karke khushi hogi.',
    sentiment: 'interested',
  },
  {
    id: 2, from: 'Raina News', email: 'rainanews@gmail.com', subject: 'Delivery Status Notification (Delay)', date: '30/7/2026, 10:21:42 am',
    body: 'This is an automatically generated Delivery Status Notification.\n\nDelivery to the following recipient has been delayed:\n\nrainanews@gmail.com\n\nMessage will be retried for another 24 hours.',
    quote: '', sentiment: 'neutral',
  },
  {
    id: 3, from: 'Gorakhpur Times', email: 'gorakhpurtimes@gmail.com', subject: 'Delivery Status Notification (Failure)', date: '25/7/2026, 5:09:11 am',
    body: 'Delivery to the following recipient failed permanently:\n\ngorakhpurtimes@gmail.com\n\nTechnical details of permanent failure:\nGoogle tried to deliver your message, but the recipient server did not accept it.',
    quote: '', sentiment: 'neutral',
  },
  {
    id: 4, from: 'Gorakhpur Times', email: 'gorakhpurtimes@gmail.com', subject: 'Delivery Status Notification (Delay)', date: '23/7/2026, 1:02:40 am',
    body: 'This is an automatically generated Delivery Status Notification.\n\nDelivery to the following recipient has been delayed:\n\ngorakhpurtimes@gmail.com',
    quote: '', sentiment: 'neutral',
  },
  {
    id: 5, from: 'UP News 9', email: 'anupsrivastava36@gmail.com', subject: 'Re: Live Demo Website & App – Detailed Proposal', date: '22/7/2026, 10:38:30 pm',
    body: 'Sorry Mera Youtube Channel hai. Website Nahi chahiye. Please aage koi email na karein.\n\nDhanyavaad.',
    quote: 'Hello UP News 9 Team,\n\nAttached is our detailed proposal for your new website & app.', sentiment: 'not_interested',
  },
  {
    id: 6, from: 'Patna Dastak News', email: 'patnadastaknews@gmail.com', subject: 'Re: Website & App Proposal', date: '8/8/2026, 5:00:31 am',
    body: 'Proposal dekh liya. Thoda mehanga lag raha hai. Agar price kam ho jaye to baat kar sakte hain.\n\nNext week call kar lena.',
    quote: 'Hello Patna Dastak News Team,\n\nAttached is our detailed proposal for your new website & app.', sentiment: 'neutral',
  },
]

export const interestedLeads = [
  { id: 1, company: 'Gorakhpur Live', email: 'gorakhpurlive.org@gmail.com', repliedOn: '23/7/2026, 10:44:20 am', heat: 'Hot', note: 'Discussing with team — will connect soon', pipeline: 'Interested' },
  { id: 2, company: 'Patna Dastak News', email: 'patnadastaknews@gmail.com', repliedOn: '8/8/2026, 5:00:31 am', heat: 'Warm', note: 'Price concern — call next week', pipeline: 'Negotiation' },
  { id: 3, company: 'Raina News', email: 'rainanews@gmail.com', repliedOn: '30/7/2026, 10:21:42 am', heat: 'Warm', note: 'Asked for demo link again', pipeline: 'Interested' },
]

export const followups = [
  { id: 1, lead: 'Siwan Live News', email: 'siwanlivenews@gmail.com', template: 'Followup 1 (v1)', due: '26/8/2026, 9:00:00 am', campaign: '26 Leads Emails', status: 'scheduled' },
  { id: 2, lead: 'Saran Samachar', email: 'saransamachar@gmail.com', template: 'Followup 1 (v1)', due: '26/8/2026, 9:05:00 am', campaign: '26 Leads Emails', status: 'scheduled' },
  { id: 3, lead: 'Patna Dastak News', email: 'patnadastaknews@gmail.com', template: 'Meeting Reminder (v1)', due: '29/8/2026, 11:00:00 am', campaign: "First 50 Customer's", status: 'scheduled' },
  { id: 4, lead: 'Chapra Khabar', email: 'chaprakhabar@gmail.com', template: 'Followup 2 (v1)', due: '20/8/2026, 10:00:00 am', campaign: "First 50 Customer's", status: 'overdue' },
  { id: 5, lead: 'Bhojpur Aaj Tak', email: 'bhojpuraajtak@gmail.com', template: 'Followup 1 (v1)', due: '18/8/2026, 4:30:00 pm', campaign: 'Testing', status: 'sent' },
]

export const pipelineStages = [
  {
    id: 'new', name: 'New', color: '#3b82f6',
    cards: [
      { id: 'p1', company: 'Chapra Khabar', email: 'chaprakhabar@gmail.com', value: '₹25,000', age: '18d' },
      { id: 'p2', company: 'Bhojpur Aaj Tak', email: 'bhojpuraajtak@gmail.com', value: '₹15,000', age: '12d' },
    ],
  },
  {
    id: 'contacted', name: 'Contacted', color: '#8b5cf6',
    cards: [
      { id: 'p3', company: 'Buxar Samachar_', email: 'sanjayupadhyay6622@gmail.com', value: '₹20,000', age: '25d' },
      { id: 'p4', company: 'BSR News Hindi', email: 'danishabbasi4280@gmail.com', value: '₹20,000', age: '25d' },
    ],
  },
  {
    id: 'interested', name: 'Interested', color: '#f59e0b',
    cards: [
      { id: 'p5', company: 'Gorakhpur Live', email: 'gorakhpurlive.org@gmail.com', value: '₹45,000', age: '33d' },
      { id: 'p6', company: 'Raina News', email: 'rainanews@gmail.com', value: '₹30,000', age: '26d' },
    ],
  },
  {
    id: 'negotiation', name: 'Negotiation', color: '#f97316',
    cards: [
      { id: 'p7', company: 'Patna Dastak News', email: 'patnadastaknews@gmail.com', value: '₹35,000', age: '18d' },
    ],
  },
  {
    id: 'won', name: 'Won', color: '#22c55e',
    cards: [],
  },
  {
    id: 'lost', name: 'Lost', color: '#ef4444',
    cards: [
      { id: 'p8', company: 'UP News 9', email: 'anupsrivastava36@gmail.com', value: '—', age: '34d' },
    ],
  },
]

export const customers = [
  { id: 1, company: 'Ara News Portal', contact: 'Ravi Singh', email: 'ravi@aranews.in', phone: '+91 98765 43210', deal: '₹45,000', wonOn: '12/6/2026', source: "First 50 Customer's" },
  { id: 2, company: 'Muzaffarpur Today', contact: 'Priya Gupta', email: 'priya@mztoday.in', phone: '+91 98123 45678', deal: '₹60,000', wonOn: '28/6/2026', source: "First 50 Customer's" },
  { id: 3, company: 'Begusarai Khabar', contact: 'Amit Kumar', email: 'amit@begusaraikhabar.in', phone: '+91 97654 32109', deal: '₹35,000', wonOn: '5/7/2026', source: "First 50 Customer's" },
  { id: 4, company: 'Gopalganj News', contact: 'Sunita Devi', email: 'sunita@gopalganjnews.in', phone: '+91 96543 21098', deal: '₹40,000', wonOn: '15/7/2026', source: "First 50 Customer's" },
  { id: 5, company: 'Arrah Live', contact: 'Vikram Yadav', email: 'vikram@arrahlive.in', phone: '+91 95432 10987', deal: '₹50,000', wonOn: '22/7/2026', source: "First 50 Customer's" },
]

export const blockedContacts = [
  { id: 1, email: 'anupsrivastava36@gmail.com', company: 'UP News 9', reason: 'Asked Not To Contact', date: '30/7/2026, 5:40:29 am', blockedBy: 'admin', notes: 'Sorry Mera Youtube Channel hai.Website Nahi chahiye. Please aage koi email na karein.' },
]

export const sheetSync = {
  name: 'demo',
  connected: true,
  worksheet: 'Sheet1',
  rows: 113,
  imported: 109,
  lastSync: '1/8/2026, 5:35:04 pm',
  connectedOn: '19/7/2026',
  autoSync: false,
}

export const syncHistory = [
  { id: 1, status: 'success', imported: 0, skipped: 113, failed: 0, time: '1/8/2026, 5:35:04 pm' },
  { id: 2, status: 'success', imported: 14, skipped: 99, failed: 0, time: '1/8/2026, 5:31:48 pm' },
  { id: 3, status: 'failed', imported: 0, skipped: 0, failed: 0, time: '1/8/2026, 5:31:02 pm' },
  { id: 4, status: 'failed', imported: 0, skipped: 0, failed: 0, time: '1/8/2026, 5:30:54 pm' },
  { id: 5, status: 'failed', imported: 0, skipped: 0, failed: 0, time: '1/8/2026, 5:30:01 pm' },
  { id: 6, status: 'failed', imported: 0, skipped: 0, failed: 0, time: '1/8/2026, 5:25:01 pm' },
  { id: 7, status: 'failed', imported: 0, skipped: 0, failed: 0, time: '1/8/2026, 5:20:01 pm' },
  { id: 8, status: 'failed', imported: 0, skipped: 0, failed: 0, time: '1/8/2026, 5:15:02 pm' },
  { id: 9, status: 'failed', imported: 0, skipped: 0, failed: 0, time: '1/8/2026, 5:10:02 pm' },
  { id: 10, status: 'success', imported: 23, skipped: 90, failed: 0, time: '1/8/2026, 5:05:11 pm' },
]

export const batches = [
  { id: 1, name: 'Batch #4', source: 'CSV Import', imported: 0, emailed: 0, created: '4/8/2026', status: 'empty' },
  { id: 2, name: 'Batch #3', source: 'Sheet Sync', imported: 14, emailed: 0, created: '1/8/2026', status: 'ready' },
  { id: 3, name: 'Batch #6', source: 'Sheet Sync', imported: 23, emailed: 0, created: '1/8/2026', status: 'ready' },
  { id: 4, name: 'Legacy Leads', source: 'CSV Import', imported: 86, emailed: 63, created: '10/7/2026', status: 'active' },
]

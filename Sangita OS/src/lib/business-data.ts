// Rich, deterministic mock business data for Sangita OS modules.
// Everything is illustrative — no real customers, no PII.

export const inr = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)}Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(0)}k`
    : `₹${n}`;

export type LeadStage = "New" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
export const LEAD_STAGES: LeadStage[] = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  stage: LeadStage;
  owner: string;
  source: string;
  score: number;
  priority: "High" | "Medium" | "Low";
  createdAt: string;
  lastActivity: string;
  nextAction: string;
  aiNext: string;
  tags: string[];
  notes: { at: string; author: string; text: string }[];
  emails: { at: string; subject: string; direction: "in" | "out" }[];
  whatsapp: { at: string; text: string; direction: "in" | "out" }[];
  tasks: { title: string; done: boolean; due: string }[];
  attachments: { name: string; size: string }[];
  timeline: { at: string; type: string; text: string }[];
};

export const LEADS: Lead[] = [
  {
    id: "L-1042", name: "Rajat Malhotra", company: "Acme Corp", email: "rajat@acme.io", phone: "+91 98110 22110",
    value: 840000, stage: "Negotiation", owner: "Ananya", source: "Referral", score: 92, priority: "High",
    createdAt: "2026-06-14", lastActivity: "2h ago", nextAction: "Send revised MSA", aiNext: "Call before EOD — opened proposal 4× in 48h. Offer 8% annual discount, lock 24-month term.",
    tags: ["Enterprise", "Hot", "SwiftGrowth"],
    notes: [
      { at: "Today · 10:12", author: "Ananya", text: "CFO wants annual invoicing. Legal reviewing MSA v3." },
      { at: "Yesterday", author: "You", text: "Discussed rollout timeline — Q4 kickoff preferred." },
    ],
    emails: [
      { at: "Today · 09:20", subject: "Re: Proposal v3 — annual terms", direction: "in" },
      { at: "Yesterday", subject: "Proposal v3 — SwiftGrowth Enterprise", direction: "out" },
      { at: "Jul 22", subject: "Intro & discovery notes", direction: "out" },
    ],
    whatsapp: [
      { at: "Today · 11:04", text: "Can we jump on a quick call at 4?", direction: "in" },
      { at: "Today · 11:06", text: "Absolutely, sending invite now.", direction: "out" },
    ],
    tasks: [
      { title: "Send revised MSA", done: false, due: "Today" },
      { title: "Legal review sign-off", done: false, due: "Tomorrow" },
      { title: "Kickoff call scheduling", done: true, due: "Yesterday" },
    ],
    attachments: [{ name: "MSA-v3.pdf", size: "412 KB" }, { name: "Proposal-Acme.pdf", size: "1.2 MB" }],
    timeline: [
      { at: "2h ago", type: "email", text: "Rajat replied to proposal" },
      { at: "1d ago", type: "stage", text: "Moved to Negotiation" },
      { at: "3d ago", type: "call", text: "45min discovery call" },
      { at: "1w ago", type: "note", text: "Referral from Priya @ Nexora" },
    ],
  },
  {
    id: "L-1041", name: "Priya Nair", company: "Nexora Labs", email: "priya@nexora.co", phone: "+91 90000 44112",
    value: 320000, stage: "Proposal", owner: "Vikram", source: "Website", score: 84, priority: "High",
    createdAt: "2026-07-02", lastActivity: "5h ago", nextAction: "Follow-up on proposal", aiNext: "Send case study — she opened the proposal but hasn't shared internally. Include ROI calculator.",
    tags: ["Mid-market", "Libriofy"],
    notes: [{ at: "5h ago", author: "Vikram", text: "Waiting on procurement sign-off." }],
    emails: [{ at: "5h ago", subject: "Proposal — Libriofy Pro", direction: "out" }],
    whatsapp: [],
    tasks: [{ title: "Share ROI calculator", done: false, due: "Today" }],
    attachments: [{ name: "Libriofy-Proposal.pdf", size: "890 KB" }],
    timeline: [{ at: "5h ago", type: "email", text: "Proposal sent" }, { at: "2d ago", type: "call", text: "Discovery call" }],
  },
  {
    id: "L-1040", name: "Arjun Reddy", company: "Meridian Retail", email: "arjun@meridian.in", phone: "+91 98450 77123",
    value: 180000, stage: "Qualified", owner: "Ananya", source: "LinkedIn", score: 71, priority: "Medium",
    createdAt: "2026-07-08", lastActivity: "1d ago", nextAction: "Schedule demo",
    aiNext: "Book a Synsfi demo — retail vertical, budget confirmed at ₹1.8L. Similar to Meridian's cohort won last quarter.",
    tags: ["Retail", "Synsfi"],
    notes: [], emails: [], whatsapp: [], tasks: [{ title: "Send demo invite", done: false, due: "Tomorrow" }],
    attachments: [], timeline: [{ at: "1d ago", type: "stage", text: "Qualified via BANT" }],
  },
  {
    id: "L-1039", name: "Kabir Shah", company: "Halcyon Foods", email: "kabir@halcyon.in", phone: "+91 99870 44561",
    value: 240000, stage: "New", owner: "Vikram", source: "Cold outbound", score: 58, priority: "Medium",
    createdAt: "2026-07-24", lastActivity: "3h ago", nextAction: "Qualification call",
    aiNext: "Send discovery questionnaire — no clear budget signal. Assign to SDR for BANT qualification.",
    tags: ["F&B", "Cold"], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [],
  },
  {
    id: "L-1038", name: "Sneha Kapoor", company: "Verdant HR", email: "sneha@verdant.hr", phone: "+91 97030 88110",
    value: 145000, stage: "New", owner: "Ananya", source: "Event", score: 66, priority: "Low",
    createdAt: "2026-07-23", lastActivity: "6h ago", nextAction: "Send intro deck",
    aiNext: "Nurture with case study email — met at SaaSBoomi, interested but not urgent.",
    tags: ["HR-Tech"], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [],
  },
  {
    id: "L-1037", name: "Devansh Iyer", company: "Bluewave Studios", email: "d@bluewave.studio", phone: "+91 90210 11003",
    value: 92000, stage: "Qualified", owner: "Vikram", source: "Referral", score: 74, priority: "Medium",
    createdAt: "2026-07-11", lastActivity: "2d ago", nextAction: "Send proposal",
    aiNext: "Draft proposal — creative agency, needs Libriofy + custom onboarding. Reference Bluewave-like cohort pricing.",
    tags: ["Creative", "Libriofy"], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [],
  },
  {
    id: "L-1036", name: "Rhea Menon", company: "Kestrel Health", email: "rhea@kestrel.health", phone: "+91 88900 33211",
    value: 520000, stage: "Proposal", owner: "Ananya", source: "Partner", score: 88, priority: "High",
    createdAt: "2026-06-28", lastActivity: "4h ago", nextAction: "Negotiate contract",
    aiNext: "Prepare 3-tier pricing — healthcare compliance is deal-breaker, emphasize SOC2 & DPDP readiness.",
    tags: ["Healthcare", "Enterprise"], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [],
  },
  {
    id: "L-1035", name: "Vivaan Chopra", company: "Pinnacle Realty", email: "vivaan@pinnacle.re", phone: "+91 98290 55471",
    value: 380000, stage: "Negotiation", owner: "Vikram", source: "Referral", score: 79, priority: "High",
    createdAt: "2026-06-20", lastActivity: "1d ago", nextAction: "Close terms",
    aiNext: "Offer 10% for signing this week — quarter-end urgency. Realty vertical, 12-month term.",
    tags: ["Realty"], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [],
  },
  {
    id: "L-1034", name: "Ishaan Ghosh", company: "Northline Logistics", email: "ishaan@northline.co", phone: "+91 90040 22110",
    value: 210000, stage: "Won", owner: "Ananya", source: "Website", score: 95, priority: "High",
    createdAt: "2026-05-14", lastActivity: "3d ago", nextAction: "Handoff to CS",
    aiNext: "Introduce to Customer Success — schedule onboarding week 1, target activation by day 21.",
    tags: ["Logistics", "Won"], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [],
  },
  {
    id: "L-1033", name: "Aanya Bose", company: "Cascade Ventures", email: "aanya@cascade.vc", phone: "+91 98470 92211",
    value: 90000, stage: "Lost", owner: "Vikram", source: "Cold outbound", score: 32, priority: "Low",
    createdAt: "2026-05-02", lastActivity: "2w ago", nextAction: "Archive",
    aiNext: "Reason: budget cut. Nurture in Q4 — revisit after their next fund close.",
    tags: ["VC", "Lost"], notes: [], emails: [], whatsapp: [], tasks: [], attachments: [], timeline: [],
  },
];

export type InvoiceStatus = "Draft" | "Sent" | "Viewed" | "Paid" | "Overdue" | "Cancelled";
export type Invoice = {
  id: string;
  client: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: { desc: string; qty: number; rate: number; gstPct: number }[];
  notes?: string;
  timeline: { at: string; type: string; text: string }[];
};

export const INVOICES: Invoice[] = [
  {
    id: "INV-2044", client: "Acme Corp", clientEmail: "billing@acme.io",
    issueDate: "2026-07-20", dueDate: "2026-08-04", status: "Sent",
    items: [
      { desc: "SwiftGrowth Enterprise — Annual", qty: 1, rate: 720000, gstPct: 18 },
      { desc: "Onboarding & Migration", qty: 1, rate: 80000, gstPct: 18 },
    ],
    notes: "Net 15 · Bank transfer preferred.",
    timeline: [
      { at: "2h ago", type: "view", text: "Client viewed invoice" },
      { at: "1d ago", type: "sent", text: "Emailed to billing@acme.io" },
      { at: "1d ago", type: "created", text: "Invoice created" },
    ],
  },
  {
    id: "INV-2043", client: "Kestrel Health", clientEmail: "ap@kestrel.health",
    issueDate: "2026-07-14", dueDate: "2026-07-29", status: "Paid",
    items: [{ desc: "Libriofy Pro — Q3 subscription", qty: 1, rate: 180000, gstPct: 18 }],
    notes: "Paid via Razorpay · UTR 3421887710",
    timeline: [
      { at: "1h ago", type: "paid", text: "Payment received · ₹2.12L" },
      { at: "2d ago", type: "sent", text: "Reminder sent" },
      { at: "9d ago", type: "sent", text: "Emailed to ap@kestrel.health" },
    ],
  },
  {
    id: "INV-2042", client: "Bluewave Studios", clientEmail: "accounts@bluewave.studio",
    issueDate: "2026-07-10", dueDate: "2026-07-25", status: "Overdue",
    items: [{ desc: "Libriofy Team — Monthly", qty: 3, rate: 12000, gstPct: 18 }],
    timeline: [{ at: "5h ago", type: "reminder", text: "AI reminder sent" }, { at: "5d ago", type: "sent", text: "Invoice sent" }],
  },
  {
    id: "INV-2041", client: "Meridian Retail", clientEmail: "finance@meridian.in",
    issueDate: "2026-07-08", dueDate: "2026-07-23", status: "Paid",
    items: [{ desc: "Synsfi Retail — Setup", qty: 1, rate: 120000, gstPct: 18 }],
    timeline: [{ at: "3d ago", type: "paid", text: "Payment received" }],
  },
  {
    id: "INV-2040", client: "Northline Logistics", clientEmail: "cfo@northline.co",
    issueDate: "2026-07-01", dueDate: "2026-07-16", status: "Paid",
    items: [{ desc: "SwiftGrowth Pro — Annual", qty: 1, rate: 480000, gstPct: 18 }],
    timeline: [],
  },
  {
    id: "INV-2039", client: "Pinnacle Realty", clientEmail: "billing@pinnacle.re",
    issueDate: "2026-06-28", dueDate: "2026-07-13", status: "Overdue",
    items: [{ desc: "Synsfi Pro — Quarterly", qty: 1, rate: 96000, gstPct: 18 }],
    timeline: [{ at: "2d ago", type: "reminder", text: "Payment reminder sent" }],
  },
  {
    id: "INV-2038", client: "Verdant HR", clientEmail: "ap@verdant.hr",
    issueDate: "2026-06-22", dueDate: "2026-07-07", status: "Paid",
    items: [{ desc: "Libriofy Starter — Annual", qty: 1, rate: 48000, gstPct: 18 }],
    timeline: [],
  },
  {
    id: "INV-2037", client: "Halcyon Foods", clientEmail: "accounts@halcyon.in",
    issueDate: "2026-06-15", dueDate: "2026-06-30", status: "Draft",
    items: [{ desc: "SwiftGrowth Pilot — 60 days", qty: 1, rate: 60000, gstPct: 18 }],
    timeline: [],
  },
];

export function invoiceTotals(inv: Invoice) {
  const subtotal = inv.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const gst = inv.items.reduce((s, it) => s + (it.qty * it.rate * it.gstPct) / 100, 0);
  return { subtotal, gst, total: subtotal + gst };
}

export const CONTACTS = [
  { id: "C-201", name: "Rajat Malhotra", company: "Acme Corp", role: "VP Growth", email: "rajat@acme.io", phone: "+91 98110 22110", ltv: 2400000, deals: 3, tier: "Enterprise", lastTouch: "2h ago" },
  { id: "C-202", name: "Priya Nair", company: "Nexora Labs", role: "Founder", email: "priya@nexora.co", phone: "+91 90000 44112", ltv: 640000, deals: 2, tier: "Mid-market", lastTouch: "5h ago" },
  { id: "C-203", name: "Rhea Menon", company: "Kestrel Health", role: "COO", email: "rhea@kestrel.health", phone: "+91 88900 33211", ltv: 1200000, deals: 2, tier: "Enterprise", lastTouch: "4h ago" },
  { id: "C-204", name: "Ishaan Ghosh", company: "Northline Logistics", role: "CFO", email: "ishaan@northline.co", phone: "+91 90040 22110", ltv: 820000, deals: 1, tier: "Enterprise", lastTouch: "3d ago" },
  { id: "C-205", name: "Arjun Reddy", company: "Meridian Retail", role: "Head of Digital", email: "arjun@meridian.in", phone: "+91 98450 77123", ltv: 320000, deals: 1, tier: "Mid-market", lastTouch: "1d ago" },
  { id: "C-206", name: "Sneha Kapoor", company: "Verdant HR", role: "CEO", email: "sneha@verdant.hr", phone: "+91 97030 88110", ltv: 145000, deals: 1, tier: "SMB", lastTouch: "6h ago" },
  { id: "C-207", name: "Kabir Shah", company: "Halcyon Foods", role: "MD", email: "kabir@halcyon.in", phone: "+91 99870 44561", ltv: 90000, deals: 1, tier: "SMB", lastTouch: "3h ago" },
  { id: "C-208", name: "Vivaan Chopra", company: "Pinnacle Realty", role: "Director", email: "vivaan@pinnacle.re", phone: "+91 98290 55471", ltv: 380000, deals: 1, tier: "Mid-market", lastTouch: "1d ago" },
];

export const EMPLOYEES = [
  { id: "E-01", name: "Ananya Verma", role: "Head of Sales", team: "Revenue", status: "Active", perf: 94, tasks: 12, avatar: "AV" },
  { id: "E-02", name: "Vikram Rao", role: "AE", team: "Revenue", status: "Active", perf: 88, tasks: 9, avatar: "VR" },
  { id: "E-03", name: "Zoya Sheikh", role: "Head of Product", team: "Product", status: "Active", perf: 91, tasks: 7, avatar: "ZS" },
  { id: "E-04", name: "Kunal Sethi", role: "Staff Engineer", team: "Engineering", status: "Active", perf: 96, tasks: 14, avatar: "KS" },
  { id: "E-05", name: "Meera Iyer", role: "Design Lead", team: "Design", status: "Active", perf: 89, tasks: 6, avatar: "MI" },
  { id: "E-06", name: "Rohit Bansal", role: "Growth Marketer", team: "Marketing", status: "Active", perf: 82, tasks: 11, avatar: "RB" },
  { id: "E-07", name: "Nikita Joshi", role: "CS Manager", team: "CS", status: "Active", perf: 90, tasks: 8, avatar: "NJ" },
  { id: "E-08", name: "Aryan Deshpande", role: "SDR", team: "Revenue", status: "On leave", perf: 74, tasks: 4, avatar: "AD" },
];

export const PROJECTS = [
  { id: "P-11", name: "Libriofy v1.4 Launch", team: "Product", status: "On Track", progress: 72, dueDate: "2026-08-30", budget: 1200000, spent: 820000, owner: "Zoya" },
  { id: "P-12", name: "SwiftGrowth Enterprise Rollout", team: "Revenue", status: "At Risk", progress: 48, dueDate: "2026-09-15", budget: 800000, spent: 520000, owner: "Ananya" },
  { id: "P-13", name: "Synsfi Retail Vertical", team: "Product", status: "On Track", progress: 34, dueDate: "2026-10-10", budget: 1800000, spent: 610000, owner: "Kunal" },
  { id: "P-14", name: "Marketing Site Redesign", team: "Marketing", status: "On Track", progress: 88, dueDate: "2026-08-14", budget: 400000, spent: 340000, owner: "Meera" },
  { id: "P-15", name: "DPDP Compliance Audit", team: "Ops", status: "Blocked", progress: 22, dueDate: "2026-09-30", budget: 300000, spent: 90000, owner: "Nikita" },
];

export const PRODUCTS_LIST = [
  { name: "SwiftGrowth Digital", tier: "Enterprise", price: 60000, mrr: 184000, users: 42, churn: 1.2, delta: 12.4 },
  { name: "Libriofy", tier: "Pro", price: 12000, mrr: 96000, users: 218, churn: 2.4, delta: 22.1 },
  { name: "Synsfi", tier: "Retail", price: 8000, mrr: 58000, users: 74, churn: 3.1, delta: 8.6 },
];

export const AGREEMENTS = [
  { id: "AGR-118", title: "MSA — Acme Corp", counterparty: "Acme Corp", value: 2400000, status: "Awaiting signature", updated: "2h ago", owner: "Legal" },
  { id: "AGR-117", title: "NDA — Kestrel Health", counterparty: "Kestrel Health", value: 0, status: "Signed", updated: "1d ago", owner: "You" },
  { id: "AGR-116", title: "SOW — Bluewave Studios", counterparty: "Bluewave", value: 480000, status: "In review", updated: "3d ago", owner: "Legal" },
  { id: "AGR-115", title: "MSA — Northline Logistics", counterparty: "Northline", value: 1200000, status: "Signed", updated: "2w ago", owner: "You" },
  { id: "AGR-114", title: "Partner Agreement — Meridian", counterparty: "Meridian Retail", value: 320000, status: "Draft", updated: "3d ago", owner: "You" },
];

export const QUOTATIONS = [
  { id: "Q-2210", client: "Acme Corp", value: 840000, status: "Sent", validity: "2026-08-14", owner: "Ananya" },
  { id: "Q-2209", client: "Nexora Labs", value: 320000, status: "Accepted", validity: "2026-07-28", owner: "Vikram" },
  { id: "Q-2208", client: "Meridian Retail", value: 180000, status: "Sent", validity: "2026-08-10", owner: "Ananya" },
  { id: "Q-2207", client: "Halcyon Foods", value: 240000, status: "Draft", validity: "2026-08-20", owner: "Vikram" },
  { id: "Q-2206", client: "Verdant HR", value: 145000, status: "Rejected", validity: "2026-07-25", owner: "Ananya" },
];

export const CALLS = [
  { id: "CL-901", contact: "Rajat Malhotra", company: "Acme Corp", direction: "out", duration: "42m", outcome: "Interested", at: "Today · 11:20" },
  { id: "CL-900", contact: "Priya Nair", company: "Nexora Labs", direction: "in", duration: "18m", outcome: "Follow-up", at: "Today · 09:12" },
  { id: "CL-899", contact: "Rhea Menon", company: "Kestrel Health", direction: "out", duration: "27m", outcome: "Demo scheduled", at: "Yesterday" },
  { id: "CL-898", contact: "Arjun Reddy", company: "Meridian Retail", direction: "out", duration: "12m", outcome: "Voicemail", at: "Yesterday" },
  { id: "CL-897", contact: "Kabir Shah", company: "Halcyon Foods", direction: "in", duration: "9m", outcome: "Qualified", at: "2d ago" },
];

export const MEETINGS = [
  { id: "M-51", title: "Acme Corp — MSA review", attendees: ["Rajat", "Ananya", "Legal"], at: "Today · 16:00", duration: "45m", type: "External" },
  { id: "M-52", title: "Weekly Revenue standup", attendees: ["Ananya", "Vikram", "Aryan"], at: "Today · 17:30", duration: "30m", type: "Internal" },
  { id: "M-53", title: "Kestrel — Demo", attendees: ["Rhea", "Ananya"], at: "Tomorrow · 11:00", duration: "60m", type: "External" },
  { id: "M-54", title: "Product review — v1.4", attendees: ["Zoya", "Kunal", "Meera"], at: "Tomorrow · 15:00", duration: "60m", type: "Internal" },
];

export const EMAIL_CAMPAIGNS = [
  { id: "EC-14", name: "August Renewals Push", sent: 842, open: 62.4, click: 18.2, replies: 34, revenue: 1240000, status: "Sending" },
  { id: "EC-13", name: "SwiftGrowth Case Study Blast", sent: 1240, open: 48.1, click: 12.7, replies: 22, revenue: 720000, status: "Completed" },
  { id: "EC-12", name: "Libriofy Q3 Feature Digest", sent: 3410, open: 41.8, click: 9.4, replies: 12, revenue: 340000, status: "Completed" },
  { id: "EC-11", name: "Synsfi Retail Launch", sent: 620, open: 56.2, click: 16.1, replies: 18, revenue: 480000, status: "Scheduled" },
];

export const WHATSAPP_TEMPLATES = [
  { id: "WT-1", name: "Payment Reminder", uses: 128, cvr: 42, category: "Transactional" },
  { id: "WT-2", name: "Meeting Confirmation", uses: 96, cvr: 88, category: "Utility" },
  { id: "WT-3", name: "Feature Launch — Libriofy", uses: 3210, cvr: 12, category: "Marketing" },
  { id: "WT-4", name: "Feedback NPS", uses: 542, cvr: 34, category: "Utility" },
];

export const TASKS = [
  { id: "T-901", title: "Send revised MSA to Acme", owner: "Ananya", due: "Today", priority: "High", status: "In Progress", project: "SwiftGrowth Enterprise" },
  { id: "T-902", title: "Ship checkout redesign (Libriofy)", owner: "Kunal", due: "Today", priority: "High", status: "In Progress", project: "Libriofy v1.4" },
  { id: "T-903", title: "Publish August renewals email", owner: "Rohit", due: "Today", priority: "Medium", status: "Todo", project: "Marketing Site Redesign" },
  { id: "T-904", title: "Review Q3 marketing spend", owner: "You", due: "Tomorrow", priority: "Medium", status: "Todo", project: "—" },
  { id: "T-905", title: "Prep DPDP audit checklist", owner: "Nikita", due: "Aug 05", priority: "High", status: "Blocked", project: "DPDP Compliance" },
  { id: "T-906", title: "1:1 with engineering leads", owner: "You", due: "Tomorrow", priority: "Low", status: "Todo", project: "—" },
  { id: "T-907", title: "Draft Kestrel proposal v2", owner: "Vikram", due: "Aug 06", priority: "High", status: "In Progress", project: "—" },
  { id: "T-908", title: "Onboard Northline (Won)", owner: "Nikita", due: "Aug 07", priority: "Medium", status: "Todo", project: "—" },
  { id: "T-909", title: "Weekly ops review", owner: "You", due: "Aug 09", priority: "Low", status: "Done", project: "—" },
];

export const ACTIVITY_FEED = [
  { at: "2m ago", who: "Rajat Malhotra", type: "email", text: "Replied to proposal — 'Legal reviewing v3'" },
  { at: "12m ago", who: "Ananya", type: "stage", text: "Moved Pinnacle Realty to Negotiation" },
  { at: "1h ago", who: "System", type: "paid", text: "Invoice INV-2043 paid — ₹2.12L" },
  { at: "2h ago", who: "AI", type: "insight", text: "Hot signal: Acme opened proposal 4× in 48h" },
  { at: "3h ago", who: "Kabir Shah", type: "call", text: "Inbound call · 9 min · Qualified" },
  { at: "4h ago", who: "Rohit", type: "campaign", text: "Started August Renewals Push campaign" },
  { at: "5h ago", who: "Kunal", type: "commit", text: "Merged checkout redesign PR #482" },
  { at: "6h ago", who: "Meera", type: "design", text: "Shipped landing page v3 mocks" },
];

export const HABIT_LOG = [
  { habit: "Deep work · 4h", streak: 12, week: [1,1,1,1,1,0,1] },
  { habit: "Sales calls · 6", streak: 5, week: [1,1,0,1,1,1,1] },
  { habit: "Exercise · 45m", streak: 8, week: [1,0,1,1,1,1,0] },
  { habit: "Sleep · 7h", streak: 21, week: [1,1,1,1,1,1,1] },
  { habit: "Reading · 30m", streak: 3, week: [1,0,0,1,1,1,0] },
];

export const CASH_FLOW = [
  { month: "Feb", inflow: 184, outflow: 92 },
  { month: "Mar", inflow: 212, outflow: 98 },
  { month: "Apr", inflow: 248, outflow: 104 },
  { month: "May", inflow: 231, outflow: 108 },
  { month: "Jun", inflow: 289, outflow: 112 },
  { month: "Jul", inflow: 342, outflow: 118 },
  { month: "Aug", inflow: 378, outflow: 124 },
];

export const EXPENSE_BREAKDOWN = [
  { category: "Salaries", value: 62 },
  { category: "Cloud/Infra", value: 12 },
  { category: "Marketing", value: 14 },
  { category: "Ops", value: 7 },
  { category: "Legal/Compliance", value: 5 },
];

export const FORECAST_12M = Array.from({ length: 12 }).map((_, i) => {
  const base = 378 + i * 34 + (i % 3 === 0 ? 12 : 0);
  return { month: ["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul"][i], revenue: base, profit: Math.round(base * 0.28), best: base * 1.14, worst: base * 0.82 };
});

export const AI_RECS = [
  { title: "Push renewals this week", impact: "+₹12.4L", confidence: 82, why: "82% of renewals close in the last 10 days of the month. 6 renewals still open." },
  { title: "Reduce cloud spend on staging", impact: "-₹68k/mo", confidence: 91, why: "Staging cluster idle >70% of the time — right-size or schedule down." },
  { title: "Hire 1 SDR for outbound", impact: "+18% pipeline", confidence: 74, why: "Inbound saturating at 42 MQL/mo. Outbound cohort ROI = 4.2×." },
  { title: "Retire Synsfi Free tier", impact: "-2.1% churn drag", confidence: 68, why: "Free-tier accounts convert at 3.4%. Reallocating support hours saves 32h/mo." },
];

export const RISKS = [
  { title: "Concentration risk", severity: "High", detail: "Top 3 clients = 48% of MRR. Diversify with mid-market bookings." },
  { title: "Bluewave — payment overdue", severity: "Medium", detail: "INV-2042 · 6 days late. Auto-reminder sent." },
  { title: "Automation health -6 pts", severity: "Medium", detail: "3 workflows failed silently. Review sync jobs." },
  { title: "Aryan (SDR) on leave", severity: "Low", detail: "Outbound cadence down 22% this week." },
];

export const MISSED_OPPS = [
  { title: "Cascade Ventures — budget-cut Lost", cost: 90000, why: "No follow-up in Q3. Nurture cohort has 22% reopen rate.", action: "Add to Q4 nurture." },
  { title: "Verdant HR — cold since Jul 12", cost: 145000, why: "Assigned but no touch in 12 days. AI drafted a 3-step sequence.", action: "Send drafted sequence." },
  { title: "Halcyon Foods — no BANT", cost: 240000, why: "Cold outbound stalled at Stage 1.", action: "Assign SDR for qualification." },
];

export const CHURN_RISK = [
  { client: "Bluewave Studios", product: "Libriofy Team", risk: 78, reason: "3× tickets in 30d, payment 6d late" },
  { client: "Meridian Retail", product: "Synsfi Retail", risk: 42, reason: "Usage down 24% this month" },
  { client: "Verdant HR", product: "Libriofy Starter", risk: 34, reason: "Only 1 active user" },
  { client: "Pinnacle Realty", product: "Synsfi Pro", risk: 61, reason: "No exec sponsor engagement" },
];

// 7×24 activity heatmap (Sun→Sat, 0→23)
export const HEATMAP = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const workHour = h >= 9 && h <= 19;
    const weekend = d === 0 || d === 6;
    const base = workHour ? 60 : 8;
    const noise = (d * 3 + h * 7) % 25;
    return { day: d, hour: h, value: Math.min(100, Math.max(0, base + noise - (weekend ? 22 : 0))) };
  })
);

export const NOTIFICATIONS_FULL = [
  { id: "N-1", icon: "signed", title: "Agreement signed", detail: "Acme Corp — Annual retainer", time: "12m ago", unread: true },
  { id: "N-2", icon: "paid", title: "Invoice paid", detail: "INV-2043 · ₹2.12L received", time: "1h ago", unread: true },
  { id: "N-3", icon: "hot", title: "Hot lead", detail: "Nexora Labs opened proposal 4×", time: "2h ago", unread: true },
  { id: "N-4", icon: "bug", title: "Bug reported", detail: "Libriofy — checkout page slow", time: "3h ago", unread: false },
  { id: "N-5", icon: "overdue", title: "Payment overdue", detail: "INV-2042 · ₹42k, 6 days late", time: "5h ago", unread: false },
  { id: "N-6", icon: "insight", title: "AI insight", detail: "Concentration risk rising — top 3 clients = 48% MRR", time: "6h ago", unread: false },
  { id: "N-7", icon: "task", title: "Task assigned", detail: "Prep DPDP audit checklist — Nikita", time: "1d ago", unread: false },
];

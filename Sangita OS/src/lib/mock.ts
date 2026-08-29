// Deterministic mock data for the CEO dashboard and modules.

export const REVENUE_TREND = [
  { month: "Feb", revenue: 184000, target: 200000, expenses: 92000 },
  { month: "Mar", revenue: 212000, target: 220000, expenses: 98000 },
  { month: "Apr", revenue: 248000, target: 240000, expenses: 104000 },
  { month: "May", revenue: 231000, target: 260000, expenses: 108000 },
  { month: "Jun", revenue: 289000, target: 280000, expenses: 112000 },
  { month: "Jul", revenue: 342000, target: 320000, expenses: 118000 },
  { month: "Aug", revenue: 378000, target: 360000, expenses: 124000 },
];

export const HEALTH = [
  { area: "Sales", score: 88 },
  { area: "Marketing", score: 74 },
  { area: "Development", score: 92 },
  { area: "Finance", score: 81 },
  { area: "Customer Success", score: 86 },
  { area: "Product", score: 79 },
  { area: "Operations", score: 71 },
  { area: "Automation", score: 68 },
];

export const PIPELINE = [
  { stage: "New", count: 42, value: 620000 },
  { stage: "Qualified", count: 28, value: 980000 },
  { stage: "Proposal", count: 14, value: 1240000 },
  { stage: "Negotiation", count: 7, value: 890000 },
  { stage: "Won", count: 5, value: 720000 },
];

export const PRIORITIES = [
  { id: 1, title: "Close Acme Corp — SwiftGrowth annual", impact: "₹8.4L", due: "Today", owner: "Sales", level: "high" as const },
  { id: 2, title: "Ship Libriofy v1.3 checkout redesign", impact: "+18% CVR", due: "Today", owner: "Product", level: "high" as const },
  { id: 3, title: "Follow-up: Nexora Labs proposal", impact: "₹3.2L", due: "Today", owner: "Sales", level: "med" as const },
  { id: 4, title: "Review Q3 marketing spend allocation", impact: "Efficiency", due: "Tomorrow", owner: "Marketing", level: "med" as const },
  { id: 5, title: "1:1 with engineering leads", impact: "Team health", due: "Tomorrow", owner: "You", level: "low" as const },
];

export const AI_SUGGESTIONS = [
  { title: "Revenue on track to beat target", body: "August is pacing +5.3% over target. Push Libriofy renewals this week to lock the quarter." },
  { title: "Automation health slipping", body: "Ops automation score dropped 6 pts — 3 workflows failed silently last week. Review the sync jobs." },
  { title: "Hot lead identified", body: "Acme Corp opened your proposal 4 times in 48h. Recommend a same-day follow-up call." },
];

export const PRODUCTS = [
  { name: "SwiftGrowthDigital", mrr: 184000, users: 42, delta: 12.4 },
  { name: "Libriofy", mrr: 96000, users: 218, delta: 22.1 },
  { name: "Synsfi", mrr: 58000, users: 74, delta: 8.6 },
];

export const NOTIFICATIONS = [
  { icon: "signed", title: "Agreement signed", detail: "Acme Corp — Annual retainer", time: "12m ago" },
  { icon: "paid", title: "Invoice paid", detail: "INV-2043 · ₹1.8L received", time: "1h ago" },
  { icon: "hot", title: "Hot lead", detail: "Nexora Labs opened proposal 4×", time: "2h ago" },
  { icon: "bug", title: "Bug reported", detail: "Libriofy — checkout page slow", time: "3h ago" },
  { icon: "overdue", title: "Payment overdue", detail: "INV-2019 · ₹42k, 5 days late", time: "5h ago" },
];

export const inr = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(1)}Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : `₹${(n / 1000).toFixed(0)}k`;
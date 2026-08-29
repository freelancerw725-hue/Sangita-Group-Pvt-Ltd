import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok } from './helpers.js'
import { getCampaignAnalytics, getDailyStatistics, getMonthlyStatistics, getDashboardAnalytics } from '../services/analytics.service.js'
import { listSentEmails, getLeadEmailHistory } from '../services/email-history.service.js'
import { getEventsByEmailId, getEventsByCampaignId } from '../services/email-events.service.js'

const router = Router()

// Campaign analytics
router.get('/analytics/campaigns/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: { message: 'Invalid campaign id' } })
  const analytics = getCampaignAnalytics(id)
  if (!analytics) return res.status(404).json({ error: { message: 'Campaign not found' } })
  ok(res, analytics)
}))

// Daily statistics
router.get('/analytics/daily', asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30
  ok(res, getDailyStatistics(days))
}))

// Monthly statistics
router.get('/analytics/monthly', asyncHandler(async (req, res) => {
  const { year, month, from, to } = req.query
  ok(res, getMonthlyStatistics({
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
    from: from || undefined,
    to: to || undefined,
  }))
}))

// Dashboard analytics (replaces mock data)
router.get('/analytics/dashboard', asyncHandler(async (req, res) => {
  ok(res, getDashboardAnalytics())
}))

// Sent email history
router.get('/email-history', asyncHandler(async (req, res) => {
  const { campaignId, leadId, status, from, to, page, pageSize } = req.query
  ok(res, listSentEmails({
    campaignId: campaignId ? Number(campaignId) : undefined,
    leadId: leadId ? Number(leadId) : undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 50,
  }))
}))

// Lead email history
router.get('/leads/:id/email-history', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: { message: 'Invalid lead id' } })
  ok(res, getLeadEmailHistory(id))
}))

// Email events
router.get('/emails/:id/events', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: { message: 'Invalid email id' } })
  ok(res, getEventsByEmailId(id))
}))

// Campaign events
router.get('/campaigns/:id/events', asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: { message: 'Invalid campaign id' } })
  ok(res, getEventsByCampaignId(id))
}))

export default router

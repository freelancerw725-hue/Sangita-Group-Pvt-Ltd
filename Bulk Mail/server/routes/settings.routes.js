import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { ok, validate } from './helpers.js'
import {
  senderProfileSchema,
  senderProfileUpdateSchema,
  brandFooterSchema,
  brandFooterUpdateSchema,
  smtpTestConnectionSchema,
  outreachDefaultsSchema,
  outreachDefaultsUpdateSchema,
  notificationSettingsSchema,
  notificationSettingsUpdateSchema,
} from '../validation/schemas.js'
import * as settings from '../services/settings.service.js'

const router = Router()

// ---- Sender Profile ----
router.get('/settings/sender', asyncHandler(async (req, res) => {
  ok(res, await settings.getSenderProfile())
}))

router.put('/settings/sender', validate(senderProfileUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, await settings.updateSenderProfile(req.validatedBody))
}))

// ---- Brand Footer ----
router.get('/settings/footer', asyncHandler(async (req, res) => {
  ok(res, await settings.getBrandFooter())
}))

router.put('/settings/footer', validate(brandFooterUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, await settings.updateBrandFooter(req.validatedBody))
}))

// ---- SMTP Settings ----
router.get('/settings/smtp', asyncHandler(async (req, res) => {
  ok(res, await settings.getSMTPSettings())
}))

// ---- SMTP Test Connection ----
router.post('/settings/smtp/test', validate(smtpTestConnectionSchema), asyncHandler(async (req, res) => {
  ok(res, await settings.testSMTPConnection(req.validatedBody))
}))

// ---- Outreach Defaults ----
router.get('/settings/outreach', asyncHandler(async (req, res) => {
  ok(res, await settings.getOutreachDefaults())
}))

router.put('/settings/outreach', validate(outreachDefaultsUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, await settings.updateOutreachDefaults(req.validatedBody))
}))

// ---- Notification Settings ----
router.get('/settings/notifications', asyncHandler(async (req, res) => {
  ok(res, await settings.getNotificationSettings())
}))

router.put('/settings/notifications', validate(notificationSettingsUpdateSchema), asyncHandler(async (req, res) => {
  ok(res, await settings.updateNotificationSettings(req.validatedBody))
}))

export default router
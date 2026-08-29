import { z } from 'zod'

const email = z.string().trim().toLowerCase().email('Invalid email address').max(254)
const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal('')).transform((v) => (v === '' ? null : v))

export const LEAD_STATUSES = ['new', 'contacted', 'replied', 'interested', 'customer', 'blocked', 'never_contacted']

export const leadCreateSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(200),
  contact: optionalText(200),
  email,
  status: z.enum(LEAD_STATUSES).default('new'),
  batchId: z.coerce.number().int().positive().nullable().optional(),
  notes: optionalText(2000),
})

export const leadUpdateSchema = z.object({
  company: z.string().trim().min(1).max(200).optional(),
  contact: optionalText(200),
  email: email.optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  batchId: z.coerce.number().int().positive().nullable().optional(),
  notes: optionalText(2000),
})

export const leadListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().max(40).optional(),
  batch: z.string().trim().max(200).optional(),
  outreach: z.enum(['all', 'contacted', 'never']).default('all'),
  sent: z.enum(['all', 'sent', 'not_sent']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['id', 'company', 'last_email_sent_at', 'created_at']).default('id'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export const bulkDeleteSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, 'Provide at least one id').max(500),
})

export const templateCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  category: z.enum(['Initial Outreach', 'Followup 1', 'Followup 2', 'Proposal', 'Meeting Reminder']),
  subject: z.string().trim().max(300).default(''),
  body: z.string().max(50000).default(''),
})

export const templateUpdateSchema = templateCreateSchema.partial()

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').max(200),
  templateId: z.coerce.number().int().positive(),
  senderAccountId: z.coerce.number().int().positive().nullable().optional(),
  audience: z.object({
    type: z.enum(['manual', 'batch', 'all']),
    batchId: z.coerce.number().int().positive().nullable().optional(),
    leadIds: z.array(z.coerce.number().int().positive()).max(10000).optional(),
  }),
  dailyLimit: z.coerce.number().int().min(1).max(2000).default(200),
  delaySeconds: z.coerce.number().int().min(0).max(3600).default(45),
  status: z.enum(['draft', 'active', 'running', 'paused', 'completed', 'cancelled']).default('active'),
})

export const campaignUpdateSchema = campaignCreateSchema.partial().extend({
  audience: campaignCreateSchema.shape.audience.optional(),
})

export const campaignStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'running', 'paused', 'completed', 'cancelled']),
})

export const campaignActionSchema = z.object({
  senderAccountId: z.coerce.number().int().positive().nullable().optional(),
})

export const recipientsSchema = z.object({
  leadIds: z.array(z.coerce.number().int().positive()).max(10000),
})

export const blockedCreateSchema = z.object({
  email,
  company: optionalText(200),
  reason: z.enum(['Asked Not To Contact', 'Bounced', 'Spam Complaint', 'Invalid Email', 'Competitor', 'Other']).default('Other'),
  notes: optionalText(2000),
})

export const batchCreateSchema = z.object({
  name: z.string().trim().min(1, 'Batch name is required').max(200),
  source: z.enum(['CSV Import', 'Sheet Sync', 'Manual entry']).default('CSV Import'),
  notes: optionalText(2000),
})

export const batchUpdateSchema = batchCreateSchema.partial()

export const importCsvSchema = z.object({
  csv: z.string().min(1, 'CSV content is required').max(5 * 1024 * 1024),
  batchId: z.coerce.number().int().positive().nullable().optional(),
})

const senderEmail = z.string().trim().toLowerCase().email('Invalid email address').max(254)
const smtpPort = z.coerce.number().int().min(1, 'SMTP port must be between 1 and 65535').max(65535)
const limitValue = z.coerce.number().int().min(1).max(5000)

export const senderSecurityModes = ['none', 'tls', 'ssl']

export const senderCreateSchema = z.object({
  name: z.string().trim().min(1, 'Sender name is required').max(200),
  email: senderEmail,
  smtpHost: z.string().trim().min(1, 'SMTP host is required').max(255),
  smtpPort,
  username: z.string().trim().min(1, 'SMTP username is required').max(255),
  password: z.string().min(1, 'SMTP password is required').max(5000),
  securityMode: z.enum(senderSecurityModes).default('tls'),
  dailyLimit: limitValue.default(200),
  hourlyLimit: limitValue.default(50),
  enabled: z.coerce.boolean().default(true),
})

export const senderUpdateSchema = senderCreateSchema.partial().extend({
  password: z.string().min(1).max(5000).optional(),
})

export const senderStatusSchema = z.object({
  enabled: z.coerce.boolean(),
})

export const senderTestConnectionSchema = z.object({
  timeoutMs: z.coerce.number().int().min(1000).max(30000).default(10000),
})

export const senderTestEmailSchema = z.object({
  recipient: senderEmail,
  subject: z.string().trim().min(1, 'Subject is required').max(300),
  body: z.string().min(1, 'Body is required').max(100000),
})

/** Format a zod error into { fields: { name: message } } */
export function formatZodError(err) {
  const fields = {}
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_'
    if (!fields[key]) fields[key] = issue.message
  }
  return fields
}

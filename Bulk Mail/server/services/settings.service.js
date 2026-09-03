import { db, transaction } from '../db/connection.js'

function rowToSenderProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    username: row.username,
    businessName: row.business_name,
    fromEmail: row.from_email,
    replyToEmail: row.reply_to_email,
    emailSignature: row.email_signature,
    securityMode: row.security_mode,
    dailyLimit: row.daily_limit,
    hourlyLimit: row.hourly_limit,
    enabled: !!row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToBrandFooter(row) {
  if (!row) return null
  let settings = {}
  try {
    settings = JSON.parse(row.settings_json)
  } catch {
    settings = {}
  }
  return {
    id: row.id,
    providerName: row.provider_name,
    website: settings.website || '',
    unsubscribeText: settings.unsubscribe_text || '',
    footerEnabled: settings.footer_enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToOutreachDefaults(row) {
  if (!row) return null
  let settings = {}
  try {
    settings = JSON.parse(row.settings_json)
  } catch {
    settings = {}
  }
  return {
    id: row.id,
    providerName: row.provider_name,
    followup1Days: settings.followup_1_days !== undefined ? settings.followup_1_days : 3,
    followup2Days: settings.followup_2_days !== undefined ? settings.followup_2_days : 7,
    sendWindowStart: settings.send_window_start || '09:00',
    sendWindowEnd: settings.send_window_end || '19:00',
    workingDays: settings.working_days || 'Mon-Sat',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToNotificationSettings(row) {
  if (!row) return null
  let settings = {}
  try {
    settings = JSON.parse(row.settings_json)
  } catch {
    settings = {}
  }
  return {
    id: row.id,
    providerName: row.provider_name,
    newReplies: settings.new_replies !== false,
    interestedLeads: settings.interested_leads !== false,
    campaignCompleted: settings.campaign_completed !== false,
    bounceAlerts: settings.bounce_alerts !== false,
    dailySummary: settings.daily_summary !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function ensureProviderSettings() {
  let setting = db.prepare('SELECT * FROM email_provider_settings WHERE enabled = 1 ORDER BY id DESC LIMIT 1').get()
  if (!setting) {
    const id = db.prepare(
      `INSERT INTO email_provider_settings (provider_name, settings_json, enabled) VALUES (?, '{}', 1)`
    ).run('smtp').lastInsertRowid
    setting = { id, provider_name: 'smtp', settings_json: '{}', enabled: 1 }
  }
  return setting
}

function getSenderProfile(preferredId = null) {
  if (preferredId) return rowToSenderProfile(db.prepare('SELECT * FROM sender_accounts WHERE id = ?').get(preferredId))
  const sender = db.prepare('SELECT * FROM sender_accounts WHERE enabled = 1 ORDER BY id LIMIT 1').get()
  if (sender) return rowToSenderProfile(sender)
  return null
}

function updateSenderProfile(input) {
  return transaction(() => {
    const existing = getSenderProfile()
    if (!existing) {
      // Create new sender account if none exists
      const result = db.prepare(
        `INSERT INTO sender_accounts (name, email, smtp_host, smtp_port, username, business_name, from_email, reply_to_email, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(input.name || '', input.email || '', input.smtpHost || 'smtp.gmail.com', input.smtpPort || 587, input.username || '', input.businessName || '', input.fromEmail || '', input.replyToEmail || '')
      return rowToSenderProfile({ id: result.lastInsertRowid, ...input })
    }
    // Build dynamic update with ? placeholders
    const setItems = []
    const params = []

    if (input.name !== undefined) {
      setItems.push('name = ?')
      params.push(input.name)
    }
    if (input.email !== undefined) {
      setItems.push('email = ?')
      params.push(input.email)
    }
    if (input.smtpHost !== undefined) {
      setItems.push('smtp_host = ?')
      params.push(input.smtpHost)
    }
    if (input.smtpPort !== undefined) {
      setItems.push('smtp_port = ?')
      params.push(input.smtpPort)
    }
    if (input.username !== undefined) {
      setItems.push('username = ?')
      params.push(input.username)
    }
    if (input.securityMode !== undefined) {
      setItems.push('security_mode = ?')
      params.push(input.securityMode)
    }
    if (input.dailyLimit !== undefined) {
      setItems.push('daily_limit = ?')
      params.push(input.dailyLimit)
    }
    if (input.hourlyLimit !== undefined) {
      setItems.push('hourly_limit = ?')
      params.push(input.hourlyLimit)
    }
    if (input.enabled !== undefined) {
      setItems.push('enabled = ?')
      params.push(input.enabled ? 1 : 0)
    }
    if (input.businessName !== undefined) {
      setItems.push('business_name = ?')
      params.push(input.businessName)
    }
    if (input.fromEmail !== undefined) {
      setItems.push('from_email = ?')
      params.push(input.fromEmail)
    }
    if (input.replyToEmail !== undefined) {
      setItems.push('reply_to_email = ?')
      params.push(input.replyToEmail)
    }
    if (input.emailSignature !== undefined) {
      setItems.push('email_signature = ?')
      params.push(input.emailSignature)
    }

    setItems.push('updated_at = datetime(?)')
    params.push('now')
    params.push(existing.id)

    const sql = `UPDATE sender_accounts SET ${setItems.join(', ')} WHERE id = ?`
    db.prepare(sql).run(...params)

    return rowToSenderProfile(getSenderProfile(existing.id))
  })
}

function getBrandFooter() {
  const setting = ensureProviderSettings()
  return rowToBrandFooter(setting)
}

function updateBrandFooter(input) {
  return transaction(() => {
    const setting = ensureProviderSettings()
    let settings = {}
    try {
      settings = JSON.parse(setting.settings_json)
    } catch {
      settings = {}
    }
    if (input.website !== undefined) settings.website = input.website
    if (input.unsubscribeText !== undefined) settings.unsubscribe_text = input.unsubscribeText
    if (input.footerEnabled !== undefined) settings.footer_enabled = input.footerEnabled

    db.prepare(
      `UPDATE email_provider_settings SET settings_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(settings), setting.id)

    return rowToBrandFooter(ensureProviderSettings())
  })
}

function getSMTPSettings() {
  const sender = getSenderProfile()
  return {
    id: sender.id,
    smtpHost: sender.smtpHost,
    smtpPort: sender.smtpPort,
    username: sender.username,
    securityMode: sender.securityMode,
  }
}

function testSMTPConnection(input) {
  const sender = getSenderProfile()
  const { timeoutMs = 10000 } = input

  try {
    const { SMTPEmailProvider } = require('../providers/smtp-provider.js')
    const provider = new SMTPEmailProvider(sender, { timeoutMs })
    provider.verifyConnection()
    db.prepare(
      `UPDATE sender_accounts
       SET last_tested_at = datetime('now'), last_test_status = 'success', last_test_error = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(sender.id)
    return { ok: true, sender: getSenderProfile(sender.id) }
  } catch (error) {
    db.prepare(
      `UPDATE sender_accounts
       SET last_tested_at = datetime('now'), last_test_status = 'failed', last_test_error = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(error.message || 'SMTP connection test failed', sender.id)
    return { ok: false, error: error.message || 'SMTP connection test failed' }
  }
}

function getOutreachDefaults() {
  const setting = ensureProviderSettings()
  return rowToOutreachDefaults(setting)
}

function updateOutreachDefaults(input) {
  return transaction(() => {
    const setting = ensureProviderSettings()
    let settings = {}
    try {
      settings = JSON.parse(setting.settings_json)
    } catch {
      settings = {}
    }
    if (input.followup1Days !== undefined) settings.followup_1_days = input.followup1Days
    if (input.followup2Days !== undefined) settings.followup_2_days = input.followup2Days
    if (input.sendWindowStart !== undefined) settings.send_window_start = input.sendWindowStart
    if (input.sendWindowEnd !== undefined) settings.send_window_end = input.sendWindowEnd
    if (input.workingDays !== undefined) settings.working_days = input.workingDays

    db.prepare(
      `UPDATE email_provider_settings SET settings_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(settings), setting.id)

    return rowToOutreachDefaults(ensureProviderSettings())
  })
}

function getNotificationSettings() {
  const setting = ensureProviderSettings()
  return rowToNotificationSettings(setting)
}

function updateNotificationSettings(input) {
  return transaction(() => {
    const setting = ensureProviderSettings()
    let settings = {}
    try {
      settings = JSON.parse(setting.settings_json)
    } catch {
      settings = {}
    }
    if (input.newReplies !== undefined) settings.new_replies = input.newReplies
    if (input.interestedLeads !== undefined) settings.interested_leads = input.interestedLeads
    if (input.campaignCompleted !== undefined) settings.campaign_completed = input.campaignCompleted
    if (input.bounceAlerts !== undefined) settings.bounce_alerts = input.bounceAlerts
    if (input.dailySummary !== undefined) settings.daily_summary = input.dailySummary

    db.prepare(
      `UPDATE email_provider_settings SET settings_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(settings), setting.id)

    return rowToNotificationSettings(ensureProviderSettings())
  })
}

export { getSenderProfile, updateSenderProfile, getBrandFooter, updateBrandFooter, getSMTPSettings, testSMTPConnection, getOutreachDefaults, updateOutreachDefaults, getNotificationSettings, updateNotificationSettings }
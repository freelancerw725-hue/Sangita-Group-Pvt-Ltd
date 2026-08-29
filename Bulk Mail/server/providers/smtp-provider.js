import nodemailer from 'nodemailer'
import { EmailProvider } from './email-provider.js'
import { badGateway } from '../lib/errors.js'

function buildTransportOptions(sender) {
  const secure = sender.security_mode === 'ssl'
  return {
    host: sender.smtp_host,
    port: sender.smtp_port,
    secure,
    requireTLS: sender.security_mode === 'tls',
    auth: {
      user: sender.username,
      pass: sender.password_secret,
    },
    tls: sender.security_mode === 'none'
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true },
  }
}

export class SMTPEmailProvider extends EmailProvider {
  constructor(sender, options = {}) {
    super()
    this.sender = sender
    this.transportFactory = options.transportFactory || nodemailer.createTransport
    this.connectionTimeout = options.timeoutMs
  }

  connect() {
    return this.transportFactory({
      ...buildTransportOptions(this.sender),
      connectionTimeout: this.connectionTimeout || 10000,
      greetingTimeout: this.connectionTimeout || 10000,
      socketTimeout: this.connectionTimeout || 10000,
    })
  }

  async verifyConnection() {
    try {
      const transport = this.connect()
      await transport.verify()
      return { ok: true }
    } catch (error) {
      throw badGateway('SMTP connection verification failed', {
        message: error.message,
        code: error.code,
        command: error.command,
      })
    }
  }

  async sendEmail({ fromName, to, subject, html, text, replyTo }) {
    const transport = this.connect()
    try {
      const info = await transport.sendMail({
        from: fromName ? `${fromName} <${this.sender.email}>` : this.sender.email,
        to,
        subject,
        html,
        text,
        replyTo,
      })
      return {
        ok: true,
        messageId: info.messageId || info.response || null,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        response: info.response || null,
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
        },
      }
    }
  }
}

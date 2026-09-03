import { db } from '../server/db/connection.js'

db.prepare(
  "UPDATE sender_accounts SET name = 'SwiftGrowthDigital', email = 'hello@swiftgrowthdigital.com', business_name = 'SwiftGrowth Digital', from_email = 'hello@swiftgrowthdigital.com', reply_to_email = 'sonu@swiftgrowthdigital.com', email_signature = 'Thanks & Regards,\nSonu\nSwiftGrowthDigital\n+91 98765 43210', smtp_host = 'smtp.gmail.com', smtp_port = 587, username = 'hello@swiftgrowthdigital.com', security_mode = 'tls', daily_limit = 200, hourly_limit = 50, enabled = 1, updated_at = datetime('now') WHERE id = 1"
).run()

db.prepare(
  "UPDATE email_provider_settings SET settings_json = '{}', updated_at = datetime('now') WHERE id = 1"
).run()

console.log('Database reset complete')
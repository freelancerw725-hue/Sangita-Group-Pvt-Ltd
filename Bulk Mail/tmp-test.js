import { db } from './server/db/connection.js';
import settings from './server/services/settings.service.js';

// Reset DB
db.prepare("UPDATE sender_accounts SET name = 'SwiftGrowthDigital', email = 'hello@swiftgrowthdigital.com', business_name = 'SwiftGrowth Digital', from_email = 'hello@swiftgrowthdigital.com', reply_to_email = 'sonu@swiftgrowthdigital.com', email_signature = 'Thanks & Regards,\nSonu\nSwiftGrowthDigital\n+91 98765 43210', smtp_host = 'smtp.gmail.com', smtp_port = 587, username = 'hello@swiftgrowthdigital.com', security_mode = 'tls', daily_limit = 200, hourly_limit = 50, enabled = 1, updated_at = datetime('now') WHERE id = 1").run();
db.prepare("UPDATE email_provider_settings SET settings_json = '{}', updated_at = datetime('now') WHERE id = 1").run();

let persistOk, fbOk, defOk, notOk;

// Test 1: Get all settings
console.log("=== Test 1: Get All Settings ===");
const profile = settings.getSenderProfile();
console.log("Sender Profile email:", profile.email);
const footer = settings.getBrandFooter();
console.log("Brand Footer website:", footer.website);
const smtp = settings.getSMTPSettings();
console.log("SMTP Settings host:", smtp.smtpHost);
const defaults = settings.getOutreachDefaults();
console.log("Outreach Defaults followup1:", defaults.followup1Days);
const notifs = settings.getNotificationSettings();
console.log("Notification newReplies:", notifs.newReplies);
console.log("Test 1 PASSED");

// Test 2: Update Sender Profile and verify persistence
console.log("\n=== Test 2: Update Sender Profile ===");
settings.updateSenderProfile({
  name: "TestUpdated",
  businessName: "Test Business",
  fromEmail: "from@test.com",
  replyToEmail: "reply@test.com",
  emailSignature: "New Signature\nTest"
});
const updated = settings.getSenderProfile();
console.log("After update - name:", updated.name);
console.log("After update - businessName:", updated.businessName);
console.log("After update - fromEmail:", updated.fromEmail);
console.log("After update - replyToEmail:", updated.replyToEmail);
const direct = db.prepare("SELECT * FROM sender_accounts WHERE id = 1").get();
persistOk = updated.name === "TestUpdated" && updated.businessName === "Test Business" && updated.fromEmail === "from@test.com" && updated.replyToEmail === "reply@test.com" && direct.from_email === "from@test.com" && direct.business_name === "Test Business";
console.log("DB direct - from_email:", direct.from_email);
console.log("DB direct - business_name:", direct.business_name);
console.log(persistOk ? "PERSISTENCE VERIFIED" : "PERSISTENCE FAILED");

// Reset sender
settings.updateSenderProfile({
  name: "SwiftGrowthDigital",
  businessName: "SwiftGrowth Digital",
  fromEmail: "hello@swiftgrowthdigital.com",
  replyToEmail: "sonu@swiftgrowthdigital.com",
  emailSignature: "Thanks & Regards,\nSonu\nSwiftGrowthDigital\n+91 98765 43210"
});
console.log("Sender reset complete");
console.log("Test 2 " + (persistOk ? "PASSED" : "FAILED"));

// Test 3: Brand Footer
console.log("\n=== Test 3: Brand Footer ===");
settings.updateBrandFooter({
  website: "https://example.com",
  unsubscribeText: "Reply NO to unsubscribe",
  footerEnabled: true
});
const fb = settings.getBrandFooter();
console.log("Footer website:", fb.website);
console.log("Footer unsubscribeText:", fb.unsubscribeText);
const fbDirect = db.prepare("SELECT * FROM email_provider_settings WHERE id = 1").get();
fbParsed = JSON.parse(fbDirect.settings_json);
fbOk = fb.website === "https://example.com" && fbParsed.website === "https://example.com";
console.log("PERSISTENCE " + (fbOk ? "VERIFIED" : "FAILED"));

// Reset footer
settings.updateBrandFooter({
  website: "",
  unsubscribeText: "",
  footerEnabled: true
});
console.log("Footer reset complete");
console.log("Test 3 " + (fbOk ? "PASSED" : "FAILED"));

// Test 4: Outreach Defaults
console.log("\n=== Test 4: Outreach Defaults ===");
settings.updateOutreachDefaults({
  followup1Days: 5,
  followup2Days: 14,
  sendWindowStart: "08:00",
  sendWindowEnd: "20:00",
  workingDays: "Mon-Fri"
});
const defaults2 = settings.getOutreachDefaults();
defDirect = db.prepare("SELECT * FROM email_provider_settings WHERE id = 1").get();
defParsed = JSON.parse(defDirect.settings_json);
defOk = defaults2.followup1Days === 5 && defaults2.followup2Days === 14 && defParsed.followup_1_days === 5;
console.log("followup1Days:", defaults2.followup1Days, "followup2Days:", defaults2.followup2Days);
console.log("DB followup_1_days:", defParsed.followup_1_days);
console.log(defOk ? "PERSISTENCE VERIFIED" : "PERSISTENCE FAILED");

// Reset outreach
settings.updateOutreachDefaults({
  followup1Days: 3,
  followup2Days: 7,
  sendWindowStart: "09:00",
  sendWindowEnd: "19:00",
  workingDays: "Mon-Sat"
});
console.log("Outreach reset complete");
console.log("Test 4 " + (defOk ? "PASSED" : "FAILED"));

// Test 5: Notification Settings
console.log("\n=== Test 5: Notification Settings ===");
settings.updateNotificationSettings({
  newReplies: true,
  interestedLeads: false,
  campaignCompleted: true,
  bounceAlerts: true,
  dailySummary: false
});
const notifs2 = settings.getNotificationSettings();
notifDirect = db.prepare("SELECT * FROM email_provider_settings WHERE id = 1").get();
notifParsed = JSON.parse(notifDirect.settings_json);
notOk = notifs2.newReplies === true && notifParsed.new_replies === true;
console.log("newReplies:", notifs2.newReplies, "new_replies DB:", notifParsed.new_replies);
console.log(notOk ? "PERSISTENCE VERIFIED" : "PERSISTENCE FAILED");

// Reset notifications
settings.updateNotificationSettings({
  newReplies: true,
  interestedLeads: true,
  campaignCompleted: true,
  bounceAlerts: true,
  dailySummary: true
});
console.log("Notifications reset complete");
console.log("Test 5 " + (notOk ? "PASSED" : "FAILED"));

console.log("\n=== ALL TESTS " + (persistOk && fbOk && defOk && notOk ? "PASSED" : "SOME FAILED") + " ===");
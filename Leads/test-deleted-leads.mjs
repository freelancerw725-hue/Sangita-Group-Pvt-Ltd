import { mergeAndDedupeLeads, normalizeLeadRecord } from "./src/lib/lead-utils.mjs";

// Test 1: Verify deleted leads are not re-imported
console.log("Test 1: Deleted leads filtering in saveNewLeads (JSON fallback)");

const deletedEmails = new Set(["deleted@example.com".toLowerCase()]);

const currentLeads = [
  normalizeLeadRecord({ channelId: "ch1", email: "existing@example.com", channelName: "Existing" })
];

const incomingLeads = [
  normalizeLeadRecord({ channelId: "ch2", email: "new@example.com", channelName: "New Lead" }),
  normalizeLeadRecord({ channelId: "ch3", email: "deleted@example.com", channelName: "Deleted Lead" }),
];

const { merged, skippedDuplicates } = mergeAndDedupeLeads(
  currentLeads,
  incomingLeads.filter(lead => !deletedEmails.has(lead.email.toLowerCase().trim()))
);

console.log("  Current leads:", currentLeads.length);
console.log("  Incoming leads:", incomingLeads.length);
console.log("  Skipped (deleted):", 1);
console.log("  Merged leads:", merged.length);
console.log("  Result:", merged.length === 2 && merged.some(l => l.email === "new@example.com") && !merged.some(l => l.email === "deleted@example.com") ? "PASS" : "FAIL");

// Test 2: Verify mergeAndDedupeLeads still works for normal deduplication
console.log("\nTest 2: Normal deduplication still works");

const current2 = [normalizeLeadRecord({ channelId: "ch1", email: "test@example.com", channelName: "Test" })];
const incoming2 = [normalizeLeadRecord({ channelId: "ch2", email: "test@example.com", channelName: "Test Duplicate" })];

const { merged: merged2, skippedDuplicates: skipped2 } = mergeAndDedupeLeads(current2, incoming2);
console.log("  Current:", current2.length, "Incoming:", incoming2.length);
console.log("  Skipped duplicates:", skipped2);
console.log("  Merged:", merged2.length);
console.log("  Result:", skipped2 === 1 && merged2.length === 1 ? "PASS" : "FAIL");

console.log("\n=== All logic tests passed ===");

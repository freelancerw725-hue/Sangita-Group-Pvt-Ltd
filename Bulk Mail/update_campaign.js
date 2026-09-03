const { db } = require("./server/db/connection.js");
db.prepare('UPDATE campaigns SET sender_account_id = ?, updated_at = datetime("now") WHERE id = ?').run(1, 5);
console.log("Updated campaign sender_account_id");
const campaign = db.prepare("SELECT * FROM campaigns WHERE id = 5").get();
console.log("Campaign:", campaign);
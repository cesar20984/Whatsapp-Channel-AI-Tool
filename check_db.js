const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'whatsapp_channel.db');
const db = new Database(dbPath);
const prompts = db.prepare('SELECT * FROM prompts').all();
console.log(JSON.stringify(prompts, null, 2));

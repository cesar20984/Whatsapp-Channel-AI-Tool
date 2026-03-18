const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'whatsapp_channel.db');
const db = new Database(dbPath);

try {
  db.exec('ALTER TABLE prompts ADD COLUMN negative_prompt TEXT');
} catch (e) {
  // Column might already exist
}

db.prepare('UPDATE prompts SET negative_prompt = ? WHERE id = ?').run(
  'text, blurry, low resolution, distorted faces, watermark, ugly, letters', 
  'image_generation'
);
console.log('Database updated with negative_prompt column and value.');

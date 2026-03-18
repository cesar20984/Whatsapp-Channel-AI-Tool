import Database from 'better-sqlite3';
import path from 'path';

// Define the database path (can be overridden by environment variable or defaults to local db file)
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'whatsapp_channel.db');

export const db = new Database(dbPath);

// Initialize database schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      negative_prompt TEXT,
      color TEXT DEFAULT 'var(--accent-color)',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Simple migrations for existing databases
  try { db.exec(`ALTER TABLE prompts ADD COLUMN color TEXT DEFAULT 'var(--accent-color)'`); } catch (e) {}
  try { db.exec(`ALTER TABLE prompts ADD COLUMN position INTEGER DEFAULT 0`); } catch (e) {}
  try { db.exec(`ALTER TABLE prompts ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch (e) {}

  // Default Prompts
  const defaultPrompts = [
    { id: 'greeting', title: 'Saludo', content: 'Escribe un saludo de buenos días muy sencillo y humano...', color: '#10b981', position: 1 },
    { id: 'farewell', title: 'Despedida', content: 'Escribe un mensaje de despedida corto para ir a descansar...', color: '#f59e0b', position: 2 },
    { id: 'question', title: 'Crear pregunta', content: 'Haz una pregunta corta y natural...', color: '#8b5cf6', position: 3 },
    { id: 'poll', title: 'Encuesta', content: 'Crea una encuesta con una pregunta corta...', color: '#8b5cf6', position: 4 },
    { id: 'message', title: 'Mensaje corto', content: 'Escribe un mensaje breve...', color: 'var(--accent-color)', position: 5 },
    { id: 'personal_message', title: 'Mensaje personal', content: 'Escribe un saludo corto...', color: 'var(--accent-color)', position: 6 },
    { id: 'continue_conversation', title: 'Continuar charla', content: 'Escribe una frase corta...', color: 'var(--accent-color)', position: 7 },
    { id: 'verse_explanation', title: 'Explicación versículo', content: 'Escribe una explicación profunda...', color: '#3b82f6', position: 8 },
    { id: 'image_generation', title: 'Generar Imagen', content: 'Una imagen creativa...', color: '#ec4899', position: 999 } // Al final
  ];

  const insertPrompt = db.prepare('INSERT OR IGNORE INTO prompts (id, title, content, color, position) VALUES (@id, @title, @content, @color, @position)');
  
  const insertMany = db.transaction((prompts) => {
    for (const prompt of prompts) insertPrompt.run(prompt);
  });
  
  insertMany(defaultPrompts);
  db.prepare('DELETE FROM prompts WHERE id = ?').run('passage_explanation');
}

initDb();

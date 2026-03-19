import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

// Connection strategy
let sqliteDb: any;
let pgSql: any;

if (isProduction && process.env.DATABASE_URL) {
  pgSql = neon(process.env.DATABASE_URL);
} else {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'whatsapp_channel.db');
  sqliteDb = new Database(dbPath);
}

// Unified Query Function
export async function dbQuery(sql: string, params: any[] = []) {
  if (pgSql) {
    // Postgres ($1, $2...) logic
    // We transform SQLite (?) to Postgres ($n)
    let pgSqlStr = sql;
    let i = 1;
    while (pgSqlStr.includes('?')) {
      pgSqlStr = pgSqlStr.replace('?', `$${i++}`);
    }
    // Handle INSERT OR IGNORE specifically if needed, 
    // but better to use pure SQL if possible. 
    // Most current queries are simple.
    pgSqlStr = pgSqlStr.replace('INSERT OR IGNORE', 'INSERT');
    if (sql.includes('INSERT')) {
       // if we want to ensure no conflicts on PK:
       if (!pgSqlStr.includes('ON CONFLICT')) {
          pgSqlStr += ' ON CONFLICT DO NOTHING';
       }
    }
    return await pgSql.query(pgSqlStr, params);
  } else {
    // SQLite (?) logic
    const stmt = sqliteDb.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    } else {
      return stmt.run(...params);
    }
  }
}

// Unified Init
export async function initDb() {
  const schema = `
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generations (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (pgSql) {
    // Postgres Init
    // In postgres, id in generations should be SERIAL. 
    // SQLite id should be INTEGER PRIMARY KEY AUTOINCREMENT.
    // We adjust the schema string or run individual commands.
    await pgSql.query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    await pgSql.query(`CREATE TABLE IF NOT EXISTS prompts (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, negative_prompt TEXT, color TEXT DEFAULT 'var(--accent-color)', position INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pgSql.query(`CREATE TABLE IF NOT EXISTS generations (id SERIAL PRIMARY KEY, type TEXT NOT NULL, prompt TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  } else {
    // SQLite Init
    sqliteDb.exec(schema.replace('SERIAL', 'INTEGER PRIMARY KEY AUTOINCREMENT'));
    // Migrations for SQLite
    try { sqliteDb.exec(`ALTER TABLE prompts ADD COLUMN color TEXT DEFAULT 'var(--accent-color)'`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE prompts ADD COLUMN position INTEGER DEFAULT 0`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE prompts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`); } catch (e) {}
  }

  // Initial Data
  const defaultPrompts = [
    { id: 'greeting', title: 'Saludo', content: 'Saludo de buenos días muy sencillo y humano...', color: '#10b981', position: 1 },
    { id: 'farewell', title: 'Despedida', content: 'Mensaje de despedida corto...', color: '#f59e0b', position: 2 },
    { id: 'question', title: 'Crear pregunta', content: 'Haz una pregunta corta y natural...', color: '#8b5cf6', position: 3 },
    { id: 'poll', title: 'Encuesta', content: 'Crea una encuesta...', color: '#8b5cf6', position: 4 },
    { id: 'message', title: 'Mensaje corto', content: 'Escribe un mensaje breve...', color: 'var(--accent-color)', position: 5 },
    { id: 'personal_message', title: 'Mensaje personal', content: 'Saludo corto y personal...', color: 'var(--accent-color)', position: 6 },
    { id: 'continue_conversation', title: 'Continuar charla', content: 'Frase corta y natural...', color: 'var(--accent-color)', position: 7 },
    { id: 'verse_explanation', title: 'Explicación versículo', content: 'Explicación profunda, reflexiva...', color: '#3b82f6', position: 8 },
    { id: 'image_generation', title: 'Generar Imagen', content: 'Imagen creativa, inspiradora...', color: '#ec4899', position: 999 }
  ];

  for (const p of defaultPrompts) {
    const checkSql = `SELECT id FROM prompts WHERE id = ?`;
    const exists = pgSql ? await pgSql.query(checkSql.replace('?', '$1'), [p.id]) : sqliteDb.prepare(checkSql).get(p.id);
    
    // PG query returns { rows: [...] } 
    const isNew = pgSql ? exists.rows.length === 0 : !exists;

    if (isNew) {
      const insertSql = `INSERT INTO prompts (id, title, content, color, position) VALUES (?, ?, ?, ?, ?)`;
      if (pgSql) await pgSql.query(insertSql.replace(/\?/g, (_, idx) => `$${idx + 1}`), [p.id, p.title, p.content, p.color, p.position]);
      else sqliteDb.prepare(insertSql).run(p.id, p.title, p.content, p.color, p.position);
    }
  }
}

// Run init
initDb().catch(console.error);

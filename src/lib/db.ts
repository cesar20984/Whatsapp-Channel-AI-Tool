import Database from 'better-sqlite3';
import { Pool } from '@neondatabase/serverless';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

let sqliteDb: any;
let pgSql: any;

if (isProduction && process.env.DATABASE_URL) {
  pgSql = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'whatsapp_channel.db');
  sqliteDb = new Database(dbPath);
}

// Unified Query Function
export async function dbQuery(sql: string, params: any[] = []) {
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

  if (pgSql) {
    let pgSqlStr = sql;
    let i = 1;
    while (pgSqlStr.includes('?')) {
      pgSqlStr = pgSqlStr.replace('?', `$${i++}`);
    }
    pgSqlStr = pgSqlStr.replace('INSERT OR IGNORE', 'INSERT');
    if (sql.includes('INSERT') && !pgSqlStr.includes('ON CONFLICT')) {
      pgSqlStr += ' ON CONFLICT DO NOTHING';
    }

    // neon.query returns an object with 'rows' and others
    // We want to return the array for SELECTs
    const result = await pgSql.query(pgSqlStr, params);
    if (isSelect) {
      return result.rows || [];
    }
    return { changes: result.rowCount || 0, rowCount: result.rowCount || 0 };
  } else {
    const stmt = sqliteDb.prepare(sql);
    if (isSelect) {
      return stmt.all(...params);
    } else {
      const result = stmt.run(...params);
      return { changes: result.changes, rowCount: result.changes };
    }
  }
}

export async function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
      negative_prompt TEXT, color TEXT DEFAULT 'var(--accent-color)',
      position INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS generations (
      id SERIAL PRIMARY KEY, type TEXT NOT NULL, prompt TEXT NOT NULL,
      content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (pgSql) {
    await pgSql.query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    await pgSql.query(`CREATE TABLE IF NOT EXISTS prompts (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, negative_prompt TEXT, color TEXT DEFAULT 'var(--accent-color)', position INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pgSql.query(`CREATE TABLE IF NOT EXISTS generations (id SERIAL PRIMARY KEY, type TEXT NOT NULL, prompt TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  } else {
    sqliteDb.exec(schema.replace('SERIAL', 'INTEGER PRIMARY KEY AUTOINCREMENT'));
    try { sqliteDb.exec(`ALTER TABLE prompts ADD COLUMN color TEXT DEFAULT 'var(--accent-color)'`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE prompts ADD COLUMN position INTEGER DEFAULT 0`); } catch (e) {}
    try { sqliteDb.exec(`ALTER TABLE prompts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`); } catch (e) {}
  }

  const defaultPrompts = [
    { id: 'greeting', title: 'Saludo', content: 'Saludo de buenos días...', color: '#10b981', position: 1 },
    { id: 'farewell', title: 'Despedida', content: 'Mensaje de despedida...', color: '#f59e0b', position: 2 },
    { id: 'question', title: 'Pregunta', content: 'Haz una pregunta...', color: '#8b5cf6', position: 3 },
    { id: 'poll', title: 'Encuesta', content: 'Crea una encuesta...', color: '#8b5cf6', position: 4 },
    { id: 'image_generation', title: 'Generar Imagen', content: 'Crea una imagen...', color: '#ec4899', position: 999 }
  ];

  for (const p of defaultPrompts) {
    const rows = await dbQuery(`SELECT id FROM prompts WHERE id = ?`, [p.id]) as any[];
    if (rows.length === 0) {
      await dbQuery(`INSERT INTO prompts (id, title, content, color, position) VALUES (?, ?, ?, ?, ?)`, [p.id, p.title, p.content, p.color, p.position]);
    }
  }
}

initDb().catch(console.error);

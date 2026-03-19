const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('@neondatabase/serverless');

// Leer el .env manualmente para mayor compatibilidad
const env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : '';

if (!dbUrl) {
  console.error("No se encontró DATABASE_URL en el archivo .env");
  process.exit(1);
}

async function runMigration() {
  console.log("Iniciando migración de SQLite local a Neon PostgreSQL...");
  const db = new Database('whatsapp_channel.db');
  const sql = new Pool({ connectionString: dbUrl });

  // 1. Asegurar Creación de Tablas (Por si no se han inicializado)
  console.log("Verificando esquema en la nube...");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
      negative_prompt TEXT, color TEXT DEFAULT 'var(--accent-color)',
      position INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS generations (
      id SERIAL PRIMARY KEY, type TEXT NOT NULL, prompt TEXT NOT NULL,
      content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Leer datos locales
  const settings = db.prepare('SELECT * FROM settings').all();
  const prompts = db.prepare('SELECT * FROM prompts').all();
  const generations = db.prepare('SELECT * FROM generations').all();

  // 3. Insertar Settings
  console.log(`Subiendo ${settings.length} configuraciones...`);
  for (const s of settings) {
    await sql.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [s.key, s.value]);
  }

  // 4. Insertar Prompts (Botones y Colores)
  console.log(`Subiendo ${prompts.length} botones personalizados...`);
  for (const p of prompts) {
    await sql.query(`
      INSERT INTO prompts (id, title, content, negative_prompt, color, position, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      ON CONFLICT (id) DO UPDATE SET 
        title = EXCLUDED.title, content = EXCLUDED.content, 
        negative_prompt = EXCLUDED.negative_prompt, color = EXCLUDED.color, position = EXCLUDED.position
    `, [p.id, p.title, p.content, p.negative_prompt, p.color, p.position, p.created_at || new Date().toISOString()]);
  }

  // 5. Insertar Historial
  console.log(`Subiendo ${generations.length} elementos del historial...`);
  await sql.query(`TRUNCATE TABLE generations RESTART IDENTITY`);
  for (const g of generations) {
    await sql.query(`INSERT INTO generations (type, prompt, content, created_at) VALUES ($1, $2, $3, $4)`, 
    [g.type, g.prompt, g.content, g.created_at || new Date().toISOString()]);
  }

  console.log("¡Migración completada con éxito! 🎉 Todos los datos están en Neon.");
}

runMigration().catch(console.error);

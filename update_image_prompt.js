const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'whatsapp_channel.db');
const db = new Database(dbPath);

const newPrompts = [
  { 
    id: 'image_generation', 
    content: 'Analiza el siguiente historial del canal: {HISTORIAL}. \nTu tarea es crear un PROMPT VISUAL detallado EN INGLÉS (máximo 70 palabras) para generar una imagen relacionada con el último mensaje. Describe la iluminación, el estilo (ej. cinematic, soft photography), la composición y la atmósfera. Que sea una imagen hermosa, pacífica y espiritual.'
  }
];

const updateStmt = db.prepare('UPDATE prompts SET content = ? WHERE id = ?');
const updateMany = db.transaction((list) => {
  for (const p of list) {
    updateStmt.run(p.content, p.id);
  }
});

updateMany(newPrompts);
console.log('Prompt de imagen actualizado en la DB.');

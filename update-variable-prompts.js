const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'whatsapp_channel.db');
const db = new Database(dbPath);

const newPrompts = [
  { id: 'question', content: 'Mira el historial: {HISTORIAL}. Ahora genera una pregunta corta y fresca sobre un tema DISTINTO a esos para que los hermanos charlen.' },
  { id: 'message', content: 'Escribe un pensamiento directo y natural sobre la fe, evitando repetir lo del historial: {HISTORIAL}. Sin emojis.' },
  { id: 'continue_conversation', content: 'Lee lo último que hablamos: {HISTORIAL}. Ahora escribe una frase corta que siga la plática o el sentimiento de forma súper natural, sin sonar a IA.' },
  { id: 'answer_question', content: 'Toma esta duda del usuario: {EXTRA}. Responde como un hermano con mucha confianza, de forma corta y directa, sin dar vueltas ni usar emojis.' },
  { id: 'personal_message', content: 'Teniendo en cuenta el historial: {HISTORIAL}, envíame un saludo personal corto de confianza al grupo, sin repetir temas anteriores.' }
];

const updateStmt = db.prepare('UPDATE prompts SET content = ? WHERE id = ?');

const updateMany = db.transaction((list) => {
  for (const p of list) {
    updateStmt.run(p.content, p.id);
  }
});

updateMany(newPrompts);
console.log('Prompts con variables {HISTORIAL} y {EXTRA} actualizados.');

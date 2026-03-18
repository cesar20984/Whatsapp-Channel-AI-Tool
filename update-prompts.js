const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'whatsapp_channel.db');
const db = new Database(dbPath);

const newPrompts = [
  { id: 'question', content: 'Haz una pregunta corta y natural para los hermanos del canal, sin emojis ni negritas, que genere charla entre amigos sobre la fe.' },
  { id: 'message', content: 'Escribe un mensaje breve y cercano, de una sola línea, como hablándole a un amigo sobre Dios, sin usar emojis ni texto en negrita.' },
  { id: 'poll', content: 'Crea una encuesta con una pregunta corta y opciones directas, todo en lenguaje muy natural y sin adornos tipográficos ni emojis.' },
  { id: 'personal_message', content: 'Escribe un saludo corto y personal de mi parte para el grupo, de una sola línea, con mucha confianza y hermandad, sin emojis ni negritas.' },
  { id: 'greeting', content: 'Escribe un saludo de buenos días muy sencillo y humano, de una sola línea, deseando bendiciones como si fuera un mensaje rápido por chat, sin emojis.' },
  { id: 'farewell', content: 'Escribe un mensaje de despedida corto para ir a descansar, en una sola línea, natural y fraternal, sin emojis ni negritas.' },
  { id: 'continue_conversation', content: 'Escribe una frase corta y natural que siga el hilo de lo que se venía hablando en el canal, de forma fluida y sin sonar como una IA, sin emojis.' },
  { id: 'answer_question', content: 'Responde la duda del usuario de forma directa y sencilla, como un hermano mayor hablando con mucha confianza, en una sola frase corta y sin emojis ni negritas.' }
];

const updateStmt = db.prepare('UPDATE prompts SET content = ? WHERE id = ?');

const updateMany = db.transaction((list) => {
  for (const p of list) {
    updateStmt.run(p.content, p.id);
  }
});

updateMany(newPrompts);
console.log('Prompts actualizados correctamente en la base de datos.');

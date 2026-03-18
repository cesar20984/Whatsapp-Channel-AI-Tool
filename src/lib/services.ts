import { db } from './db';

// TYPES
export interface Prompt {
  id: string;
  title: string;
  content: string;
  negative_prompt?: string;
  color?: string;
  position?: number;
  created_at?: string;
}

export interface Generation {
  id?: number;
  type: string;
  prompt: string;
  content: string;
  created_at?: string;
}

export interface Settings {
  key: string;
  value: string;
}

// PROMPTS
export function getPrompts(): Prompt[] {
  try {
    return db.prepare('SELECT * FROM prompts ORDER BY position ASC, created_at ASC').all() as Prompt[];
  } catch (e) {
    return db.prepare('SELECT * FROM prompts').all() as Prompt[];
  }
}

export function updatePrompt(id: string, content: string, negative_prompt: string = '', title?: string, color?: string): boolean {
  if (title && color) {
    const result = db.prepare('UPDATE prompts SET content = @content, negative_prompt = @negative_prompt, title = @title, color = @color WHERE id = @id').run({ content, id, negative_prompt, title, color });
    return result.changes > 0;
  }
  const result = db.prepare('UPDATE prompts SET content = @content, negative_prompt = @negative_prompt WHERE id = @id').run({ content, id, negative_prompt });
  return result.changes > 0;
}

export function updatePromptPositions(orders: {id: string, position: number}[]): boolean {
  const update = db.prepare('UPDATE prompts SET position = @position WHERE id = @id');
  const runTransaction = db.transaction((list) => {
    for (const item of list) update.run(item);
  });
  runTransaction(orders);
  return true;
}

export function createPrompt(id: string, title: string, content: string, color: string = 'var(--accent-color)'): boolean {
  const result = db.prepare('INSERT INTO prompts (id, title, content, color, position) VALUES (@id, @title, @content, @color, 999)').run({ id, title, content, color });
  return result.changes > 0;
}

export function deletePrompt(id: string): boolean {
  const result = db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
  return result.changes > 0;
}

// SETTINGS
export function getSettings(): Record<string, string> {
  const settingsArray = db.prepare('SELECT * FROM settings').all() as Settings[];
  return settingsArray.reduce((acc, current) => {
    acc[current.key] = current.value;
    return acc;
  }, {} as Record<string, string>);
}

export function saveSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)').run({ key, value });
}

// GENERATIONS (HISTORY)
export function saveGeneration(type: string, prompt: string, content: string): Generation {
  const result = db.prepare('INSERT INTO generations (type, prompt, content) VALUES (@type, @prompt, @content)').run({ type, prompt, content });
  return {
    id: result.lastInsertRowid as number,
    type,
    prompt,
    content,
    created_at: new Date().toISOString()
  };
}

export function getRecentGenerations(days: number = 30): Generation[] {
  return db.prepare(`
    SELECT * FROM generations 
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    ORDER BY created_at DESC
  `).all(days) as Generation[];
}

export function deleteGeneration(id: number): boolean {
  const result = db.prepare('DELETE FROM generations WHERE id = ?').run(id);
  return result.changes > 0;
}

export function deleteGenerations(ids: number[]): boolean {
  if (!ids || ids.length === 0) return false;
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM generations WHERE id IN (${placeholders})`).run(...ids);
  return result.changes > 0;
}

export function deleteAllGenerations(): boolean {
  const result = db.prepare('DELETE FROM generations').run();
  return result.changes > 0;
}

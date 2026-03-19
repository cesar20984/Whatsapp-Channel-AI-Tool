import { dbQuery } from './db';

// TYPES
export interface Prompt {
  id: string; title: string; content: string; 
  negative_prompt?: string; color?: string; position?: number; created_at?: string;
}

export interface Generation {
  id?: number; type: string; prompt: string; content: string; created_at?: string;
}

// PROMPTS
export async function getPrompts(): Promise<Prompt[]> {
  try {
    return await dbQuery('SELECT * FROM prompts ORDER BY position ASC, created_at ASC') as Prompt[];
  } catch (e) {
    return await dbQuery('SELECT * FROM prompts') as Prompt[];
  }
}

export async function updatePrompt(id: string, content: string, negative_prompt: string = '', title?: string, color?: string): Promise<boolean> {
  if (title && color) {
    const result = await dbQuery('UPDATE prompts SET content = ?, negative_prompt = ?, title = ?, color = ? WHERE id = ?', [content, negative_prompt, title, color, id]);
    return result.changes > 0 || !!result.rowCount;
  }
  const result = await dbQuery('UPDATE prompts SET content = ?, negative_prompt = ? WHERE id = ?', [content, negative_prompt, id]);
  return result.changes > 0 || !!result.rowCount;
}

export async function updatePromptPositions(orders: {id: string, position: number}[]): Promise<boolean> {
  for (const item of orders) {
    await dbQuery('UPDATE prompts SET position = ? WHERE id = ?', [item.position, item.id]);
  }
  return true;
}

export async function createPrompt(id: string, title: string, content: string, color: string = 'var(--accent-color)'): Promise<boolean> {
  const result = await dbQuery('INSERT INTO prompts (id, title, content, color, position) VALUES (?, ?, ?, ?, ?)', [id, title, content, color, 999]);
  return result.changes > 0 || !!result.rowCount;
}

export async function deletePrompt(id: string): Promise<boolean> {
  const result = await dbQuery('DELETE FROM prompts WHERE id = ?', [id]);
  return result.changes > 0 || !!result.rowCount;
}

// SETTINGS
export async function getSettings(): Promise<Record<string, string>> {
  const settingsArray = await dbQuery('SELECT * FROM settings') as {key: string, value: string}[];
  return settingsArray.reduce((acc, current) => {
    acc[current.key] = current.value;
    return acc;
  }, {} as Record<string, string>);
}

export async function saveSetting(key: string, value: string): Promise<void> {
  // Use a query that works for both OR REPLACE (SQLite) and ON CONFLICT (Postgres handled by dbQuery)
  await dbQuery('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

// HISTORY (GENERATIONS)
export async function saveGeneration(type: string, prompt: string, content: string): Promise<void> {
  await dbQuery('INSERT INTO generations (type, prompt, content) VALUES (?, ?, ?)', [type, prompt, content]);
}

export async function getRecentGenerations(days: number = 30): Promise<Generation[]> {
  try {
     return await dbQuery(`
        SELECT * FROM generations 
        WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day' * ?)
        ORDER BY created_at DESC
      `, [days]) as Generation[];
  } catch(e) {
     return await dbQuery(`
        SELECT * FROM generations 
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        ORDER BY created_at DESC
      `, [days]) as Generation[];
  }
}

export async function deleteGeneration(id: number): Promise<boolean> {
  const result = await dbQuery('DELETE FROM generations WHERE id = ?', [id]);
  return result.changes > 0 || !!result.rowCount;
}

export async function deleteGenerations(ids: number[]): Promise<boolean> {
  if (!ids || ids.length === 0) return false;
  const placeholders = ids.map(() => '?').join(',');
  const result = await dbQuery(`DELETE FROM generations WHERE id IN (${placeholders})`, ids);
  return result.changes > 0 || !!result.rowCount;
}

export async function deleteAllGenerations(): Promise<boolean> {
  const result = await dbQuery('DELETE FROM generations');
  return result.changes > 0 || !!result.rowCount;
}

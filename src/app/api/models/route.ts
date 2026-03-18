import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // We fetch models supporting generateContent
    const response = await ai.models.list();
    
    // Simplification: the SDK returns an async iterable or an array depending on the exact method
    // In @google/genai, it returns a paginated list.
    const models = [];
    for await (const model of response) {
      if (!model.name) continue;
      models.push({
        name: model.name.replace('models/', ''),
        displayName: model.displayName,
        supportedActions: model.supportedActions || []
      });
    }

    // Filter text models and image models
    const isImageModel = (m: any) => 
      m.name.includes('imagen') || 
      m.name.includes('image') || 
      m.supportedActions.includes('generateImages') ||
      m.supportedActions.includes('predict');

    const imageModels = models.filter(m => isImageModel(m));
    const textModels = models.filter(m => m.supportedActions.includes('generateContent') && !isImageModel(m));

    return NextResponse.json({
      textModels,
      imageModels
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching models', details: String(error) }, { status: 500 });
  }
}

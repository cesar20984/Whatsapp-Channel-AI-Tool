import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getPrompts, getSettings, getRecentGenerations, saveGeneration } from '@/lib/services';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    const { promptId, userContext, customPrompt, actionType, allowTextInImage } = await request.json();

    const ai = new GoogleGenAI({ apiKey });
    const settings = await getSettings();
    const textModel = settings['text_model'] || 'gemini-2.0-flash';
    const imageModel = settings['image_model'] || 'imagen-3.0-generate-001';

    let basePromptStr = customPrompt;
    let negativePromptStr = '';
    
    if (promptId) {
      const dbPrompts = await getPrompts();
      const found = dbPrompts.find(p => p.id === promptId);
      if (found) {
        if (!basePromptStr) basePromptStr = found.content;
        negativePromptStr = found.negative_prompt || '';
      }
    }

    const recentItems = await getRecentGenerations(30);
    const recent = recentItems.filter(g => g.type === 'text').slice(0, 10);
    const historyText = recent.length > 0 ? recent.map(r => `- ${r.content}`).join('\n') : 'Sin historial reciente.';

    const finalInstruction = (basePromptStr || '')
      .replace('{HISTORIAL}', historyText)
      .replace('{EXTRA}', userContext || '(Sin contexto)');

    if (actionType === 'image') {
      let promptToUse = finalInstruction || 'Una imagen creativa.';
      if (allowTextInImage === false) {
        promptToUse += "\n\nCRÍTICO: Sin texto, letras ni palabras.";
      }
      
      let synthResult = '';
      try {
        const resp = await ai.models.generateContent({ model: textModel, contents: promptToUse });
        if (resp.text) { promptToUse = resp.text.trim(); synthResult = promptToUse; }
      } catch (err) { console.error("Synth err:", err); }
      
      if (allowTextInImage === false) {
        promptToUse += " (no text, no letters)";
        negativePromptStr = negativePromptStr ? negativePromptStr + ", text, letters" : "text, letters";
      }

      let base64Image = '';
      const isGeminiImage = imageModel.includes('gemini');
      const apiUrl = isGeminiImage 
        ? `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict?key=${apiKey}`;

      const apiBody = isGeminiImage ? {
        contents: [{ parts: [{ text: promptToUse }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { imageSize: "1024", aspectRatio: "1:1" } }
      } : {
        instances: [{ prompt: promptToUse }],
        parameters: { sampleCount: 1, negativePrompt: negativePromptStr, imageConfig: { imageSize: "1024", aspectRatio: "1:1" } }
      };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "API Error");
      
      if (isGeminiImage) {
        const parts = data.candidates?.[0]?.content?.parts || [];
        const img = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (!img) throw new Error("No image generated");
        base64Image = img.inlineData.data;
      } else {
        base64Image = data.predictions?.[0]?.bytesBase64Encoded;
      }
      
      await saveGeneration('image', promptToUse, 'imagen-generada');
      return NextResponse.json({ 
        result: `data:image/jpeg;base64,${base64Image}`, 
        synthesizedPrompt: synthResult,
        originalResolvedPrompt: finalInstruction 
      });
    }

    const systemInstruction = `Asistente para canal de WhatsApp cristiano. Sé variado, no repitas temas del historial:\n${historyText}\nNo emojis, no negritas, una sola línea.`;
    const response = await ai.models.generateContent({
      model: textModel,
      contents: `Instrucción: ${finalInstruction}`,
      config: { systemInstruction, temperature: 0.9 }
    });

    const generatedText = response.text || '';
    await saveGeneration('text', basePromptStr, generatedText);
    return NextResponse.json({ result: generatedText });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getPrompts, getSettings, getRecentGenerations, saveGeneration } from '@/lib/services';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    const body = await request.json();
    const { promptId, userContext, customPrompt, actionType, allowTextInImage, selectedSuggestion } = body;

    const ai = new GoogleGenAI({ apiKey });
    const settings = (await getSettings()) || {};
    const textModel = settings['text_model'] || 'gemini-2.0-flash-exp';
    const imageModel = settings['image_model'] || 'imagen-3.0-generate-001';

    let basePromptStr = customPrompt;
    let negativePromptStr = '';
    
    if (promptId) {
      const dbPrompts = (await getPrompts()) || [];
      if (Array.isArray(dbPrompts)) {
        const found = dbPrompts.find(p => p.id === promptId);
        if (found) {
          if (!basePromptStr) basePromptStr = found.content;
          negativePromptStr = found.negative_prompt || '';
        }
      }
    }

    const recentItems = (await getRecentGenerations(30)) || [];
    const recent = Array.isArray(recentItems) ? recentItems.filter(g => g.type === 'text').slice(0, 10) : [];
    const historyText = recent.length > 0 ? recent.map(r => `- ${r.content}`).join('\n') : 'Sin historial.';
    const latestText = recent.length > 0 ? recent[0].content : '';

    const finalInstruction = (basePromptStr || '')
      .replace('{HISTORIAL}', actionType === 'text' ? historyText : (latestText || 'Sin historial.'))
      .replace('{EXTRA}', userContext || '(Sin contexto)');

    // ═══════════════════════════════════════════
    // STEP 1: IMAGE SUGGESTIONS (5 opciones)
    // ═══════════════════════════════════════════
    if (actionType === 'image-suggestions') {
      const contextForSuggestions = finalInstruction || 'Contenido cristiano inspirador.';
      
      const resp = await ai.models.generateContent({
        model: textModel,
        contents: `Analiza este contexto del canal cristiano y sugiere 5 ideas de imagen DIFERENTES y CREATIVAS.

CONTEXTO / HISTORIAL RECIENTE:
${contextForSuggestions}

REGLAS:
- Cada opción debe ser una descripción corta (1-2 frases) en ESPAÑOL de lo que aparecería en la imagen.
- Las opciones deben ser VARIADAS: distintos estilos, escenas, metáforas visuales.
- NO repitas pastores con ovejas en todas las opciones. Sé creativo: paisajes, personas, objetos simbólicos, escenas abstractas, naturaleza, cosmos, etc.
- Cada opción debe conectarse con el tema del historial/contexto.
- Responde ÚNICAMENTE con un JSON válido, sin markdown, sin backticks.

Formato de respuesta (JSON puro):
[
  {"id": 1, "title": "Título corto", "description": "Descripción de lo que mostraría la imagen"},
  {"id": 2, "title": "Título corto", "description": "Descripción de lo que mostraría la imagen"},
  {"id": 3, "title": "Título corto", "description": "Descripción de lo que mostraría la imagen"},
  {"id": 4, "title": "Título corto", "description": "Descripción de lo que mostraría la imagen"},
  {"id": 5, "title": "Título corto", "description": "Descripción de lo que mostraría la imagen"}
]`,
        config: {
          temperature: 1.0
        }
      });

      let suggestions = [];
      try {
        let rawText = (resp.text || '').trim();
        // Clean any markdown formatting
        rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        suggestions = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse suggestions JSON:', e, 'Raw:', resp.text);
        return NextResponse.json({ error: 'No se pudieron generar las opciones. Intenta de nuevo.' }, { status: 500 });
      }

      return NextResponse.json({ suggestions });
    }

    // ═══════════════════════════════════════════
    // STEP 2: GENERATE IMAGE from selected suggestion
    // ═══════════════════════════════════════════
    if (actionType === 'image') {
      // Build the visual prompt from the selected suggestion
      let promptToUse = selectedSuggestion || finalInstruction || 'Una imagen creativa.';
      
      if (allowTextInImage === false) {
        promptToUse += "\n\nCRÍTICO: Sin texto ni palabras.";
      }
      
      // Synthesize into an English image generation prompt
      let synthResult = '';
      try {
        const resp = await ai.models.generateContent({
          model: textModel,
          contents: `Convierte esta idea de imagen en un prompt visual detallado EN INGLÉS (máximo 70 palabras) para un generador de imágenes:

"${promptToUse}"

Describe: iluminación, estilo artístico (cinematic, oil painting, watercolor, soft photography, etc.), composición, colores, atmósfera y emociones. 
Responde SOLO con el prompt en inglés, nada más.`,
          config: {
            systemInstruction: `You are an expert visual prompt engineer. Output ONLY the English image prompt. No explanations, no markdown. Max 70 words. Be specific and creative.`,
            temperature: 0.9
          }
        });
        const text = resp.text;
        if (text) { promptToUse = text.trim(); synthResult = promptToUse; }
      } catch (err) { console.error("Synth err:", err); }
      
      if (allowTextInImage === false) {
        promptToUse += " (no text, no letters)";
        negativePromptStr = negativePromptStr ? negativePromptStr + ", text, letters" : "text, letters";
      }

      const isGeminiImage = imageModel.includes('gemini');
      const apiUrl = isGeminiImage 
        ? `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict?key=${apiKey}`;

      const parameters: any = { sampleCount: 1 };
      if (negativePromptStr && negativePromptStr.trim() !== '') {
        parameters.negativePrompt = negativePromptStr;
      }

      const imageConfig: any = { aspectRatio: "1:1" };
      const modelLower = imageModel.toLowerCase();
      if (!modelLower.includes('imagen-3') || modelLower.includes('nano') || modelLower.includes('banana') || isGeminiImage) {
        imageConfig.imageSize = "512";
      }

      const apiBody = isGeminiImage ? {
        contents: [{ parts: [{ text: promptToUse }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig }
      } : {
        instances: [{ prompt: promptToUse }],
        parameters: { ...parameters, imageConfig }
      };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody)
      });
      
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json({ error: data.error?.message || "Google API Error" }, { status: res.status });
      }
      
      let base64Image = '';
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
        originalResolvedPrompt: selectedSuggestion || finalInstruction 
      });
    }

    // ═══════════════════════════════════════════
    // TEXT GENERATION
    // ═══════════════════════════════════════════
    const systemInstruction = `Asistente cristiano variado. No repitas temas:\n${historyText}\nCorto, natural, sin formato.`;
    
    const response = await ai.models.generateContent({
      model: textModel,
      contents: `Instrucción: ${finalInstruction}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9
      }
    });
    
    const generatedText = response.text || '';
    
    await saveGeneration('text', basePromptStr, generatedText);
    return NextResponse.json({ result: generatedText });
  } catch (error) {
    console.error("Generation Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getPrompts, getSettings, getRecentGenerations, saveGeneration } from '@/lib/services';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    const body = await request.json();
    const { promptId, userContext, customPrompt, actionType, allowTextInImage } = body;

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

    // Para imágenes: solo el mensaje MÁS RECIENTE del historial
    const latestText = recent.length > 0 ? recent[0].content : '';
    const imageHistoryText = latestText || 'Sin historial.';

    const finalInstruction = (basePromptStr || '')
      .replace('{HISTORIAL}', actionType === 'image' ? imageHistoryText : historyText)
      .replace('{EXTRA}', userContext || '(Sin contexto)');

    if (actionType === 'image') {
      let promptToUse = finalInstruction || 'Una imagen creativa.';
      if (allowTextInImage === false) {
        promptToUse += "\n\nCRÍTICO: Sin texto ni palabras.";
      }
      
      let synthResult = '';
      try {
        const resp = await ai.models.generateContent({
            model: textModel,
            contents: promptToUse,
            config: {
              systemInstruction: `You are an expert visual prompt engineer. Your ONLY job is to create a short image generation prompt (max 70 words) in English.
CRITICAL RULES:
- Focus EXCLUSIVELY on the SPECIFIC topic mentioned. If the topic is about forgiveness, create imagery about forgiveness. If it's about light, create imagery about light. If it's about judgment, create imagery about that.
- DO NOT default to generic shepherd/sheep/pastoral imagery unless the text SPECIFICALLY talks about Psalm 23 or shepherds.
- Create VARIED, UNIQUE imagery each time. Think creatively: use metaphors, abstract concepts, nature scenes, human emotions, cosmic imagery, etc.
- Describe lighting, style (cinematic, oil painting, watercolor, etc.), composition, mood, and atmosphere.
- Output ONLY the English image prompt, nothing else.`,
              temperature: 1.0
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
      
      // Aplicar 512 EXCLUSIVAMENTE para Nano Banana / Gemini, o modelos antiguos.
      // imagen-3 prohíbe el uso de "imageSize: 512" (devuelve Invalid Argument).
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
        originalResolvedPrompt: finalInstruction 
      });
    }

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

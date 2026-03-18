import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getPrompts, getSettings, getRecentGenerations, saveGeneration } from '@/lib/services';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const { promptId, userContext, imagePrompt, customPrompt, actionType, allowTextInImage } = await request.json();

    const ai = new GoogleGenAI({ apiKey });
    const settings = getSettings();
    const textModel = settings['text_model'] || 'gemini-2.5-flash';
    const imageModel = settings['image_model'] || 'imagen-4.0-generate-001'; // fallback valid name

    // Get prompt content
    let basePromptStr = customPrompt;
    let negativePromptStr = '';
    
    if (promptId) {
      const dbPrompts = getPrompts();
      const found = dbPrompts.find(p => p.id === promptId);
      if (found) {
        if (!basePromptStr) basePromptStr = found.content;
        negativePromptStr = found.negative_prompt || '';
      }
    }

    // Prepare Context from recent generations for placeholders
    const recent = getRecentGenerations(30).filter(g => g.type === 'text').slice(0, 10);
    const historyText = recent.length > 0 ? 
      recent.map(r => `- ${r.content}`).join('\n') 
      : 'No hay mensajes recientes en el historial.';

    // Replace placeholders in the prompt (Shared for both Text and Image)
    const finalInstruction = (basePromptStr || '')
      .replace('{HISTORIAL}', historyText)
      .replace('{EXTRA}', userContext || '(Sin contexto adicional)');

    // Case 1: Image Generation
    if (actionType === 'image') {
      let promptToUse = finalInstruction || 'Una imagen creativa e inspiradora.';
      
      if (allowTextInImage === false) {
        promptToUse += "\n\nCRÍTICO: El usuario desea una imagen 100% libre de texto. Por favor, asegúrate de NO pedir letras, palabras ni frases en tu descripción, e instruye a la IA de dibujo explícitamente a NO incluir ningún tipo de texto, marca de agua o firma.";
      }
      
      let synthResult = '';
      
      // If the prompt is complex (has variables) or we want the LLM to write the image instruction:
      // We synthesize it by running the user's prompt through the text model first.
      try {
        const synthResponse = await ai.models.generateContent({
          model: textModel, // user's selected text model
          contents: promptToUse
        });
        if (synthResponse.text) {
           promptToUse = synthResponse.text.trim();
           synthResult = promptToUse;
        }
      } catch (err) {
        console.error("Synthesize failed:", err);
      }
      
      if (allowTextInImage === false) {
        promptToUse += " (absolutely no text, no letters, no words, no writing, no watermark, no signs)";
        negativePromptStr = negativePromptStr ? negativePromptStr + ", text, letters, words, writing, sign, watermark, signature" : "text, letters, words, writing, sign, watermark, signature";
      }

      let base64Image = '';
      if (imageModel.includes('gemini')) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              contents: [{ parts: [{ text: promptToUse }] }],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
                responseMimeType: "text/plain",
                imageConfig: {
                    imageSize: "512",
                    aspectRatio: "1:1"
                }
              },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
              ]
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Error Gemini Native");
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (!imagePart) throw new Error("IA no generó imagen");
        base64Image = imagePart.inlineData.data;
      } else {
        // Imagen logic with negativePrompt
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              instances: [{ prompt: promptToUse }],
              parameters: {
                sampleCount: 1,
                // Using the negative prompt from DB
                negativePrompt: negativePromptStr,
                imageConfig: {
                    imageSize: "512",
                    aspectRatio: "1:1"
                }
              }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Error Imagen Classic");
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (!b64) throw new Error("No b64 from Imagen");
        base64Image = b64;
      }
      
      saveGeneration('image', promptToUse, 'imagen-generada');
      return NextResponse.json({ 
        result: `data:image/jpeg;base64,${base64Image}`, 
        synthesizedPrompt: synthResult,
        originalResolvedPrompt: finalInstruction 
      });
    }

    // Case 2: Text Generation
    if (!basePromptStr) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const systemInstruction = `Eres un asistente para un canal de WhatsApp cristiano que habla como un hermano cercano.
CRÍTICO: TU OBJETIVO PRINCIPAL ES LA VARIEDAD. 
REGLAS DE ORO:
1. REVISA EL HISTORIAL PROPORCIONADO: No repitas temas, frases, ni ideas que ya se hayan dicho recientemente. El historial es precisamente para que NO digas lo mismo.
2. NUNCA menciones conceptos como "Dios tiene el control" o "Confía en Él" si ya aparecen en el historial reciente. Busca otros temas: gratitud, propósito, comunidad, perdón, servicio, etc.
3. No uses emojis ni texto en negrita.
4. Tono natural, frases cortas, una sola línea.

HISTORIAL RECIENTE DEL CANAL (PROHIBIDO REPETIR ESTO):
${historyText}

INSTRUCCIÓN ESPECÍFICA:
${finalInstruction}`;

    const userMessage = `Genera un mensaje nuevo, fresco y diferente siguiendo la instrucción actual.`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9, // Higher temperature for more variety
      }
    });

    const generatedText = response.text || '';
    
    // Save to DB
    saveGeneration('text', basePromptStr, generatedText);

    return NextResponse.json({ result: generatedText });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Generation failed', details: String(error) }, { status: 500 });
  }
}

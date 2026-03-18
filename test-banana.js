const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testBanana() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: 'a cute cat',
      config: {
        responseModalities: ['IMAGE']
      }
    });
    console.log("Success with generateContent!");
    const firstPart = response.candidates[0].content.parts[0];
    if (firstPart.inlineData) {
      console.log('Got inlineData base64 of length:', firstPart.inlineData.data.length);
    }
  } catch (err) {
    console.error("FAILED generateContent:", err.message);
  }
}
testBanana();

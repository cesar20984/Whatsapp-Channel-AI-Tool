const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function check() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.list();
    const models = [];
    for await (const model of response) {
      models.push(model);
    }
    const filteredText = models.filter(m => m.supportedActions?.includes('generateContent') && m.name.includes('gemini'));
    const filteredImage = models.filter(m => m.name.includes('imagen') || m.supportedActions?.includes('predict') || m.supportedActions?.includes('generateImages'));
    
    console.log("Text models:", filteredText.map(m => m.name));
    console.log("Image models:", filteredImage.map(m => m.name));
  } catch (err) {
    console.error("Error:", err);
  }
}
check();

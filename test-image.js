const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testImage() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001', // or whatever is loaded by default
      prompt: 'Un perrito con alas de angel volando',
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1'
      }
    });
    
    // Check output
    console.log("Success!");
    console.log("Generated array length:", response.generatedImages.length);
    if(response.generatedImages.length > 0) {
      const base64Image = response.generatedImages[0].image.imageBytes;
      console.log("Base64 string starts with:", base64Image.substring(0, 20));
    }
  } catch (err) {
    console.error("FAILED:");
    console.error(err);
  }
}
testImage();

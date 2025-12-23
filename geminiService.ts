
import { GoogleGenAI } from "@google/genai";

/**
 * Helper to get the API key safely in browser environments
 */
const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
  } catch (e) {
    return '';
  }
};

export const analyzeScreenContent = async (imageData: string, prompt: string) => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData.split(',')[1],
            },
          },
          { text: prompt }
        ]
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze screen content. Please check if your API key is correctly set in the environment variables.";
  }
};

export const chatWithScreenAssistant = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are the NovaCast Clarity Engine AI. Your primary role is to help users optimize their Mac-to-Android mirroring experience. 
        Focus on:
        1. High-resolution scaling: Explain how macOS HiDPI works and why 'Retina' scaling is important.
        2. Clarity: Suggest disabling "Font Smoothing" on macOS or adjusting resolution to 1440p (Retina) for best results.
        3. Low Latency: Recommend Wi-Fi 6 5GHz or USB 3.0+ cables.
        4. Color Accuracy: Discuss P3 vs sRGB profiles.
        Be professional, technical, and helpful. Use terms like 'pixel-perfect', 'bitrate optimization', and 'sub-pixel rendering'.`,
      }
    });
    
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to the AI engine. Please verify your internet connection and API key configuration.";
  }
};

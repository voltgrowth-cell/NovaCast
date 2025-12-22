
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeScreenContent = async (imageData: string, prompt: string) => {
  try {
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
    return "Failed to analyze screen content. Please check your connection stability.";
  }
};

export const chatWithScreenAssistant = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  try {
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
    return "I'm experiencing a bit of lag in my reasoning core. Please retry.";
  }
};

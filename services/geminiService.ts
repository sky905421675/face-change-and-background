import { GoogleGenAI, Part } from "@google/genai";
import { ModelVersion, ImageResolution, AspectRatio } from "../types";

// Helper to convert File to Base64
export const fileToPart = async (file: File): Promise<Part> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface GenerateImageParams {
  prompt: string;
  model: ModelVersion;
  referenceImages?: File[];
  resolution?: ImageResolution;
  aspectRatio?: AspectRatio;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImageContent = async ({
  prompt,
  model,
  referenceImages = [],
  resolution = ImageResolution.RES_1K,
  aspectRatio = AspectRatio.SQUARE,
}: GenerateImageParams): Promise<string> => {
  
  // Re-initialize client to ensure fresh API key if it changed
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: Part[] = [];

  // Add reference images first
  for (const file of referenceImages) {
    const imagePart = await fileToPart(file);
    parts.push(imagePart);
  }

  // Add text prompt
  parts.push({ text: prompt });

  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio,
    }
  };

  // Resolution is only supported on the Pro model
  if (model === ModelVersion.GEMINI_3_PRO_IMAGE) {
    config.imageConfig.imageSize = resolution;
  }
  
  // For editing/remixing with images, we don't set google_search typically.

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config
      });

      // Extract image from response
      if (response.candidates && response.candidates.length > 0) {
        const content = response.candidates[0].content;
        if (content.parts) {
          for (const part of content.parts) {
            if (part.inlineData && part.inlineData.data) {
               return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
      }
      
      throw new Error("No image generated in the response.");

    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed with error:`, error);
      lastError = error;

      // Check for 500 (Internal) or 503 (Service Unavailable)
      const msg = error.message || "";
      const status = error.status || 0;
      const isServerFactor = msg.includes("500") || msg.includes("503") || msg.includes("INTERNAL") || status === 500 || status === 503;

      // If it's a server error and we have retries left, wait and retry
      if (attempt < MAX_RETRIES && isServerFactor) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
        await wait(delay);
        continue;
      }

      // If it's not a server error, or we ran out of retries, stop loop
      break;
    }
  }

  throw new Error(lastError?.message || "Failed to generate image.");
};
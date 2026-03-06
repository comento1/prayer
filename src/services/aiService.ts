import { GoogleGenAI, GenerateContentParameters } from "@google/genai";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const PRIMARY_MODEL = "gemini-3.1-flash-lite-preview";
const FALLBACK_MODEL = "gemini-3.1-pro-preview";

let lastQuotaErrorTime = 0;
const COOLDOWN_PERIOD = 30000; // 30 seconds cooldown after a hard quota error

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractWaitTime(errorMessage: string): number | null {
  const match = errorMessage.match(/Please retry in ([\d.]+)s/);
  if (match && match[1]) {
    return parseFloat(match[1]) * 1000;
  }
  return null;
}

export async function generateAIContent(params: GenerateContentParameters) {
  // Check cooldown
  const now = Date.now();
  if (now - lastQuotaErrorTime < COOLDOWN_PERIOD) {
    console.warn("AI is in cooldown due to recent quota errors. Skipping call.");
    throw new Error("AI_COOLDOWN");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let lastError: any;
  let currentModel = params.model === "gemini-3-flash-preview" ? PRIMARY_MODEL : params.model;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      const errorStatus = error.status;
      
      const isQuotaError = 
        errorMessage.includes("429") || 
        errorMessage.includes("quota") ||
        errorStatus === "RESOURCE_EXHAUSTED" ||
        errorStatus === 429;
      
      if (isQuotaError) {
        lastQuotaErrorTime = Date.now();
        const waitTime = extractWaitTime(errorMessage);
        
        if (waitTime && waitTime > 10000) {
          throw error;
        }

        if (i < MAX_RETRIES - 1) {
          const delay = waitTime ? waitTime + 500 : INITIAL_RETRY_DELAY * Math.pow(2, i);
          console.warn(`AI Quota exceeded for ${currentModel}. Retrying in ${Math.round(delay)}ms...`);
          
          if (i >= 1 && currentModel !== FALLBACK_MODEL) {
            currentModel = FALLBACK_MODEL;
          }
          
          await sleep(delay);
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

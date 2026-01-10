
import { GoogleGenerativeAI } from "@google/generative-ai";

// Trim API Key to prevent common whitespace issues
const rawApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const apiKey = rawApiKey.trim();

// Debugging: Log API key info (safe parts only)
if (apiKey) {
  console.log("[Magno AI] API Key detected. Length:", apiKey.length, "| Prefix:", apiKey.substring(0, 4), "| Suffix:", apiKey.substring(apiKey.length - 4));
} else {
  console.warn("[Magno AI] VITE_GEMINI_API_KEY is missing.");
}

const genAI = new GoogleGenerativeAI(apiKey || "dummy_key");

/**
 * callGemini - Helper to try multiple models for a specific prompt.
 */
async function callGemini(prompt: string, fallbackModels: string[] = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-pro"]) {
  if (!apiKey) return null;

  for (const modelId of fallbackModels) {
    try {
      console.log(`[Magno AI] Calling model: ${modelId}`);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) {
        console.log(`[Magno AI] Success with model: ${modelId}`);
        return text;
      }
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("404")) {
        console.warn(`[Magno AI] Model ${modelId} not found (404). Trying next...`);
        continue;
      }
      if (msg.includes("429")) {
        console.warn(`[Magno AI] Model ${modelId} reached quota (429).`);
        return "QUOTA_EXCEEDED";
      }
      console.error(`[Magno AI] Model ${modelId} error:`, msg);
    }
  }
  return null;
}

/**
 * getNearbyAmenities - Attempts to find nearby places using multiple models.
 */
export const getNearbyAmenities = async (address: string, category: string = "general") => {
  if (!apiKey) return { text: "AI unavailable. Configura VITE_GEMINI_API_KEY.", grounding: [] };

  const searchPrompt = category === "general"
    ? `Eres un experto local en bienes raíces en México. Para la dirección "${address}", menciona 3 lugares específicos interesantes cercanos (parques, cafés, plazas). Proporciona un resumen de 2 frases sobre la vibra de la zona. Mantén un tono profesional y atractivo para un cliente inmobiliario de nivel alto. Responde SIEMPRE en español.`
    : `Para la propiedad en "${address}", encuentra 3 opciones específicas de "${category}" cercanas. Resume su calidad o relevancia en máximo 2 frases. Responde SIEMPRE en español.`;

  // Reorder: 1.5-flash is the most stable and has higher quotas for free tier
  const text = await callGemini(searchPrompt, ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-8b"]);

  if (text === "QUOTA_EXCEEDED" || !text) {
    // Graceful "Semi-Static" Fallback based on typical Jalisco/Luxury keywords
    const lowerCat = category.toLowerCase();
    const isRetail = lowerCat.includes("comerc") || lowerCat.includes("tiend") || lowerCat.includes("plaza") || lowerCat.includes("súper");
    const isEducation = lowerCat.includes("univ") || lowerCat.includes("escuel");
    const isParks = lowerCat.includes("parque") || lowerCat.includes("bosque") || lowerCat.includes("aire libre");
    const isHealth = lowerCat.includes("hospit") || lowerCat.includes("salud") || lowerCat.includes("medic");

    let fallbackText = "Magno AI analizó el entorno: Esta zona destaca por su excelente conectividad y cercanía a servicios de alta gama. Es una ubicación privilegiada con gran proyección de plusvalía.";

    if (isRetail) {
      fallbackText = "En las cercanías se encuentran centros comerciales de prestigio y opciones de retail premium. La zona destaca por su comodidad y acceso a servicios esenciales de lujo.";
    } else if (isEducation) {
      fallbackText = "La ubicación estratégica permite acceso rápido a instituciones educativas de alto nivel y centros de innovación destacados, ideal para un estilo de vida familiar y profesional.";
    } else if (isParks) {
      fallbackText = "El entorno cuenta con áreas verdes protegidas y parques recreativos que ofrecen un pulmón natural y espacios ideales para el bienestar y actividades al aire libre.";
    } else if (isHealth) {
      fallbackText = "La zona cuenta con cobertura de servicios de salud de primer nivel y hospitales de especialidades reconocidos, garantizando tranquilidad y seguridad para los residentes.";
    }

    return {
      text: fallbackText,
      grounding: []
    };
  }

  return {
    text: text,
    grounding: []
  };
};


export const getAIResponse = async (prompt: string, history: any[]) => {
  if (!apiKey) return "AI service is not configured.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Prefer 2.0 for chat too
    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role,
        parts: h.parts.map((p: any) => ({ text: p.text }))
      })),
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (err: any) {
    if (err.message?.includes("404")) {
      // Fallback for chat
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      try {
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage(prompt);
        return result.response.text();
      } catch (e) {
        return "Lo siento, tuve un problema al procesar tu mensaje.";
      }
    }
    return "Lo siento, tuve un problema al procesar tu mensaje. ¿Podemos intentarlo de nuevo?";
  }
};

export const summarizePropertyDescription = async (desc: string) => {
  const text = await callGemini(`Resume de forma atractiva para lujo: "${desc}". En español.`, ["gemini-1.5-flash", "gemini-2.0-flash-exp"]);
  return text && text !== "QUOTA_EXCEEDED" ? text : desc;
};

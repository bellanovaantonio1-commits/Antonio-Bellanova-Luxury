import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-flash-latest"
];

async function safeGenerateContent(params: any, retries = 2, delay = 2000): Promise<any> {
  let lastError: any;
  // Get unique models, prioritizing the one in params if provided
  const models = Array.from(new Set([params.model || PRIMARY_MODEL, ...FALLBACK_MODELS]));
  
  console.log(`Starting AI generation. Models to try: ${models.join(", ")}`);

  for (const modelName of models) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Trying model: ${modelName} (Attempt ${i + 1}/${retries})`);
        
        // Map params to Interactions API with correct snake_case
        const generationConfig: any = {};
        let responseFormat: any = params.response_format;

        if (params.config) {
          if (params.config.temperature !== undefined) generationConfig.temperature = params.config.temperature;
          if (params.config.topP !== undefined) generationConfig.top_p = params.config.topP;
          if (params.config.topK !== undefined) generationConfig.top_k = params.config.topK;
          if (params.config.maxOutputTokens !== undefined) generationConfig.max_output_tokens = params.config.maxOutputTokens;
          if (params.config.seed !== undefined) generationConfig.seed = params.config.seed;

          // For Interactions API, response format info goes into response_format, not generation_config
          if (params.config.responseMimeType === "application/json" || params.config.responseSchema) {
            responseFormat = {
              type: "OBJECT", // Default to OBJECT if not specified
              ...params.config.responseSchema
            };
          }
        }

        // Ensure input is in the correct format for the Interactions API
        let input = params.contents;
        if (Array.isArray(input)) {
          // If it's the standard messages format, extract the text from the last user message
          const lastMessage = [...input].reverse().find((m: any) => m.role === 'user');
          if (lastMessage && lastMessage.parts) {
            const textPart = (lastMessage.parts as any[]).find(p => p.text);
            if (textPart) {
              input = textPart.text;
            }
          }
        }

        const interaction = await ai.interactions.create({
          model: modelName,
          input: input,
          system_instruction: params.system_instruction,
          generation_config: Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
          response_format: responseFormat,
          tools: params.tools
        });
        
        let fullOutput = "";
        for (const step of interaction.steps) {
          if (step.type === 'model_output') {
            const textContent = (step.content as any[])?.find((c: any) => c.type === 'text');
            if (textContent && textContent.text) {
              fullOutput += textContent.text;
            }
          }
        }
        
        if (!fullOutput) {
          throw new Error(`Empty response from model ${modelName}`);
        }
        
        console.log(`Success with model: ${modelName}`);
        return {
          get text() { return fullOutput; },
          interaction
        };
      } catch (error: any) {
        lastError = error;
        // Extract status code and message
        const message = error.message || "";
        const status = error?.status || error?.code || (message.includes('429') ? 429 : (message.includes('404') ? 404 : 0));
        
        console.error(`Error with model ${modelName}:`, {
          status,
          message,
        });

        // 429: Resource Exhausted / Quota Exceeded
        if (status === 429) {
          // If we hit a hard daily limit or restricted quota, skip to next model immediately
          if (message.includes('limit: 20') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
            console.warn(`Hit quota limit for ${modelName}. Skipping to next model.`);
            break; 
          }
          
          const waitTime = delay * Math.pow(2, i);
          console.warn(`Gemini Rate Limit (429) for ${modelName}. Retry ${i + 1}/${retries} after ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // 404: Model not found or not supported in this region/version
        if (status === 404) {
          console.warn(`Model ${modelName} not found (404). Trying next fallback...`);
          break; // Try next model in fallback list
        }
        
        // For other unexpected errors, try next model
        console.warn(`Unexpected error for ${modelName}. Trying fallback...`);
        break;
      }
    }
  }
  
  throw lastError || new Error("Gemini analysis failed after trying all available models and retries.");
}

export async function extractProductFromText(text: string) {
  const prompt = `Extract product details from the following text and return as JSON. 
  Focus on Watches or Jewelry for Antonio Bellanova Luxury. 
  
  Format the response as JSON with:
  - name (the primary descriptive title)
  - brand
  - model
  - sku (reference number)
  - year
  - price
  - currency
  - type (WATCH/JEWELRY)
  - material
  - diameter
  - movement
  - box (boolean)
  - papers (boolean)
  - conditionGroup (NEW, UNUSED, PRE_OWNED, VINTAGE)
  - conditionRemarks
  - maintenancePerformed (boolean)
  - maintenanceDescription
  
  - titleDe
  - titleEn
  - descriptionDe
  - descriptionEn
  - shortDescriptionDe
  - shortDescriptionEn
  - specificationsDe
  - specificationsEn
  - scopeOfDeliveryDe
  - scopeOfDeliveryEn
  - conditionDe
  - conditionEn
  
  - seoTitleDe
  - seoDescriptionDe
  - seoTitleEn
  - seoDescriptionEn
  
  Text: ${text}`;

  const response = await safeGenerateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function analyzeProductImport(rawData: any) {
  // Trim raw data to reduce token usage and noise
  const sanitizedData = {
    ...rawData,
    description: rawData.description?.substring(0, 5000), // Limit description size
    images: rawData.images?.slice(0, 15) // Limit number of images passed
  };

  const prompt = `
  You are an expert luxury copywriter for "Antonio Bellanova Luxury", a high-end boutique in Cologne. 
  Your goal is to create world-class product listings based on raw supplier data.

  CRITICAL STRATEGY:
  - DO NOT COPY: Never translate or copy the source description literally.
  - FACT-BASED CREATION: Extract key facts (Brand, Model, Ref, Specs, Condition) and write ENTIRELY NEW, professional, and elegant copy.
  - TONE: Sophisticated, natural, and trustworthy. Antonio Bellanova Luxury is the speaker.
  - NO SOURCE REFERENCES: Never mention the supplier, "TS Trading", or say "according to the source".

  FIELD CONTENT RULES (Apply to both DE and EN independently):
  1. title: "[BRAND] [MODEL] [REFERENCE]" (Western characters only).
  2. shortDescription: A punchy one-sentence summary of the piece.
  3. description (FLOW TEXT): 
     - 1-2 elegant paragraphs. Highlight the watch's character and craftsmanship. 
     - Use facts about material, movement, and dial to tell a story.
     - NO bullet points here.
     - NEVER include a "Details:" section, asterisk lists, or specification tables in description.
  4. specificationsText: One structured line per attribute using "Label: Value" format, separated by newlines (NOT pipes, NOT asterisks).
  5. conditionText: A natural, descriptive sentence about the condition. 
     - DO NOT use rank codes (A, AB, etc.). 
     - Instead: "Very good condition with minor signs of wear on the bezel."
  6. scopeOfDelivery: What is included (e.g., "Original papers", "Luxury travel case").
  7. SEO: Create a professional seoTitle and seoDescription.

  LANGUAGE RULES:
  - contentDe: MUST be high-quality, professional German. Use terms like "Edelstahl", "Saphirglas", "Automatikaufzug".
  - contentEn: MUST be high-quality, professional English.
  - STRICT SEPARATION: German stays in DE fields, English in EN fields.

  EXCLUSIONS:
  - Exclude all supplier-specific stock info, shipping policies, and general dealer notices.

  Rank Mapping (For internal logic):
  - N -> NEW (Neu / New)
  - S -> UNUSED (Ungetragen / Unused)
  - SA/A -> Excellent (Hervorragend / Excellent)
  - AB/B -> Very Good (Sehr gut / Very Good)
  - BC/C -> Good (Gut / Good)

  IMPORTANT: Your response MUST be a valid JSON object matching the requested structure.
  
  Source data: ${JSON.stringify(sanitizedData)}`;

  const response = await safeGenerateContent({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          extractedData: {
            type: "OBJECT",
            properties: {
              brand: { type: "STRING" },
              model: { type: "STRING" },
              sku: { type: "STRING" },
              year: { type: "STRING" },
              price: { type: "STRING" },
              currency: { type: "STRING" },
              conditionGroup: { type: "STRING" },
              specifications: { type: "OBJECT" }
            },
            required: ["brand", "model", "sku"]
          },
          contentDe: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              shortDescription: { type: "STRING" },
              description: { type: "STRING" },
              specificationsText: { type: "STRING" },
              scopeOfDelivery: { type: "STRING" },
              conditionText: { type: "STRING" },
              seoTitle: { type: "STRING" },
              seoDescription: { type: "STRING" }
            },
            required: ["title", "description", "conditionText"]
          },
          contentEn: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              shortDescription: { type: "STRING" },
              description: { type: "STRING" },
              specificationsText: { type: "STRING" },
              scopeOfDelivery: { type: "STRING" },
              conditionText: { type: "STRING" },
              seoTitle: { type: "STRING" },
              seoDescription: { type: "STRING" }
            },
            required: ["title", "description", "conditionText"]
          }
        },
        required: ["extractedData", "contentDe", "contentEn"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  
  if (!result.extractedData) {
    throw new Error("AI failed to extract valid product data structure");
  }

  return {
    extractedData: result.extractedData,
    confidence: result.confidence || {},
    contentDe: result.contentDe,
    contentEn: result.contentEn
  };
}

/**
 * OpenAI API Service
 * Instagram Automation - Sade Patisserie
 *
 * Services:
 * 1. Vision API - Photo analysis
 * 2. DALL-E 3 - Image enhancement (to be added)
 */

import {OpenAIVisionResponse, OpenAIImageResponse, ProductCategory} from "../types";
import {
  OPENAI_MODEL_VISION,
  OPENAI_MODEL_DALLE,
  DALLE_SIZE,
  DALLE_QUALITY,
} from "../config/constants";
import {buildEnhancementPrompt} from "../utils";

const OPENAI_API_BASE = "https://api.openai.com/v1";

/**
 * OpenAI API Error
 */
export class OpenAIApiError extends Error {
  /** HTTP status code */
  public statusCode?: number;
  /** OpenAI error type */
  public errorType?: string;

  /**
   * Create OpenAI API Error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorType - OpenAI error type
   */
  constructor(
    message: string,
    statusCode?: number,
    errorType?: string
  ) {
    super(message);
    this.name = "OpenAIApiError";
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

/**
 * Vision Analysis Prompt Template
 * Sade Patisserie'ye özel analiz prompt'u
 */
const VISION_ANALYSIS_PROMPT = "Bu Sade Patisserie ürün fotoğrafını " +
  `profesyonel bir food photographer gözüyle analiz et.

Şunları değerlendir:
1. Işık ve aydınlatma kalitesi
2. Ürünün görsel çekiciliği ve iştah açıcılığı
3. Renk paletinin zenginliği ve canlılığı
4. Kompozisyon ve ürün yerleşimi
5. Arka plan ve çevre düzenlemesi

Instagram için görsel iyileştirme önerileri ver:
- Hangi unsurlar güçlendirilmeli?
- Işık nasıl iyileştirilebilir?
- Renklerde ne tür düzenlemeler yapılmalı?

Kısa ve öz analiz yap (4-5 cümle). Türkçe yanıt ver.`;

/**
 * Category-specific analysis hints
 */
const CATEGORY_HINTS: Record<ProductCategory, string> = {
  "viennoiserie": "Altın rengi kabuk, gevreklik, tereyağlı doku önemli.",
  "coffee": "Buhar efekti, crema kalitesi, sıcak atmosfer değerlendir.",
  "chocolate": "Parlaklık, zengin kakao renkleri, lüks hissi önemli.",
  "small-desserts": "Detay işçiliği, renk canlılığı, zarif sunum değerlendir.",
  "slice-cakes": "Katman yapısı, doku detayları, kesit görünümü önemli.",
  "big-cakes": "Dekorasyon kalitesi, kutlama havası, etkileyicilik değerlendir.",
  "profiterole": "Krem dokusu, çikolata akışı, zarif sunum önemli.",
  "special-orders": "Sanatsal tasarım, benzersizlik, premium kalite değerlendir.",
};

/**
 * OpenAI API Service
 * Handles OpenAI Vision and DALL-E interactions
 */
export class OpenAIService {
  private apiKey: string;

  /**
   * Create OpenAI Service
   * @param {string} apiKey - OpenAI API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get authorization headers
   * @return {object} Headers object
   */
  private getHeaders(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Analyze photo using GPT-4 Vision
   * Returns insights and improvement suggestions
   *
   * @param {string} photoUrl - Public URL of the photo to analyze
   * @param {ProductCategory} category - Product category for context
   * @return {Promise<OpenAIVisionResponse>} Analysis and suggestions
   */
  async analyzePhoto(
    photoUrl: string,
    category?: ProductCategory
  ): Promise<OpenAIVisionResponse> {
    console.log("[OpenAI] Starting photo analysis...");
    console.log("[OpenAI] Photo URL:", photoUrl);
    console.log("[OpenAI] Category:", category || "general");

    // Build prompt with category hint if available
    let prompt = VISION_ANALYSIS_PROMPT;
    if (category && CATEGORY_HINTS[category]) {
      prompt += `\n\nÜrün kategorisi: ${category}\nÖzel not: ${CATEGORY_HINTS[category]}`;
    }

    const requestBody = {
      model: OPENAI_MODEL_VISION,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: photoUrl,
                detail: "high", // High detail for better analysis
              },
            },
          ],
        },
      ],
      max_tokens: 500, // Enough for detailed analysis
    };

    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || "Vision analysis failed";
        const errorType = data.error?.type;

        console.error("[OpenAI] Vision analysis failed:", errorMessage);

        // Handle specific errors
        if (response.status === 401) {
          throw new OpenAIApiError(
            "Invalid API key. Please check your OpenAI API key.",
            response.status,
            "invalid_api_key"
          );
        }

        if (response.status === 429) {
          throw new OpenAIApiError(
            "Rate limit exceeded. Please try again later.",
            response.status,
            "rate_limit_exceeded"
          );
        }

        if (response.status === 503) {
          throw new OpenAIApiError(
            "OpenAI service overloaded. Please try again.",
            response.status,
            "service_unavailable"
          );
        }

        throw new OpenAIApiError(errorMessage, response.status, errorType);
      }

      // Extract response content
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new OpenAIApiError(
          "No analysis content received from Vision API",
          500,
          "empty_response"
        );
      }

      console.log("[OpenAI] Analysis completed successfully");

      // Parse the response into analysis and suggestions
      // The model typically provides both in the same response
      const result: OpenAIVisionResponse = {
        analysis: content,
        suggestions: this.extractSuggestions(content),
      };

      return result;
    } catch (error) {
      // Re-throw OpenAI errors
      if (error instanceof OpenAIApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new OpenAIApiError(
            "Request timed out. Please try again.",
            408,
            "timeout"
          );
        }

        throw new OpenAIApiError(
          `Network error: ${error.message}`,
          500,
          "network_error"
        );
      }

      throw new OpenAIApiError("Unknown error occurred", 500, "unknown");
    }
  }

  /**
   * Extract improvement suggestions from analysis text
   * Helper method to separate suggestions from analysis
   *
   * @param {string} content - Full analysis content
   * @return {string} Extracted suggestions
   */
  private extractSuggestions(content: string): string {
    // Look for common suggestion indicators in Turkish
    const suggestionMarkers = [
      "iyileştirme",
      "öneri",
      "geliştir",
      "artır",
      "güçlendir",
    ];

    const lines = content.split("\n");
    const suggestionLines: string[] = [];
    let inSuggestionSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check if we're entering a suggestion section
      if (suggestionMarkers.some((marker) => lowerLine.includes(marker))) {
        inSuggestionSection = true;
      }

      if (inSuggestionSection && line.trim()) {
        suggestionLines.push(line);
      }
    }

    // If no specific suggestions found, return a summary
    if (suggestionLines.length === 0) {
      return "Detaylı iyileştirme önerileri için analiz metnini inceleyin.";
    }

    return suggestionLines.join("\n");
  }

  /**
   * Validate API key by making a simple request
   * @return {Promise<boolean>} True if valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${OPENAI_API_BASE}/models`, {
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Enhance photo using DALL-E 3
   * Generates an improved version of the product photo
   *
   * @param {string} originalDescription - Vision API analysis of the photo
   * @param {ProductCategory} category - Product category
   * @param {string} productName - Optional specific product name
   * @return {Promise<OpenAIImageResponse>} Enhanced image URL and prompt
   */
  async enhancePhoto(
    originalDescription: string,
    category: ProductCategory,
    productName?: string
  ): Promise<OpenAIImageResponse> {
    console.log("[OpenAI] Starting DALL-E 3 image enhancement...");
    console.log("[OpenAI] Category:", category);
    console.log("[OpenAI] Product:", productName || "generic");

    // Build the enhancement prompt
    const prompt = buildEnhancementPrompt(
      category,
      originalDescription,
      productName
    );

    console.log("[OpenAI] Prompt length:", prompt.length, "chars");

    const requestBody = {
      model: OPENAI_MODEL_DALLE,
      prompt: prompt,
      n: 1, // Generate single image
      size: DALLE_SIZE,
      quality: DALLE_QUALITY,
      response_format: "url", // Get URL instead of base64
    };

    try {
      const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || "Image generation failed";
        const errorType = data.error?.type;

        console.error("[OpenAI] DALL-E generation failed:", errorMessage);

        // Handle specific errors
        if (response.status === 401) {
          throw new OpenAIApiError(
            "Invalid API key. Please check your OpenAI API key.",
            response.status,
            "invalid_api_key"
          );
        }

        if (response.status === 429) {
          throw new OpenAIApiError(
            "Rate limit exceeded. Please try again later.",
            response.status,
            "rate_limit_exceeded"
          );
        }

        if (response.status === 400) {
          // Content policy or invalid request
          if (errorMessage.includes("content_policy")) {
            throw new OpenAIApiError(
              "Content policy violation. Image rejected.",
              response.status,
              "content_policy"
            );
          }
          throw new OpenAIApiError(
            `Invalid request: ${errorMessage}`,
            response.status,
            "invalid_request"
          );
        }

        throw new OpenAIApiError(errorMessage, response.status, errorType);
      }

      // Extract generated image URL
      const imageData = data.data?.[0];

      if (!imageData?.url) {
        throw new OpenAIApiError(
          "No image URL received from DALL-E API",
          500,
          "empty_response"
        );
      }

      console.log("[OpenAI] Image enhancement completed successfully");

      const result: OpenAIImageResponse = {
        url: imageData.url,
        revisedPrompt: imageData.revised_prompt,
      };

      return result;
    } catch (error) {
      // Re-throw OpenAI errors
      if (error instanceof OpenAIApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new OpenAIApiError(
            "Request timed out. DALL-E can take up to 60 seconds.",
            408,
            "timeout"
          );
        }

        throw new OpenAIApiError(
          `Network error: ${error.message}`,
          500,
          "network_error"
        );
      }

      throw new OpenAIApiError("Unknown error occurred", 500, "unknown");
    }
  }
}

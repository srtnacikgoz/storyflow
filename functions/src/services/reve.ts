/**
 * Reve Image Service
 * Image-to-image transformation using Reve AI API
 * https://api.reve.com/v1/image/edit
 */

import { AILogService } from "./aiLogService";

/**
 * Reve API config
 */
export interface ReveConfig {
  apiKey: string;
  version?: "latest" | "latest-fast" | "reve-edit@20250915" | "reve-edit-fast@20251030";
  testTimeScaling?: number; // 1-15, varsayılan 1
}

/**
 * Image transform seçenekleri
 */
export interface ReveTransformOptions {
  prompt: string;
  negativePrompt?: string; // Reve'de native destek yok, prompt'a eklenecek
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4" | "3:2" | "2:3";
  referenceImages?: Array<{ base64: string; mimeType: string; label: string; description?: string }>;
}

/**
 * Transform sonucu
 */
export interface ReveTransformResult {
  imageBase64: string;
  mimeType: string;
  model: string;
  cost: number;
  creditsUsed?: number;
  creditsRemaining?: number;
}

/**
 * Reve API Hata Sınıfı
 */
export class ReveApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "ReveApiError";
  }
}

/**
 * Reve Content Violation Hata Sınıfı
 */
export class ReveContentViolationError extends ReveApiError {
  constructor(message: string) {
    super(message, "CONTENT_POLICY_VIOLATION");
    this.name = "ReveContentViolationError";
  }
}

/**
 * ReveService - Image-to-Image transformation using Reve AI
 */
export class ReveService {
  private apiKey: string;
  private version: string;
  private testTimeScaling: number;
  private baseUrl = "https://api.reve.com/v1";

  // Pipeline context for logging
  private pipelineContext: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  } = {};

  /**
   * Maliyet sabitleri (credits per request - tahmini)
   * Edit: ~30 credits, Create: ~18 credits
   * 1 credit ≈ $0.001 (tahmini)
   */
  static readonly COSTS: Record<string, number> = {
    "reve-edit@20250915": 0.03,
    "reve-edit-fast@20251030": 0.02,
    "reve-create@20250915": 0.018,
    "latest": 0.03,
    "latest-fast": 0.02,
  };

  constructor(config: ReveConfig) {
    this.apiKey = config.apiKey;
    this.version = config.version || "latest";
    this.testTimeScaling = config.testTimeScaling || 1;
  }

  /**
   * Pipeline context'i ayarla (loglama için)
   */
  setPipelineContext(context: {
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  }): void {
    this.pipelineContext = context;
  }

  /**
   * Image-to-Image transformation (Edit endpoint)
   * Ana görseli referans alarak yeni görsel üretir
   */
  async transformImage(
    imageBase64: string,
    mimeType: string,
    options: ReveTransformOptions
  ): Promise<ReveTransformResult> {
    const startTime = Date.now();

    // Edit instruction oluştur
    let editInstruction = options.prompt;

    // Negative prompt'u instruction'a ekle (Reve'de native destek yok)
    if (options.negativePrompt) {
      editInstruction += `\n\nAVOID: ${options.negativePrompt}`;
    }

    // Referans görsellerin açıklamalarını prompt'a ekle
    if (options.referenceImages && options.referenceImages.length > 0) {
      const refDescriptions = options.referenceImages
        .filter(ref => ref.description)
        .map(ref => `- ${ref.label.toUpperCase()}: ${ref.description}`)
        .join("\n");

      if (refDescriptions) {
        editInstruction = `ADDITIONAL ELEMENTS TO INCLUDE:\n${refDescriptions}\n\n${editInstruction}`;
      }
    }

    // Request body
    const requestBody: Record<string, unknown> = {
      edit_instruction: editInstruction.substring(0, 2560), // Max 2560 chars
      reference_image: imageBase64,
      version: this.version,
    };

    // Aspect ratio
    if (options.aspectRatio) {
      requestBody.aspect_ratio = options.aspectRatio;
    }

    // Test time scaling (daha iyi kalite için)
    if (this.testTimeScaling > 1) {
      requestBody.test_time_scaling = this.testTimeScaling;
    }

    try {
      console.log(`[ReveService] Generating with model: ${this.version}`);
      console.log(`[ReveService] Edit instruction length: ${editInstruction.length} chars`);

      const response = await fetch(`${this.baseUrl}/image/edit`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const durationMs = Date.now() - startTime;

      // Response handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = errorData.error_code || "API_ERROR";
        const errorMessage = errorData.message || `HTTP ${response.status}`;

        console.error(`[ReveService] API error: ${errorCode} - ${errorMessage}`);

        // Log error
        await AILogService.logGemini("image-generation", {
          model: this.version,
          userPrompt: editInstruction.substring(0, 500),
          status: "error",
          error: `${errorCode}: ${errorMessage}`,
          cost: 0,
          durationMs,
          pipelineId: this.pipelineContext.pipelineId,
          slotId: this.pipelineContext.slotId,
          productType: this.pipelineContext.productType,
        });

        throw new ReveApiError(errorMessage, errorCode, response.status);
      }

      const data = await response.json();

      // Content violation check
      if (data.content_violation) {
        console.warn("[ReveService] Content policy violation detected");

        await AILogService.logGemini("image-generation", {
          model: data.version || this.version,
          userPrompt: editInstruction.substring(0, 500),
          status: "blocked",
          error: "Content policy violation",
          cost: 0,
          durationMs,
          pipelineId: this.pipelineContext.pipelineId,
          slotId: this.pipelineContext.slotId,
          productType: this.pipelineContext.productType,
        });

        throw new ReveContentViolationError("Generated image violates content policy");
      }

      // Success
      const creditsUsed = data.credits_used || 30;
      const estimatedCost = (creditsUsed / 1000); // 1 credit ≈ $0.001

      console.log(`[ReveService] Image generated successfully`);
      console.log(`[ReveService] Credits used: ${creditsUsed}, Remaining: ${data.credits_remaining}`);

      // Log success
      await AILogService.logGemini("image-generation", {
        model: data.version || this.version,
        userPrompt: editInstruction.substring(0, 500),
        status: "success",
        cost: estimatedCost,
        durationMs,
        inputImageCount: 1 + (options.referenceImages?.length || 0),
        outputImageGenerated: true,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      return {
        imageBase64: data.image,
        mimeType: "image/png", // Reve returns PNG by default
        model: data.version || this.version,
        cost: estimatedCost,
        creditsUsed: data.credits_used,
        creditsRemaining: data.credits_remaining,
      };

    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Known errors
      if (error instanceof ReveApiError || error instanceof ReveContentViolationError) {
        throw error;
      }

      // Network or other errors
      const errorMessage = error instanceof Error ? error.message : "Unknown Reve API error";
      console.error(`[ReveService] Error:`, error);

      await AILogService.logGemini("image-generation", {
        model: this.version,
        userPrompt: editInstruction.substring(0, 500),
        status: "error",
        error: errorMessage,
        cost: 0,
        durationMs,
        pipelineId: this.pipelineContext.pipelineId,
        slotId: this.pipelineContext.slotId,
        productType: this.pipelineContext.productType,
      });

      throw new ReveApiError(errorMessage, "NETWORK_ERROR");
    }
  }

  /**
   * Text-to-Image generation (Create endpoint)
   * Sadece prompt'tan görsel üretir
   */
  async createImage(
    prompt: string,
    options?: {
      aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4" | "3:2" | "2:3";
      negativePrompt?: string;
    }
  ): Promise<ReveTransformResult> {
    let fullPrompt = prompt;
    if (options?.negativePrompt) {
      fullPrompt += `\n\nAVOID: ${options.negativePrompt}`;
    }

    const requestBody: Record<string, unknown> = {
      prompt: fullPrompt.substring(0, 2560),
      version: this.version.replace("edit", "create"), // edit → create
    };

    if (options?.aspectRatio) {
      requestBody.aspect_ratio = options.aspectRatio;
    }

    if (this.testTimeScaling > 1) {
      requestBody.test_time_scaling = this.testTimeScaling;
    }

    try {
      console.log(`[ReveService] Creating image with prompt: ${prompt.substring(0, 100)}...`);

      const response = await fetch(`${this.baseUrl}/image/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ReveApiError(
          errorData.message || `HTTP ${response.status}`,
          errorData.error_code || "API_ERROR",
          response.status
        );
      }

      const data = await response.json();

      if (data.content_violation) {
        throw new ReveContentViolationError("Generated image violates content policy");
      }

      const creditsUsed = data.credits_used || 18;
      const estimatedCost = (creditsUsed / 1000);

      console.log(`[ReveService] Image created successfully. Credits: ${creditsUsed}`);

      return {
        imageBase64: data.image,
        mimeType: "image/png",
        model: data.version || "reve-create",
        cost: estimatedCost,
        creditsUsed: data.credits_used,
        creditsRemaining: data.credits_remaining,
      };

    } catch (error) {
      if (error instanceof ReveApiError) throw error;
      throw new ReveApiError(
        error instanceof Error ? error.message : "Unknown error",
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Bağlantı testi
   */
  async testConnection(): Promise<boolean> {
    try {
      // Basit bir create isteği ile test et (çok düşük maliyetli)
      const response = await fetch(`${this.baseUrl}/image/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "test connection",
          version: "latest-fast",
        }),
      });

      // 401 değilse API key geçerli
      return response.status !== 401;
    } catch (error) {
      console.error("[ReveService] Connection test failed:", error);
      return false;
    }
  }
}

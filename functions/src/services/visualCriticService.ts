import { GoogleGenerativeAI } from "@google/generative-ai";

import { AILogService } from "./aiLogService";
import { ConfigSnapshot, AppliedRules, DecisionDetails, RetryInfo, AILogStage } from "../types";

export interface PipelineContext {
    configSnapshot?: ConfigSnapshot;
    appliedRules?: AppliedRules;
    assetSelection?: DecisionDetails;
    scenarioSelection?: DecisionDetails;
    promptDetails?: DecisionDetails;
    imageGeneration?: {
        retryInfo?: RetryInfo;
        referenceImages?: Array<{ type: string; filename: string }>;
    };
}

interface CritiqueRequest {
    imageBase64: string;
    mimeType: string;
    originalPrompt: string;
    intendedMood: string;
    productName: string;
    pipelineId?: string;
    pipelineContext?: PipelineContext | null; // YENİ: Pipeline context
}

interface CritiqueResponse {
    score: number;
    critique: string;
    issues: string[];
    suggestions: string[];
    refined_prompt?: string;
}

/**
 * Visual Critic Service
 * Gemini 1.5 Pro Vision kullanarak görsel eleştirisi yapar (On-Demand)
 */
export class VisualCriticService {
    private genAI: GoogleGenerativeAI;
    private modelName = "gemini-3-pro-preview"; // Vision yeteneği olan güncel model

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Eleştiri Promptunu (System Instruction) yükle
     */
    private loadSystemPrompt(): string {
        // Fallback Prompt (Dosya okumazsa)
        return `Sen kıdemli bir Sanat Yönetmeni ve Teknik Fotoğraf Eleştirmenisin.
    Üretilen görseli Kullanıcının Niyeti, Teknik Standartlar ve Pipeline Spesifikasyonları açısından analiz et.
    
    ÇIKTI FORMATI (JSON):
    {
      "score": (0-10 arası puan),
      "critique": "Detaylı analiz paragrafı. Beklentilerin karşılanıp karşılanmadığını belirt.",
      "issues": ["Uyumsuzluk 1", "Teknik Sorun 2"],
      "suggestions": ["Öneri 1", "Öneri 2"],
      "refined_prompt": "Daha iyi sonuç almak için önerilen prompt (opsiyonel)"
    }
    
    Yanıtı SADECE geçerli bir JSON objesi olarak ver. Markdown formatı kullanma.
    Tüm metinleri TÜRKÇE yaz.`;
    }

    /**
     * Görseli Analiz Et
     */
    async critiqueImage(request: CritiqueRequest): Promise<{ success: boolean; data?: CritiqueResponse; error?: string }> {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2, // Assertion check için daha deterministik olmalı
            },
            systemInstruction: this.loadSystemPrompt()
        });

        // Pipeline context varsa assertion prompt'u oluştur
        let assertionContext = "";
        if (request.pipelineContext) {
            const ctx = request.pipelineContext;

            assertionContext = `
    PIPELINE CONTEXT (ASSERTION CHECK - BUNLARA KESİN UYULMALI):
    `;

            if (ctx.configSnapshot) {
                if (ctx.configSnapshot.styleName) assertionContext += `- Stil: ${ctx.configSnapshot.styleName}\n`;
                if (ctx.configSnapshot.timeOfDay) assertionContext += `- Zaman: ${ctx.configSnapshot.timeOfDay}\n`;
                if (ctx.configSnapshot.themeColors) assertionContext += `- Renk Paleti: ${ctx.configSnapshot.themeColors.join(", ")}\n`;
            }

            if (ctx.assetSelection && ctx.assetSelection.selectedAssets) {
                assertionContext += `- SEÇİLEN VARLIKLAR (Görselde bunlar olmalı):\n`;
                Object.values(ctx.assetSelection.selectedAssets).forEach(asset => {
                    assertionContext += `  * ${asset.type}: ${asset.filename}\n`;
                });
            }

            if (ctx.scenarioSelection && ctx.scenarioSelection.selectedScenario) {
                const scen = ctx.scenarioSelection.selectedScenario;
                assertionContext += `- SENARYO: ${scen.name}\n`;
                assertionContext += `- EL DURUMU: ${scen.includesHands ? "Görünmeli" : "Görünmemeli"}\n`;
                if (scen.handStyle) assertionContext += `- EL STİLİ: ${scen.handStyle}\n`;
                if (scen.compositionId) assertionContext += `- KOMPOZİSYON: ${scen.compositionId}\n`;
            }

            assertionContext += `
    GÖREVİN:
    Görselin yukarıdaki "PIPELINE CONTEXT" içindeki beklentilere uyup uymadığını kontrol et.
    Örneğin: "El görünmeli" denmişse ve görselde el yoksa, bunu "issues" listesine ekle ve puan kır.
    Seçilen varlıklar (tabak, fincan vb.) görselde tanınabilir şekilde var mı kontrol et.
    `;
        }

        const userPrompt = `
    NİYET ANALİZİ:
    - Ürün: ${request.productName}
    - Mood: ${request.intendedMood}
    - Orijinal Prompt: ${request.originalPrompt}

    ${assertionContext}
    
    Ekteki görseli analiz et. Niyetle ve (varsa) Pipeline Context ile uyuşuyor mu?
    Işık, kompozisyon ve gerçekçilik nasıl?
    Yanıtını JSON olarak VE TÜRKÇE ver.
    `;

        try {
            const startTime = Date.now();
            console.log("[VisualCritic] Starting analysis with context...");

            const result = await model.generateContent([
                { inlineData: { data: request.imageBase64, mimeType: request.mimeType } },
                { text: userPrompt }
            ]);

            const response = result.response;
            let text = response.text();
            // Markdown temizliği
            text = text.replace(/```json|```/g, "").trim();

            const data = JSON.parse(text) as CritiqueResponse;

            const durationMs = Date.now() - startTime;

            // Logla (createLog kullanıyoruz çünkü visual-critic stage'i)
            await AILogService.createLog({
                provider: "gemini",
                stage: "visual-critic" as AILogStage,
                model: this.modelName,
                userPrompt: "Visual Critique Request (Assertion-Based)",
                status: "success",
                cost: 0,
                durationMs,
                pipelineId: request.pipelineId,
                response: text,
                responseData: data as unknown as Record<string, unknown>
            });

            console.log(`[VisualCritic] Analysis complete. Score: ${data.score}`);

            return { success: true, data };

        } catch (error) {
            console.error("[VisualCritic] Error:", error);
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    }
}

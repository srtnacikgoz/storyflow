/**
 * AI Log Service
 * Claude ve Gemini çağrılarını Firestore'a kaydeder
 */

import * as admin from "firebase-admin";
import { AILog, AILogStage, AILogStatus, AIProvider } from "../types";

// Firestore referansı
const getDb = () => admin.firestore();

/**
 * AI Log Service
 */
export class AILogService {
  private static readonly COLLECTION = "ai-logs";
  private static readonly MAX_LOGS_PER_QUERY = 100;

  /**
   * Yeni AI log oluştur
   */
  static async createLog(
    data: Omit<AILog, "id" | "createdAt">
  ): Promise<string> {
    try {
      const db = getDb();
      const docRef = db.collection(this.COLLECTION).doc();

      // undefined değerleri kaldır (Firestore undefined kabul etmiyor)
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );

      const log: AILog = {
        ...cleanData,
        id: docRef.id,
        createdAt: Date.now(),
      } as AILog;

      // Prompt'ları kısalt (çok uzun olabilir)
      if (log.systemPrompt && log.systemPrompt.length > 10000) {
        log.systemPrompt = log.systemPrompt.substring(0, 10000) + "... [truncated]";
      }
      if (log.userPrompt && log.userPrompt.length > 10000) {
        log.userPrompt = log.userPrompt.substring(0, 10000) + "... [truncated]";
      }
      if (log.response && log.response.length > 10000) {
        log.response = log.response.substring(0, 10000) + "... [truncated]";
      }

      await docRef.set(log);
      console.log(`[AILogService] Log created: ${docRef.id} (${data.provider}/${data.stage})`);

      return docRef.id;
    } catch (error) {
      // Loglama hatası pipeline'ı durdurmamalı
      console.error("[AILogService] Error creating log:", error);
      return "";
    }
  }

  /**
   * Claude log helper
   */
  static async logClaude(
    stage: AILogStage,
    data: {
      model: string;
      systemPrompt: string;
      userPrompt: string;
      response?: string;
      responseData?: Record<string, unknown>;
      status: AILogStatus;
      error?: string;
      tokensUsed?: number;
      cost?: number;
      durationMs: number;
      pipelineId?: string;
      slotId?: string;
      productType?: string;
    }
  ): Promise<string> {
    return this.createLog({
      provider: "claude",
      stage,
      model: data.model,
      systemPrompt: data.systemPrompt,
      userPrompt: data.userPrompt,
      response: data.response,
      responseData: data.responseData,
      status: data.status,
      error: data.error,
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      durationMs: data.durationMs,
      pipelineId: data.pipelineId,
      slotId: data.slotId,
      productType: data.productType,
    });
  }

  /**
   * Gemini log helper
   */
  static async logGemini(data: {
    model: string;
    userPrompt: string;
    negativePrompt?: string;
    status: AILogStatus;
    error?: string;
    cost?: number;
    durationMs: number;
    inputImageCount?: number;
    outputImageGenerated?: boolean;
    pipelineId?: string;
    slotId?: string;
    productType?: string;
  }): Promise<string> {
    return this.createLog({
      provider: "gemini",
      stage: "image-generation",
      model: data.model,
      userPrompt: data.userPrompt,
      negativePrompt: data.negativePrompt,
      status: data.status,
      error: data.error,
      cost: data.cost,
      durationMs: data.durationMs,
      inputImageCount: data.inputImageCount,
      outputImageGenerated: data.outputImageGenerated,
      pipelineId: data.pipelineId,
      slotId: data.slotId,
      productType: data.productType,
    });
  }

  /**
   * Log listesi getir
   */
  static async getLogs(options?: {
    provider?: AIProvider;
    stage?: AILogStage;
    status?: AILogStatus;
    pipelineId?: string;
    limit?: number;
    startAfter?: number;
  }): Promise<AILog[]> {
    try {
      const db = getDb();
      let query: FirebaseFirestore.Query = db.collection(this.COLLECTION);

      // Filtreler
      if (options?.provider) {
        query = query.where("provider", "==", options.provider);
      }
      if (options?.stage) {
        query = query.where("stage", "==", options.stage);
      }
      if (options?.status) {
        query = query.where("status", "==", options.status);
      }
      if (options?.pipelineId) {
        query = query.where("pipelineId", "==", options.pipelineId);
      }

      // Sıralama ve limit
      query = query.orderBy("createdAt", "desc");

      if (options?.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      query = query.limit(options?.limit || this.MAX_LOGS_PER_QUERY);

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => doc.data() as AILog);
    } catch (error) {
      console.error("[AILogService] Error fetching logs:", error);
      return [];
    }
  }

  /**
   * Pipeline'a ait logları getir
   */
  static async getLogsByPipeline(pipelineId: string): Promise<AILog[]> {
    return this.getLogs({ pipelineId, limit: 50 });
  }

  /**
   * İstatistikleri getir
   */
  static async getStats(lastHours: number = 24): Promise<{
    totalCalls: number;
    claudeCalls: number;
    geminiCalls: number;
    successRate: number;
    totalCost: number;
    avgDurationMs: number;
    byStage: Record<string, number>;
    errorCount: number;
  }> {
    try {
      const db = getDb();
      const cutoffTime = Date.now() - lastHours * 60 * 60 * 1000;

      const snapshot = await db
        .collection(this.COLLECTION)
        .where("createdAt", ">=", cutoffTime)
        .get();

      const logs = snapshot.docs.map((doc) => doc.data() as AILog);

      const claudeCalls = logs.filter((l) => l.provider === "claude").length;
      const geminiCalls = logs.filter((l) => l.provider === "gemini").length;
      const successCount = logs.filter((l) => l.status === "success").length;
      const errorCount = logs.filter((l) => l.status === "error").length;
      const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
      const totalDuration = logs.reduce((sum, l) => sum + (l.durationMs || 0), 0);

      // Stage bazlı istatistikler
      const byStage: Record<string, number> = {};
      for (const log of logs) {
        byStage[log.stage] = (byStage[log.stage] || 0) + 1;
      }

      return {
        totalCalls: logs.length,
        claudeCalls,
        geminiCalls,
        successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
        totalCost,
        avgDurationMs: logs.length > 0 ? totalDuration / logs.length : 0,
        byStage,
        errorCount,
      };
    } catch (error) {
      console.error("[AILogService] Error fetching stats:", error);
      return {
        totalCalls: 0,
        claudeCalls: 0,
        geminiCalls: 0,
        successRate: 0,
        totalCost: 0,
        avgDurationMs: 0,
        byStage: {},
        errorCount: 0,
      };
    }
  }

  /**
   * Eski logları temizle (30 günden eski)
   */
  static async cleanupOldLogs(daysOld: number = 30): Promise<number> {
    try {
      const db = getDb();
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

      const snapshot = await db
        .collection(this.COLLECTION)
        .where("createdAt", "<", cutoffTime)
        .limit(500) // Batch limit
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`[AILogService] Cleaned up ${snapshot.size} old logs`);

      return snapshot.size;
    } catch (error) {
      console.error("[AILogService] Error cleaning up logs:", error);
      return 0;
    }
  }
}

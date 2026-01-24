/**
 * AI Feedback Service
 * Kullanıcı geri bildirimlerini Firestore'da yönetir
 */

import * as admin from "firebase-admin";
import { IssueFeedback, IssueCategoryId, ISSUE_CATEGORIES } from "../orchestrator/types";
import { getSystemSettings } from "./configService";

// Firestore referansı
const getDb = () => admin.firestore();

/**
 * Feedback Service
 */
export class FeedbackService {
  private static readonly COLLECTION = "ai-feedback";
  // MAX_FEEDBACK_FOR_PROMPT artık config'den okunuyor (runtime'da değiştirilebilir)

  /**
   * Yeni feedback oluştur
   */
  static async createFeedback(
    data: Omit<IssueFeedback, "id" | "createdAt" | "resolved">
  ): Promise<string> {
    try {
      const db = getDb();
      const docRef = db.collection(this.COLLECTION).doc();

      const feedback: IssueFeedback = {
        ...data,
        id: docRef.id,
        createdAt: Date.now(),
        resolved: false,
      };

      await docRef.set(feedback);
      console.log(`[FeedbackService] Feedback created: ${docRef.id} (${data.category})`);

      return docRef.id;
    } catch (error) {
      console.error("[FeedbackService] Error creating feedback:", error);
      throw error;
    }
  }

  /**
   * Slot'a ait feedback'leri getir
   */
  static async getFeedbackBySlot(slotId: string): Promise<IssueFeedback[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(this.COLLECTION)
        .where("slotId", "==", slotId)
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map((doc) => doc.data() as IssueFeedback);
    } catch (error) {
      console.error("[FeedbackService] Error fetching feedback:", error);
      return [];
    }
  }

  /**
   * Son çözülmemiş feedback'leri getir (Claude prompt'u için)
   * Kategoriye göre gruplar ve en sık karşılaşılan sorunları döndürür
   */
  static async getRecentUnresolvedFeedback(limit: number = 50): Promise<{
    byCategory: Record<IssueCategoryId, number>;
    recentIssues: Array<{ category: IssueCategoryId; note?: string; scenarioId?: string }>;
    totalCount: number;
  }> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(this.COLLECTION)
        .where("resolved", "==", false)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const feedbacks = snapshot.docs.map((doc) => doc.data() as IssueFeedback);

      // Kategoriye göre grupla
      const byCategory: Record<string, number> = {};
      for (const fb of feedbacks) {
        byCategory[fb.category] = (byCategory[fb.category] || 0) + 1;
      }

      // Config'den max feedback sayısını al (runtime'da değiştirilebilir)
      const systemSettings = await getSystemSettings();
      const maxFeedback = systemSettings.maxFeedbackForPrompt;

      // Son birkaç issue'yu al (prompt'a eklemek için)
      const recentIssues = feedbacks.slice(0, maxFeedback).map((fb) => ({
        category: fb.category,
        note: fb.customNote,
        scenarioId: fb.scenarioId,
      }));

      return {
        byCategory: byCategory as Record<IssueCategoryId, number>,
        recentIssues,
        totalCount: feedbacks.length,
      };
    } catch (error) {
      console.error("[FeedbackService] Error fetching recent feedback:", error);
      return { byCategory: {} as Record<IssueCategoryId, number>, recentIssues: [], totalCount: 0 };
    }
  }

  /**
   * Feedback'i çözüldü olarak işaretle
   */
  static async resolveFeedback(feedbackId: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection(this.COLLECTION).doc(feedbackId).update({
        resolved: true,
        resolvedAt: Date.now(),
      });
      console.log(`[FeedbackService] Feedback resolved: ${feedbackId}`);
    } catch (error) {
      console.error("[FeedbackService] Error resolving feedback:", error);
      throw error;
    }
  }

  /**
   * Claude prompt'u için feedback özeti oluştur
   * Bu, Claude'un geçmiş hatalardan öğrenmesini sağlar
   */
  static async generatePromptHints(): Promise<string> {
    const feedback = await this.getRecentUnresolvedFeedback();

    if (feedback.totalCount === 0) {
      return "";
    }

    // En sık karşılaşılan sorunları bul
    const sortedCategories = Object.entries(feedback.byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (sortedCategories.length === 0) {
      return "";
    }

    // Prompt hint oluştur
    const hints: string[] = [
      "\n⚠️ KULLANICI GERİ BİLDİRİMLERİ (SON HATALAR):",
    ];

    for (const [category, count] of sortedCategories) {
      const catInfo = ISSUE_CATEGORIES[category as IssueCategoryId];
      if (catInfo) {
        hints.push(`- ${catInfo.label} (${count}x): ${catInfo.aiHint}`);
      }
    }

    // Özel notları ekle
    const notesWithContent = feedback.recentIssues.filter((i) => i.note);
    if (notesWithContent.length > 0) {
      hints.push("\nKullanıcı notları:");
      for (const issue of notesWithContent.slice(0, 3)) {
        hints.push(`- "${issue.note}"`);
      }
    }

    return hints.join("\n");
  }

  /**
   * İstatistikleri getir
   */
  static async getStats(): Promise<{
    totalFeedback: number;
    unresolvedCount: number;
    byCategory: Record<string, number>;
    lastWeekCount: number;
  }> {
    try {
      const db = getDb();
      const allSnapshot = await db.collection(this.COLLECTION).get();
      const unresolvedSnapshot = await db
        .collection(this.COLLECTION)
        .where("resolved", "==", false)
        .get();

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const lastWeekSnapshot = await db
        .collection(this.COLLECTION)
        .where("createdAt", ">=", weekAgo)
        .get();

      // Kategoriye göre grupla
      const byCategory: Record<string, number> = {};
      for (const doc of allSnapshot.docs) {
        const fb = doc.data() as IssueFeedback;
        byCategory[fb.category] = (byCategory[fb.category] || 0) + 1;
      }

      return {
        totalFeedback: allSnapshot.size,
        unresolvedCount: unresolvedSnapshot.size,
        byCategory,
        lastWeekCount: lastWeekSnapshot.size,
      };
    } catch (error) {
      console.error("[FeedbackService] Error fetching stats:", error);
      return {
        totalFeedback: 0,
        unresolvedCount: 0,
        byCategory: {},
        lastWeekCount: 0,
      };
    }
  }
}

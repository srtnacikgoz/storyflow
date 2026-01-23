/**
 * AI Rules Service
 * Kullanıcının Claude'a öğrettiği kuralları yönetir
 * Bu kurallar prompt'lara eklenerek AI'ın öğrenmesini sağlar
 */

import * as admin from "firebase-admin";
import { AIRule, AIRuleCategoryId, AI_RULE_CATEGORIES } from "../orchestrator/types";

// Firestore referansı
const getDb = () => admin.firestore();

/**
 * AI Rules Service
 */
export class AIRulesService {
  private static readonly COLLECTION = "ai-rules";

  /**
   * Yeni kural oluştur
   */
  static async createRule(
    data: Omit<AIRule, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const db = getDb();
      const docRef = db.collection(this.COLLECTION).doc();

      const now = Date.now();
      const rule: AIRule = {
        ...data,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(rule);
      console.log(`[AIRulesService] Rule created: ${docRef.id} (${data.type}: ${data.title})`);

      return docRef.id;
    } catch (error) {
      console.error("[AIRulesService] Error creating rule:", error);
      throw error;
    }
  }

  /**
   * Kural güncelle
   */
  static async updateRule(
    ruleId: string,
    data: Partial<Omit<AIRule, "id" | "createdAt">>
  ): Promise<void> {
    try {
      const db = getDb();
      await db.collection(this.COLLECTION).doc(ruleId).update({
        ...data,
        updatedAt: Date.now(),
      });
      console.log(`[AIRulesService] Rule updated: ${ruleId}`);
    } catch (error) {
      console.error("[AIRulesService] Error updating rule:", error);
      throw error;
    }
  }

  /**
   * Kural sil
   */
  static async deleteRule(ruleId: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection(this.COLLECTION).doc(ruleId).delete();
      console.log(`[AIRulesService] Rule deleted: ${ruleId}`);
    } catch (error) {
      console.error("[AIRulesService] Error deleting rule:", error);
      throw error;
    }
  }

  /**
   * Tek kural getir
   */
  static async getRule(ruleId: string): Promise<AIRule | null> {
    try {
      const db = getDb();
      const doc = await db.collection(this.COLLECTION).doc(ruleId).get();
      return doc.exists ? (doc.data() as AIRule) : null;
    } catch (error) {
      console.error("[AIRulesService] Error fetching rule:", error);
      return null;
    }
  }

  /**
   * Tüm kuralları getir
   */
  static async listRules(activeOnly: boolean = false): Promise<AIRule[]> {
    try {
      const db = getDb();
      let query: admin.firestore.Query = db.collection(this.COLLECTION);

      if (activeOnly) {
        query = query.where("isActive", "==", true);
      }

      const snapshot = await query.orderBy("createdAt", "desc").get();
      return snapshot.docs.map((doc) => doc.data() as AIRule);
    } catch (error) {
      console.error("[AIRulesService] Error listing rules:", error);
      return [];
    }
  }

  /**
   * Kategoriye göre kuralları getir
   */
  static async getRulesByCategory(category: AIRuleCategoryId): Promise<AIRule[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(this.COLLECTION)
        .where("category", "==", category)
        .where("isActive", "==", true)
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map((doc) => doc.data() as AIRule);
    } catch (error) {
      console.error("[AIRulesService] Error fetching rules by category:", error);
      return [];
    }
  }

  /**
   * Claude prompt'u için kural özeti oluştur
   * Bu, Claude'un kullanıcı kurallarını öğrenmesini sağlar
   */
  static async generatePromptRules(): Promise<string> {
    const rules = await this.listRules(true); // Sadece aktif kurallar

    if (rules.length === 0) {
      return "";
    }

    // Kategoriye göre grupla
    const doRules: AIRule[] = [];
    const dontRules: AIRule[] = [];

    for (const rule of rules) {
      if (rule.type === "do") {
        doRules.push(rule);
      } else {
        dontRules.push(rule);
      }
    }

    const lines: string[] = [
      "\n📚 KULLANICI TANIMLARI KURALLAR (MUTLAKA UYGULA):",
    ];

    // Yapılmayacaklar
    if (dontRules.length > 0) {
      lines.push("\n🚫 YAPILMAYACAKLAR:");
      for (const rule of dontRules) {
        const categoryInfo = AI_RULE_CATEGORIES[rule.category];
        lines.push(`- ${categoryInfo.icon} [${categoryInfo.label}] ${rule.title}`);
        if (rule.description) {
          lines.push(`  → ${rule.description}`);
        }
      }
    }

    // Yapılacaklar
    if (doRules.length > 0) {
      lines.push("\n✅ YAPILACAKLAR:");
      for (const rule of doRules) {
        const categoryInfo = AI_RULE_CATEGORIES[rule.category];
        lines.push(`- ${categoryInfo.icon} [${categoryInfo.label}] ${rule.title}`);
        if (rule.description) {
          lines.push(`  → ${rule.description}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Kural istatistiklerini getir
   */
  static async getStats(): Promise<{
    totalRules: number;
    activeRules: number;
    doRules: number;
    dontRules: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const rules = await this.listRules(false);

      const byCategory: Record<string, number> = {};
      let doCount = 0;
      let dontCount = 0;
      let activeCount = 0;

      for (const rule of rules) {
        byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;

        if (rule.type === "do") doCount++;
        else dontCount++;

        if (rule.isActive) activeCount++;
      }

      return {
        totalRules: rules.length,
        activeRules: activeCount,
        doRules: doCount,
        dontRules: dontCount,
        byCategory,
      };
    } catch (error) {
      console.error("[AIRulesService] Error fetching stats:", error);
      return {
        totalRules: 0,
        activeRules: 0,
        doRules: 0,
        dontRules: 0,
        byCategory: {},
      };
    }
  }
}

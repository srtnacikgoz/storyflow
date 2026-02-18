/**
 * Usage Tracking Service
 * AI API kullanımını ve maliyetlerini takip eder
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Maliyet sabitleri (USD)
export const COSTS = {
  GEMINI_IMAGE: 0.04, // Gemini 3 Pro Image Preview
};

// Usage tipi
export type UsageType = "gemini" | "instagram_post";

// Usage kaydı
export interface UsageRecord {
  id?: string;
  type: UsageType | string; // string for backward compatibility with legacy types
  cost: number;
  description: string;
  itemId?: string; // İlgili queue item
  timestamp: number;
  date: string; // YYYY-MM-DD formatında (gruplama için)
}

// Usage istatistikleri
export interface UsageStats {
  today: {
    gemini: { count: number; cost: number };
    total: number;
  };
  thisMonth: {
    gemini: { count: number; cost: number };
    total: number;
  };
  allTime: {
    gemini: { count: number; cost: number };
    total: number;
  };
}

/**
 * Usage Tracking Service
 */
export class UsageService {
  private _db: FirebaseFirestore.Firestore | null = null;
  private collection = "usage";

  // Lazy initialization - Firestore'u ilk kullanımda yükle
  private get db(): FirebaseFirestore.Firestore {
    if (!this._db) {
      this._db = getFirestore();
    }
    return this._db;
  }

  /**
   * Kullanım kaydı ekle
   */
  async logUsage(params: {
    type: UsageType;
    cost: number;
    description: string;
    itemId?: string;
  }): Promise<string> {
    const now = new Date();
    const record: Omit<UsageRecord, "id"> = {
      type: params.type,
      cost: params.cost,
      description: params.description,
      itemId: params.itemId,
      timestamp: now.getTime(),
      date: now.toISOString().split("T")[0], // YYYY-MM-DD
    };

    const docRef = await this.db.collection(this.collection).add({
      ...record,
      createdAt: Timestamp.now(),
    });

    console.log(`[UsageService] Logged: ${params.type} - $${params.cost}`);
    return docRef.id;
  }

  /**
   * Gemini kullanımı logla
   */
  async logGeminiUsage(
    itemId?: string,
    cost: number = COSTS.GEMINI_IMAGE
  ): Promise<string> {
    return this.logUsage({
      type: "gemini",
      cost,
      description: "Gemini 3 Pro Image img2img dönüşümü",
      itemId,
    });
  }

  /**
   * Kullanım istatistiklerini getir
   * Not: Legacy kayıtlar (vision, dalle, gemini-flash, gemini-pro) gemini altında toplanır
   */
  async getStats(): Promise<UsageStats> {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Tüm kayıtları çek
    const snapshot = await this.db
      .collection(this.collection)
      .orderBy("timestamp", "desc")
      .get();

    const stats: UsageStats = {
      today: { gemini: { count: 0, cost: 0 }, total: 0 },
      thisMonth: { gemini: { count: 0, cost: 0 }, total: 0 },
      allTime: { gemini: { count: 0, cost: 0 }, total: 0 },
    };

    snapshot.forEach((doc) => {
      const data = doc.data() as UsageRecord;
      const isToday = data.date === today;
      const isThisMonth = data.date >= monthStart;

      // Tüm AI kullanımlarını gemini altında topla (legacy dahil)
      const isAI = data.type !== "instagram_post";

      // All time
      if (isAI) {
        stats.allTime.gemini.count++;
        stats.allTime.gemini.cost += data.cost;
      }
      stats.allTime.total += data.cost;

      // This month
      if (isThisMonth) {
        if (isAI) {
          stats.thisMonth.gemini.count++;
          stats.thisMonth.gemini.cost += data.cost;
        }
        stats.thisMonth.total += data.cost;
      }

      // Today
      if (isToday) {
        if (isAI) {
          stats.today.gemini.count++;
          stats.today.gemini.cost += data.cost;
        }
        stats.today.total += data.cost;
      }
    });

    // Maliyetleri 2 ondalık basamağa yuvarla
    const round = (n: number) => Math.round(n * 100) / 100;
    stats.today.gemini.cost = round(stats.today.gemini.cost);
    stats.today.total = round(stats.today.total);
    stats.thisMonth.gemini.cost = round(stats.thisMonth.gemini.cost);
    stats.thisMonth.total = round(stats.thisMonth.total);
    stats.allTime.gemini.cost = round(stats.allTime.gemini.cost);
    stats.allTime.total = round(stats.allTime.total);

    return stats;
  }

  /**
   * Son kullanım kayıtlarını getir
   */
  async getRecentUsage(limit: number = 10): Promise<UsageRecord[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UsageRecord[];
  }
}


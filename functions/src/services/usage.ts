/**
 * Usage Tracking Service
 * AI API kullanımını ve maliyetlerini takip eder
 */

import {getFirestore, Timestamp} from "firebase-admin/firestore";

// Maliyet sabitleri (USD)
export const COSTS = {
  VISION_API: 0.01, // GPT-4 Vision per image
  DALLE_3_HD: 0.08, // DALL-E 3 HD 1024x1024
  DALLE_3_STANDARD: 0.04, // DALL-E 3 Standard
};

// Usage tipi
export type UsageType = "vision" | "dalle" | "instagram_post";

// Usage kaydı
export interface UsageRecord {
  id?: string;
  type: UsageType;
  cost: number;
  description: string;
  itemId?: string; // İlgili queue item
  timestamp: number;
  date: string; // YYYY-MM-DD formatında (gruplama için)
}

// Usage istatistikleri
export interface UsageStats {
  today: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
    total: number;
  };
  thisMonth: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
    total: number;
  };
  allTime: {
    vision: { count: number; cost: number };
    dalle: { count: number; cost: number };
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
   * Vision API kullanımı logla
   */
  async logVisionUsage(itemId?: string): Promise<string> {
    return this.logUsage({
      type: "vision",
      cost: COSTS.VISION_API,
      description: "GPT-4 Vision görsel analizi",
      itemId,
    });
  }

  /**
   * DALL-E kullanımı logla
   */
  async logDalleUsage(itemId?: string, quality: "hd" | "standard" = "hd"): Promise<string> {
    const cost = quality === "hd" ? COSTS.DALLE_3_HD : COSTS.DALLE_3_STANDARD;
    return this.logUsage({
      type: "dalle",
      cost,
      description: `DALL-E 3 ${quality.toUpperCase()} görsel oluşturma`,
      itemId,
    });
  }

  /**
   * Kullanım istatistiklerini getir
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
      today: {vision: {count: 0, cost: 0}, dalle: {count: 0, cost: 0}, total: 0},
      thisMonth: {vision: {count: 0, cost: 0}, dalle: {count: 0, cost: 0}, total: 0},
      allTime: {vision: {count: 0, cost: 0}, dalle: {count: 0, cost: 0}, total: 0},
    };

    snapshot.forEach((doc) => {
      const data = doc.data() as UsageRecord;
      const isToday = data.date === today;
      const isThisMonth = data.date >= monthStart;

      // All time
      if (data.type === "vision") {
        stats.allTime.vision.count++;
        stats.allTime.vision.cost += data.cost;
      } else if (data.type === "dalle") {
        stats.allTime.dalle.count++;
        stats.allTime.dalle.cost += data.cost;
      }
      stats.allTime.total += data.cost;

      // This month
      if (isThisMonth) {
        if (data.type === "vision") {
          stats.thisMonth.vision.count++;
          stats.thisMonth.vision.cost += data.cost;
        } else if (data.type === "dalle") {
          stats.thisMonth.dalle.count++;
          stats.thisMonth.dalle.cost += data.cost;
        }
        stats.thisMonth.total += data.cost;
      }

      // Today
      if (isToday) {
        if (data.type === "vision") {
          stats.today.vision.count++;
          stats.today.vision.cost += data.cost;
        } else if (data.type === "dalle") {
          stats.today.dalle.count++;
          stats.today.dalle.cost += data.cost;
        }
        stats.today.total += data.cost;
      }
    });

    // Maliyetleri 2 ondalık basamağa yuvarla
    const round = (n: number) => Math.round(n * 100) / 100;
    stats.today.vision.cost = round(stats.today.vision.cost);
    stats.today.dalle.cost = round(stats.today.dalle.cost);
    stats.today.total = round(stats.today.total);
    stats.thisMonth.vision.cost = round(stats.thisMonth.vision.cost);
    stats.thisMonth.dalle.cost = round(stats.thisMonth.dalle.cost);
    stats.thisMonth.total = round(stats.thisMonth.total);
    stats.allTime.vision.cost = round(stats.allTime.vision.cost);
    stats.allTime.dalle.cost = round(stats.allTime.dalle.cost);
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

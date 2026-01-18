"use strict";
/**
 * Usage Tracking Service
 * AI API kullanımını ve maliyetlerini takip eder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageService = exports.COSTS = void 0;
const firestore_1 = require("firebase-admin/firestore");
// Maliyet sabitleri (USD)
exports.COSTS = {
    VISION_API: 0.01, // GPT-4 Vision per image
    DALLE_3_HD: 0.08, // DALL-E 3 HD 1024x1024
    DALLE_3_STANDARD: 0.04, // DALL-E 3 Standard
    GEMINI_FLASH: 0.01, // Gemini 2.5 Flash Image
    GEMINI_PRO: 0.04, // Gemini 3 Pro Image Preview
};
/**
 * Usage Tracking Service
 */
class UsageService {
    constructor() {
        this._db = null;
        this.collection = "usage";
    }
    // Lazy initialization - Firestore'u ilk kullanımda yükle
    get db() {
        if (!this._db) {
            this._db = (0, firestore_1.getFirestore)();
        }
        return this._db;
    }
    /**
     * Kullanım kaydı ekle
     */
    async logUsage(params) {
        const now = new Date();
        const record = {
            type: params.type,
            cost: params.cost,
            description: params.description,
            itemId: params.itemId,
            timestamp: now.getTime(),
            date: now.toISOString().split("T")[0], // YYYY-MM-DD
        };
        const docRef = await this.db.collection(this.collection).add({
            ...record,
            createdAt: firestore_1.Timestamp.now(),
        });
        console.log(`[UsageService] Logged: ${params.type} - $${params.cost}`);
        return docRef.id;
    }
    /**
     * Vision API kullanımı logla
     */
    async logVisionUsage(itemId) {
        return this.logUsage({
            type: "vision",
            cost: exports.COSTS.VISION_API,
            description: "GPT-4 Vision görsel analizi",
            itemId,
        });
    }
    /**
     * DALL-E kullanımı logla
     */
    async logDalleUsage(itemId, quality = "hd") {
        const cost = quality === "hd" ? exports.COSTS.DALLE_3_HD : exports.COSTS.DALLE_3_STANDARD;
        return this.logUsage({
            type: "dalle",
            cost,
            description: `DALL-E 3 ${quality.toUpperCase()} görsel oluşturma`,
            itemId,
        });
    }
    /**
     * Gemini kullanımı logla
     */
    async logGeminiUsage(itemId, cost = exports.COSTS.GEMINI_FLASH, modelType = "gemini-flash") {
        const descriptions = {
            "gemini-flash": "Gemini 2.5 Flash Image img2img dönüşümü",
            "gemini-pro": "Gemini 3 Pro Image img2img dönüşümü",
        };
        return this.logUsage({
            type: modelType,
            cost,
            description: descriptions[modelType],
            itemId,
        });
    }
    /**
     * Kullanım istatistiklerini getir
     */
    async getStats() {
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        // Tüm kayıtları çek
        const snapshot = await this.db
            .collection(this.collection)
            .orderBy("timestamp", "desc")
            .get();
        const stats = {
            today: { vision: { count: 0, cost: 0 }, dalle: { count: 0, cost: 0 }, gemini: { count: 0, cost: 0 }, total: 0 },
            thisMonth: { vision: { count: 0, cost: 0 }, dalle: { count: 0, cost: 0 }, gemini: { count: 0, cost: 0 }, total: 0 },
            allTime: { vision: { count: 0, cost: 0 }, dalle: { count: 0, cost: 0 }, gemini: { count: 0, cost: 0 }, total: 0 },
        };
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isToday = data.date === today;
            const isThisMonth = data.date >= monthStart;
            // Gemini modellerini aynı kategoride topla
            const isGemini = data.type === "gemini-flash" || data.type === "gemini-pro";
            // All time
            if (data.type === "vision") {
                stats.allTime.vision.count++;
                stats.allTime.vision.cost += data.cost;
            }
            else if (data.type === "dalle") {
                stats.allTime.dalle.count++;
                stats.allTime.dalle.cost += data.cost;
            }
            else if (isGemini) {
                stats.allTime.gemini.count++;
                stats.allTime.gemini.cost += data.cost;
            }
            stats.allTime.total += data.cost;
            // This month
            if (isThisMonth) {
                if (data.type === "vision") {
                    stats.thisMonth.vision.count++;
                    stats.thisMonth.vision.cost += data.cost;
                }
                else if (data.type === "dalle") {
                    stats.thisMonth.dalle.count++;
                    stats.thisMonth.dalle.cost += data.cost;
                }
                else if (isGemini) {
                    stats.thisMonth.gemini.count++;
                    stats.thisMonth.gemini.cost += data.cost;
                }
                stats.thisMonth.total += data.cost;
            }
            // Today
            if (isToday) {
                if (data.type === "vision") {
                    stats.today.vision.count++;
                    stats.today.vision.cost += data.cost;
                }
                else if (data.type === "dalle") {
                    stats.today.dalle.count++;
                    stats.today.dalle.cost += data.cost;
                }
                else if (isGemini) {
                    stats.today.gemini.count++;
                    stats.today.gemini.cost += data.cost;
                }
                stats.today.total += data.cost;
            }
        });
        // Maliyetleri 2 ondalık basamağa yuvarla
        const round = (n) => Math.round(n * 100) / 100;
        stats.today.vision.cost = round(stats.today.vision.cost);
        stats.today.dalle.cost = round(stats.today.dalle.cost);
        stats.today.gemini.cost = round(stats.today.gemini.cost);
        stats.today.total = round(stats.today.total);
        stats.thisMonth.vision.cost = round(stats.thisMonth.vision.cost);
        stats.thisMonth.dalle.cost = round(stats.thisMonth.dalle.cost);
        stats.thisMonth.gemini.cost = round(stats.thisMonth.gemini.cost);
        stats.thisMonth.total = round(stats.thisMonth.total);
        stats.allTime.vision.cost = round(stats.allTime.vision.cost);
        stats.allTime.dalle.cost = round(stats.allTime.dalle.cost);
        stats.allTime.gemini.cost = round(stats.allTime.gemini.cost);
        stats.allTime.total = round(stats.allTime.total);
        return stats;
    }
    /**
     * Son kullanım kayıtlarını getir
     */
    async getRecentUsage(limit = 10) {
        const snapshot = await this.db
            .collection(this.collection)
            .orderBy("timestamp", "desc")
            .limit(limit)
            .get();
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }
}
exports.UsageService = UsageService;
//# sourceMappingURL=usage.js.map
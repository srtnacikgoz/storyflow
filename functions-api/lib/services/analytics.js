"use strict";
/**
 * Analytics Dashboard Service
 * Instagram Automation - Sade Patisserie
 *
 * Paylaşım istatistiklerini toplar ve hesaplar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const firestore_1 = require("firebase-admin/firestore");
const types_1 = require("../types");
// Kategori etiketleri
const CATEGORY_LABELS = {
    "viennoiserie": "Viennoiserie",
    "coffee": "Kahve",
    "chocolate": "Çikolata",
    "small-desserts": "Küçük Tatlılar",
    "slice-cakes": "Dilim Pastalar",
    "big-cakes": "Büyük Pastalar",
    "profiterole": "Profiterol",
    "special-orders": "Özel Siparişler",
};
// AI Model etiketleri
const AI_MODEL_LABELS = {
    "gemini-flash": "Gemini Flash",
    "gemini-pro": "Gemini Pro",
    "none": "AI Kapalı",
};
// Stil etiketleri
const STYLE_LABELS = {
    "pure-minimal": "Minimal",
    "lifestyle-moments": "Lifestyle",
    "rustic-warmth": "Rustic",
    "french-elegance": "French",
};
/**
 * Analytics Service
 */
class AnalyticsService {
    constructor() {
        this.db = (0, firestore_1.getFirestore)();
        this.queueCollection = this.db.collection("media-queue");
    }
    /**
     * Tarih aralığı için başlangıç timestamp'i hesapla
     */
    getStartTimestamp(range) {
        const now = new Date();
        switch (range) {
            case "today":
                now.setHours(0, 0, 0, 0);
                return now.getTime();
            case "week":
                now.setDate(now.getDate() - 7);
                return now.getTime();
            case "month":
                now.setMonth(now.getMonth() - 1);
                return now.getTime();
            case "all":
            default:
                return 0;
        }
    }
    /**
     * Tamamlanan paylaşımları getir
     */
    async getCompletedPosts(range = "all") {
        const startTimestamp = this.getStartTimestamp(range);
        let query = this.queueCollection.where("status", "==", "completed");
        if (range !== "all") {
            query = query.where("uploadedAt", ">=", startTimestamp);
        }
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }
    /**
     * Tüm queue item'ları getir (status bazlı sayım için)
     */
    async getAllQueueItems() {
        const snapshot = await this.queueCollection.get();
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }
    /**
     * Özet istatistikleri hesapla
     */
    async getSummary() {
        const allItems = await this.getAllQueueItems();
        const now = Date.now();
        // Zaman filtreleri
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - 1);
        // Tamamlanan paylaşımlar
        const completed = allItems.filter((item) => item.status === "completed");
        const postsToday = completed.filter((item) => item.uploadedAt >= todayStart.getTime()).length;
        const postsThisWeek = completed.filter((item) => item.uploadedAt >= weekStart.getTime()).length;
        const postsThisMonth = completed.filter((item) => item.uploadedAt >= monthStart.getTime()).length;
        // Kuyruk durumu
        const pendingCount = allItems.filter((item) => item.status === "pending").length;
        const scheduledCount = allItems.filter((item) => item.status === "scheduled").length;
        const failedCount = allItems.filter((item) => item.status === "failed").length;
        // Onay oranları
        const approvedCount = completed.length;
        const rejectedCount = allItems.filter((item) => item.approvalStatus === "rejected").length;
        const timeoutCount = allItems.filter((item) => item.approvalStatus === "timeout").length;
        const totalDecisions = approvedCount + rejectedCount + timeoutCount;
        const approvalRate = totalDecisions > 0
            ? Math.round((approvedCount / totalDecisions) * 100)
            : 100;
        // Ortalamalar (son 30 gün bazlı)
        const daysActive = Math.max(1, Math.ceil((now - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
        const avgPostsPerDay = Math.round((postsThisMonth / daysActive) * 10) / 10;
        const avgPostsPerWeek = Math.round(avgPostsPerDay * 7 * 10) / 10;
        // Son paylaşım
        const lastPost = completed.sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
        return {
            totalPosts: completed.length,
            postsToday,
            postsThisWeek,
            postsThisMonth,
            avgPostsPerDay,
            avgPostsPerWeek,
            pendingCount,
            scheduledCount,
            failedCount,
            approvedCount,
            rejectedCount,
            timeoutCount,
            approvalRate,
            lastPostAt: lastPost?.uploadedAt,
            calculatedAt: now,
        };
    }
    /**
     * Kategori dağılımı
     */
    async getCategoryBreakdown(range = "all") {
        const posts = await this.getCompletedPosts(range);
        const total = posts.length;
        if (total === 0)
            return [];
        // Sayım
        const counts = {};
        for (const post of posts) {
            const cat = post.productCategory || "unknown";
            counts[cat] = (counts[cat] || 0) + 1;
        }
        // Stats oluştur
        const stats = Object.entries(counts)
            .map(([category, count]) => ({
            category: category,
            categoryLabel: CATEGORY_LABELS[category] || category,
            count,
            percentage: Math.round((count / total) * 100),
        }))
            .sort((a, b) => b.count - a.count);
        return stats;
    }
    /**
     * AI Model dağılımı
     */
    async getAIModelBreakdown(range = "all") {
        const posts = await this.getCompletedPosts(range);
        const total = posts.length;
        if (total === 0)
            return [];
        const counts = {};
        for (const post of posts) {
            const model = post.aiModel || "none";
            counts[model] = (counts[model] || 0) + 1;
        }
        const stats = Object.entries(counts)
            .map(([model, count]) => ({
            model: model,
            modelLabel: AI_MODEL_LABELS[model] || model,
            count,
            percentage: Math.round((count / total) * 100),
        }))
            .sort((a, b) => b.count - a.count);
        return stats;
    }
    /**
     * Stil dağılımı
     */
    async getStyleBreakdown(range = "all") {
        const posts = await this.getCompletedPosts(range);
        // Sadece AI kullanılan postlar
        const aiPosts = posts.filter((p) => p.aiModel && p.aiModel !== "none");
        const total = aiPosts.length;
        if (total === 0)
            return [];
        const counts = {};
        for (const post of aiPosts) {
            const style = post.styleVariant || "lifestyle-moments";
            counts[style] = (counts[style] || 0) + 1;
        }
        const stats = Object.entries(counts)
            .map(([style, count]) => ({
            style: style,
            styleLabel: STYLE_LABELS[style] || style,
            count,
            percentage: Math.round((count / total) * 100),
        }))
            .sort((a, b) => b.count - a.count);
        return stats;
    }
    /**
     * Şablon kullanım dağılımı
     */
    async getTemplateBreakdown(range = "all") {
        const posts = await this.getCompletedPosts(range);
        const postsWithTemplate = posts.filter((p) => p.captionTemplateId);
        const total = postsWithTemplate.length;
        if (total === 0)
            return [];
        const counts = {};
        for (const post of postsWithTemplate) {
            const id = post.captionTemplateId;
            if (!counts[id]) {
                counts[id] = { name: post.captionTemplateName || "Bilinmeyen", count: 0 };
            }
            counts[id].count++;
        }
        const stats = Object.entries(counts)
            .map(([templateId, data]) => ({
            templateId,
            templateName: data.name,
            count: data.count,
            percentage: Math.round((data.count / total) * 100),
        }))
            .sort((a, b) => b.count - a.count);
        return stats;
    }
    /**
     * Günlük trend (son 30 gün)
     */
    async getDailyTrend(days = 30) {
        const posts = await this.getCompletedPosts("month");
        // Son N günü hazırla
        const trend = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split("T")[0];
            const dateLabel = date.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
            });
            const dayStart = date.getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000;
            const count = posts.filter((p) => p.uploadedAt >= dayStart && p.uploadedAt < dayEnd).length;
            trend.push({ date: dateStr, dateLabel, count });
        }
        return trend;
    }
    /**
     * Saatlik dağılım
     */
    async getHourlyDistribution(range = "all") {
        const posts = await this.getCompletedPosts(range);
        // 24 saat için sayım
        const counts = new Array(24).fill(0);
        for (const post of posts) {
            const date = new Date(post.uploadedAt);
            const hour = date.getHours();
            counts[hour]++;
        }
        return counts.map((count, hour) => ({
            hour,
            hourLabel: `${hour.toString().padStart(2, "0")}:00`,
            count,
        }));
    }
    /**
     * Gün dağılımı
     */
    async getDayDistribution(range = "all") {
        const posts = await this.getCompletedPosts(range);
        // 7 gün için sayım
        const counts = new Array(7).fill(0);
        for (const post of posts) {
            const date = new Date(post.uploadedAt);
            const day = date.getDay();
            counts[day]++;
        }
        return counts.map((count, dayIndex) => ({
            dayIndex: dayIndex,
            dayLabel: types_1.DAY_NAMES[dayIndex],
            count,
        }));
    }
    /**
     * Tam dashboard verisi
     */
    async getDashboard(range = "all") {
        // Paralel olarak tüm verileri çek
        const [summary, categoryBreakdown, aiModelBreakdown, styleBreakdown, templateBreakdown, dailyTrend, hourlyDistribution, dayDistribution,] = await Promise.all([
            this.getSummary(),
            this.getCategoryBreakdown(range),
            this.getAIModelBreakdown(range),
            this.getStyleBreakdown(range),
            this.getTemplateBreakdown(range),
            this.getDailyTrend(30),
            this.getHourlyDistribution(range),
            this.getDayDistribution(range),
        ]);
        return {
            summary,
            categoryBreakdown,
            aiModelBreakdown,
            styleBreakdown,
            templateBreakdown,
            dailyTrend,
            hourlyDistribution,
            dayDistribution,
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics.js.map
/**
 * Time Score Service
 * Instagram Automation - Sade Patisserie
 *
 * Best Time to Post hibrit skor hesaplama sistemi
 * Araştırma verisi + geçmiş paylaşım analizi
 */

import {db} from "../config/firebase";
import {
  DayOfWeekIndex,
  DAY_NAMES,
  DAY_NAMES_EN,
  ConfidenceLevel,
  PostAnalyticsRecord,
  TimeScore,
  TimeSlotRecommendation,
  TimeHeatmap,
  BestTimesResponse,
} from "../types";

const ANALYTICS_COLLECTION = "post-analytics";
// const SCORES_COLLECTION = "time-scores"; // Cache için (ileride)

/**
 * Default Optimal Times - GERÇEK ARAŞTIRMA VERİSİ
 *
 * Kaynaklar:
 * - Sprout Social (2025): 2.7 milyar engagement, 463K profil
 *   https://sproutsocial.com/insights/best-times-to-post-on-instagram/
 * - Buffer (2025): 2 milyon post analizi
 *   https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram/
 * - Hootsuite (2025): 1 milyon post analizi
 *   https://blog.hootsuite.com/best-time-to-post-on-social-media/
 *
 * Gün bazlı en iyi saatler (birden fazla kaynak):
 * - Pazartesi: 13-14, 15-17 (Sprout), 15-17 (Buffer), 15-21 (Hootsuite)
 * - Salı: 11-18 peak (Sprout), 15-17 (Buffer), 05-08 & 15-19 (Hootsuite)
 * - Çarşamba: 11-18, 19-21 (Sprout), 14-15 (Buffer)
 * - Perşembe: 11-18 (Sprout), 14-16 (Buffer), 17-19 (Hootsuite)
 * - Cuma: 10-17 (Sprout), 14-16 (Buffer)
 * - Cumartesi: 10-18 en zayıf gün (Sprout), 14-18 (Buffer)
 * - Pazar: 16:00 tek peak (Sprout), 14-18 (Buffer)
 */

/**
 * Gün + Saat bazlı skorlar (0-100)
 * Her gün için ayrı saat skorları - araştırma verilerine dayalı
 */
const DAY_HOUR_SCORES: Record<DayOfWeekIndex, Record<number, number>> = {
  // Pazar (0) - En zayıf günlerden, tek peak 16:00
  0: {
    0: 10, 1: 8, 2: 5, 3: 5, 4: 8, 5: 15,
    6: 25, 7: 35, 8: 40, 9: 45,
    10: 50, 11: 55, 12: 55, 13: 55,
    14: 65, 15: 70, 16: 80, 17: 75, // 16:00 peak (Sprout)
    18: 65, 19: 55, 20: 45, 21: 35,
    22: 25, 23: 15,
  },
  // Pazartesi (1) - İyi gün, 13-14 ve 15-21 arası güçlü
  1: {
    0: 10, 1: 8, 2: 5, 3: 5, 4: 8, 5: 20,
    6: 35, 7: 45, 8: 55, 9: 60,
    10: 65, 11: 70, 12: 72, 13: 82, // 13-14 peak (Sprout)
    14: 80, 15: 88, 16: 90, 17: 90, // 15-17 peak (Buffer + Hootsuite)
    18: 85, 19: 80, 20: 75, 21: 65, // 15-21 (Hootsuite)
    22: 40, 23: 20,
  },
  // Salı (2) - EN İYİ GÜN, 11-18 sürekli yüksek
  2: {
    0: 10, 1: 8, 2: 5, 3: 5, 4: 10, 5: 55, // 05-08 sabah peak (Hootsuite)
    6: 65, 7: 70, 8: 65, 9: 70,
    10: 75, 11: 88, 12: 90, 13: 88, // 11-18 peak (Sprout)
    14: 90, 15: 95, 16: 95, 17: 92, // 15-17 peak (Buffer + Hootsuite)
    18: 85, 19: 75, 20: 60, 21: 45,
    22: 30, 23: 15,
  },
  // Çarşamba (3) - Çok iyi gün, 11-18 + akşam 19-21 bonus
  3: {
    0: 10, 1: 8, 2: 5, 3: 5, 4: 8, 5: 20,
    6: 35, 7: 50, 8: 60, 9: 65,
    10: 72, 11: 85, 12: 88, 13: 85, // 11-18 (Sprout)
    14: 90, 15: 92, 16: 88, 17: 85, // 14-15 peak (Buffer)
    18: 80, 19: 82, 20: 80, 21: 75, // 19-21 akşam bonus (Sprout)
    22: 45, 23: 20,
  },
  // Perşembe (4) - Çok iyi gün, 11-18 peak, özellikle 17-19
  4: {
    0: 10, 1: 8, 2: 5, 3: 5, 4: 8, 5: 20,
    6: 35, 7: 50, 8: 58, 9: 65,
    10: 72, 11: 85, 12: 85, 13: 82, // 11-18 (Sprout)
    14: 88, 15: 90, 16: 88, 17: 95, // 17-19 peak (Hootsuite)
    18: 92, 19: 85, 20: 65, 21: 50,
    22: 35, 23: 18,
  },
  // Cuma (5) - İyi gün, 10-17 arası
  5: {
    0: 10, 1: 8, 2: 5, 3: 5, 4: 8, 5: 18,
    6: 30, 7: 45, 8: 55, 9: 62,
    10: 75, 11: 80, 12: 82, 13: 80, // 10-17 (Sprout)
    14: 85, 15: 88, 16: 85, 17: 78, // 14-16 peak (Buffer)
    18: 65, 19: 55, 20: 45, 21: 38,
    22: 28, 23: 15,
  },
  // Cumartesi (6) - En zayıf gün, 10-18 geniş ama düşük
  6: {
    0: 10, 1: 8, 2: 5, 3: 5, 4: 8, 5: 15,
    6: 25, 7: 35, 8: 42, 9: 48,
    10: 58, 11: 62, 12: 65, 13: 62, // 10-18 (Sprout - en zayıf)
    14: 68, 15: 70, 16: 68, 17: 65,
    18: 72, 19: 60, 20: 50, 21: 40, // 18:00 hafif peak (Buffer)
    22: 28, 23: 15,
  },
};

/**
 * Time Score Service
 */
export class TimeScoreService {
  private analyticsCollection = db.collection(ANALYTICS_COLLECTION);
  // Cache collection (ileride kullanılacak)
  // private scoresCollection = db.collection(SCORES_COLLECTION);

  // ==========================================
  // Default Score Calculation
  // ==========================================

  /**
   * Araştırma verisine dayalı varsayılan skor hesapla
   * Kaynaklar: Sprout Social, Buffer, Hootsuite (2025)
   *
   * @param {DayOfWeekIndex} day - Gün (0-6)
   * @param {number} hour - Saat (0-23)
   * @return {number} Skor (0-100)
   */
  getDefaultScore(day: DayOfWeekIndex, hour: number): number {
    // Gün+saat bazlı gerçek araştırma skoru
    const dayScores = DAY_HOUR_SCORES[day];
    if (!dayScores) {
      return 50; // Fallback
    }

    const score = dayScores[hour];
    if (score === undefined) {
      return 50; // Fallback
    }

    return score;
  }

  // ==========================================
  // Historical Data
  // ==========================================

  /**
   * Belirli gün/saat için geçmiş verileri getir
   * @param {DayOfWeekIndex} day - Gün
   * @param {number} hour - Saat
   * @return {Promise<PostAnalyticsRecord[]>} Analitik kayıtları
   */
  async getHistoricalData(
    day: DayOfWeekIndex,
    hour: number
  ): Promise<PostAnalyticsRecord[]> {
    const snapshot = await this.analyticsCollection
      .where("dayOfWeek", "==", day)
      .where("hourOfDay", "==", hour)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PostAnalyticsRecord[];
  }

  /**
   * Tüm geçmiş verileri getir
   * @return {Promise<PostAnalyticsRecord[]>} Tüm analitik kayıtları
   */
  async getAllHistoricalData(): Promise<PostAnalyticsRecord[]> {
    const snapshot = await this.analyticsCollection
      .orderBy("postedAt", "desc")
      .limit(500) // Son 500 paylaşım
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PostAnalyticsRecord[];
  }

  /**
   * Geçmiş veriden skor hesapla
   * @param {PostAnalyticsRecord[]} records - Analitik kayıtları
   * @return {number} Skor (0-100)
   */
  calculateHistoricalScore(records: PostAnalyticsRecord[]): number {
    if (records.length === 0) {
      return 50; // Veri yoksa nötr skor
    }

    // Engagement rate ortalaması
    const engagements = records
      .filter((r) => r.engagementRate !== undefined)
      .map((r) => r.engagementRate!);

    if (engagements.length === 0) {
      // Engagement verisi yoksa paylaşım sayısına göre skor
      // Daha fazla paylaşım = daha güvenilir
      return Math.min(70, 50 + records.length * 2);
    }

    const avgEngagement = engagements.reduce((a, b) => a + b, 0) / engagements.length;

    // Engagement'ı skora çevir (0-10% engagement = 0-100 skor)
    return Math.round(Math.min(100, avgEngagement * 10));
  }

  // ==========================================
  // Combined Score Calculation
  // ==========================================

  /**
   * Hibrit skor hesapla (default + historical)
   * @param {DayOfWeekIndex} day - Gün
   * @param {number} hour - Saat
   * @return {Promise<TimeScore>} Hesaplanan skor
   */
  async calculateCombinedScore(
    day: DayOfWeekIndex,
    hour: number
  ): Promise<TimeScore> {
    const defaultScore = this.getDefaultScore(day, hour);
    const historicalRecords = await this.getHistoricalData(day, hour);
    const historicalScore = this.calculateHistoricalScore(historicalRecords);

    const postCount = historicalRecords.length;

    // Veri arttıkça historical ağırlığı artar
    // 0 post = %100 default, 10+ post = %80 historical
    const historicalWeight = Math.min(postCount / 10, 0.8);
    const defaultWeight = 1 - historicalWeight;

    const combinedScore = Math.round(
      defaultScore * defaultWeight + historicalScore * historicalWeight
    );

    // Confidence level
    let confidence: ConfidenceLevel = "low";
    if (postCount >= 10) {
      confidence = "high";
    } else if (postCount >= 5) {
      confidence = "medium";
    }

    // Ortalama engagement
    const engagements = historicalRecords
      .filter((r) => r.engagementRate !== undefined)
      .map((r) => r.engagementRate!);
    const avgEngagement = engagements.length > 0
      ? engagements.reduce((a, b) => a + b, 0) / engagements.length
      : 0;

    const id = `${day}_${hour}`;

    return {
      id,
      dayOfWeek: day,
      hourOfDay: hour,
      defaultScore,
      historicalScore,
      combinedScore,
      postCount,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      confidence,
      lastCalculated: Date.now(),
    };
  }

  // ==========================================
  // Recommendations
  // ==========================================

  /**
   * En iyi paylaşım zamanlarını öner
   * @param {number} count - Kaç öneri dönsün (default: 5)
   * @return {Promise<BestTimesResponse>} Öneriler ve heatmap
   */
  async getBestTimes(count: number = 5): Promise<BestTimesResponse> {
    const allScores: TimeScore[] = [];

    // Tüm gün/saat kombinasyonları için skor hesapla
    // Sadece 06:00 - 22:00 arası (gece saatleri hariç)
    for (let day = 0; day <= 6; day++) {
      for (let hour = 6; hour <= 22; hour++) {
        const score = await this.calculateCombinedScore(
          day as DayOfWeekIndex,
          hour
        );
        allScores.push(score);
      }
    }

    // Skora göre sırala
    allScores.sort((a, b) => b.combinedScore - a.combinedScore);

    // En iyi N tanesini al
    const topScores = allScores.slice(0, count);

    // Recommendations formatına çevir
    const recommendations: TimeSlotRecommendation[] = topScores.map((s) => ({
      day: DAY_NAMES_EN[s.dayOfWeek],
      dayTr: DAY_NAMES[s.dayOfWeek],
      dayIndex: s.dayOfWeek,
      hour: s.hourOfDay,
      hourFormatted: `${s.hourOfDay.toString().padStart(2, "0")}:00`,
      score: s.combinedScore,
      confidence: s.confidence,
      basedOnPosts: s.postCount,
      avgEngagement: s.avgEngagement,
    }));

    // Heatmap oluştur
    const heatmap: TimeHeatmap = {};
    for (const score of allScores) {
      if (!heatmap[score.dayOfWeek]) {
        heatmap[score.dayOfWeek] = {};
      }
      heatmap[score.dayOfWeek][score.hourOfDay] = score.combinedScore;
    }

    // Toplam post sayısı
    const totalPosts = allScores.reduce((sum, s) => sum + s.postCount, 0);

    // Veri kalitesi
    let dataQuality: ConfidenceLevel = "low";
    if (totalPosts >= 50) {
      dataQuality = "high";
    } else if (totalPosts >= 20) {
      dataQuality = "medium";
    }

    return {
      recommendations,
      heatmap,
      totalPosts,
      dataQuality,
      lastUpdated: Date.now(),
    };
  }

  // ==========================================
  // Analytics Recording
  // ==========================================

  /**
   * Paylaşım sonrası analitik kaydı oluştur
   * @param {string} photoId - Photo ID
   * @param {string} storyId - Instagram Story ID
   * @param {number} postedAt - Paylaşım zamanı (timestamp)
   * @return {Promise<PostAnalyticsRecord>} Oluşturulan kayıt
   */
  async recordPost(
    photoId: string,
    storyId: string,
    postedAt: number
  ): Promise<PostAnalyticsRecord> {
    const date = new Date(postedAt);
    const dayOfWeek = date.getDay() as DayOfWeekIndex;
    const hourOfDay = date.getHours();

    const record: Omit<PostAnalyticsRecord, "id"> = {
      photoId,
      storyId,
      postedAt,
      dayOfWeek,
      hourOfDay,
      createdAt: Date.now(),
    };

    const docRef = await this.analyticsCollection.add(record);

    console.log(
      `[TimeScoreService] Recorded post: ${photoId} at ${DAY_NAMES[dayOfWeek]} ${hourOfDay}:00`
    );

    return {
      id: docRef.id,
      ...record,
    };
  }

  /**
   * Engagement metriklerini güncelle
   * @param {string} analyticsId - Analytics record ID
   * @param {object} metrics - Engagement metrikleri
   * @return {Promise<void>}
   */
  async updateEngagement(
    analyticsId: string,
    metrics: {
      impressions?: number;
      reach?: number;
      likes?: number;
      comments?: number;
      saves?: number;
      shares?: number;
    }
  ): Promise<void> {
    const {impressions, reach, likes, comments, saves, shares} = metrics;

    // Engagement rate hesapla
    let engagementRate: number | undefined;
    if (reach && reach > 0) {
      const totalEngagement = (likes || 0) + (comments || 0) + (saves || 0);
      engagementRate = (totalEngagement / reach) * 100;
    }

    await this.analyticsCollection.doc(analyticsId).update({
      impressions,
      reach,
      likes,
      comments,
      saves,
      shares,
      engagementRate,
      updatedAt: Date.now(),
    });

    console.log(`[TimeScoreService] Updated engagement for: ${analyticsId}`);
  }

  // ==========================================
  // Utility
  // ==========================================

  /**
   * Bugün için en iyi saati öner
   * @return {Promise<TimeSlotRecommendation | null>} Bugünün en iyi saati
   */
  async getBestTimeForToday(): Promise<TimeSlotRecommendation | null> {
    const today = new Date().getDay() as DayOfWeekIndex;
    const currentHour = new Date().getHours();

    const todayScores: TimeScore[] = [];

    // Bugün için kalan saatlerin skorlarını hesapla
    for (let hour = currentHour + 1; hour <= 22; hour++) {
      const score = await this.calculateCombinedScore(today, hour);
      todayScores.push(score);
    }

    if (todayScores.length === 0) {
      return null; // Bugün için saat kalmadı
    }

    // En yüksek skoru bul
    todayScores.sort((a, b) => b.combinedScore - a.combinedScore);
    const best = todayScores[0];

    return {
      day: DAY_NAMES_EN[best.dayOfWeek],
      dayTr: DAY_NAMES[best.dayOfWeek],
      dayIndex: best.dayOfWeek,
      hour: best.hourOfDay,
      hourFormatted: `${best.hourOfDay.toString().padStart(2, "0")}:00`,
      score: best.combinedScore,
      confidence: best.confidence,
      basedOnPosts: best.postCount,
      avgEngagement: best.avgEngagement,
    };
  }

  /**
   * İstatistik özeti getir
   * @return {Promise<object>} Özet istatistikler
   */
  async getStats(): Promise<{
    totalPosts: number;
    postsWithEngagement: number;
    avgEngagementRate: number;
    mostActiveDay: string;
    mostActiveHour: number;
  }> {
    const allData = await this.getAllHistoricalData();

    const postsWithEngagement = allData.filter(
      (d) => d.engagementRate !== undefined
    );

    const avgEngagementRate = postsWithEngagement.length > 0
      ? postsWithEngagement.reduce((sum, d) => sum + (d.engagementRate || 0), 0) /
        postsWithEngagement.length
      : 0;

    // En aktif gün
    const dayCount: Record<number, number> = {};
    for (const d of allData) {
      dayCount[d.dayOfWeek] = (dayCount[d.dayOfWeek] || 0) + 1;
    }
    const mostActiveDay = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])[0];

    // En aktif saat
    const hourCount: Record<number, number> = {};
    for (const d of allData) {
      hourCount[d.hourOfDay] = (hourCount[d.hourOfDay] || 0) + 1;
    }
    const mostActiveHour = Object.entries(hourCount)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalPosts: allData.length,
      postsWithEngagement: postsWithEngagement.length,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      mostActiveDay: mostActiveDay
        ? DAY_NAMES[parseInt(mostActiveDay[0]) as DayOfWeekIndex]
        : "-",
      mostActiveHour: mostActiveHour ? parseInt(mostActiveHour[0]) : -1,
    };
  }
}

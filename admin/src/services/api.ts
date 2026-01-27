import type {
  QueueItem,
  QueueStats,
  HealthCheckResponse,
  ProductCategory,
  AIModel,
  StyleVariant,
  SchedulingMode,
  UsageStats,
  UsageRecord,
  CaptionTemplate,
  CaptionTemplateInput,
  RenderedCaption,
  BestTimesResponse,
  TimeSlotRecommendation,
  PostAnalyticsStats,
  DateRange,
  AnalyticsDashboard,
  AnalyticsSummary,
  CalendarData,
  // Orchestrator types
  OrchestratorAsset,
  TimeSlotRule,
  ScheduledSlot,
  PipelineResult,
  OrchestratorDashboardStats,
  Theme,
  Mood,
  // AI Monitor types
  AILog,
  AIStats,
  AIProvider,
  AILogStage,
  AILogStatus,
  // AI Rules types
  AIRule,
  AIRulesStats,
  // Setup Status types
  SetupStatusResponse,
  // Dynamic Category types
  DynamicCategory,
  DynamicCategoryType,
  // Style types
  Style,
  // Prompt Studio types
  PromptStudioConfig,
  PromptTemplate,
  PromptStageId,
  VisualCriticRequest,
  VisualCriticResponse,
} from "../types";

// Firebase Functions base URL
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net";

/**
 * API isteklerini yöneten servis
 */
class ApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Cache'den veri getir
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Cache'e veri kaydet
   */
  private setCache<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Cache temizle (belirli bir prefix ile veya tamamen)
   */
  clearCache(prefix?: string): void {
    if (prefix) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Genel fetch wrapper
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "API isteği başarısız");
    }

    return data;
  }

  // ==========================================
  // Generic HTTP Methods
  // ==========================================

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint);
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * Sistem sağlık durumu
   */
  async getHealthCheck(): Promise<HealthCheckResponse> {
    return this.fetch<HealthCheckResponse>("healthCheck");
  }

  /**
   * Kuyruk istatistikleri
   */
  async getQueueStats(): Promise<QueueStats> {
    const response = await this.fetch<{ success: boolean; stats: QueueStats }>(
      "getQueueStats"
    );
    return response.stats;
  }

  /**
   * Bekleyen kuyruk item'ları
   */
  async getPendingItems(): Promise<QueueItem[]> {
    const response = await this.fetch<{
      success: boolean;
      count: number;
      items: QueueItem[];
    }>("getPendingItems");
    return response.items;
  }

  /**
   * Kuyruğa yeni item ekle
   */
  async addToQueue(params: {
    originalUrl: string;
    productCategory: ProductCategory;
    productName?: string;
    caption?: string;
    aiModel: AIModel;
    styleVariant: StyleVariant;
    faithfulness: number;
    // Caption template alanları
    captionTemplateId?: string;
    captionTemplateName?: string;
    captionVariables?: Record<string, string>;
    // Scheduling alanları
    schedulingMode?: SchedulingMode;
    scheduledFor?: number; // Timestamp
    skipApproval?: boolean;
  }): Promise<QueueItem> {
    const response = await this.fetch<{
      success: boolean;
      photo: QueueItem;
    }>("addToQueue", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return response.photo;
  }

  /**
   * Kuyruk item'ını işle (Telegram onaylı)
   * Önce Telegram'a gönderir, onay sonrası Instagram'a paylaşır
   */
  async processQueueWithApproval(options?: {
    skipEnhancement?: boolean;
    itemId?: string;
  }): Promise<{
    success: boolean;
    skipped?: boolean;
    reason?: string;
    itemId?: string;
    message?: string;
  }> {
    const params = new URLSearchParams();
    if (options?.skipEnhancement) {
      params.append("skipEnhancement", "true");
    }
    if (options?.itemId) {
      params.append("itemId", options.itemId);
    }

    const queryString = params.toString();
    const endpoint = queryString
      ? `processQueueWithApproval?${queryString}`
      : "processQueueWithApproval";

    return this.fetch(endpoint);
  }

  /**
   * Kuyruk item'ını işle (Telegram onaysız - doğrudan paylaş)
   * @deprecated Telegram onaylı versiyon tercih edilmeli
   */
  async processQueueItem(options?: {
    skipEnhancement?: boolean;
    itemId?: string;
  }): Promise<{
    success: boolean;
    skipped?: boolean;
    reason?: string;
    itemId?: string;
    storyId?: string;
  }> {
    const params = new URLSearchParams();
    if (options?.skipEnhancement) {
      params.append("skipEnhancement", "true");
    }
    if (options?.itemId) {
      params.append("itemId", options.itemId);
    }

    const queryString = params.toString();
    const endpoint = queryString
      ? `processQueueItem?${queryString}`
      : "processQueueItem";

    return this.fetch(endpoint);
  }

  /**
   * Instagram token doğrulama
   */
  async validateInstagramToken(): Promise<{
    success: boolean;
    account: { id: string; name: string };
  }> {
    return this.fetch("validateInstagramToken");
  }

  /**
   * AI kullanım istatistikleri
   */
  async getUsageStats(): Promise<{
    stats: UsageStats;
    recent: UsageRecord[];
  }> {
    const response = await this.fetch<{
      success: boolean;
      stats: UsageStats;
      recent: UsageRecord[];
    }>("getUsageStats");
    return {
      stats: response.stats,
      recent: response.recent,
    };
  }

  /**
   * Tamamlanan (paylaşılan) item'lar - Arşiv
   */
  async getCompletedItems(limit: number = 50): Promise<{
    id: string;
    originalUrl: string;
    enhancedUrl?: string;
    productCategory: string;
    productName?: string;
    caption: string;
    aiModel: string;
    styleVariant: string;
    faithfulness: number;
    isEnhanced?: boolean;
    storyId?: string;
    uploadedAt: string;
  }[]> {
    const response = await this.fetch<{
      success: boolean;
      count: number;
      items: {
        id: string;
        originalUrl: string;
        enhancedUrl?: string;
        productCategory: string;
        productName?: string;
        caption: string;
        aiModel: string;
        styleVariant: string;
        faithfulness: number;
        isEnhanced?: boolean;
        storyId?: string;
        uploadedAt: string;
      }[];
    }>(`getCompletedItems?limit=${limit}`);
    return response.items;
  }

  // ==========================================
  // Queue CRUD Methods
  // ==========================================

  /**
   * Kuyruk item'ını ID ile getir
   */
  async getQueueItem(id: string): Promise<QueueItem> {
    const response = await this.fetch<{
      success: boolean;
      item: QueueItem;
    }>(`getQueueItem?id=${id}`);
    return response.item;
  }

  /**
   * Kuyruk item'ını sil
   */
  async deleteQueueItem(id: string): Promise<void> {
    await this.fetch(`deleteQueueItem?id=${id}`, {
      method: "POST",
    });
  }

  /**
   * Kuyruk item'ını güncelle
   */
  async updateQueueItem(
    id: string,
    updates: {
      productName?: string;
      productCategory?: ProductCategory;
      caption?: string;
      aiModel?: AIModel;
      styleVariant?: StyleVariant;
      faithfulness?: number;
      captionTemplateId?: string;
      captionTemplateName?: string;
      captionVariables?: Record<string, string>;
      schedulingMode?: SchedulingMode;
      scheduledFor?: number;
      scheduledDayHour?: string;
      skipApproval?: boolean;
    }
  ): Promise<QueueItem> {
    const response = await this.fetch<{
      success: boolean;
      item: QueueItem;
    }>(`updateQueueItem?id=${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
    return response.item;
  }

  // ==========================================
  // Caption Template Methods
  // ==========================================

  /**
   * Tüm şablonları getir (admin - inactive dahil)
   */
  async getTemplates(): Promise<CaptionTemplate[]> {
    const response = await this.fetch<{
      success: boolean;
      count: number;
      templates: CaptionTemplate[];
    }>("getTemplates?includeInactive=true");
    return response.templates;
  }

  /**
   * Tek şablon getir
   */
  async getTemplate(id: string): Promise<CaptionTemplate> {
    const response = await this.fetch<{
      success: boolean;
      template: CaptionTemplate;
    }>(`getTemplate?id=${id}`);
    return response.template;
  }

  /**
   * Yeni şablon oluştur
   */
  async createTemplate(input: CaptionTemplateInput): Promise<CaptionTemplate> {
    const response = await this.fetch<{
      success: boolean;
      template: CaptionTemplate;
    }>("createTemplate", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.template;
  }

  /**
   * Şablon güncelle
   */
  async updateTemplate(
    id: string,
    updates: Partial<CaptionTemplateInput>
  ): Promise<CaptionTemplate> {
    const response = await this.fetch<{
      success: boolean;
      template: CaptionTemplate;
    }>(`updateTemplate?id=${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
    return response.template;
  }

  /**
   * Şablon sil
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.fetch(`deleteTemplate?id=${id}`, {
      method: "POST",
    });
  }

  /**
   * Caption önizleme
   */
  async previewCaption(
    templateId: string,
    values?: Record<string, string>,
    photoContext?: { productName?: string }
  ): Promise<RenderedCaption> {
    const response = await this.fetch<{
      success: boolean;
      preview: RenderedCaption;
    }>("previewCaption", {
      method: "POST",
      body: JSON.stringify({ templateId, values, photoContext }),
    });
    return response.preview;
  }

  /**
   * Varsayılan şablonları seed et
   */
  async seedTemplates(): Promise<number> {
    const response = await this.fetch<{
      success: boolean;
      created: number;
    }>("seedTemplates", {
      method: "POST",
    });
    return response.created;
  }

  // ==========================================
  // Best Time to Post Methods (Phase 8)
  // ==========================================

  /**
   * En iyi paylaşım zamanlarını getir
   */
  async getBestTimes(count: number = 5): Promise<BestTimesResponse> {
    const response = await this.fetch<{
      success: boolean;
    } & BestTimesResponse>(`getBestTimes?count=${count}`);
    return {
      recommendations: response.recommendations,
      heatmap: response.heatmap,
      totalPosts: response.totalPosts,
      dataQuality: response.dataQuality,
      lastUpdated: response.lastUpdated,
    };
  }

  /**
   * Bugün için en iyi zamanı getir
   */
  async getBestTimeToday(): Promise<TimeSlotRecommendation | null> {
    const response = await this.fetch<{
      success: boolean;
      recommendation: TimeSlotRecommendation | null;
      message?: string;
    }>("getBestTimeToday");
    return response.recommendation;
  }

  /**
   * Post analytics istatistiklerini getir
   */
  async getPostAnalyticsStats(): Promise<PostAnalyticsStats> {
    const response = await this.fetch<{
      success: boolean;
      stats: PostAnalyticsStats;
    }>("getPostAnalyticsStats");
    return response.stats;
  }

  // ==========================================
  // Analytics Dashboard Methods (Phase 9)
  // ==========================================

  /**
   * Tam analytics dashboard verisini getir
   */
  async getAnalyticsDashboard(range: DateRange = "all"): Promise<AnalyticsDashboard> {
    const response = await this.fetch<{
      success: boolean;
      range: string;
    } & AnalyticsDashboard>(`getAnalyticsDashboard?range=${range}`);
    return {
      summary: response.summary,
      categoryBreakdown: response.categoryBreakdown,
      aiModelBreakdown: response.aiModelBreakdown,
      styleBreakdown: response.styleBreakdown,
      templateBreakdown: response.templateBreakdown,
      dailyTrend: response.dailyTrend,
      hourlyDistribution: response.hourlyDistribution,
      dayDistribution: response.dayDistribution,
    };
  }

  /**
   * Sadece özet istatistikleri getir
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const response = await this.fetch<{
      success: boolean;
      summary: AnalyticsSummary;
    }>("getAnalyticsSummary");
    return response.summary;
  }

  // ==========================================
  // Content Calendar Methods (Phase 10)
  // ==========================================

  /**
   * Takvim verisi getir (zamanlanmış + pending items + heatmap)
   */
  async getCalendarData(start?: number, end?: number): Promise<CalendarData> {
    const params = new URLSearchParams();
    if (start) params.append("start", start.toString());
    if (end) params.append("end", end.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `getCalendarData?${queryString}` : "getCalendarData";

    const response = await this.fetch<{
      success: boolean;
    } & CalendarData>(endpoint);

    return {
      items: response.items,
      pendingItems: response.pendingItems,
      heatmap: response.heatmap,
    };
  }

  /**
   * Item'ı yeniden zamanla (drag-drop için)
   */
  async rescheduleItem(id: string, scheduledFor: number): Promise<QueueItem> {
    return this.updateQueueItem(id, {
      schedulingMode: "scheduled",
      scheduledFor,
    });
  }

  // ==========================================
  // Orchestrator - Asset Management
  // ==========================================

  /**
   * Asset'leri listele
   */
  async listAssets(filters?: {
    category?: string;
    subType?: string;
    isActive?: boolean;
  }): Promise<OrchestratorAsset[]> {
    // Cache key oluştur
    const cacheKey = `assets_${JSON.stringify(filters || {})}`;
    const cached = this.getFromCache<OrchestratorAsset[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.subType) params.append("subType", filters.subType);
    if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));

    const queryString = params.toString();
    const endpoint = queryString ? `listAssets?${queryString}` : "listAssets";

    const response = await this.fetch<{
      success: boolean;
      data: OrchestratorAsset[];
      count: number;
    }>(endpoint);

    // 30 saniye cache
    this.setCache(cacheKey, response.data, 30);
    return response.data;
  }

  /**
   * Yeni asset ekle
   */
  async createAsset(asset: Omit<OrchestratorAsset, "id" | "usageCount" | "isActive" | "createdAt" | "updatedAt">): Promise<OrchestratorAsset> {
    const response = await this.fetch<{
      success: boolean;
      data: OrchestratorAsset;
    }>("createAsset", {
      method: "POST",
      body: JSON.stringify(asset),
    });
    return response.data;
  }

  /**
   * Asset güncelle
   */
  async updateAsset(id: string, updates: Partial<OrchestratorAsset>): Promise<void> {
    await this.fetch(`updateAsset?id=${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Asset sil (soft delete)
   */
  async deleteAsset(id: string): Promise<void> {
    await this.fetch(`deleteAsset?id=${id}`, {
      method: "POST",
    });
  }

  // ==========================================
  // Orchestrator - Mood Management
  // ==========================================

  /**
   * Mood listesini getir
   */
  async getMoods(activeOnly: boolean = false): Promise<Mood[]> {
    const response = await this.fetch<{
      success: boolean;
      moods: Mood[];
    }>(`getMoods?activeOnly=${activeOnly}`);
    return response.moods;
  }

  /**
   * Mood detayı getir
   */
  async getMood(id: string): Promise<Mood> {
    const response = await this.fetch<{
      success: boolean;
      mood: Mood;
    }>(`getMood?id=${id}`);
    return response.mood;
  }

  /**
   * Yeni mood ekle
   */
  async createMood(mood: Omit<Mood, "id" | "createdAt" | "updatedAt">): Promise<Mood> {
    const response = await this.fetch<{
      success: boolean;
      mood: Mood;
    }>("createMood", {
      method: "POST",
      body: JSON.stringify(mood),
    });
    return response.mood;
  }

  /**
   * Mood güncelle
   */
  async updateMood(id: string, updates: Partial<Mood>): Promise<void> {
    await this.fetch(`updateMood?id=${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Mood sil
   */
  async deleteMood(id: string): Promise<void> {
    await this.fetch(`deleteMood?id=${id}`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  /**
   * Varsayılan stilleri yükle
   */
  async seedStyles(): Promise<{ added: number; skipped: number }> {
    const response = await this.fetch<{
      success: boolean;
      added: number;
      skipped: number;
    }>("seedStyles", {
      method: "POST"
    });
    return { added: response.added, skipped: response.skipped };
  }

  /**
   * Varsayılan modları yükle
   */
  async seedMoods(): Promise<{ added: number; skipped: number }> {
    const response = await this.fetch<{
      success: boolean;
      added: number;
      skipped: number;
    }>("seedMoods", {
      method: "POST"
    });
    return { added: response.added, skipped: response.skipped };
  }

  // ==========================================
  // Orchestrator - Time Slot Rules
  // ==========================================

  /**
   * Zaman kurallarını listele
   */
  async listTimeSlotRules(): Promise<TimeSlotRule[]> {
    const response = await this.fetch<{
      success: boolean;
      data: TimeSlotRule[];
      count: number;
    }>("listTimeSlotRules");
    return response.data;
  }

  /**
   * Yeni zaman kuralı ekle
   */
  async createTimeSlotRule(rule: Omit<TimeSlotRule, "id" | "isActive">): Promise<TimeSlotRule> {
    const response = await this.fetch<{
      success: boolean;
      data: TimeSlotRule;
    }>("createTimeSlotRule", {
      method: "POST",
      body: JSON.stringify(rule),
    });
    return response.data;
  }

  /**
   * Zaman kuralı güncelle
   */
  async updateTimeSlotRule(id: string, updates: Partial<TimeSlotRule>): Promise<void> {
    await this.fetch(`updateTimeSlotRule?id=${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Zaman kuralı sil
   */
  async deleteTimeSlotRule(id: string): Promise<void> {
    await this.fetch(`deleteTimeSlotRule?id=${id}`, {
      method: "POST",
    });
  }

  // ==========================================
  // Orchestrator - Pipeline
  // ==========================================

  /**
   * Scheduler'ı manuel tetikle
   */
  async triggerOrchestratorScheduler(): Promise<{
    triggered: number;
    skipped: number;
    errors: string[];
  }> {
    const response = await this.fetch<{
      success: boolean;
      data: {
        triggered: number;
        skipped: number;
        errors: string[];
      };
    }>("triggerOrchestratorScheduler");
    return response.data;
  }

  /**
   * Belirli kural için pipeline başlat
   */
  async triggerOrchestratorPipeline(ruleId: string): Promise<string> {
    const response = await this.fetch<{
      success: boolean;
      message: string;
      slotId: string;
    }>(`triggerOrchestratorPipeline?ruleId=${ruleId}`);
    return response.slotId;
  }

  /**
   * Hemen içerik üret (pipeline tamamlanana kadar bekler)
   * @param productType Ürün tipi
   * @param themeId Opsiyonel tema ID'si - senaryoları filtreler
   * @param aspectRatio Görsel formatı (1:1, 3:4, 9:16)
   */
  async orchestratorGenerateNow(
    productType: string,
    themeId?: string,
    aspectRatio?: "1:1" | "3:4" | "9:16"
  ): Promise<{
    success: boolean;
    message: string;
    slotId: string;
    duration?: number;
    error?: string;
  }> {
    const body: { productType: string; themeId?: string; aspectRatio?: string } = { productType };
    if (themeId) {
      body.themeId = themeId;
    }
    if (aspectRatio) {
      body.aspectRatio = aspectRatio;
    }

    const response = await this.fetch<{
      success: boolean;
      message: string;
      slotId: string;
      duration?: number;
      error?: string;
    }>("orchestratorGenerateNow", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response;
  }

  /**
   * Telegram bildirimini tekrar gönder
   */
  async orchestratorResendTelegram(slotId: string): Promise<{
    success: boolean;
    message: string;
    messageId?: number;
  }> {
    const response = await this.fetch<{
      success: boolean;
      message: string;
      messageId?: number;
    }>("orchestratorResendTelegram", {
      method: "POST",
      body: JSON.stringify({ slotId }),
    });
    return response;
  }

  /**
   * Tek bir slot'un detaylarını getir (polling için)
   */
  async getScheduledSlot(slotId: string): Promise<{
    id: string;
    status: string;
    currentStage?: string;
    stageIndex?: number;
    totalStages?: number;
    error?: string;
  } | null> {
    const response = await this.fetch<{
      success: boolean;
      slot: {
        id: string;
        status: string;
        currentStage?: string;
        stageIndex?: number;
        totalStages?: number;
        error?: string;
      } | null;
    }>(`getScheduledSlot?slotId=${slotId}`);
    return response.slot;
  }

  // ==========================================
  // Orchestrator - Status & Stats
  // ==========================================

  /**
   * Scheduled slot'ları listele
   */
  async listScheduledSlots(options?: {
    status?: string;
    limit?: number;
  }): Promise<ScheduledSlot[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append("status", options.status);
    if (options?.limit) params.append("limit", String(options.limit));

    const queryString = params.toString();
    const endpoint = queryString ? `listScheduledSlots?${queryString}` : "listScheduledSlots";

    const response = await this.fetch<{
      success: boolean;
      data: ScheduledSlot[];
      count: number;
    }>(endpoint);
    return response.data;
  }

  /**
   * Pipeline sonuçlarını listele
   */
  async listPipelineResults(limit?: number): Promise<PipelineResult[]> {
    const endpoint = limit ? `listPipelineResults?limit=${limit}` : "listPipelineResults";
    const response = await this.fetch<{
      success: boolean;
      data: PipelineResult[];
      count: number;
    }>(endpoint);
    return response.data;
  }

  /**
   * Orchestrator dashboard istatistikleri
   */
  async getOrchestratorDashboardStats(): Promise<OrchestratorDashboardStats> {
    const response = await this.fetch<{
      success: boolean;
      data: OrchestratorDashboardStats;
    }>("getOrchestratorDashboardStats");
    return response.data;
  }

  /**
   * Dashboard için tüm verileri tek seferde yükle (2nd Gen - Hızlı)
   * 3 ayrı API çağrısı yerine tek çağrı - Cold start süresini %60-70 azaltır
   */
  async loadDashboardData(slotsLimit = 50): Promise<{
    stats: OrchestratorDashboardStats;
    slots: ScheduledSlot[];
    themes: Theme[];
    aiStats?: AIStats;
    aiStatsMonthly?: {
      totalCost: number;
      totalCalls: number;
      geminiCalls: number;
      claudeCalls: number;
    };
    loadTimeMs: number;
  }> {
    const response = await this.fetch<{
      success: boolean;
      stats: OrchestratorDashboardStats;
      slots: ScheduledSlot[];
      themes: Theme[];
      aiStats?: AIStats;
      aiStatsMonthly?: {
        totalCost: number;
        totalCalls: number;
        geminiCalls: number;
        claudeCalls: number;
      };
      loadTimeMs: number;
    }>(`loadDashboardData?slotsLimit=${slotsLimit}`);
    return {
      stats: response.stats,
      slots: response.slots,
      themes: response.themes,
      aiStats: response.aiStats,
      aiStatsMonthly: response.aiStatsMonthly,
      loadTimeMs: response.loadTimeMs,
    };
  }

  /**
   * Sistem kurulum durumunu al (Onboarding Progress)
   * Ürünler, asset'ler, senaryolar, temalar ve zaman dilimlerinin durumunu döner
   */
  async getSetupStatus(): Promise<SetupStatusResponse> {
    const response = await this.fetch<{
      success: boolean;
      data: SetupStatusResponse;
    }>("getSetupStatus");
    return response.data;
  }

  // ==========================================
  // Orchestrator - Slot CRUD Operations
  // ==========================================

  /**
   * Slot'un tam detaylarını getir (pipelineResult dahil)
   */
  async getSlotDetail(slotId: string): Promise<ScheduledSlot> {
    const response = await this.fetch<{
      success: boolean;
      data: ScheduledSlot;
    }>(`getSlotDetail?slotId=${slotId}`);
    return response.data;
  }

  /**
   * Slot sil
   */
  async deleteScheduledSlot(slotId: string): Promise<void> {
    await this.fetch<{ success: boolean }>(`deleteScheduledSlot?slotId=${slotId}`, {
      method: "POST",
    });
  }

  /**
   * Başarısız slot'u yeniden dene
   */
  async retrySlot(slotId: string): Promise<void> {
    await this.fetch<{ success: boolean }>("retrySlot", {
      method: "POST",
      body: JSON.stringify({ slotId }),
    });
  }

  /**
   * Slot'u onayla ve Instagram'a yayınla
   */
  async approveSlot(slotId: string): Promise<void> {
    await this.fetch<{ success: boolean }>("approveSlot", {
      method: "POST",
      body: JSON.stringify({ slotId }),
    });
  }

  /**
   * Slot'u reddet
   */
  async rejectSlot(slotId: string): Promise<void> {
    await this.fetch<{ success: boolean }>("rejectSlot", {
      method: "POST",
      body: JSON.stringify({ slotId }),
    });
  }

  /**
   * Slot caption'ını güncelle
   */
  async updateSlotCaption(slotId: string, caption: string, hashtags?: string[]): Promise<void> {
    await this.fetch<{ success: boolean }>("updateSlotCaption", {
      method: "POST",
      body: JSON.stringify({ slotId, caption, hashtags }),
    });
  }

  // ==========================================
  // Orchestrator - Config & Variation Rules
  // ==========================================

  /**
   * Orchestrator config'i getir (çeşitlilik kuralları)
   */
  async getOrchestratorConfig(): Promise<{
    variationRules: {
      scenarioGap: number;
      tableGap: number;
      handStyleGap: number;
      compositionGap: number;
      petFrequency: number;
      similarityThreshold: number;
    };
    weeklyThemes: Record<string, {
      mood: string;
      scenarios: string[];
      petAllowed?: boolean;
    }>;
    assetPriorities: {
      underusedBoost: number;
      lastUsedPenalty: number;
    };
  }> {
    const response = await this.fetch<{
      success: boolean;
      data: {
        variationRules: {
          scenarioGap: number;
          tableGap: number;
          handStyleGap: number;
          compositionGap: number;
          petFrequency: number;
          similarityThreshold: number;
        };
        weeklyThemes: Record<string, {
          mood: string;
          scenarios: string[];
          petAllowed?: boolean;
        }>;
        assetPriorities: {
          underusedBoost: number;
          lastUsedPenalty: number;
        };
      };
    }>("getVariationConfig");
    return response.data;
  }

  /**
   * Orchestrator config'i güncelle
   */
  async updateOrchestratorConfig(updates: {
    variationRules?: {
      scenarioGap?: number;
      tableGap?: number;
      handStyleGap?: number;
      compositionGap?: number;
      petFrequency?: number;
      similarityThreshold?: number;
    };
    weeklyThemes?: Record<string, {
      mood: string;
      scenarios: string[];
      petAllowed?: boolean;
    }>;
    assetPriorities?: {
      underusedBoost?: number;
      lastUsedPenalty?: number;
    };
  }): Promise<void> {
    await this.fetch<{ success: boolean }>("updateVariationConfig", {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Üretim geçmişini getir (çeşitlilik takibi için)
   */
  async getProductionHistory(limit: number = 15): Promise<{
    id: string;
    timestamp: number;
    scenarioId: string;
    compositionId: string;
    tableId?: string;
    handStyleId?: string;
    includesPet: boolean;
    productType: string;
  }[]> {
    const response = await this.fetch<{
      success: boolean;
      data: {
        id: string;
        timestamp: number;
        scenarioId: string;
        compositionId: string;
        tableId?: string;
        handStyleId?: string;
        includesPet: boolean;
        productType: string;
      }[];
    }>(`getProductionHistory?limit=${limit}`);
    return response.data;
  }

  /**
   * Köpek kullanım istatistiğini getir
   */
  async getPetUsageStats(): Promise<{
    lastPetUsage: number | null;
    productionsSincePet: number;
    nextPetDue: boolean;
  }> {
    const response = await this.fetch<{
      success: boolean;
      data: {
        lastPetUsage: number | null;
        productionsSincePet: number;
        nextPetDue: boolean;
      };
    }>("getPetUsageStats");
    return response.data;
  }

  // ==========================================
  // Orchestrator - Timeout Configuration
  // ==========================================

  /**
   * Timeout ayarlarını getir
   */
  async getTimeoutsConfig(): Promise<{
    telegramApprovalMinutes: number;
    processingTimeoutMinutes: number;
    fetchTimeoutSeconds: number;
    retryDelayMs: number;
    updatedAt: number;
  }> {
    const response = await this.fetch<{
      success: boolean;
      data: {
        telegramApprovalMinutes: number;
        processingTimeoutMinutes: number;
        fetchTimeoutSeconds: number;
        retryDelayMs: number;
        updatedAt: number;
      };
    }>("getTimeoutsConfig");
    return response.data;
  }

  /**
   * Timeout ayarlarını güncelle
   */
  async updateTimeoutsConfig(updates: {
    telegramApprovalMinutes?: number;
    processingTimeoutMinutes?: number;
    fetchTimeoutSeconds?: number;
    retryDelayMs?: number;
  }): Promise<void> {
    await this.fetch<{ success: boolean }>("updateTimeoutsConfig", {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  // ==========================================
  // Orchestrator - Theme Management
  // ==========================================

  /**
   * Tüm senaryoları listele
   */
  async listScenarios(): Promise<{
    all: Array<{ id: string; name: string; includesHands?: boolean; isInterior?: boolean }>;
    byCategory: {
      withHands: Array<{ id: string; name: string }>;
      withoutHands: Array<{ id: string; name: string }>;
      interior: Array<{ id: string; name: string }>;
    };
    total: number;
  }> {
    const response = await this.fetch<{
      success: boolean;
      data: {
        all: Array<{ id: string; name: string; includesHands?: boolean; isInterior?: boolean }>;
        byCategory: {
          withHands: Array<{ id: string; name: string }>;
          withoutHands: Array<{ id: string; name: string }>;
          interior: Array<{ id: string; name: string }>;
        };
        total: number;
      };
    }>("listScenarios");
    return response.data;
  }

  /**
   * Tüm temaları listele
   */
  async listThemes(): Promise<Theme[]> {
    const response = await this.fetch<{
      success: boolean;
      data: Theme[];
    }>("listThemes");
    return response.data;
  }

  /**
   * Yeni tema oluştur
   */
  async createTheme(theme: {
    id: string;
    name: string;
    description?: string;
    scenarios: string[];
    mood: string;
    petAllowed: boolean;
    accessoryAllowed: boolean;
  }): Promise<Theme> {
    const response = await this.fetch<{
      success: boolean;
      data: Theme;
    }>("createTheme", {
      method: "POST",
      body: JSON.stringify(theme),
    });
    return response.data;
  }

  /**
   * Tema güncelle
   */
  async updateTheme(id: string, updates: Partial<{
    name: string;
    description: string;
    scenarios: string[];
    mood: string;
    petAllowed: boolean;
    accessoryAllowed: boolean;
  }>): Promise<Theme> {
    const response = await this.fetch<{
      success: boolean;
      data: Theme;
    }>("updateTheme", {
      method: "POST",
      body: JSON.stringify({ id, ...updates }),
    });
    return response.data;
  }

  /**
   * Tema sil
   */
  async deleteTheme(id: string): Promise<void> {
    await this.fetch<{ success: boolean }>("deleteTheme", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  // ==========================================
  // AI Monitor Methods
  // ==========================================

  /**
   * AI loglarını listele
   */
  async getAILogs(options?: {
    provider?: AIProvider;
    stage?: AILogStage;
    status?: AILogStatus;
    pipelineId?: string;
    limit?: number;
  }): Promise<AILog[]> {
    const params = new URLSearchParams();
    if (options?.provider) params.append("provider", options.provider);
    if (options?.stage) params.append("stage", options.stage);
    if (options?.status) params.append("status", options.status);
    if (options?.pipelineId) params.append("pipelineId", options.pipelineId);
    if (options?.limit) params.append("limit", String(options.limit));

    const queryString = params.toString();
    const endpoint = queryString ? `getAILogs?${queryString}` : "getAILogs";

    const response = await this.fetch<{
      success: boolean;
      data: AILog[];
      count: number;
    }>(endpoint);
    return response.data;
  }

  /**
   * AI istatistiklerini getir
   */
  async getAIStats(hours: number = 24): Promise<AIStats> {
    const response = await this.fetch<{
      success: boolean;
      data: AIStats;
      period: string;
    }>(`getAIStats?hours=${hours}`);
    return response.data;
  }

  /**
   * Tek bir AI log kaydını getir
   */
  async getAILogById(id: string): Promise<AILog> {
    const response = await this.fetch<{
      success: boolean;
      data: AILog;
    }>(`getAILogById/${id}`);
    return response.data;
  }

  /**
   * Pipeline'a ait AI loglarını getir
   */
  async getAILogsByPipeline(pipelineId: string): Promise<AILog[]> {
    const response = await this.fetch<{
      success: boolean;
      data: AILog[];
      count: number;
      pipelineId: string;
    }>(`getAILogsByPipeline/${pipelineId}`);
    return response.data;
  }

  /**
   * Eski AI loglarını temizle
   */
  async cleanupAILogs(daysOld: number = 30): Promise<number> {
    const response = await this.fetch<{
      success: boolean;
      message: string;
      deletedCount: number;
    }>(`cleanupAILogs?daysOld=${daysOld}`, {
      method: "POST",
    });
    return response.deletedCount;
  }

  // ==========================================
  // FEEDBACK API
  // ==========================================

  /**
   * Yeni feedback oluştur
   */
  async createFeedback(data: {
    slotId: string;
    category: string;
    customNote?: string;
    pipelineId?: string;
    scenarioId?: string;
    productType?: string;
    productId?: string;
    handStyleId?: string;
    compositionId?: string;
  }): Promise<string> {
    const response = await this.fetch<{
      success: boolean;
      data: { id: string };
    }>("createFeedback", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data.id;
  }

  /**
   * Slot'a ait feedback'leri getir
   */
  async getFeedbackBySlot(slotId: string): Promise<Array<{
    id: string;
    category: string;
    customNote?: string;
    createdAt: number;
    resolved: boolean;
  }>> {
    const response = await this.fetch<{
      success: boolean;
      data: Array<{
        id: string;
        category: string;
        customNote?: string;
        createdAt: number;
        resolved: boolean;
      }>;
    }>(`getFeedbackBySlot?slotId=${slotId}`);
    return response.data;
  }

  // ==========================================
  // AI RULES API (Öğrenme Kuralları)
  // ==========================================

  /**
   * Tüm AI kurallarını listele
   */
  async listAIRules(activeOnly: boolean = false): Promise<AIRule[]> {
    const response = await this.fetch<{
      success: boolean;
      data: AIRule[];
    }>(`listAIRules${activeOnly ? "?activeOnly=true" : ""}`);
    return response.data;
  }

  /**
   * Yeni AI kuralı oluştur
   */
  async createAIRule(data: {
    type: "do" | "dont";
    category: string;
    title: string;
    description: string;
    exampleImageUrl?: string;
    isActive?: boolean;
  }): Promise<string> {
    const response = await this.fetch<{
      success: boolean;
      data: { id: string };
    }>("createAIRule", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data.id;
  }

  /**
   * AI kuralı güncelle
   */
  async updateAIRule(id: string, updates: Partial<{
    type: "do" | "dont";
    category: string;
    title: string;
    description: string;
    exampleImageUrl?: string;
    isActive: boolean;
  }>): Promise<void> {
    await this.fetch<{ success: boolean }>("updateAIRule", {
      method: "PUT",
      body: JSON.stringify({ id, ...updates }),
    });
  }

  /**
   * AI kuralı sil
   */
  async deleteAIRule(id: string): Promise<void> {
    await this.fetch<{ success: boolean }>(`deleteAIRule?id=${id}`, {
      method: "DELETE",
    });
  }

  /**
   * AI kural istatistiklerini getir
   */
  async getAIRulesStats(): Promise<AIRulesStats> {
    const response = await this.fetch<{
      success: boolean;
      data: AIRulesStats;
    }>("getAIRulesStats");
    return response.data;
  }

  // ==========================================
  // Dynamic Categories
  // ==========================================

  /**
   * Tüm kategorileri getir
   */
  async getCategories(): Promise<{ categories: DynamicCategory[] }> {
    const cacheKey = "categories";
    const cached = this.getFromCache<{ categories: DynamicCategory[] }>(cacheKey);
    if (cached) return cached;

    const response = await this.fetch<{
      success: boolean;
      data: { categories: DynamicCategory[] };
    }>("getCategories");

    // 5 dakika cache
    this.setCache(cacheKey, response.data, 300);
    return response.data;
  }

  /**
   * Belirli bir kategori türünü getir
   */
  async getCategoryByType(type: DynamicCategoryType): Promise<DynamicCategory | null> {
    const response = await this.fetch<{
      success: boolean;
      data: DynamicCategory;
    }>(`getCategoryByType?type=${type}`);
    return response.data;
  }

  /**
   * Belirli bir kategori türünün slug listesini getir
   */
  async getSubTypeSlugs(type: DynamicCategoryType): Promise<string[]> {
    const response = await this.fetch<{
      success: boolean;
      data: string[];
    }>(`getSubTypeSlugs?type=${type}`);
    return response.data;
  }

  /**
   * Tüm ürün kategorisi slug'larını getir (TimeSlotRule için)
   */
  async getAllProductSlugs(): Promise<string[]> {
    const response = await this.fetch<{
      success: boolean;
      data: string[];
    }>("getAllProductSlugs");
    return response.data;
  }

  /**
   * Kategori özet bilgilerini getir
   */
  async getCategorySummary(): Promise<Array<{
    type: DynamicCategoryType;
    displayName: string;
    icon: string;
    activeCount: number;
    totalCount: number;
  }>> {
    const response = await this.fetch<{
      success: boolean;
      data: Array<{
        type: DynamicCategoryType;
        displayName: string;
        icon: string;
        activeCount: number;
        totalCount: number;
      }>;
    }>("getCategorySummary");
    return response.data;
  }

  /**
   * Yeni alt kategori ekle
   */
  async addSubType(
    type: DynamicCategoryType,
    subType: {
      slug: string;
      displayName: string;
      icon?: string;
      description?: string;
      isActive?: boolean;
      eatingMethodDefault?: string;
      canBeHeldDefault?: boolean;
    }
  ): Promise<void> {
    await this.fetch<{ success: boolean }>("addSubType", {
      method: "POST",
      body: JSON.stringify({ type, ...subType }),
    });

    // Cache'i temizle
    this.clearCache("categories");
  }

  /**
   * Alt kategori güncelle
   */
  async updateSubType(
    type: DynamicCategoryType,
    slug: string,
    updates: {
      displayName?: string;
      icon?: string;
      description?: string;
      isActive?: boolean;
      order?: number;
      eatingMethodDefault?: string;
      canBeHeldDefault?: boolean;
    }
  ): Promise<void> {
    await this.fetch<{ success: boolean }>("updateSubType", {
      method: "POST",
      body: JSON.stringify({ type, slug, ...updates }),
    });

    // Cache'i temizle
    this.clearCache("categories");
  }

  /**
   * Alt kategoriyi deaktif et (soft delete)
   */
  async deactivateSubType(type: DynamicCategoryType, slug: string): Promise<void> {
    await this.fetch<{ success: boolean }>("deactivateSubType", {
      method: "POST",
      body: JSON.stringify({ type, slug }),
    });

    // Cache'i temizle
    this.clearCache("categories");
  }

  /**
   * Alt kategoriyi aktif et
   */
  async activateSubType(type: DynamicCategoryType, slug: string): Promise<void> {
    await this.fetch<{ success: boolean }>("activateSubType", {
      method: "POST",
      body: JSON.stringify({ type, slug }),
    });

    // Cache'i temizle
    this.clearCache("categories");
  }

  /**
   * Alt kategorilerin sırasını güncelle
   */
  async reorderSubTypes(type: DynamicCategoryType, slugOrder: string[]): Promise<void> {
    await this.fetch<{ success: boolean }>("reorderSubTypes", {
      method: "POST",
      body: JSON.stringify({ type, slugOrder }),
    });

    // Cache'i temizle
    this.clearCache("categories");
  }

  /**
   * Varsayılan kategorileri seed et
   */
  async seedCategories(): Promise<{ categories: DynamicCategory[] }> {
    const response = await this.fetch<{
      success: boolean;
      data: { categories: DynamicCategory[] };
      message: string;
    }>("seedCategories", {
      method: "POST",
    });
    return response.data;
  }

  /**
   * Kategori cache'ini temizle
   */
  async clearCategoriesCache(): Promise<void> {
    await this.fetch<{ success: boolean }>("clearCategoriesCache", {
      method: "POST",
    });
  }

  /**
   * Slug'ı displayName'e çevir
   */
  async getCategoryDisplayName(type: DynamicCategoryType, slug: string): Promise<string> {
    const response = await this.fetch<{
      success: boolean;
      data: { slug: string; displayName: string };
    }>(`getCategoryDisplayName?type=${type}&slug=${slug}`);
    return response.data.displayName;
  }

  // ==========================================
  // Main Category Management (SaaS)
  // ==========================================

  /**
   * Yeni ana kategori ekle
   */
  async addMainCategory(category: {
    type: string;
    displayName: string;
    icon: string;
    description?: string;
  }): Promise<void> {
    await this.fetch<{ success: boolean }>("addMainCategory", {
      method: "POST",
      body: JSON.stringify(category),
    });
  }

  /**
   * Ana kategori güncelle
   */
  async updateMainCategory(
    type: DynamicCategoryType,
    updates: {
      displayName?: string;
      icon?: string;
      description?: string;
    }
  ): Promise<void> {
    await this.fetch<{ success: boolean }>("updateMainCategory", {
      method: "POST",
      body: JSON.stringify({ type, ...updates }),
    });
  }

  /**
   * Ana kategori sil (soft delete)
   */
  async deleteMainCategory(type: DynamicCategoryType): Promise<void> {
    await this.fetch<{ success: boolean }>("deleteMainCategory", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
  }

  // ==========================================
  // Prompt Studio
  // ==========================================

  /**
   * Tüm prompt template'lerini getir
   */
  async getPromptStudioConfig(): Promise<PromptStudioConfig> {
    const result = await this.fetch<{ success: boolean; data: PromptStudioConfig }>(
      "getPromptStudioConfig"
    );
    return result.data;
  }

  /**
   * Tekil prompt template getir
   */
  async getPromptTemplate(stageId: PromptStageId): Promise<PromptTemplate> {
    const result = await this.fetch<{ success: boolean; data: PromptTemplate }>(
      `getPromptTemplateById?stageId=${stageId}`
    );
    return result.data;
  }

  /**
   * Prompt template güncelle
   */
  async updatePromptTemplate(
    stageId: PromptStageId,
    systemPrompt: string,
    changeNote?: string
  ): Promise<PromptTemplate> {
    const result = await this.fetch<{ success: boolean; data: PromptTemplate }>(
      "updatePromptTemplateEndpoint",
      {
        method: "PUT",
        body: JSON.stringify({ stageId, systemPrompt, changeNote }),
      }
    );
    return result.data;
  }

  /**
   * Prompt template'i önceki versiyona geri al
   */
  async revertPromptTemplate(
    stageId: PromptStageId,
    targetVersion: number
  ): Promise<PromptTemplate> {
    const result = await this.fetch<{ success: boolean; data: PromptTemplate }>(
      "revertPromptTemplateEndpoint",
      {
        method: "POST",
        body: JSON.stringify({ stageId, targetVersion }),
      }
    );
    return result.data;
  }

  /**
   * Prompt Studio cache'ini temizle
   */
  async clearPromptStudioCache(): Promise<void> {
    await this.fetch<{ success: boolean }>("clearPromptStudioCacheEndpoint", {
      method: "POST",
    });
  }

  // ==========================================
  // Style Operations
  // ==========================================

  /**
   * Stilleri getir
   */
  async getStyles(activeOnly: boolean = false): Promise<Style[]> {
    const response = await this.fetch<{ success: boolean; styles: Style[] }>(
      `getStyles?activeOnly=${activeOnly}`
    );
    return response.styles;
  }

  /**
   * Stil detayı getir
   */
  async getStyle(id: string): Promise<Style> {
    const response = await this.fetch<{ success: boolean; style: Style }>(
      `getStyle?id=${id}`
    );
    return response.style;
  }

  /**
   * Yeni stil oluştur
   */
  async createStyle(data: Partial<Style>): Promise<Style> {
    const response = await this.fetch<{ success: boolean; style: Style }>(
      "createStyle",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.style;
  }

  /**
   * Stil güncelle
   */
  async updateStyle(id: string, data: Partial<Style>): Promise<void> {
    await this.fetch<{ success: boolean }>(`updateStyle?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * Stil sil
   */
  async deleteStyle(id: string): Promise<void> {
    await this.fetch<{ success: boolean }>(`deleteStyle?id=${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Görsel Analizi (Visual Interpreter)
   */
  async analyzeImage(data: VisualCriticRequest): Promise<VisualCriticResponse> {
    const response = await this.fetch<{
      success: boolean;
      data: VisualCriticResponse;
    }>("analyzeImage", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  }
}


// Singleton instance
export const api = new ApiService();

export default api;

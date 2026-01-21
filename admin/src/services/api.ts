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
} from "../types";

// Firebase Functions base URL
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net";

/**
 * API isteklerini yöneten servis
 */
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
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
   */
  async orchestratorGenerateNow(productType: string, themeId?: string): Promise<{
    success: boolean;
    message: string;
    slotId: string;
    duration?: number;
    error?: string;
  }> {
    const body: { productType: string; themeId?: string } = { productType };
    if (themeId) {
      body.themeId = themeId;
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
  // Orchestrator - Theme Management
  // ==========================================

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
}

// Singleton instance
export const api = new ApiService();

export default api;

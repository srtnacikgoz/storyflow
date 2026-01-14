import type {
  QueueItem,
  QueueStats,
  HealthCheckResponse,
  ProductCategory,
  UsageStats,
  UsageRecord,
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
   * Kuyruk item'ını işle (manuel trigger)
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
}

// Singleton instance
export const api = new ApiService();

export default api;

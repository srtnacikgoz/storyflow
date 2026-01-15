/**
 * Telegram Bot Service (Lightweight HTTP-based)
 * Instagram Automation - Sade Patisserie
 *
 * Human-in-the-Loop approval system via Telegram
 * Uses direct HTTP calls instead of Telegraf for faster cold starts
 */

import {TelegramConfig, Photo} from "../types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

/**
 * Callback data format for inline keyboard buttons
 * Format: action_itemId (e.g., "approve_abc123", "reject_abc123")
 */
export type CallbackAction = "approve" | "reject" | "regenerate";

/**
 * Parsed callback data
 */
export interface ParsedCallback {
  action: CallbackAction;
  itemId: string;
}

/**
 * Telegram Service for Human-in-the-Loop approval
 * Lightweight HTTP-based implementation
 */
export class TelegramService {
  private botToken: string;
  private chatId: string;
  private approvalTimeout: number;
  private apiBase: string;

  /**
   * Create Telegram Service
   * @param {TelegramConfig} config - Telegram configuration
   */
  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.approvalTimeout = config.approvalTimeout;
    this.apiBase = `${TELEGRAM_API_BASE}${this.botToken}`;
  }

  /**
   * Make Telegram API call
   * @param {string} method - API method name
   * @param {object} params - Request parameters
   * @return {Promise<T>} API response
   */
  private async callApi<T>(method: string, params: object): Promise<T> {
    const response = await fetch(`${this.apiBase}/${method}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(params),
    });

    const data = await response.json() as {ok: boolean; result: T; description?: string};

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || "Unknown error"}`);
    }

    return data.result;
  }

  /**
   * Send approval request with image and inline keyboard
   * @param {Photo} item - Queue item to approve
   * @param {string} enhancedUrl - Enhanced image URL (or original if no enhancement)
   * @return {Promise<number>} Telegram message ID
   */
  async sendApprovalRequest(item: Photo, enhancedUrl: string): Promise<number> {
    const caption = this.buildApprovalCaption(item);

    // Inline keyboard
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {text: "✅ Onayla", callback_data: `approve_${item.id}`},
          {text: "❌ Reddet", callback_data: `reject_${item.id}`},
        ],
        [
          {text: "🔄 Yeniden Oluştur", callback_data: `regenerate_${item.id}`},
        ],
      ],
    };

    try {
      const result = await this.callApi<{message_id: number}>("sendPhoto", {
        chat_id: this.chatId,
        photo: enhancedUrl,
        caption: caption,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      });

      console.log("[Telegram] Approval request sent, message ID:", result.message_id);
      return result.message_id;
    } catch (error) {
      console.error("[Telegram] Failed to send approval request:", error);
      throw error;
    }
  }

  /**
   * Build approval message caption
   * @param {Photo} item - Queue item
   * @return {string} Formatted caption
   */
  private buildApprovalCaption(item: Photo): string {
    const lines: string[] = [
      "📸 <b>Yeni Story Hazır!</b>",
      "",
      `🏷️ <b>Ürün:</b> ${item.productName || "Belirtilmemiş"}`,
      `📁 <b>Kategori:</b> ${this.formatCategory(item.productCategory)}`,
    ];

    // Şablon bilgisi
    if (item.captionTemplateName) {
      lines.push(`📋 <b>Şablon:</b> ${item.captionTemplateName}`);
    }

    // Caption (şablondan render edilmiş veya manuel)
    if (item.caption) {
      lines.push("");
      lines.push("📝 <b>Başlık:</b>");
      lines.push(`<code>${item.caption}</code>`);
    }

    lines.push("");
    lines.push(`🎨 <b>Stil:</b> ${this.formatStyle(item.styleVariant)}`);
    lines.push(`🤖 <b>Model:</b> ${item.aiModel}`);
    lines.push(`🎯 <b>Sadakat:</b> ${Math.round((item.faithfulness || 0.7) * 100)}%`);
    lines.push("");
    lines.push(`⏰ <b>Timeout:</b> ${this.approvalTimeout} dakika`);
    lines.push("");
    lines.push("<i>Onaylamak için ✅, reddetmek için ❌ basın.</i>");

    return lines.join("\n");
  }

  /**
   * Format product category for display
   * @param {string} category - Category key
   * @return {string} Formatted category name
   */
  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      "viennoiserie": "🥐 Viennoiserie",
      "coffee": "☕ Kahve",
      "chocolate": "🍫 Çikolata",
      "small-desserts": "🧁 Küçük Tatlılar",
      "slice-cakes": "🍰 Dilim Pasta",
      "big-cakes": "🎂 Büyük Pasta",
      "profiterole": "🍩 Profiterol",
      "special-orders": "✨ Özel Sipariş",
    };
    return categoryMap[category] || category;
  }

  /**
   * Format style variant for display
   * @param {string} style - Style variant key
   * @return {string} Formatted style name
   */
  private formatStyle(style: string): string {
    const styleMap: Record<string, string> = {
      "pure-minimal": "Sade & Minimal",
      "lifestyle-moments": "Lifestyle",
      "rustic-warmth": "Rustik Sıcaklık",
      "french-elegance": "Fransız Zarafeti",
    };
    return styleMap[style] || style;
  }

  /**
   * Send confirmation message after approval/rejection
   * @param {boolean} approved - Whether item was approved
   * @param {string} itemId - Item ID
   * @param {string} storyId - Instagram story ID (if approved)
   * @return {Promise<void>}
   */
  async sendConfirmation(
    approved: boolean,
    itemId: string,
    storyId?: string
  ): Promise<void> {
    const emoji = approved ? "✅" : "❌";
    const status = approved ? "Onaylandı" : "Reddedildi";

    let message = `${emoji} <b>Story ${status}</b>\n\n`;
    message += `📋 ID: <code>${itemId}</code>\n`;

    if (approved && storyId) {
      message += `📱 Story ID: <code>${storyId}</code>\n`;
      message += "\n<i>Story başarıyla Instagram'a gönderildi!</i>";
    } else if (!approved) {
      message += "\n<i>Görsel kuyruğa geri alındı veya iptal edildi.</i>";
    }

    try {
      await this.callApi("sendMessage", {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      });
      console.log("[Telegram] Confirmation sent:", status);
    } catch (error) {
      console.error("[Telegram] Failed to send confirmation:", error);
    }
  }

  /**
   * Send scheduled confirmation
   * Zamanlanmış paylaşım onay mesajı
   * @param {string} itemId - Item ID
   * @param {string} scheduledTime - Formatted scheduled time
   * @return {Promise<void>}
   */
  async sendScheduledConfirmation(
    itemId: string,
    scheduledTime: string
  ): Promise<void> {
    const message =
      "📅 <b>ZAMANLANMIŞ PAYLAŞIM</b>\n\n" +
      `📋 ID: <code>${itemId}</code>\n` +
      `🕐 Paylaşım Zamanı: <b>${scheduledTime}</b>\n\n` +
      "<i>Görsel belirtilen zamanda otomatik olarak paylaşılacak.</i>";

    try {
      await this.callApi("sendMessage", {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      });
      console.log("[Telegram] Scheduled confirmation sent:", scheduledTime);
    } catch (error) {
      console.error("[Telegram] Failed to send scheduled confirmation:", error);
    }
  }

  /**
   * Send error notification
   * @param {string} errorMessage - Error message
   * @param {string} itemId - Optional item ID
   * @return {Promise<void>}
   */
  async sendError(errorMessage: string, itemId?: string): Promise<void> {
    let message = "⚠️ <b>Hata Oluştu</b>\n\n";

    if (itemId) {
      message += `📋 ID: <code>${itemId}</code>\n`;
    }

    message += `❌ <b>Hata:</b> ${errorMessage}`;

    try {
      await this.callApi("sendMessage", {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      });
      console.log("[Telegram] Error notification sent");
    } catch (error) {
      console.error("[Telegram] Failed to send error:", error);
    }
  }

  /**
   * Send regeneration confirmation
   * @param {string} itemId - Item ID
   * @return {Promise<void>}
   */
  async sendRegenerationConfirmation(itemId: string): Promise<void> {
    const message =
      "🔄 <b>Yeniden Oluşturulacak</b>\n\n" +
      `📋 ID: <code>${itemId}</code>\n\n` +
      "<i>Görsel yeni ayarlarla tekrar işlenecek. " +
      "Kuyruktan \"AI + Onayla\" ile yeniden başlatabilirsiniz.</i>";

    try {
      await this.callApi("sendMessage", {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      });
      console.log("[Telegram] Regeneration confirmation sent for:", itemId);
    } catch (error) {
      console.error("[Telegram] Failed to send regeneration confirmation:", error);
    }
  }

  /**
   * Send timeout notification
   * @param {string} itemId - Item ID
   * @return {Promise<void>}
   */
  async sendTimeoutNotification(itemId: string): Promise<void> {
    const message =
      "⏰ <b>Zaman Aşımı</b>\n\n" +
      `📋 ID: <code>${itemId}</code>\n\n` +
      `<i>${this.approvalTimeout} dakika içinde yanıt verilmediği için ` +
      "bu görsel otomatik olarak iptal edildi.</i>";

    try {
      await this.callApi("sendMessage", {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      });
      console.log("[Telegram] Timeout notification sent for:", itemId);
    } catch (error) {
      console.error("[Telegram] Failed to send timeout notification:", error);
    }
  }

  /**
   * Send reminder notification
   * @param {string} itemId - Item ID
   * @param {number} remainingMinutes - Remaining time in minutes
   * @return {Promise<void>}
   */
  async sendReminder(itemId: string, remainingMinutes: number): Promise<void> {
    const message =
      "⏳ <b>Hatırlatma</b>\n\n" +
      `📋 ID: <code>${itemId}</code>\n\n` +
      "<i>Bu story hâlâ onay bekliyor. " +
      `${remainingMinutes} dakika içinde yanıt verilmezse otomatik iptal edilecek.</i>`;

    try {
      await this.callApi("sendMessage", {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      });
      console.log("[Telegram] Reminder sent for:", itemId);
    } catch (error) {
      console.error("[Telegram] Failed to send reminder:", error);
    }
  }

  /**
   * Update original message after approval/rejection/regeneration
   * Removes inline keyboard and updates caption
   * @param {number} messageId - Original message ID
   * @param {string} status - Status: "approved", "rejected", or "regenerate"
   * @return {Promise<void>}
   */
  async updateApprovalMessage(
    messageId: number,
    status: "approved" | "rejected" | "regenerate"
  ): Promise<void> {
    const statusTexts: Record<string, string> = {
      approved: "✅ <b>ONAYLANDI</b>",
      rejected: "❌ <b>REDDEDİLDİ</b>",
      regenerate: "🔄 <b>YENİDEN OLUŞTURULACAK</b>",
    };

    const statusText = statusTexts[status];

    try {
      await this.callApi("editMessageCaption", {
        chat_id: this.chatId,
        message_id: messageId,
        caption: statusText,
        parse_mode: "HTML",
      });
      console.log("[Telegram] Message updated:", messageId, status);
    } catch (error) {
      console.log("[Telegram] Could not update message (may be already updated)");
    }
  }

  /**
   * Answer callback query (removes loading animation)
   * @param {string} callbackQueryId - Callback query ID
   * @param {string} text - Response text
   * @return {Promise<void>}
   */
  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    try {
      await this.callApi("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text: text,
      });
    } catch (error) {
      console.log("[Telegram] Could not answer callback query");
    }
  }

  /**
   * Parse callback data from inline keyboard
   * @param {string} callbackData - Raw callback data
   * @return {ParsedCallback | null} Parsed callback or null if invalid
   */
  static parseCallback(callbackData: string): ParsedCallback | null {
    const parts = callbackData.split("_");

    if (parts.length < 2) {
      return null;
    }

    const action = parts[0] as CallbackAction;
    const itemId = parts.slice(1).join("_");

    const validActions = ["approve", "reject", "regenerate"];
    if (!validActions.includes(action)) {
      return null;
    }

    return {action, itemId};
  }
}

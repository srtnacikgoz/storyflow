# Phase 6: Human-in-the-Loop (Telegram Onay Sistemi)

## Özet

Instagram'a paylaşım yapmadan önce Telegram üzerinden kullanıcı onayı alma sistemi. Hatalı paylaşımları önlemek için kritik güvenlik katmanı.

## Neden Gerekli?

1. **AI Hata Riski:** Gemini yanlış görsel üretebilir
2. **Caption Kontrolü:** Yazım hataları yakalanabilir
3. **Story Geri Alınamaz:** Paylaşıldıktan sonra düzeltme şansı yok
4. **İşletme İtibarı:** Hatalı paylaşım marka imajına zarar verir

## Teknik Yapı

### Kullanılacak Teknolojiler
- **Telegram Bot API** - Mesaj gönderme, inline keyboard
- **Telegraf.js** - Node.js Telegram bot framework
- **Firebase Cloud Functions** - Webhook handler
- **Firestore** - Onay durumu takibi

### Maliyet
- Telegram Bot API: **Ücretsiz**
- Firebase Functions: Mevcut kullanım içinde

## Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULER TETİKLENİR                     │
│                    (Her gün 09:00)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 KUYRUKTAN GÖRSEL AL                         │
│                 status: "pending"                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               GEMINİ İLE GÖRSELİ İŞLE                       │
│               (img2img transformation)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TELEGRAM'A ÖNİZLEME GÖNDER                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  📸 Yeni Story Hazır!                                 │  │
│  │                                                       │  │
│  │  🏷️ Ürün: Kestaneli Tart                             │  │
│  │  📝 Caption: "Sade özel..."                          │  │
│  │  🎨 Stil: French Elegance                            │  │
│  │  ⏰ Saat: 09:00                                      │  │
│  │                                                       │  │
│  │  [Görsel Önizleme]                                   │  │
│  │                                                       │  │
│  │  [✅ Onayla]  [❌ Reddet]                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│              status: "awaiting_approval"                    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    ✅ ONAYLA BASILDI    │     │    ❌ REDDET BASILDI    │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  Instagram'a paylaş     │     │  status: "rejected"     │
│  status: "completed"    │     │  Sıradaki görsele geç   │
└─────────────────────────┘     └─────────────────────────┘
```

## Implementasyon Planları

### 06-01: Telegram Bot Kurulumu
**Süre:** 30 dakika

Görevler:
- [ ] @BotFather ile yeni bot oluştur
- [ ] Bot token al
- [ ] Firebase config'e token ekle: `firebase functions:config:set telegram.bot_token="XXX"`
- [ ] Chat ID belirle (onay alınacak kullanıcı)
- [ ] Firebase config'e chat ID ekle: `firebase functions:config:set telegram.chat_id="XXX"`

### 06-02: TelegramService Oluşturma
**Süre:** 2 saat

Dosya: `functions/src/services/telegram.ts`

```typescript
// Temel yapı
export class TelegramService {
  private bot: Telegraf;
  private chatId: string;

  constructor(config: TelegramConfig) { }

  // Onay mesajı gönder (görsel + butonlar)
  async sendApprovalRequest(item: Photo, enhancedUrl: string): Promise<number>;

  // Onay sonucu bildir
  async sendConfirmation(approved: boolean, storyId?: string): Promise<void>;

  // Hata bildirimi
  async sendError(error: string): Promise<void>;
}
```

Özellikler:
- [ ] Telegraf.js kurulumu
- [ ] Görsel gönderme (URL veya base64)
- [ ] Inline keyboard (Onayla/Reddet butonları)
- [ ] Callback data formatı: `approve_${itemId}` / `reject_${itemId}`

### 06-03: Webhook Endpoint
**Süre:** 2 saat

Dosya: `functions/src/index.ts`

```typescript
export const telegramWebhook = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    // Telegram callback işle
    // Buton basıldığında tetiklenir
  });
```

Görevler:
- [ ] HTTPS endpoint oluştur
- [ ] Telegram update'lerini parse et
- [ ] Callback query işle (approve/reject)
- [ ] Güvenlik: Secret token ile doğrulama
- [ ] Bot webhook'u Firebase URL'e bağla

### 06-04: processQueue Entegrasyonu
**Süre:** 2 saat

Dosya: `functions/src/schedulers/processQueue.ts`

Mevcut akış değişikliği:
```typescript
// ESKİ
Gemini işle → Instagram'a paylaş

// YENİ
Gemini işle → Telegram'a gönder → BEKLE → (callback gelince) → Paylaş/İptal
```

Görevler:
- [ ] `sendApprovalRequest()` çağrısı ekle
- [ ] Status: "awaiting_approval" durumu ekle
- [ ] Instagram paylaşımını callback'e taşı

### 06-05: Firestore Approval Tracking
**Süre:** 1 saat

Dosya: `functions/src/services/queue.ts`

Yeni alanlar:
```typescript
interface Photo {
  // ... mevcut alanlar
  approvalStatus?: "pending" | "awaiting" | "approved" | "rejected";
  approvalRequestedAt?: number;
  approvalRespondedAt?: number;
  telegramMessageId?: number;
}
```

Görevler:
- [ ] `markAsAwaitingApproval()` metodu
- [ ] `markAsApproved()` metodu
- [ ] `markAsRejected()` metodu
- [ ] Onay bekleyen item'ları getir

### 06-06: Timeout Handling
**Süre:** 1 saat

Senaryo: Kullanıcı X dakika içinde yanıt vermezse ne olacak?

Seçenekler:
1. **Otomatik iptal** - Güvenli, paylaşım yapılmaz
2. **Otomatik onay** - Riskli, hatalı paylaşım olabilir
3. **Hatırlatma gönder** - "Hâlâ onay bekleniyor..."
4. **Sıradakine geç** - Sonra tekrar dene

**Önerilen:** Seçenek 1 + 3 kombinasyonu
- 5 dakika sonra hatırlatma
- 15 dakika sonra otomatik iptal

Görevler:
- [ ] Timeout süresi config'e ekle
- [ ] Hatırlatma mekanizması
- [ ] Otomatik iptal/timeout handling

## Firestore Şema Güncellemesi

```typescript
// media-queue collection
{
  id: string;
  // ... mevcut alanlar

  // Yeni alanlar
  status: "pending" | "processing" | "awaiting_approval" | "approved" | "rejected" | "completed" | "failed";
  approvalRequestedAt?: Timestamp;
  approvalRespondedAt?: Timestamp;
  telegramMessageId?: number;
  rejectionReason?: string;
}
```

## Güvenlik Kontrolleri

1. **Webhook Doğrulama**
   - Telegram'dan gelen istekleri doğrula
   - Secret token kontrolü

2. **Chat ID Kısıtlaması**
   - Sadece belirlenen chat_id'den gelen callback'leri işle
   - Başkalarının onay vermesini engelle

3. **Rate Limiting**
   - Spam koruması
   - Aynı item için tekrar onay isteme engeli

## Test Senaryoları

1. **Happy Path:** Görsel işle → Telegram'a gönder → Onayla → Paylaş
2. **Rejection:** Görsel işle → Telegram'a gönder → Reddet → İptal
3. **Timeout:** Görsel işle → Telegram'a gönder → 15 dk bekle → Otomatik iptal
4. **Network Error:** Telegram'a gönderemezse ne olacak?
5. **Duplicate Callback:** Aynı butona iki kez basılırsa?

## Bağımlılıklar

```json
{
  "telegraf": "^4.16.0"
}
```

## Tahmini Süre

| Plan | Süre |
|------|------|
| 06-01: Bot kurulumu | 30 dk |
| 06-02: TelegramService | 2 saat |
| 06-03: Webhook endpoint | 2 saat |
| 06-04: processQueue entegrasyonu | 2 saat |
| 06-05: Firestore tracking | 1 saat |
| 06-06: Timeout handling | 1 saat |
| **TOPLAM** | **~8.5 saat** |

## Referanslar

- [Telegraf.js Docs](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Firebase + Telegram Tutorial](https://medium.com/firebase-developers/building-a-telegram-bot-with-firebase-cloud-functions-and-telegraf-js-5e5323068894)
- [Inline Keyboards](https://core.telegram.org/bots/features#inline-keyboards)

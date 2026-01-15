# Phase 8: Best Time to Post - Hibrit Sistem

## Özet
Geçmiş paylaşım verilerini analiz ederek en optimal paylaşım zamanlarını öneren akıllı sistem.

## Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                  Best Time to Post Sistemi                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATA LAYER                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │ Default Times   │    │ Post Analytics (Firestore)  │    │
│  │ (Research Data) │    │ - postedAt: timestamp       │    │
│  │                 │    │ - dayOfWeek: 0-6            │    │
│  │ Mon: 9,12,17    │    │ - hourOfDay: 0-23           │    │
│  │ Tue: 8,11,14    │    │ - engagementRate: number    │    │
│  │ Wed: 9,13,17    │    │ - impressions?: number      │    │
│  │ Thu: 8,11,15    │    │ - reach?: number            │    │
│  │ Fri: 9,14,17    │    │ - saves?: number            │    │
│  │ Sat: 10,14      │    │ - shares?: number           │    │
│  │ Sun: 12,17      │    └─────────────────────────────┘    │
│  └─────────────────┘                │                       │
│           │                         │                       │
│           └────────────┬────────────┘                       │
│                        ▼                                    │
│  ALGORITHM LAYER                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TimeScoreService                        │   │
│  │                                                      │   │
│  │  calculateScore(day, hour):                          │   │
│  │    defaultScore = getDefaultScore(day, hour)         │   │
│  │    historicalScore = getHistoricalScore(day, hour)   │   │
│  │    dataCount = getPostCountForSlot(day, hour)        │   │
│  │                                                      │   │
│  │    // Veri arttıkça historical ağırlığı artar        │   │
│  │    historicalWeight = min(dataCount / 10, 0.8)       │   │
│  │    defaultWeight = 1 - historicalWeight              │   │
│  │                                                      │   │
│  │    return defaultScore * defaultWeight +             │   │
│  │           historicalScore * historicalWeight         │   │
│  └─────────────────────────────────────────────────────┘   │
│                        │                                    │
│                        ▼                                    │
│  RECOMMENDATION LAYER                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           getRecommendations(count=5):               │   │
│  │                                                      │   │
│  │  1. Tüm gün/saat kombinasyonları için skor hesapla  │   │
│  │  2. En yüksek skorlu N slot'u döndür                │   │
│  │  3. Her slot için confidence level belirt            │   │
│  │                                                      │   │
│  │  return [                                            │   │
│  │    { day: "tuesday", hour: 14, score: 87,            │   │
│  │      confidence: "high", basedOn: 15 },              │   │
│  │    { day: "thursday", hour: 11, score: 82,           │   │
│  │      confidence: "medium", basedOn: 8 },             │   │
│  │    ...                                               │   │
│  │  ]                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Firestore Şeması

### Collection: `post-analytics`
```typescript
interface PostAnalytics {
  id: string;                    // Auto-generated
  photoId: string;               // İlgili photo ID
  storyId?: string;              // Instagram story ID

  // Zaman bilgileri
  postedAt: Timestamp;           // Paylaşım zamanı
  dayOfWeek: number;             // 0=Pazar, 1=Pazartesi, ... 6=Cumartesi
  hourOfDay: number;             // 0-23

  // Engagement metrikleri (başlangıçta null, sonra güncellenir)
  impressions?: number;          // Görüntülenme
  reach?: number;                // Ulaşılan kişi
  likes?: number;                // Beğeni
  comments?: number;             // Yorum
  saves?: number;                // Kaydetme
  shares?: number;               // Paylaşma (DM)

  // Hesaplanan metrikler
  engagementRate?: number;       // (likes + comments + saves) / reach

  // Meta
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### Collection: `time-scores` (Cache)
```typescript
interface TimeScore {
  id: string;                    // "day_hour" formatı (örn: "1_14")
  dayOfWeek: number;
  hourOfDay: number;

  // Skorlar
  defaultScore: number;          // Araştırma verisinden (0-100)
  historicalScore: number;       // Geçmiş veriden (0-100)
  combinedScore: number;         // Ağırlıklı ortalama

  // Meta
  postCount: number;             // Bu slot'taki toplam paylaşım
  avgEngagement: number;         // Ortalama engagement rate
  confidence: 'low' | 'medium' | 'high';
  lastCalculated: Timestamp;
}
```

## Default Optimal Times (Araştırma Verisi)

```typescript
// Sprout Social, Hootsuite, Buffer, Later araştırmalarının ortalaması
const DEFAULT_OPTIMAL_TIMES: Record<number, number[]> = {
  0: [12, 17],           // Pazar
  1: [9, 12, 17],        // Pazartesi
  2: [8, 11, 14, 17],    // Salı (en iyi gün)
  3: [9, 13, 17],        // Çarşamba
  4: [8, 11, 15, 17],    // Perşembe (en iyi gün)
  5: [9, 14, 17],        // Cuma
  6: [10, 14],           // Cumartesi
};

// Saat bazlı base score (0-100)
const HOUR_BASE_SCORES: Record<number, number> = {
  6: 60, 7: 70, 8: 80, 9: 85,
  10: 75, 11: 85, 12: 80, 13: 75,
  14: 85, 15: 80, 16: 75, 17: 85,
  18: 70, 19: 65, 20: 60, 21: 55,
  // Gece saatleri düşük skor
  22: 40, 23: 35, 0: 30, 1: 25,
  2: 20, 3: 15, 4: 15, 5: 40,
};
```

## API Endpoints

### 1. `GET /getBestTimes`
En iyi paylaşım zamanlarını döndürür.

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "day": "tuesday",
      "dayIndex": 2,
      "hour": 14,
      "score": 87,
      "confidence": "high",
      "basedOnPosts": 15,
      "avgEngagement": 4.2
    }
  ],
  "heatmap": {
    "0": { "9": 45, "12": 65, "17": 60 },
    "1": { "9": 72, "12": 78, "17": 85 }
  }
}
```

### 2. `POST /recordPostAnalytics`
Paylaşım sonrası analitik kaydeder.

**Request:**
```json
{
  "photoId": "xxx",
  "storyId": "yyy",
  "postedAt": "2026-01-15T14:00:00Z"
}
```

### 3. `POST /updateEngagementMetrics`
Engagement metriklerini günceller (24 saat sonra çağrılabilir).

**Request:**
```json
{
  "analyticsId": "xxx",
  "impressions": 1500,
  "reach": 1200,
  "likes": 45,
  "comments": 8,
  "saves": 12,
  "shares": 5
}
```

### 4. `GET /getTimeHeatmap`
Haftalık saat bazlı heatmap döndürür.

## Admin Panel UI

### 1. Best Times Sayfası
```
┌─────────────────────────────────────────────────────────────┐
│  Best Time to Post                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 En İyi Zamanlar                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🥇 Salı 14:00    Score: 87%  ████████░░ High       │   │
│  │  🥈 Perşembe 11:00 Score: 82%  ████████░░ Medium    │   │
│  │  🥉 Pazartesi 17:00 Score: 78% ███████░░░ Medium    │   │
│  │  4. Çarşamba 13:00 Score: 75%  ███████░░░ Low       │   │
│  │  5. Cuma 14:00     Score: 72%  ███████░░░ Low       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📅 Haftalık Heatmap                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     06  08  10  12  14  16  18  20  22              │   │
│  │ Pzt  ░░  ▒▒  ▒▒  ██  ██  ▒▒  ██  ▒▒  ░░           │   │
│  │ Sal  ▒▒  ██  ▒▒  ██  ██  ▒▒  ██  ▒▒  ░░           │   │
│  │ Çar  ░░  ▒▒  ▒▒  ▒▒  ██  ▒▒  ██  ▒▒  ░░           │   │
│  │ Per  ▒▒  ██  ▒▒  ██  ▒▒  ▒▒  ██  ▒▒  ░░           │   │
│  │ Cum  ░░  ▒▒  ▒▒  ▒▒  ██  ▒▒  ██  ▒▒  ░░           │   │
│  │ Cmt  ░░  ░░  ▒▒  ▒▒  ██  ▒▒  ░░  ░░  ░░           │   │
│  │ Paz  ░░  ░░  ░░  ██  ▒▒  ▒▒  ██  ░░  ░░           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ░░ Düşük  ▒▒ Orta  ██ Yüksek                              │
│                                                             │
│  📈 Veri Durumu                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Toplam Paylaşım: 47                                │   │
│  │  Analiz Edilen: 42                                  │   │
│  │  Ortalama Engagement: 3.8%                          │   │
│  │  Veri Güvenilirliği: Orta (daha fazla veri gerekli) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Scheduler Entegrasyonu
Fotoğraf eklerken:
```
┌─────────────────────────────────────────────────────────┐
│  ⏰ Paylaşım Zamanı                                     │
│                                                         │
│  ○ Hemen paylaş (Telegram onayı sonrası)               │
│  ○ En iyi zamanda paylaş (Önerilen: Salı 14:00)        │
│  ○ İleri tarih seç: [____] [__:__]                     │
│                                                         │
│  💡 Öneri: Salı 14:00 en yüksek engagement (%87)       │
└─────────────────────────────────────────────────────────┘
```

## Implementation Planı

### 08-01: Types & Service Altyapısı
- [ ] PostAnalytics ve TimeScore type'ları
- [ ] TimeScoreService sınıfı
- [ ] Default optimal times data

### 08-02: Analytics Recording
- [ ] recordPostAnalytics endpoint
- [ ] processQueue'da otomatik kayıt
- [ ] Firestore composite index

### 08-03: Scoring Algorithm
- [ ] calculateScore fonksiyonu
- [ ] Historical data aggregation
- [ ] Confidence level hesaplama

### 08-04: API Endpoints
- [ ] getBestTimes endpoint
- [ ] getTimeHeatmap endpoint
- [ ] updateEngagementMetrics endpoint

### 08-05: Admin Panel - Best Times Sayfası
- [ ] BestTimes.tsx component
- [ ] Heatmap visualization
- [ ] Top recommendations list

### 08-06: Scheduler Entegrasyonu
- [ ] AddPhoto'ya zaman seçimi
- [ ] Scheduled posts sistemi
- [ ] scheduledPostsScheduler function

## Bağımlılıklar
- Phase 6: Telegram HITL (completed)
- Phase 7: Caption Templates (completed)

## Risk Analizi (RISK-CHECK)

### Tier 2 - Önemli
| Risk | Etki | Mitigation |
|------|------|------------|
| Yetersiz veri | Yanlış öneriler | Default fallback, confidence göster |
| Instagram API limitleri | Engagement çekememe | Manuel güncelleme opsiyonu |

### Fallback Stratejisi
- Veri yoksa: Sadece default araştırma verisi göster
- API hatası: Cache'den eski veri göster

## Notlar
- İlk 10 paylaşıma kadar %70 default, %30 historical
- 10+ paylaşım sonrası %30 default, %70 historical
- Engagement metrikleri opsiyonel (Instagram API gerektirir)

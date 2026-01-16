---
name: instagram-bridge
version: 1.0.0
description: Instagram Otomasyon API koprusu
triggers:
  - /send-to-instagram
  - /send
author: Sade Patisserie
---

# Instagram Bridge

Photo Prompt Studio ciktisini Instagram Otomasyon sistemine gonderir.

## Konfigürasyon

```
API_ENDPOINT: https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/receivePromptFromStudio
API_KEY: [.env'den veya user'dan al]
```

## Kullanim

```
/send-to-instagram [payload_json]
```

veya photo-orchestrator workflow'undan otomatik cagrilir.

## Request Format

### Zorunlu Alanlar
- `imageUrl`: Gorselin public URL'i
- `prompt.main`: Ana prompt metni

### Opsiyonel Alanlar
- `analysis`: Gorsel analiz verileri
- `prompt.negative`: Negative prompt
- `prompt.platform`: "gemini" | "dalle" | "midjourney"
- `prompt.format`: "1:1" | "4:5" | "9:16"
- `settings`: Kategori, stil, zamanlama ayarlari
- `productName`: Urun adi

## curl Ornegi

```bash
curl -X POST "https://europe-west1-instagram-automation-ad77b.cloudfunctions.net/receivePromptFromStudio" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "imageUrl": "https://firebasestorage.googleapis.com/v0/b/...",
    "analysis": {
      "productType": "tiramisu",
      "dominantColors": ["#5D4037", "#F5F5DC"],
      "hasTypography": false,
      "suggestedStyle": "lifestyle-moments"
    },
    "prompt": {
      "main": "Using uploaded image as reference for tiramisu...",
      "negative": "steam, smoke, vapor...",
      "platform": "gemini",
      "format": "4:5"
    },
    "settings": {
      "category": "small-desserts",
      "styleVariant": "lifestyle-moments",
      "faithfulness": 0.8,
      "schedulingMode": "optimal"
    },
    "productName": "Klasik Tiramisu"
  }'
```

## Response Handling

### Basarili (201)
```json
{
  "success": true,
  "message": "Prompt received and queued",
  "itemId": "abc123def456",
  "status": "pending"
}
```

**Kullaniciya Mesaj:**
```
Gorsel kuyruga eklendi!

ID: abc123def456
Durum: Telegram onay bekliyor

Telegram'dan onay verdikten sonra Instagram'a paylasilacak.
```

### Dogrulama Hatasi (400)
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Missing required field: imageUrl"
}
```

**Kullaniciya Mesaj:**
```
Hata: Zorunlu alan eksik

Lutfen su bilgileri kontrol et:
- imageUrl: Gorselin public URL'i
- prompt.main: Ana prompt metni
```

### Yetkilendirme Hatasi (401)
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Invalid or missing API key"
}
```

**Kullaniciya Mesaj:**
```
Hata: API anahtari gecersiz

Cozum:
1. API anahtarini kontrol et
2. x-api-key header'ini dogru gonder
```

### Sunucu Hatasi (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "..."
}
```

**Kullaniciya Mesaj:**
```
Sunucu hatasi olustu

Cozum:
1. Birkas dakika bekle
2. Tekrar dene
3. Sorun devam ederse Firebase console'u kontrol et
```

## Gorsel URL Secenekleri

### 1. Firebase Storage (Onerilen)
```bash
# Gorseli Firebase Storage'a yukle
# Public URL al
# API'ye gonder
```

### 2. Gecici URL
- Base64 encode (buyuk dosyalarda sorun olabilir)
- Data URL olarak gonder

### 3. Harici URL
- Halihazirda public bir URL varsa dogrudan kullan
- CORS sorunlarina dikkat

## Settings Detaylari

### category (ProductCategory)
```
viennoiserie | coffee | chocolate | small-desserts |
slice-cakes | big-cakes | profiterole | special-orders
```

### styleVariant (StyleVariant)
```
pure-minimal | lifestyle-moments | rustic-warmth | french-elegance
```

### schedulingMode (SchedulingMode)
```
immediate  - Onay sonrasi hemen paylas
optimal    - En iyi saatte paylas (sistem secer)
scheduled  - Manuel tarih/saat sec
```

### faithfulness (number)
```
0.0 - 1.0 arasi
0.6: Yaratici mod
0.7: Dengeli (varsayilan)
0.8: Yuksek sadakat
0.9+: Typography koruma
```

## Troubleshooting

### "Network Error"
- Internet baglantisini kontrol et
- Firebase Functions calisir durumda mi?

### "CORS Error"
- Gorsel URL'inin public oldugunu kontrol et
- Firebase Storage CORS ayarlarini kontrol et

### "Timeout"
- Gorsel boyutu cok buyuk olabilir
- Daha kucuk gorsel dene

### "Item not appearing in queue"
- Firestore'u kontrol et
- Firebase console'da hata var mi?

# Tema → Prompt Builder Entegrasyonu Araştırması

> **Dosya:** `functions/src/orchestrator/geminiPromptBuilder.ts`
> **Tarih:** 2026-02-11

---

## 1. Tema Field → Prompt Etkisi Tablosu

| Tema Field | Prompt Bölümü | Etki Tipi | Efektivite |
|---|---|---|---|
| `weatherPreset` | SCENE SETTING | Doğrudan metin | GÜÇLÜ |
| `lightingPreset` | LIGHTING | Doğrudan metin | GÜÇLÜ |
| `atmospherePreset` | SCENE SETTING | Doğrudan metin | GÜÇLÜ |
| `preferredTags.*` | Referans görsel seçimi | Dolaylı (asset filtre) | ORTA |
| `accessoryOptions` | Referans görsel seçimi | Dolaylı (görsel) | ORTA |
| `accessoryAllowed` | Karar kontrolü | Boolean gate | ORTA |
| `scenarios` | SCENE DIRECTION | Dolaylı (senaryo → description) | GÜÇLÜ |
| `description` | THEME CONTEXT (sona eklenir) | Doğrudan metin | ZAYIF |
| `petAllowed` | Senaryo filtresi | Dolaylı | ORTA |
| `name` | Prompt'a GİRMEZ | - | YOK |

---

## 2. Doğrudan Prompt'a Giren Alanlar

### weatherPreset → SCENE SETTING (geminiPromptBuilder.ts:749)
```
Preset: "bright-sunny"
Prompt: "Bright sunshine, warm natural light with defined shadows"
```

### lightingPreset → LIGHTING (geminiPromptBuilder.ts:763)
```
Preset: "window-warm"
Prompt: "Warm side lighting from window, natural golden tones, 3500K tones"
```

### atmospherePreset → SCENE SETTING (geminiPromptBuilder.ts:758)
```
Preset: "peaceful-morning"
Prompt: "Peaceful morning coffee moment, intimate and contemplative"
```

### description → THEME CONTEXT (orchestrator.ts:2250-2252)
```typescript
prompt += `\n\nTHEME CONTEXT: ${themeDescription}`;
```
Prompt'un ana akışı dışında, sona yapıştırılıyor.

---

## 3. Dolaylı Etki Eden Alanlar

### preferredTags → Asset Seçimi (prompt'a metin GİRMEZ)
- v3.0 kararı: Tag'ler sadece referans görsel seçimi için
- Gemini prompt metnine hiçbir şey yazılmıyor
- Decision log'a kaydediliyor: "Tags only used for asset selection, not in prompt text"

### accessoryOptions → Referans Görsel (prompt'a metin GİRMEZ)
- v3.0 kararı: "Use ONLY references" talimatıyla çelişmemek için metin eklenmez
- Aksesuar referans görseli olarak gönderilir

### scenarios → SCENE DIRECTION
- Senaryo'nun description alanı SCENE DIRECTION bölümüne eklenir
- Tema doğrudan yazmıyor, senaryo üzerinden dolaylı etki

---

## 4. Kayıp Alanlar (Tema'da var, prompt'a aktarılmıyor)

| Alan | Durum | Potansiyel Etki |
|------|-------|----------------|
| `name` | Hiçbir yere aktarılmıyor | Düşük — metadata |
| Tema renk paleti | v3.0'da kaldırıldı, Mood'a taşındı | - |

---

## 5. Potansiyel Çarpıtma Riskleri

### Risk 1: weatherPreset + lightingPreset Çakışması
Örnek: rainy + candle-warm = yağmur + mum ışığı (çelişebilir)
Preset'ler independent olarak prompt'a eklenir, çelişki kontrolü YOK.
WEATHER_AUTO_MAP bu riski azaltıyor ama kullanıcı manuel override edebiliyor.

### Risk 2: preferredTags Asset Personality Kaybı
Asset'in kendi tag'leri tamamen override ediliyor.
Örnek: Modern cam tabak → preferredTags "rustik" → asset personality kayboluyor.

---

## 6. preferredTags Efektivite Değerlendirmesi

### Güçlü Taraflar
- Asset seçiminde doğru filtreleme sağlıyor
- `__none__` özel değer (exclude seçeneği)
- Kullanıcı tercihi en yüksek öncelik

### Zayıf Taraflar
- Gemini prompt metnine hiçbir şey yazmıyor → Gemini habersiz
- Asset personality kaybı riski
- Multiple tag arasında priority logic'i yok (eşit ağırlık)

### Sonuç
Asset seçim katmanında güçlü, Gemini generation katmanında görünmez.

---

## 7. Tema Bazlı Negatif Kısıtlamalar

Tema'dan doğrudan kaynaklı negatif kısıtlama (NO...) BULUNMUYOR.

Mevcut negatif kısıtlamalar:
- İş bağlamından (floorLevel): "NO high-rise views" vb. → tema-agnostic
- Ürün tipinden: buildNegativePrompt() → tema-agnostic
- Sabit kurallar: "NO steam, NO smoke" → tema-agnostic
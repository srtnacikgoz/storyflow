# Tema Orchestrator Kullanımı Araştırması

> **Dosya:** `functions/src/orchestrator/orchestrator.ts`
> **Tarih:** 2026-02-11

---

## 1. Tema Pipeline Akışı

```
1. themeId alınır → timeSlotRule.themeId veya overrideThemeId (Dashboard'dan)
2. Firestore'dan tema okunur → themeData (orchestrator.ts:245-247)
3. Senaryolar filtrelenir → tema.scenarios ile (orchestrator.ts:250)
4. Interior-only kontrolü → tüm senaryolar interior mı? (orchestrator.ts:255)
5. Zombie fields okunur → mood, styleId, colors (orchestrator.ts:271-339)
6. Config snapshot loglanır (orchestrator.ts:326-347)
7. accessoryAllowed kontrol edilir (orchestrator.ts:872)
8. Senaryo seçilir → tema filtrelemeli liste kullanılır (orchestrator.ts:891-933)
9. preferredTags → asset tag override (orchestrator.ts:2106-2135)
10. buildGeminiPrompt'a setting aktarılır (orchestrator.ts:2157)
11. description → prompt sonuna eklenir (orchestrator.ts:2250-2252)
```

---

## 2. Tema Field Kullanım Haritası

| Field | Kullanılıyor | Nasıl | Satır |
|---|---|---|---|
| `scenarios` | **EVET** | Senaryo filtreleme | orchestrator.ts:250 |
| `accessoryAllowed` | **EVET** | Boolean kontrol | orchestrator.ts:872 |
| `accessoryOptions` | **EVET** | Prompt builder'a aktarılıyor | orchestrator.ts:1213 |
| `setting.preferredTags` | **EVET** | Asset tag override | orchestrator.ts:2106-2135 |
| `setting.weatherPreset` | **EVET** | buildGeminiPrompt'a | orchestrator.ts:2157 |
| `setting.lightingPreset` | **EVET** | buildGeminiPrompt'a | orchestrator.ts:2157 |
| `setting.atmospherePreset` | **EVET** | buildGeminiPrompt'a | orchestrator.ts:2157 |
| `description` | **EVET** | Prompt sonuna "THEME CONTEXT:" | orchestrator.ts:2250-2252 |
| `name` | **Log only** | Sadece console.log'larda | orchestrator.ts:251, 922 |
| `petAllowed` | **Dolaylı** | isInteriorOnlyTheme ile birlikte | orchestrator.ts:255 |
| `mood` | **ZOMBIE** | Okunuyor ama interface'de yok | orchestrator.ts:271 |
| `styleId` | **ZOMBIE** | Style yükleniyor ama prompt'a etkisi yok | orchestrator.ts:310 |
| `colors` | **ZOMBIE** | Sadece config snapshot log'da | orchestrator.ts:333 |

---

## 3. Senaryo Filtreleme Detayları

### Adım 1: Tema senaryolarını filtrele (orchestrator.ts:250)
```typescript
themeFilteredScenarios = allScenarios.filter(s => themeData!.scenarios.includes(s.id));
```

### Adım 2: Ürün tipine göre filtrele (orchestrator.ts:896-912)
Senaryo'nun suggestedProducts alanı varsa, mevcut ürün tipi listede olmalı.

### Adım 3: Diversity kontrolü — TEMA SEÇİLİYKEN DEVRE DIŞI (orchestrator.ts:920-922)
Kasıtlı tasarım kararı: Tema seçiliyken kullanıcı bilinçli karar vermiştir, diversity uygulanmaz.

---

## 4. preferredTags Override Mekanizması (orchestrator.ts:2106-2135)

- Tema preferredTags varsa → asset'in kendi tag'lerini override eder
- `__none__` seçiliyse → override YAPILMAZ, asset'in kendi tag'leri kullanılır
- plate, table, cup için ayrı ayrı kontrol

---

## 5. Zombie Code Detayları

### mood (orchestrator.ts:271, 275)
- Theme interface'de yok (v3.0'da kaldırıldı)
- Firestore'da eski dokümanda varsa okunur
- getMoodFromTime() fallback çalışıyor

### styleId (orchestrator.ts:310-323)
- Gereksiz Firestore read
- Prompt'a etkisi yok

### colors (orchestrator.ts:333)
- Sadece config snapshot log'da
- Her zaman boş array (yeni temalarda)

---

## 6. Edge Case'ler

- **Tema bulunamadığında:** Tüm senaryolar kullanılır — graceful fallback
- **Tema yükleme hatası:** Hata loglanır, pipeline devam eder
- **Tema yokken:** Tema kontrolü tamamen atlanır, sorun yok

# Senaryo ↔ Kompozisyon Template Çatışma Analizi
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## 7 Çakışma Noktası

### 1. EL SAHNESİ — ÇİFT OTORİTE
- **Senaryo:** `includesHands: boolean`
- **Template:** `slots.hands` (disabled/manual/random)
- **Kim Kazanıyor:** Template slot disabled → el YOK (template kazanır)
- **Satır:** orchestrator.ts:3007-3014

### 2. KOMPOZİSYON — PARALEL SİSTEM
- **Senaryo:** `compositionId` (eski) → prompt TEXT'e gider
- **Template:** `slots` (yeni) → referans GÖRSELLER seçer
- **Kim Kazanıyor:** İkisi paralel — compositionId prompt'a, slotlar asset'e
- **Satır:** orchestrator.ts:944, 1054, 1193

### 3. TEMPLATE scenarioId — ZAYıF BAĞ
- Template `scenarioId` var ama pipeline KULLANMIYOR
- Sadece UI gösterimi için
- **Satır:** CompositionTemplates.tsx:302

### 4. SAHNE YÖNÜ vs SLOT ASSET'LERİ
- Senaryo description "minimal" → template "çatal-bıçak" slot aktif → çelişki riski
- Koordinasyon mekanizması YOK
- **Satır:** orchestrator.ts:1191-1200

### 5. ÜRÜN UYUMLULUK KOPUKLUĞU
- Senaryo `suggestedProducts` ile filtreleme yapar
- Template ürün tipinden habersiz — tüm slot'lar için geçerli
- **Satır:** orchestrator.ts:902-912

### 6. SLOT DISABLED vs SENARYO BEKLENTİSİ
- Senaryo `includesHands=true` ama template `hands=disabled` → el çıkmaz
- Template her zaman kazanır
- **Satır:** orchestrator.ts:3001-3004

### 7. İŞLEM SIRASI SORUNU
- Template asset seçimi ÖNCE yapılıyor
- Senaryo seçimi SONRA yapılıyor
- Senaryo hangi asset'leri istediğini bilmiyor

## Özet Tablo

| Senaryo | Template | Çakışma | Kim Kazanıyor? |
|---------|----------|---------|----------------|
| includesHands | hands slot | Yetki | Template |
| compositionId | slot sistemi | Anlam | Paralel |
| description | slot asset'leri | Bilgi | Koordinasyonsuz |
| suggestedProducts | ürün-agnostik | Kapsam | Senaryo filtreleniyor |

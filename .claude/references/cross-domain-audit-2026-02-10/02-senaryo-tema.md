# Senaryo ↔ Tema Çatışma Analizi
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Kritik Çakışmalar

### 1. ATMOSFER ÇİFTE KOMUTASI
- **Tema:** `setting.weatherPreset`, `lightingPreset`, `atmospherePreset` → structured preset
- **Senaryo:** `description` → serbest metin atmosfer tarifi
- **Sorun:** İKİSİ DE prompt'a ekleniyor → Gemini çelişkili talimat alıyor
- **Örnek:** Tema "bright sunny" + Senaryo "dark moody rainy" → ÇAKIŞMA

### 2. SENARYO SAHİPLİĞİ BELİRSİZ
- Tema `scenarios: string[]` ile senaryoları filtreliyor
- Senaryo bağımsız collection'da (`global/scenarios/items`)
- Many-to-many mi, parent-child mi? → Tanımsız

### 3. ÜRÜN TIPI DOLAYILI ETKİLEŞİM
- Tema senaryoları filtreler → dolaylı olarak suggestedProducts'ları etkiler
- Tema "sabah" → senaryolar "kruvasanlar, kahveler" → pasta hiç seçilemez

## Çakışma Olmayan Alanlar

| Alan | Sahip | Durum |
|------|-------|-------|
| Pet izni | Tema | ✅ Tek sahip |
| Aksesuar izni | Tema | ✅ Tek sahip |
| El pozu | Senaryo | ✅ Tek sahip |
| Kompozisyon giriş | Senaryo | ✅ Tek sahip |
| Asset tag tercihi | Tema (preferredTags) | ⚠️ Dolaylı çakışma riski |

## Otorite Zinciri vs Gerçeklik

| Alan | İdeal Sahip | Gerçek | Uyum |
|------|------------|--------|------|
| Atmosfer | Tema | Tema + Senaryo description | ❌ |
| Işık | Tema | Tema + Senaryo description | ❌ |
| Hava | Tema | Tema + Senaryo description | ❌ |
| Pet İzni | Tema | Tema | ✅ |
| Sahne Yönü | Senaryo | Senaryo | ✅ |
| El Pozu | Senaryo | Senaryo | ✅ |

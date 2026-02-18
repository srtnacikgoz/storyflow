# Senaryo Filtreleme Mantığı Araştırması
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## Filtreleme Akış Şeması

```
[TÜM SENARYOLAR] (Firestore: global/scenarios/items, isActive=true)
    ↓
[Tema filtresi] — themeData.scenarios.includes(s.id) (satır 248-250)
    ↓
[Ürün tipi filtresi] — suggestedProducts.includes(productType) (satır 896-904)
    ↓
[Diversity filtresi] — Tema yoksa çalışır (satır 924-926)
    ↓
[GEMINI SEÇER veya PUANLAMA]
    ↓
[SEÇİLEN SENARYO]
```

## 1. Senaryo Listesi Yükleme
- Collection: `global/scenarios/items`
- Query: `.where("isActive", "==", true)`
- Kaynak: configService.ts:209-221

## 2. Tema → Senaryo Filtreleme (satır 248-250)
- `allScenarios.filter(s => themeData.scenarios.includes(s.id))`
- Tema yoksa → tüm senaryolar kullanılır

## 3. Ürün Tipi → Senaryo Filtreleme (satır 896-904)
- suggestedProducts YOK veya BOŞ → Tüm ürünlerle uyumlu
- suggestedProducts VAR → `includes(productType)` kontrolü
- Eşleşme yoksa → tüm tema senaryoları kullanılır (fallback)

## 4. includesHands Filtreleme → KULLANILMIYOR
- Bu alan filtreleme kriteri DEĞİL
- Sadece el stili seçimi tetiklemek için kullanılıyor

## 5. canBeHeldByHand / eatingMethod → SENARYO SEÇİMİNDE ETKİSİZ
- Asset metadata'sı, senaryo filtreleme kriteri değil

## 6. Rastgele Senaryo Seçimi (satır 642-791)

### Auto Mod — Puanlama Algoritması
1. **Stok uyumu** (+30): suggestedProducts vs aktif stok oranı
2. **Zaman uyumu** (+15): Senaryo adı/description'da zaman kelimesi (sabah, akşam)
3. **Yenilik** (+20): Son 15 üretimde ne kadar önce kullanıldı
4. **Kullanım sıklığı** (+10): Az kullanılana bonus
5. Beraberlik → ilk 2'den rastgele

### Normal Mod
- Tek senaryo → direkt (Gemini atlanır)
- Çoklu → Gemini.selectScenario()

## 7. Diversity / Tekrar Engelleme (satır 919-933)
- `effectiveRules.blockedScenarios` listesiyle filtreleme
- **KRİTİK:** Tema seçiliyken diversity DEVRE DIŞI (kullanıcının bilinçli tercihi)

## 8. Manuel Senaryo Seçimi
- Dashboard'da manuel senaryo override YOK
- Sadece tema seçimi var → tema senaryoları kullanılır

## 9. isActive / isDeleted
- Firestore query seviyesinde `isActive === true` filtresi
- Soft delete (isActive=false) kullanılıyor, hard delete de var (cascade kontrolü ile)

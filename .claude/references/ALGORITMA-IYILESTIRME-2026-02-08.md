# Algoritma İyileştirme Takip Dosyası
> **Başlangıç:** 2026-02-08
> **Hedef:** Her algoritma güvenilir ve tahmin edilebilir çalışsın

---

## Algoritma Listesi

### 1. Senaryo Seçim Algoritması ✅ TAMAMLANDI
**Dosya:** `functions/src/orchestrator/orchestrator.ts:628-780`
**Önceki:** `Math.random()` — düz rastgele
**Yeni:** Puanlama bazlı akıllı seçim (4 faktör, 100 puan üzerinden)

| Faktör | Ağırlık | Mantık |
|--------|---------|--------|
| Ürün stok uyumu | 0-30 | suggestedProducts aktif stokla eşleşme oranı |
| Zaman uyumu | 0-20 | Senaryo adı/açıklaması günün zamanına uygun mu |
| Çeşitlilik | 0-30 | Son kullanımdan bu yana geçen süre (hiç kullanılmamış = 30) |
| Kullanım sıklığı | 0-20 | Az kullanılmış senaryolara bonus |

**Ek:** ProductType seçimi de akıllı — stokta olan + son üretimlerde az kullanılan ürün tipi tercih edilir.

**Build:** ✅ Başarılı
**Deploy:** Bekliyor

---

### 2. Gemini Prompt Uyumu 🔲 SIRADA
**Dosya:** `functions/src/orchestrator/geminiPromptBuilder.ts`, `functions/src/services/gemini.ts`
**Sorun:** Algoritma doğru seçim yapıyor ama Gemini talimatları görmezden gelebiliyor
**Hedef:** Prompt talimatları net, öncelikli ve Gemini'nin takip edeceği formatta olsun

---

### 3. Asset Seçim Algoritması 🔲 SONRA
**Dosya:** `functions/src/orchestrator/orchestrator.ts` (RuleEngine), `functions/src/services/gemini.ts` (selectAssets)
**Durum:** RuleEngine var, preferredTags düzeltildi. Büyük sorun kalmadı.
**Potansiyel:** Atmosfer → selectAssets bağlantısı (Claid planında var)

---

### 4. Diversity Block Algoritması 🔲 DEĞERLENDİR
**Dosya:** `functions/src/orchestrator/rulesService.ts`
**Durum:** Çalışıyor (son 3 üretim bloklanıyor). Basit ve işini görüyor.
**Potansiyel:** scenarioGap dinamik olabilir mi? (çok senaryo varsa düşük, az senaryo varsa yüksek)

---

### 5. Beverage Matching 🔲 DEĞERLENDİR
**Dosya:** `functions/src/orchestrator/orchestrator.ts`
**Durum:** productType → beverageRules → bardak filtreleme. Çalışıyor.
**Potansiyel:** preferredTags override zaten eklendi. Sorun kalmadı.

---

### 6. Interior Senaryo Seçimi 🔲 DEĞERLENDİR
**Dosya:** `functions/src/orchestrator/orchestrator.ts:464-466`
**Durum:** Hala `Math.random()`. Interior senaryolarda da puanlama olabilir.
**Öncelik:** Düşük — interior senaryolar AI üretimi kullanmıyor.

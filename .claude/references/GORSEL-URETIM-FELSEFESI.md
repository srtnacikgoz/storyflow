# Görsel Üretim Felsefesi

> **Bu dosya temel prensipleri içerir. Her seferinde anlatmak yerine buraya referans ver.**

---

## 1. Temel Prensip: Sürpriz Yok

Sistemde hiçbir şey Gemini'nin hayal gücüne bırakılmaz. Her element ya:
- **Fotoğraftan gelir** (asset)
- **Kullanıcı tarafından seçilir** (tema/senaryo)

---

## 2. Asset Sistemi: Gerçek Fotoğraflar

Tüm fiziksel elementler gerçek fotoğraflardan gelir:

| Element | Asset Kategorisi | Örnek Tag'ler |
|---------|------------------|---------------|
| Ürün | products | cheesecake, kruvasan, çikolata |
| Tabak | plates | cheesecake tabağı, ahşap sunum |
| Bardak/Fincan | cups | çay bardağı, latte fincanı |
| Çatal/Kaşık | cutlery | tatlı çatalı, kahve kaşığı |
| Peçete | napkins | keten peçete, kağıt peçete |
| Masa | tables | cam önü, dışarısı, mermer, iç mekan |
| Aksesuar | accessories | telefon, kitap, anahtarlık |

**Tag'ler Türkçe** - Sistem içi eşleştirme için, Gemini'ye gitmiyor.

---

## 3. Masa Fotoğrafları: Mekan Dahil

Masa fotoğrafları sadece masa değil, **tüm ortamı** içerir:
- Masa + sandalyeler
- Pencere/cam (varsa)
- Dış manzara (sokak, ağaçlar, kaldırım)
- Perspektif (zemin kat, üst kat)

**Örnek:** "cam önü" tag'li masa fotoğrafında:
- Mermer masa ✓
- Cam duvar/pencere ✓
- Dışarıdaki sokak manzarası ✓
- Zemin kat perspektifi ✓

Gemini bu fotoğrafı referans alır, dış mekanı hayal etmez.

---

## 4. Gemini'nin Görevi

Gemini sadece şunları yapar:

### Fotoğraflardan KULLANIR (değiştirmez):
- Ürün görünümü
- Tabak/bardak/çatal
- Masa ve ortam
- Pencere ve dış manzara
- Perspektif

### Tema/Senaryo'dan EKLER:
- Hava durumu etkisi (güneş yoğunluğu, gölgeler)
- Işık karakteri (sıcak/soğuk, sert/yumuşak)
- Genel atmosfer
- Kompozisyon (ürünün konumu, açı)

---

## 5. Eşleştirme Mantığı

### Ürün → Uygun Prop'lar
```
cheesecake seçildi
  → "cheesecake tabağı" tag'li tabak
  → "latte" veya "americano" tag'li bardak (beverage rules)
  → "tatlı çatalı" tag'li çatal
  → peçete (gerekiyorsa)
```

### Tema → Uygun Masa
```
"Cam Önü Sabah" teması seçildi
  → preferredTags: ["cam önü", "dışarısı", "pencere"]
  → Bu tag'lere sahip masa fotoğrafları öncelikli
  → usageCount'a göre en az kullanılan seçilir
```

### Tema → Hava/Işık
```
"Cam Önü Sabah" teması
  → weather: "bright morning sunshine"
  → lighting: "warm natural light with soft shadows"
  → atmosphere: "peaceful morning coffee moment"
```

---

## 6. Gemini Prompt Kuralları

### DOĞRU (Pozitif, Ne Yap):
```
SCENE SETTING:
- Bright morning sunshine filtering through window
- Warm natural light with soft shadows
- Peaceful, intimate breakfast atmosphere
```

### YANLIŞ (Negatif, Ne Yapma):
```
CONSTRAINTS:
- NO high-rise views
- NO skyscraper backgrounds
- DO NOT add extra items
```

**Neden?** Gemini negatif komutları iyi işleyemiyor. "Bıçak ekleme" yerine "Sadece çatal ekle" daha etkili.

---

## 7. Tag Sistemi

### Türkçe Tag'ler (Asset'lerde)
- Sistem içi eşleştirme için
- Rule Engine bonus skoru için
- Gemini'ye GİTMEZ

### İngilizce Prompt (Gemini'ye)
- weather, lighting, atmosphere
- Tema'da tanımlanır
- Gemini'ye prompt olarak gider

---

## 8. Seçim Hiyerarşisi

```
1. Ürün Seçimi
   └── usageCount (en az kullanılan)

2. Prop Seçimi (tabak, bardak, çatal)
   └── Ürün tag eşleştirmesi ("cheesecake tabağı")
   └── usageCount

3. Masa Seçimi
   └── Tema preferredTags eşleştirmesi
   └── pinnedTableId (varsa direkt bu)
   └── usageCount

4. Hava/Işık/Atmosfer
   └── Tema'dan (weather, lighting, atmosphere)
```

---

## 9. Özet Tablo

| Ne | Nereden Gelir | Kim Seçer |
|----|---------------|-----------|
| Ürün görünümü | Asset fotoğrafı | usageCount |
| Tabak | Asset fotoğrafı | Ürün tag eşleştirme |
| Bardak | Asset fotoğrafı | Beverage rules |
| Çatal/Peçete | Asset fotoğrafı | Ürün kuralları |
| Masa + ortam | Asset fotoğrafı | Tema preferredTags |
| Pencere manzarası | Masa fotoğrafında var | - |
| Hava durumu | Tema ayarı | Kullanıcı |
| Işık karakteri | Tema ayarı | Kullanıcı |
| Atmosfer | Tema ayarı | Kullanıcı |

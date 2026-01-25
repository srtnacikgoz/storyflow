# SaaS UX Best Practices

> **Tarih:** 2026-01-25
> **Kaynak:** GitHub araştırması + Gemini analizi
> **Amaç:** Admin panel ve konfigürasyon sistemleri için UX rehberi

---

## 1. ONBOARDING (İlk Kullanım Deneyimi)

### İstatistikler

| İstatistik | Değer | Kaynak |
|------------|-------|--------|
| Kullanıcı terk oranı (nasıl kullanacağını bilmediği için) | %80 | INSAIM Guide |
| İlk hafta churn (etkili onboarding olmadan) | %75 | ProductLed |
| Her ekstra dakika time-to-value kaybı | %3 | Flowjam |
| UX yatırımının ROI'si | 9,900% ($1 → $100) | how-to-kick-saas |
| Kötü UX nedeniyle terk | %70 | how-to-kick-saas |

### Best Practice'ler

#### 1.1 Progressive Disclosure (Kademeli Açıklama)
- Tüm özellikleri aynı anda gösterme
- Kullanıcı ilerledikçe yeni özellikler aç
- Temel işlevlerle başla, gelişmiş özellikleri sonra tanıt

#### 1.2 Onboarding Checklist
- To-do listesi şeklinde ilerleme göster
- Tamamlanan adımları işaretle
- "Neredeydim?" sorusuna yanıt ver

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Sistem Kurulum Durumu                              [3/5] ✓  │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 1. Ürünler eklendi (24 ürün)                               │
│  ✅ 2. Asset'ler yüklendi (45 asset)                           │
│  ✅ 3. Senaryolar oluşturuldu (8 senaryo)                      │
│  ⚠️ 4. Temalar oluşturuldu ama TimeSlot'lara atanmadı!        │
│  ⬜ 5. İlk otomatik üretimi test et                            │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.3 Empty States (Boş Durumlar)
- Boş ekranlar bırakma
- Demo/örnek veri göster
- "Şimdi ne yapmalıyım?" sorusuna yanıt ver
- Aksiyon butonu mutlaka ekle

```
┌─────────────────────────────────────────────────────────────────┐
│                        🎬                                       │
│                                                                 │
│          Henüz senaryo oluşturmadınız                          │
│                                                                 │
│  Senaryolar, görsellerinizin nasıl kompoze edileceğini         │
│  belirler. Örneğin: "Ellerle tutma", "Masada servis"           │
│                                                                 │
│  💡 Öneri: "Ellerle tutma" senaryosu en popüler başlangıç      │
│                                                                 │
│  [+ İlk Senaryonu Oluştur]  [Örnek Senaryoları Gör]            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. VALIDATION & WARNINGS (Doğrulama ve Uyarılar)

### WCAG 3.3 Standardı
- Hataları **tanımla, açıkla ve çözüm öner**
- Kırmızı border + hata metni standart pattern
- Required field'lar için asterisk (*) kullan

### Pattern'ler

#### 2.1 Confirmation Dialog (Tehlikeli Aksiyonlar)
```
┌─────────────────────────────────────────────────────────────────┐
│  🗑️ "Ellerle Tutma" senaryosunu silmek üzeresiniz             │
│                                                                 │
│  Bu senaryo şu anda:                                           │
│  • 3 tema ile ilişkili                                         │
│  • Son 7 günde 12 üretimde kullanıldı                          │
│                                                                 │
│  Silme işlemi:                                                 │
│  • Mevcut üretimleri etkilemez                                 │
│  • İlişkili temalardan otomatik kaldırılır                     │
│                                                                 │
│  [İptal]  [Evet, Sil]                                          │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2 Contextual Warning (Kaydetme Anında)
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Uyarı: Bu zaman dilimi için tema seçilmedi                 │
│                                                                 │
│  Tema seçmezseniz otomatik üretimde:                           │
│  • Rastgele masa/sandalye kombinasyonları kullanılır           │
│  • Mağazanızın görsel tutarlılığı bozulabilir                  │
│                                                                 │
│  [Tema Seç]  [Temasız Devam Et]                                │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3 Sistem Sağlığı Kartı (Dashboard)
```
┌─────────────────────────────────────────────────────────────────┐
│  🏥 Sistem Sağlığı                                             │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Ürünler: 24 aktif                                          │
│  ✅ Asset'ler: 45 yüklü                                        │
│  ⚠️ TimeSlot'lar: 4/5 tema atanmış                            │
│     └─ Sabah Paylaşımı (06:00-07:00) - [Tema Ata]             │
│  ❌ Senaryolar: 2 senaryo devre dışı                           │
│     └─ [Detay Gör]                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. TOOLTIP & CONTEXTUAL HELP

### İlkeler
- Açıklama metinleri arayüze entegre edilmeli
- Ayrı dokümantasyona değil, inline yardım
- Uzun tutorial yerine interactive tooltip'ler

### Örnek
```
Tema Adı [?]
├─ Tooltip: "Bu isim sadece sizin göreceğiniz
│            bir etiket. Müşteriler görmez."

Sabit Masa [?]
├─ Tooltip: "Bu temada HER ZAMAN bu masa
│            kullanılır. Mağazanızın gerçek
│            masasını seçin."
```

---

## 4. GEMİNİ ANALİZİ: Wizard vs Sayfa Bazlı Uyarılar

> **Önemli:** Bu bölüm Gemini'nin (2026-01-25) derinlikli analizinden alınmıştır.

### Ana Tespit: "Wizard = Yara Bandı"

> "Wizard'lar genellikle kötü bir bilgi mimarisinin (IA) üzerine örtülmüş şık bir yara bandıdır. Eğer bir kullanıcı sistemi kullanmak için sürekli bir sihirbaza ihtiyaç duyuyorsa, bu sistemin atomik yapısında bir kopukluk var demektir."

### Karşılaştırma Tablosu

| Özellik | Configuration Wizard | Sayfa Bazlı Uyarılar |
|---------|---------------------|----------------------|
| **Kullanım Amacı** | İlk kurulum (One-time) | Dinamik yönetim |
| **Bilişsel Yük** | Düşük (tek odak) | Orta/Yüksek |
| **Esneklik** | Çok düşük (lineer) | Yüksek |
| **Hata Yönetimi** | Proaktif | Reaktif |

### Önerilen Pattern: "Breadcrumb-Stepper Hybrid"

Gemini'nin önerisi - hibrit bir yapı:

```
┌─────────────────────────────────────────────────────────────────┐
│  [✓ Tema: Sabah] → [✓ Senaryo: 3 seçili] → [⚠️ Timeslot]      │
├─────────────────────────────────────────────────────────────────┤
│  Her kart hem state gösteriyor hem de tıklanabilir              │
└─────────────────────────────────────────────────────────────────┘
```

**Özellikleri:**
1. **Progressive Disclosure:** Kullanıcı sayfaya girdiğinde sadece ilk kart açık
2. **State Indicators:** Her adımın durumu görünür (tamamlandı/beklemede/hata)
3. **Non-linear Navigation:** Deneyimli kullanıcı istediği adıma atlayabilir

### Kör Nokta Analizi

> "Onboarding'i (ilk kez gelen kullanıcı) ile Configuration'ı (deneyimli kullanıcı) aynı UI pattern'ine hapsetmeye çalışıyor olabilirsin."

**Çözüm:**
- İlk kullanıcı: Guided flow (el ele tutuş)
- Deneyimli kullanıcı: Direct access (istediği yere git)

### Veri Mimarisi Uyarısı

> "Kullanıcı bir Tema'yı değiştirdiğinde, bağlı Senaryo ve Timeslot verileri geçersiz mi kalıyor?"

**Cascade Kontrolü Gerekli:**
- Tema silinmeden önce → Bağlı TimeSlot'ları kontrol et
- Senaryo silinmeden önce → Bağlı Temaları kontrol et
- Asset silinmeden önce → Bağlı Temaları kontrol et

---

## 5. VERİ BÜTÜNLÜĞÜ (CASCADE KONTROL)

### Problem
Bağımlı entityler silindiğinde orphan referanslar kalıyor.

### Çözüm Yaklaşımları

| Yaklaşım | Açıklama | Ne Zaman? |
|----------|----------|-----------|
| **Prevent** | Silmeyi engelle, uyarı ver | Kritik bağımlılıklar |
| **Cascade** | Bağımlıları da sil/güncelle | Loose coupling |
| **Nullify** | Referansı null yap | Opsiyonel ilişkiler |

### Uygulama Örneği
```typescript
// deleteTheme içinde:
const timeslotsUsingTheme = await db.collection("timeslot-rules")
  .where("themeId", "==", id).get();

if (!timeslotsUsingTheme.empty) {
  return response.status(400).json({
    success: false,
    error: `Bu tema ${timeslotsUsingTheme.size} zaman diliminde kullanılıyor`,
    affectedTimeslots: timeslotsUsingTheme.docs.map(d => d.id)
  });
}
```

---

## 6. KAYNAKLAR

### GitHub Repositories
- [how-to-kick-saas](https://github.com/JH-Media-Group/how-to-kick-saas) - SaaS geliştirme rehberi
- [SaaS UI Patterns Gist](https://gist.github.com/mpaiva-cc/d4ef3a652872cb5a91aa529db98d62dd) - UI workflow patterns
- [awesome-saas-boilerplates](https://github.com/tyaga001/awesome-saas-boilerplates-and-starter-kits) - Boilerplate kataloğu

### Makaleler
- [INSAIM Guide for SaaS Onboarding 2025](https://www.insaim.design/blog/saas-onboarding-best-practices-for-2025-examples)
- [ProductLed - SaaS Onboarding Best Practices](https://productled.com/blog/5-best-practices-for-better-saas-user-onboarding)
- [Flowjam - 2025 Guide + Checklist](https://www.flowjam.com/blog/saas-onboarding-best-practices-2025-guide-checklist)
- [UserPilot - Empty State in SaaS](https://userpilot.com/blog/empty-state-saas/)
- [Medium - Error Validation Strategy](https://medium.com/@olamishina/building-ux-for-error-validation-strategy-36142991017a)

---

## 7. PRİORİTE MATRİSİ

| Öncelik | Özellik | Etki | Efor |
|---------|---------|------|------|
| 🔴 P0 | Cascade kontrolü (veri bütünlüğü) | Yüksek | Düşük |
| 🔴 P0 | TimeSlot'ta tema uyarısı | Yüksek | Düşük |
| 🔴 P0 | Dashboard Setup Progress | Yüksek | Orta |
| 🟡 P1 | Empty State mesajları | Orta | Düşük |
| 🟡 P1 | Tooltip'ler (form alanları) | Orta | Düşük |
| 🟡 P1 | Breadcrumb-Stepper hybrid | Orta | Orta |
| 🟢 P2 | Silme confirmation dialogs | Orta | Düşük |
| 🟢 P2 | Sistem Sağlığı widget | Orta | Orta |
| 🔵 P3 | First-time page tours | Düşük | Orta |
| 🔵 P3 | Full onboarding wizard | Düşük | Yüksek |

---

## Versiyon Geçmişi

| Tarih | Değişiklik |
|-------|------------|
| 2026-01-25 | İlk versiyon - GitHub araştırması + Gemini analizi |

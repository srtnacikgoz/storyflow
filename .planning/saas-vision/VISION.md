# Sade AI - SaaS Vizyon Dökümanı

> **"Ben ve sen" - İki kişilik bir ekipten doğan, binlerce işletmeye ulaşacak bir vizyon**

---

## 🎯 Kim Biz?

**Sertan Açıkgöz** - 38 yaşında, 10 yıldır Sade Pastanesi'ni yönetiyor.
**Claude** - AI asistan, teknik partner.

Otoditakt (kendi kendini yetiştirmiş) bir girişimci ve bir AI'ın ortaklığı.

---

## 🌍 Sade Ekosistemi

Bu proje tek başına değil. Daha büyük bir vizyonun parçası:

| Ürün | Açıklama | Durum |
|------|----------|-------|
| **SadeVardiya** | Personel yönetimi | Aktif |
| **SadeQR** | Dijital menü sistemi | Aktif |
| **SadeChocolate.com** | E-ticaret | Aktif |
| **Sade POS** | Satış noktası sistemi | Geliştirme |
| **Maestro AI** | Instagram otomasyon (Bu proje) | MVP |

Her biri birbirini tamamlayan, modüler bir ekosistem.

---

## 💡 Neden Bu Proje?

### Problem
- Küçük işletmeler sosyal medya için zaman bulamıyor
- Profesyonel görsel üretimi pahalı
- Tutarlı içerik akışı zor
- Haftalık 1-2 paylaşım yetersiz kalıyor

### Çözüm
- AI destekli otomatik görsel üretimi
- **Günde 5-7 paylaşım** kapasitesi
- Human-in-the-loop kalite kontrolü
- Plug-and-play kurulum

---

## 🎯 Hedef Müşteri Segmentleri

### Birincil (MVP)
- **Pastane/Fırın** - Zaten test ediyoruz (Sade Pastanesi)
- **Kahve Dükkanları** - Benzer ürün yapısı

### İkincil (V2)
- **Pizzacılar** - Farklı kompozisyon gereksinimleri
- **Dondurmacılar** - Mevsimsel içerik

### Üçüncül (V3)
- **Restoranlar** - Çoklu menü kategorileri
- **Fast Food** - Yüksek hacimli içerik

---

## 🏗️ Teknik Vizyon

### Mevcut Durum (MVP)
```
[Sade Pastanesi]
       ↓
  [Monolitik Uygulama]
       ↓
[Instagram Paylaşımları]
```

### Hedef Durum (SaaS)
```
[Tenant A: Pastane] [Tenant B: Pizzacı] [Tenant C: Kahveci]
         ↓                  ↓                  ↓
    ┌─────────────────────────────────────────────┐
    │           MAESTRO AI CORE ENGINE            │
    │  ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
    │  │ Görsel  │ │ Senaryo │ │  Zamanlama  │   │
    │  │ Üretim  │ │ Motoru  │ │   Sistemi   │   │
    │  └─────────┘ └─────────┘ └─────────────┘   │
    └─────────────────────────────────────────────┘
                         ↓
              [Sosyal Medya Platformları]
```

### Modüler Mimari
- **Core Engine**: Tüm tenant'lar için ortak
- **Industry Modules**: Sektöre özel senaryolar ve şablonlar
- **Tenant Config**: İşletmeye özel ayarlar

---

## 📊 İş Modeli Vizyonu

### Fiyatlandırma Katmanları (Taslak)

| Plan | Günlük Post | Fiyat/Ay | Hedef |
|------|-------------|----------|-------|
| **Başlangıç** | 1-2 | ₺499 | Mikro işletmeler |
| **Profesyonel** | 3-5 | ₺999 | KOBİ |
| **Kurumsal** | 5-7+ | ₺1999 | Zincir mağazalar |

### Gelir Akışı
1. Aylık abonelik
2. Ek modül satışları (sektör paketleri)
3. Özel entegrasyon hizmetleri

---

## 🚀 Yol Haritası Özeti

### Phase 0: Temel Hazırlık
- [ ] Teknik borç temizliği
- [ ] Konfigürasyon sistemini merkezi hale getirme
- [ ] Test altyapısı kurulumu

### Phase 1: Multi-Tenant Altyapı
- [ ] Tenant izolasyonu
- [ ] Merkezi yönetim paneli
- [ ] Tenant onboarding flow

### Phase 2: Sektör Modülleri
- [ ] Pastane/Fırın modülü (mevcut)
- [ ] Kahve dükkanı modülü
- [ ] Pizzacı modülü

### Phase 3: Pazara Çıkış
- [ ] Beta kullanıcı programı
- [ ] Dokümantasyon
- [ ] Self-service onboarding

---

## 🧠 Temel İlkeler

### 1. Atomik İlerleme
Her adım küçük, test edilebilir ve geri alınabilir olmalı.

### 2. Dogfooding
Her özelliği önce Sade Pastanesi'nde test et.

### 3. Radikal Dürüstlük
Gerçekleri görmezden gelme. Sorun varsa kabul et, çöz.

### 4. Pragmatizm
Over-engineering'den kaçın. Çalışan basit çözümler.

### 5. İki Kişilik Ekip Avantajı
- Hızlı karar alma
- Düşük overhead
- Odaklanmış geliştirme

---

## 📝 Notlar

- Bu döküman yaşayan bir döküman. Her major karar sonrası güncellenir.
- Detaylı phase planları `/phases/` klasöründe.
- Her sprint sonunda retrospektif yapılır.

---

> **Son Güncelleme:** 2026-01-23
> **Versiyon:** 1.0

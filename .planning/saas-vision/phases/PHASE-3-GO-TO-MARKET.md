# Phase 3: Pazara Çıkış

> **Hedef:** MVP'den ticari ürüne geçiş
> **Önkoşul:** Phase 1 ve Phase 2 tamamlanmış olmalı
> **Öncelik:** 🟡 Orta

---

## 📋 Genel Bakış

Phase 3'te:
1. Beta kullanıcı programı başlatıyoruz
2. Ödeme sistemini entegre ediyoruz
3. Self-service onboarding kuruyoruz
4. Destek ve dokümantasyon hazırlıyoruz

---

## 🎯 Atomik Görevler

### 3.1 Beta Program

#### 3.1.1 Beta Kriterleri Belirleme
- [ ] Hedef kullanıcı sayısı (5-10 işletme)
- [ ] Sektör dağılımı (3 pastane, 3 kahve, 2-4 diğer)
- [ ] Geri bildirim mekanizması
- [ ] Success metrikleri

**Beta Kabul Kriterleri:**
- Aktif Instagram hesabı olan işletme
- Günde en az 1 paylaşım isteği
- Geri bildirim vermeye istekli
- İlk 3 ay ücretsiz kullanım karşılığı

#### 3.1.2 Beta Davet Sistemi
- [ ] Davet kodu oluşturma
- [ ] Sınırlı kayıt formu
- [ ] Otomatik tenant oluşturma (onay sonrası)

#### 3.1.3 Beta Geri Bildirim
- [ ] In-app feedback widget
- [ ] Haftalık check-in görüşmeleri (ilk ay)
- [ ] Feature request tracking
- [ ] Bug report sistem

#### 3.1.4 Beta → Paid Geçiş
- [ ] Beta bitiş tarihi belirleme
- [ ] Ödeme sistemine geçiş
- [ ] Grandfather clause (beta kullanıcılara indirim)

---

### 3.2 Ödeme Entegrasyonu

#### 3.2.1 Ödeme Provider Seçimi
- [ ] Türkiye için: Iyzico / PayTR / Stripe Turkey
- [ ] API entegrasyonu araştır
- [ ] Fiyatlandırma karşılaştırması

**Değerlendirme Kriterleri:**
| Kriter | Iyzico | PayTR | Stripe |
|--------|--------|-------|--------|
| Komisyon | ? | ? | 2.9% |
| Entegrasyon | Kolay | Orta | Kolay |
| Recurring billing | ✓ | ✓ | ✓ |
| TR desteği | ✓ | ✓ | Sınırlı |

#### 3.2.2 Billing Service
- [ ] Subscription management
- [ ] Invoice generation
- [ ] Payment retry logic
- [ ] Dunning (ödeme hatırlatma)

```typescript
interface BillingService {
  createSubscription(tenantId: string, planId: string): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  updatePlan(subscriptionId: string, newPlanId: string): Promise<void>;
  getInvoices(tenantId: string): Promise<Invoice[]>;
}
```

#### 3.2.3 Plan Yönetimi
- [ ] Plan tanımlama (Starter, Pro, Enterprise)
- [ ] Feature gates (plan'a göre özellik kısıtlama)
- [ ] Usage tracking (günlük post sayısı)

**Plan Yapısı:**
```typescript
const plans = {
  starter: {
    name: "Başlangıç",
    price: 499, // TRY/ay
    features: {
      dailyPosts: 2,
      scenarios: "basic",
      support: "email",
      customBranding: false
    }
  },
  professional: {
    name: "Profesyonel",
    price: 999,
    features: {
      dailyPosts: 5,
      scenarios: "all",
      support: "email+chat",
      customBranding: true
    }
  },
  enterprise: {
    name: "Kurumsal",
    price: 1999,
    features: {
      dailyPosts: 10,
      scenarios: "all+custom",
      support: "priority",
      customBranding: true,
      apiAccess: true
    }
  }
};
```

#### 3.2.4 Billing UI
- [ ] Plan seçim sayfası
- [ ] Ödeme formu
- [ ] Fatura geçmişi
- [ ] Plan değiştirme

---

### 3.3 Self-Service Onboarding

#### 3.3.1 Landing Page
- [ ] Ürün tanıtımı
- [ ] Fiyatlandırma tablosu
- [ ] Özellik karşılaştırması
- [ ] CTA: "Ücretsiz Dene"

#### 3.3.2 Signup Flow
- [ ] Email/Google signup
- [ ] Email verification
- [ ] Plan seçimi
- [ ] Ödeme (trial sonrası)

```
Signup Flow:
1. Email gir → Verification kodu
2. Şifre belirle
3. İşletme bilgileri (isim, sektör)
4. Sektör seçimi → Industry module
5. Instagram bağla (OAuth)
6. Telegram bot kurulumu (QR)
7. İlk ürünü ekle
8. İlk görsel üret
9. Dashboard'a yönlendir
```

#### 3.3.3 Trial Period
- [ ] 14 gün ücretsiz trial
- [ ] Tüm özellikler açık (Pro plan)
- [ ] Trial bitimine 3 gün kala hatırlatma
- [ ] Trial sonunda plan seçimi zorunlu

#### 3.3.4 Onboarding Wizard
- [ ] Adım adım kurulum
- [ ] Progress indicator
- [ ] Skip/Later seçenekleri
- [ ] Completion celebration 🎉

---

### 3.4 Dokümantasyon

#### 3.4.1 Kullanıcı Dokümantasyonu
- [ ] Başlangıç rehberi (Getting Started)
- [ ] Özellik dokümantasyonu
- [ ] FAQ sayfası
- [ ] Video tutorial'lar (opsiyonel)

**Dokümantasyon Yapısı:**
```
/docs
├── baslangic/
│   ├── ilk-adimlar.md
│   ├── instagram-baglama.md
│   ├── telegram-kurulumu.md
│   └── ilk-gorsel.md
├── ozellikler/
│   ├── gorsel-uretim.md
│   ├── zamanlama.md
│   ├── ai-kurallari.md
│   └── raporlama.md
├── fiyatlandirma/
│   ├── planlar.md
│   └── fatura.md
└── sss/
    ├── genel.md
    └── teknik.md
```

#### 3.4.2 API Dokümantasyonu
- [ ] Endpoint listesi
- [ ] Authentication
- [ ] Request/Response örnekleri
- [ ] Rate limits

#### 3.4.3 Help Center
- [ ] Searchable knowledge base
- [ ] Kategorize edilmiş makaleler
- [ ] Contact form

---

### 3.5 Destek Sistemi

#### 3.5.1 Destek Kanalları
- [ ] Email: destek@maestro-ai.com
- [ ] In-app chat widget (Intercom/Crisp)
- [ ] WhatsApp Business (opsiyonel)

#### 3.5.2 Ticket Sistemi
- [ ] Ticket oluşturma
- [ ] Önceliklendirme
- [ ] SLA tracking
- [ ] Satisfaction survey

**SLA Hedefleri:**
| Plan | İlk Yanıt | Çözüm |
|------|-----------|-------|
| Starter | 48 saat | 5 iş günü |
| Professional | 24 saat | 2 iş günü |
| Enterprise | 4 saat | 1 iş günü |

#### 3.5.3 Self-Service Support
- [ ] Status page (sistem durumu)
- [ ] Known issues sayfası
- [ ] Changelog

---

### 3.6 Analytics ve Raporlama

#### 3.6.1 Tenant Analytics
- [ ] Üretilen görsel sayısı
- [ ] Paylaşılan post sayısı
- [ ] Engagement metrikleri (opsiyonel)
- [ ] En başarılı senaryolar

#### 3.6.2 Platform Analytics
- [ ] Aktif tenant sayısı
- [ ] MRR (Monthly Recurring Revenue)
- [ ] Churn rate
- [ ] Feature usage

#### 3.6.3 Dashboard
- [ ] Tenant: Kendi metrikleri
- [ ] Admin: Platform metrikleri

---

## ✅ Tamamlanma Kriterleri

Phase 3 tamamlanmış sayılır eğer:

1. **Beta programı başarıyla tamamlandı**
   - En az 5 aktif beta kullanıcısı
   - Kritik bug'lar çözüldü
   - Geri bildirimler değerlendirildi

2. **Ödeme sistemi çalışıyor**
   - En az 1 ödeme başarıyla işlendi
   - Subscription yönetimi çalışıyor
   - Faturalar oluşturuluyor

3. **Self-service signup çalışıyor**
   - Yeni kullanıcı kendi başına kayıt olabiliyor
   - Onboarding wizard tamamlanabiliyor
   - Trial → Paid geçiş çalışıyor

4. **Temel dokümantasyon hazır**
   - Başlangıç rehberi yayında
   - En az 10 FAQ maddesi
   - Destek kanalları aktif

---

## 💰 Finansal Hedefler

### İlk Yıl (Taslak)
| Ay | Tenant | MRR (TRY) |
|----|--------|-----------|
| 1-3 | Beta (ücretsiz) | 0 |
| 4 | 5 | 2,500 |
| 6 | 15 | 10,000 |
| 12 | 50 | 40,000 |

### Break-even Analizi
- Firebase cost: ~$50/ay (başlangıç)
- Gemini API: ~$100/ay (10 tenant)
- Domain/Hosting: ~$20/ay
- **Break-even:** ~5 ücretli tenant (Starter plan)

---

## ⚠️ Riskler ve Dikkat Edilecekler

| Risk | Etki | Önlem |
|------|------|-------|
| Düşük talep | 🔴 Yüksek | Beta geri bildirimleri, pivot hazırlığı |
| Teknik sorunlar | 🟡 Orta | Monitoring, on-call |
| Rekabet | 🟡 Orta | Niş odaklı kal, kalite |
| Ölçekleme | 🟢 Düşük | Cloud infra avantajı |

---

## 📝 Notlar

- Beta kullanıcı seçimi kritik - doğru kişilerle başla
- İlk ödeme alan müşteri motivasyon kaynağı olacak
- Dokümantasyon sürekli güncellenmeli
- Destek kalitesi ürün kadar önemli

---

> **Son Güncelleme:** 2026-01-23
> **Durum:** Phase 2 bekleniyor

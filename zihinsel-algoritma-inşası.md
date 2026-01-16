# GitHub: Entelektüel ve Teknik Gelişim Kılavuzu

> **"Kod Deposu Değil, Karar Destek Mekanizması"**

Bu kılavuz, bir geliştiricinin veya araştırmacının karşılaştığı kritik eşiklerde **neden** ve **nasıl** GitHub'a başvurması gerektiğini tanımlayan standart bir operasyon prosedürüdür (SOP).

**Tetikleyici:** `REPO-FIRST`

---

## 1. Stratejik Pozisyonlama: GitHub Neden Zorunludur?

GitHub, başkalarının çözdüğü sorunların, yaptığı hataların ve belirlediği standartların **yaşayan müzesidir**. Bir konuya GitHub olmadan yaklaşmak, karanlık bir odada el yordamıyla ilerlemeye benzer.

### GitHub'ın Sağladığı Değer
| Kaynak | Ne Öğretir? |
|--------|-------------|
| README.md | Projenin amacı ve hızlı başlangıç |
| Issues | Gerçek dünya sorunları ve çözümleri |
| Discussions | Mimari kararların "neden"i |
| Commits | Bir özelliğin adım adım inşası |
| Pull Requests | Code review kültürü ve kalite standartları |

---

## 2. Kritik Eşikler ve Müdahale Protokolleri

Aşağıdaki durumlardan herhangi biri gerçekleştiğinde, **GitHub Protokolü** derhal devreye alınmalıdır:

### A. "Genesis" (Yeni Bir Konuya Başlama) Eşiği

**Durum:** Henüz sıfır noktasındasın, mimariyi nasıl kuracağını bilmiyorsun.

**Neden GitHub?**
- Tekerleği yeniden icat etmemek için
- Sektörün kabul ettiği "Best Practice" kalıplarını görmek için

**Aksiyon:**
1. Benzer projelerin README.md dosyalarını analiz et
2. Klasör yapılarını ve boilerplate repoları incele
3. Mimariyi "standartlara" göre kurgula
4. En az 3 popüler repoyu karşılaştır

**Arama Örnekleri:**
```
react ecommerce boilerplate stars:>500
nextjs starter template language:typescript
firebase react authentication example
```

---

### B. "The Wall" (Tıkanma ve Hata) Eşiği

**Durum:** Bir hata (bug) aldın veya mantıksal bir kilitlenme (deadlock) yaşıyorsun.

**Neden GitHub?**
- Muhtemelen bu hatayı dünyada alan ilk kişi değilsin
- Çözümün arkasındaki düşünce sürecini görebilirsin

**Aksiyon:**
1. Hata kodunu GitHub "Issues" kısmında arat
2. Sadece çözüme bakma; o çözümün hangi tartışmalardan sonra kabul edildiğini (comment history) oku
3. Closed issues'ları da kontrol et - çözülmüş sorunlar altın madeni

**Arama Örnekleri:**
```
"TypeError: Cannot read property" is:issue is:closed
"CORS error" firebase functions language:typescript
"500 Internal Server Error" API is:issue
```

---

### C. "The Void" (Yetersiz Bilgi) Eşiği

**Durum:** Bir kütüphaneyi veya teknolojiyi biliyorsun ama "derinlemesine" hakim değilsin.

**Neden GitHub?**
- Dokümantasyon size **ne** yapmanız gerektiğini söyler
- GitHub ise bunun **gerçek dünyada nasıl yapıldığını** gösterir

**Aksiyon:**
1. İlgili teknolojiyi kullanan en az 3 farklı popüler repoyu incele
2. Gerçek projelerdeki "Implementation" farklarını not et
3. Edge case'leri ve hata yönetimini gözlemle

**Arama Örnekleri:**
```
filename:useAuth.tsx language:typescript stars:>100
path:src/hooks "firebase" "authentication"
filename:checkout.tsx "stripe" OR "payment"
```

---

## 3. GitHub'a Başvuru Metodolojisi

GitHub'a rastgele bakmak vakit kaybıdır. Şu hiyerarşiyi izle:

### Kalite Değerlendirme Piramidi

```
                    ┌─────────────┐
                    │   COMMITS   │  ← Nasıl inşa edilmiş?
                   ┌┴─────────────┴┐
                   │  DISCUSSIONS  │  ← Neden bu kararlar?
                  ┌┴───────────────┴┐
                  │   PULSE/NETWORK │  ← Proje canlı mı?
                 ┌┴─────────────────┴┐
                 │    STARS & FORKS   │  ← Topluluk onayı
                └─────────────────────┘
```

### Kontrol Listesi

| Kriter | Soru | Eşik Değer |
|--------|------|------------|
| **Stars** | Topluluk onayı var mı? | >100 (küçük projeler), >1000 (framework) |
| **Son Commit** | Proje yaşıyor mu? | <6 ay |
| **Issues** | Sorunlara yanıt veriliyor mu? | Ortalama yanıt <1 hafta |
| **Contributors** | Tek kişi mi yoksa topluluk mu? | >3 aktif contributor |
| **Tests** | Test coverage var mı? | CI/CD badge'i ara |
| **TypeScript** | Tip güvenliği var mı? | `.ts` veya `.tsx` dosyaları |
| **License** | Kullanabilir miyim? | MIT, Apache 2.0, BSD |

---

## 4. Gelişmiş Arama Sözdizimi

### Temel Filtreler
```bash
# Dil filtresi
language:typescript "search term"

# Dosya adı filtresi
filename:*.tsx "component"
filename:package.json "dependencies"

# Yol filtresi
path:src/services "API"
path:src/hooks filename:use*.ts

# Yıldız filtresi
stars:>500 "react hook"
stars:100..1000 "firebase auth"

# Tarih filtresi
pushed:>2024-01-01 "nextjs 14"
created:>2023-06-01 "tailwind"
```

### Kombinasyon Örnekleri
```bash
# E-ticaret checkout implementasyonu
language:typescript path:src "checkout" "payment" stars:>200

# Firebase authentication hook'ları
filename:useAuth* language:typescript "firebase" stars:>50

# API error handling patterns
path:src/services "try" "catch" "error" language:typescript

# React form validation
filename:*.tsx "useForm" OR "formik" OR "react-hook-form" stars:>100
```

---

## 5. Güvenlik Protokolü

### Kopyalamadan Önce Kontrol Et

**Tehlikeli Paternler:**
```javascript
// ❌ KOPYALAMA - Güvenlik riski
eval(userInput)
innerHTML = userInput
exec(command)
password = "hardcoded123"
apiKey = "sk-xxxxx"
```

**Kontrol Listesi:**
- [ ] Hardcoded credentials var mı?
- [ ] `eval()` veya `Function()` kullanımı var mı?
- [ ] SQL injection riski var mı? (string concatenation)
- [ ] XSS riski var mı? (`dangerouslySetInnerHTML`, `innerHTML`)
- [ ] Dependency'ler güncel mi? (`npm audit`)

### Dependency Güvenlik Taraması
```bash
# Projeyi klonladıktan sonra
npm audit
npm outdated
npx depcheck
```

---

## 6. Altın Kurallar (Tembihler)

### 1. GitHub Bir Sözlüktür
Bilmediğin her "teknik terimi" GitHub arama çubuğunda arat ve kod içindeki kullanımını gör.

### 2. Şeffaflık Borcu
Eğer GitHub'dan bir çözüm aldıysan, kendi sürecini de oraya ekleyerek (commit/push) sisteme olan borcunu öde. Open source ekosistemi karşılıklı katkıyla yaşar.

### 3. Kör Nokta Analizi
Kendi yazdığın kodu, GitHub'daki "High-Quality" projelerle yan yana koy ve aradaki kalite farkını (Refactoring ihtiyacı) dürüstçe yüzüne vur.

### 4. Copy-Paste Yasağı
Kodu anlamadan kopyalama. Her satırın ne yaptığını açıklayabilmelisin. Aksi halde teknik borç biriktirirsin.

### 5. Trend Takibi
Haftada bir "Trending" repoları incele. Sektörün nereye gittiğini anla.

---

## 7. Workflow Entegrasyonu

### REPO-FIRST Tetiklendiğinde

```
┌─────────────────────────────────────────────────────────┐
│                    REPO-FIRST Akışı                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Durumu Belirle                                      │
│     ├── Genesis? → Boilerplate/Architecture ara        │
│     ├── The Wall? → Issues/Solutions ara               │
│     └── The Void? → Implementation örnekleri ara       │
│                                                         │
│  2. Arama Yap                                           │
│     ├── GitHub Search (gelişmiş syntax)                │
│     ├── GitHub Trending (güncel trendler)              │
│     └── Awesome Lists (küratörlü listeler)             │
│                                                         │
│  3. Kalite Filtrele                                     │
│     ├── Stars/Forks kontrolü                           │
│     ├── Son aktivite kontrolü                          │
│     ├── Issue response time                            │
│     └── Test coverage                                  │
│                                                         │
│  4. Güvenlik Kontrolü                                   │
│     ├── Kod incelemesi                                 │
│     ├── Dependency audit                               │
│     └── License uygunluğu                              │
│                                                         │
│  5. Uygula ve Adapte Et                                 │
│     ├── Projeye uyarla                                 │
│     ├── Kendi context'ine göre modifiye et             │
│     └── Dokümante et (nereden geldiğini belirt)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Faydalı Kaynaklar

### Awesome Lists
- `awesome-react` - React ekosistemi
- `awesome-typescript` - TypeScript kaynakları
- `awesome-firebase` - Firebase patterns
- `awesome-tailwindcss` - Tailwind kaynakları

### Boilerplate Aramak İçin
```
template:true language:typescript stars:>100
topic:boilerplate topic:starter-kit
```

### Trending Takibi
- https://github.com/trending
- https://github.com/trending/typescript?since=weekly

---

*Son Güncelleme: Ocak 2026*
*Versiyon: 1.0 - Evrensel*
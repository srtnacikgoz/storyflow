# Malzeme Görsel Prompt Üretici — Tasarım Dokümanı

> **Tarih:** 2026-04-15
> **Amaç:** Sade Patisserie'nin hammadde ve üretim süreçlerini vurgulayan, tutarlı DALL-E prompt'ları üreten sistem

---

## Problem

Amerikan servis (tepsi kağıdı) gibi baskı materyallerinde ve sosyal medyada kullanılacak görseller gerekiyor. Bu görseller Sade'nin kendi ürettiği hammaddeleri (mascarpone, ganaj, praline vb.) ve üretim süreçlerini vurgulamalı. McDonald's'ın "%99 yerli" tepsi kağıdındaki gibi — basit, samimi, "biz bunu kendimiz yapıyoruz" mesajı.

**Temel zorluk:** 8-10 farklı malzeme için üretilen görsellerin aynı stilde olması gerekiyor (aynı ışık, açı, renk paleti, atmosfer). DALL-E her görseli bağımsız ürettiği için tutarlılık baştan sağlanmalı.

## Çözüm: Hibrit Prompt Üretici

İki katmanlı sistem: sabit şablon çatısı tutarlılığı garanti eder, Gemini sadece sahne detayını yazar.

### Katman 1: Stil Profili (Sabit Şablon)

Kullanıcı tarafından Admin Panel'de tanımlanan sabit parametreler. Her prompt'a aynı şekilde eklenir.

**6 parametre:**

| Parametre | Örnek Değer |
|-----------|-------------|
| Kamera açısı | 45° üstten |
| Işık tipi | Doğal gün ışığı, soldan pencere |
| Zemin/arka plan | Beyaz mermer yüzey |
| Renk paleti | Pastel, sıcak tonlar |
| Atmosfer | Minimal, temiz, profesyonel |
| Çerçeveleme | Yakın çekim, nefes payı bırakılmış |

- Birden fazla stil profili oluşturulabilir (tepsi kağıdı için bir profil, sosyal medya için başka)
- Her parametre serbest metin — DALL-E prompt'ları esnek olmalı
- Referans görsel yükleme: beğenilen bir DALL-E çıktısı referans olarak kaydedilebilir

### Katman 2: Gemini Sahne Detayı Yazıcı

Gemini'ye gönderilen:
- Stil profili parametreleri (sabit kısım)
- Malzeme bilgisi (ad, açıklama, mesaj, kullanıldığı ürünler)
- Varsa referans görsel (base64)

Gemini'den istenen:
- Sadece sahne detayı — malzemenin üretim/hazırlık sürecini gösteren görsel tarifi
- Hangi aşamada gösterilecek, hangi araçlar/kaplar sahnede, ürünün dokusu nasıl
- Referans görsel varsa o stile uyumlu sahne yazması

### Prompt Birleştirme

```
[STYLE] {stil profili parametreleri — sabit}

[SCENE] {Gemini'nin yazdığı sahne detayı}

[QUALITY] Professional food photography, high detail, shallow depth of field
```

Çıktı: kopyalanabilir DALL-E prompt'u. Kullanıcı kopyalar, DALL-E'ye yapıştırır.

## Admin Panel Sayfası

**Sayfa:** "Malzeme Görsel Üretici" — Sidebar'da Poster grubunun altında bağımsız sayfa.

### Bölüm 1: Stil Profili Yönetimi

- Profil listesi (seç / yeni oluştur / düzenle / sil)
- 6 parametre alanı (serbest metin)
- Referans görsel yükleme alanı
- Aktif profil işaretleme

### Bölüm 2: Malzeme Listesi

- Malzeme CRUD (ekle / düzenle / sil / sırala)
- Her malzeme kaydı:
  - `name`: Malzeme adı (Mascarpone)
  - `description`: Kısa açıklama (Günlük taze üretim)
  - `message`: Vurgu mesajı (Tiramisumuzun sırrı)
  - `usedInProducts`: Kullanıldığı ürünler listesi (Tiramisu, Cheesecake)
  - `isActive`: Aktif/pasif
  - `sortOrder`: Sıralama

### Bölüm 3: Prompt Üretim Alanı

- Malzeme seç (dropdown veya listeden tıkla)
- Stil profili seç
- "Prompt Üret" butonu
- Çıktı alanı: üretilen DALL-E prompt'u (kopyalanabilir)
- Prompt geçmişi: daha önce üretilen prompt'lar tarih sıralı liste

## Firestore Yapısı

```
global/config/
├── ingredient-style-profiles/
│   └── items/{profileId}
│       ├── name: string
│       ├── cameraAngle: string
│       ├── lighting: string
│       ├── surface: string
│       ├── colorPalette: string
│       ├── atmosphere: string
│       ├── framing: string
│       ├── referenceImageUrl: string (opsiyonel)
│       ├── isActive: boolean
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── ingredient-items/
│   └── items/{itemId}
│       ├── name: string
│       ├── description: string
│       ├── message: string
│       ├── usedInProducts: string[]
│       ├── isActive: boolean
│       ├── sortOrder: number
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
└── ingredient-prompt-history/
    └── items/{promptId}
        ├── ingredientId: string
        ├── styleProfileId: string
        ├── generatedPrompt: string
        ├── sceneDetail: string (Gemini çıktısı)
        ├── referenceImageUrl: string (opsiyonel)
        ├── cost: number (Gemini API maliyeti)
        ├── model: string
        └── createdAt: timestamp
```

## Backend API

**Yeni endpoint:**

```
POST /generateIngredientPrompt
Body: {
  ingredientId: string,
  styleProfileId: string,
  referenceImageBase64?: string,
  referenceImageMimeType?: string
}
Response: {
  prompt: string,        // birleştirilmiş DALL-E prompt'u
  sceneDetail: string,   // Gemini'nin yazdığı sahne kısmı
  cost: number,
  model: string
}
```

**Akış:**
1. Firestore'dan stil profili ve malzeme bilgisi oku
2. Şablon çatısını hazırla (STYLE + QUALITY bölümleri)
3. Gemini'ye gönder: stil + malzeme + referans → sahne detayı iste
4. SCENE bölümünü Gemini çıktısıyla doldur
5. Birleştirilmiş prompt'u döndür
6. Prompt geçmişine kaydet

## Gemini System Prompt

Gemini'ye gönderilecek talimat:

```
Sen bir food photography sahne yönetmenisin. Sana bir malzeme bilgisi ve stil profili vereceğim.
Görevin: Bu malzemenin üretim veya hazırlık sürecini gösteren bir sahne detayı yazmak.

KURALLAR:
- Sadece SCENE bölümünü yaz, STYLE ve QUALITY bölümlerini YAZMA
- Sahne gerçekçi olmalı — gerçek bir mutfakta çekilmiş gibi
- Malzemenin dokusunu, rengini ve formunu detaylı tarif et
- Sahnede en fazla 3-4 obje olsun (sadelik)
- Malzemenin kullanıldığı ürünlerden biri arka planda tamamlanmış halde görünsün
- İnsan eli veya vücut GÖSTERME — sadece malzeme ve araçlar
- İngilizce yaz (DALL-E için)
- 2-3 cümle yeterli, uzatma

REFERANS GÖRSEL VARSA:
- Bu görseldeki kompozisyon, ışık yönü ve obje yerleşimini takip et
- Aynı hissiyatı koru ama malzemeye göre adapte et
```

## Seed Endpoint

```
POST /seedIngredientData
```

Varsayılan veriler:
- 1 stil profili ("Sade Minimal")
- 10 malzeme (Mascarpone, Ganaj, Fındık Praline, Karamel, Çikolata Temperleme, Vanilya Krema, Meringue, Pişmaniye Teli, Tereyağlı Hamur, Taze Meyve)

## Kullanım Senaryoları

### Senaryo 1: Tepsi Kağıdı Görselleri
1. "Sade Minimal" stil profilini seç
2. Mascarpone malzemesini seç → prompt üret → DALL-E'de görsel üret
3. Beğenildiyse referans olarak kaydet
4. Aynı profille Ganaj, Praline, Karamel... için prompt üret
5. Tüm görseller aynı stilde çıkar

### Senaryo 2: Sosyal Medya Görseli
1. "Sosyal Medya Canlı" gibi farklı bir profil oluştur (daha yakın çekim, daha canlı renkler)
2. Aynı malzemeler, farklı stil → farklı ama kendi içinde tutarlı görseller

## Kapsam Dışı

- DALL-E API entegrasyonu (kullanıcı elle yapıştıracak)
- Görsel düzenleme/kırpma
- Otomatik tepsi kağıdı layout'u oluşturma
- Baskı dosyası üretimi (CMYK, bleed)

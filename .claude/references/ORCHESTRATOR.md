# Orchestrator Kuralları

Bu dosya, AI görsel üretim orchestrator'ının seçim ve davranış kurallarını tanımlar.
Claude (Orchestrator içindeki) bu kuralları okuyup uygular.

---

## 1. SENARYOLAR

Her senaryo farklı bir görsel kompozisyon stilini temsil eder.

| ID | Ad | El Var | Açıklama | Kompozisyon Varyantları |
|----|-----|--------|----------|------------------------|
| zarif-tutma | Zarif Tutma | ✓ | Bakımlı el ürün tutuyor | bottom-right, bottom-left, top-corner, center-hold |
| kahve-ani | Kahve Anı | ✓ | Eller fincan tutuyor, ürün ön planda | product-front, product-side, overhead |
| hediye-acilisi | Hediye Açılışı | ✓ | El kutu açıyor | box-center, box-angled, unwrapping |
| ilk-dilim | İlk Dilim | ✓ | El çatalla pasta alıyor | fork-entering, slice-lifted, mid-bite |
| cam-kenari | Cam Kenarı | ✗ | Pencere önü, doğal ışık | window-left, window-right, window-center |
| mermer-zarafet | Mermer Zarafet | ✗ | Mermer yüzey, premium sunum | centered, diagonal, corner-composition |
| kahve-kosesi | Kahve Köşesi | ✗ | Rahat köşe, cozy atmosfer | cozy-corner, reading-nook, pet-friendly |
| yarim-kaldi | Yarım Kaldı | ✗ | Isırık alınmış, yarı dolu fincan | bitten-product, half-eaten, crumbs-scattered |
| paylasim | Paylaşım | ✗ | İki tabak, sosyal an | two-plates, sharing-moment, conversation |
| paket-servis | Paket Servis | ✗ | Kraft torba, takeaway | package-hero, unboxing, takeaway-ready |

### Kompozisyon Varyantları Detay

**zarif-tutma:**
- `bottom-right`: El sağ alt köşeden giriyor, ürün sol üstte
- `bottom-left`: El sol alt köşeden giriyor, ürün sağ üstte
- `top-corner`: El üst köşeden giriyor, ürün alt kısımda
- `center-hold`: Ürün ortada, el alttan tutuyor

**kahve-ani:**
- `product-front`: Ürün ön planda keskin, eller arkada bulanık
- `product-side`: Ürün yanda, eller diagonal pozisyonda
- `overhead`: Kuş bakışı, ürün ve fincan yan yana

---

## 2. EL STİLLERİ

El içeren senaryolarda kullanılacak stiller. Rotasyonla değiştirilmeli.

| ID | Açıklama | Oje | Aksesuar | Dövme |
|----|----------|-----|----------|-------|
| elegant | Şık, minimal | Nude/soft pink | Silver midi ring, thin bracelet | Minimalist (ay, yıldız) |
| bohemian | Bohem, doğal | Earth-tone/terracotta | Stacked rings, beaded bracelet | Çiçek, yaprak motifleri |
| minimal | Sade, temiz | Yok veya şeffaf | Single thin gold ring | Yok |
| trendy | Trend, modern | French tip | Chunky gold ring, chain bracelet | Geometric, fine line |
| sporty | Sportif, aktif | Yok | Fitness watch, simple band | Yok |

---

## 3. ASSET KİŞİLİKLERİ

Her asset'in bir "kişiliği" var. Claude bu kişiliklere göre uyumlu kombinasyonlar seçmeli.

### Masalar

| Asset | Kişilik | Mood | Uyumlu Senaryolar |
|-------|---------|------|-------------------|
| Mermer Masa | Lüks, şık, premium | Elegant, sophisticated | mermer-zarafet, zarif-tutma, hediye-acilisi |
| Ahşap Masa (Koyu) | Sıcak, rustik, artisanal | Cozy, warm | kahve-ani, cam-kenari, kahve-kosesi |
| Ahşap Masa (Açık) | Ferah, modern, Scandinavian | Fresh, light | ilk-dilim, paylasim, yarim-kaldi |

### Özel Asset'ler

| Asset | Kişilik | Kullanım Koşulu | Uyumlu Senaryolar |
|-------|---------|-----------------|-------------------|
| Köpek | Rahat, samimi, ev sıcaklığı | Her 15 üretimde 1, sadece uygun senaryolarda | kahve-kosesi, yarim-kaldi, cam-kenari |
| Dekorasyon (Bitki) | Canlı, taze, doğal | Minimal kullanım | cam-kenari, kahve-kosesi |
| Dekorasyon (Kitap) | Entelektüel, rahat | Cozy senaryolarda | kahve-kosesi, yarim-kaldi |

---

## 4. ÇEŞİTLİLİK KURALLARI

Bu kurallar tekrarı önlemek için zorunludur.

### Minimum Aralıklar

| Öğe | Minimum Aralık | Açıklama |
|-----|----------------|----------|
| Aynı senaryo | 3 üretim | Aynı senaryo min 3 üretim sonra tekrar kullanılabilir |
| Aynı masa | 2 üretim | Aynı masa min 2 üretim sonra tekrar kullanılabilir |
| Aynı el stili | 4 üretim | Aynı el stili min 4 üretim sonra tekrar kullanılabilir |
| Aynı kompozisyon | 5 üretim | Aynı senaryo+kompozisyon kombinasyonu min 5 üretim sonra |

### Özel Frekanslar

| Öğe | Frekans | Açıklama |
|-----|---------|----------|
| Köpek | Her 15 üretimde 1 | Köpek içeren görsel her 15 üretimde bir |
| Dış mekan | Her 10 üretimde 1 | Pencere/dış mekan vurgusu her 10 üretimde bir |
| Wabi-sabi (kırıntı, ısırık) | Her 5 üretimde 1 | Kusurlu güzellik elementleri |

### Benzerlik Skoru

Yeni üretim son 5 üretimle karşılaştırılır:
- Aynı senaryo: +30 puan
- Aynı masa: +20 puan
- Aynı el stili: +25 puan
- Aynı kompozisyon: +25 puan

**Toplam > 50 puan ise: REDDET, farklı seç**

---

## 5. ZAMAN-MOOD EŞLEŞTİRMESİ

Günün saatine göre farklı mood ve senaryo tercihleri.

| Saat Aralığı | Mood | Işık Tercihi | Önerilen Senaryolar | Özel Notlar |
|--------------|------|--------------|---------------------|-------------|
| 07:00-10:00 | Taze sabah | Soft side light, pencere | cam-kenari, zarif-tutma, ilk-dilim | Aydınlık, enerjik başlangıç |
| 10:00-12:00 | Brunch keyfi | Natural bright | kahve-ani, paylasim | Sosyal, paylaşım odaklı |
| 12:00-14:00 | Öğle molası | Bright, clean | zarif-tutma, mermer-zarafet | Profesyonel, şık |
| 14:00-17:00 | Öğleden sonra | Warm, relaxed | kahve-kosesi, yarim-kaldi | Köpek bu saatlerde uygun |
| 17:00-20:00 | Altın saat | Golden hour, warm | cam-kenari, hediye-acilisi | Romantik, sıcak tonlar |
| 20:00-22:00 | Akşam keyfi | Cozy, intimate | kahve-kosesi, yarim-kaldi | Samimi, ev atmosferi |

---

## 6. HAFTALIK TEMALAR

Haftanın günlerine göre tema önerileri.

| Gün | Tema | Mood | Önerilen Senaryolar | Köpek İzni |
|-----|------|------|---------------------|------------|
| Pazartesi | Yeni Hafta Enerjisi | Energetic, fresh | zarif-tutma, kahve-ani | ✗ |
| Salı | Çalışkan | Productive | mermer-zarafet, ilk-dilim | ✗ |
| Çarşamba | Ortası | Balanced | paylasim, cam-kenari | ✗ |
| Perşembe | Heyecan | Anticipation | hediye-acilisi, zarif-tutma | ✗ |
| Cuma | Haftasonu Başlıyor | Relaxed, social | kahve-kosesi, paylasim | ✓ |
| Cumartesi | Keyif Günü | Cozy, slow | yarim-kaldi, kahve-kosesi | ✓ |
| Pazar | Yavaş Sabah | Slow, intimate | cam-kenari, yarim-kaldi | ✓ |

---

## 7. MUTLAK KURALLAR (ASLA İHLAL ETME)

Bu kurallar her üretimde geçerlidir, istisna yoktur.

### Ürün Kuralları
- **TEK ÜRÜN**: Görselde yalnızca BİR ana ürün olmalı (referanstan)
- **TEK FİNCAN**: Varsa yalnızca BİR kahve fincanı olmalı
- **TEK TABAK**: Yalnızca BİR tabak (paylaşım senaryosu hariç)
- **REFERANS SADIKLIĞI**: Ürün referans fotoğraftan tanınabilir olmalı

### Yasak Elementler
- **DUPLİKASYON YOK**: Aynı üründen birden fazla asla
- **BUHAR/DUMAN YOK**: Steam, smoke, mist, fog yasak
- **KOYU ARKA PLAN YOK**: Siyah, koyu gri arka plan yasak
- **EKLEME YOK**: Prompt'ta olmayan obje ekleme (vazo, çiçek, vb.)

### Kalite Kuralları
- **8K PHOTOREALISTIC**: Her zaman yüksek kalite
- **DOĞAL IŞIK**: Yapay flaş görünümü yasak
- **SICAK TONLAR**: Soğuk mavi tonlar yasak (marka estetiği)

---

## 8. CLAUDE İÇİN TALİMATLAR

Bu bölüm, Orchestrator içindeki Claude'un nasıl davranması gerektiğini açıklar.

### Seçim Yaparken

1. **Önce geçmişi kontrol et**: Son 15 üretimi incele
2. **Çeşitlilik skorunu hesapla**: Benzerlik > 50 ise farklı seç
3. **Zaman-mood eşleştir**: Günün saatine göre uygun senaryo seç
4. **Asset kişiliklerini eşleştir**: Uyumlu masa/dekor kombinasyonları
5. **Köpek sayacını kontrol et**: 15 üretimdir köpek yoksa, uygun senaryoda ekle

### Prompt Oluştururken

1. **Referans bildirimi ile başla**: "Using uploaded image(s) as reference..."
2. **MUTLAK KURALLARI ekle**: "ONLY ONE product, ONLY ONE cup..."
3. **Seçilen kompozisyonu belirt**: Hangi varyant seçildiyse detaylandır
4. **El stili detayları**: Seçilen stil için oje, aksesuar, dövme tarifi
5. **Negative prompt**: Tüm yasakları ekle

### Kalite Kontrolde

1. **Duplikasyon kontrolü**: Birden fazla aynı obje var mı?
2. **Referans sadakati**: Ürün tanınabilir mi?
3. **Kompozisyon kontrolü**: Seçilen varyanta uygun mu?
4. **Yasak element kontrolü**: Buhar, koyu arka plan, ekleme var mı?

---

## Versiyon

- **Versiyon**: 1.0.0
- **Oluşturma**: 2026-01-20
- **Son Güncelleme**: 2026-01-20
- **Geçerlilik**: Tüm orchestrator üretimleri

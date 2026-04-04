# Proje Vizyonu

> Bu dosya projenin ruhunu ve amacını tanımlar.
> Teknik detaylar için `references/` klasörüne bak.

---

## Bu Proje Ne Yapmak İstiyor?

Bir pastane/kafe işletmesi için **tamamen otomatik Instagram içerik üretim sistemi**.

Temel fikir şu: İşletmenin kendi çektiği gerçek fotoğrafları (ürünler, mekan, ambiyans) alıp bunları bir araya getirerek tek, profesyonel bir Instagram görseli oluşturmak. Yapay zeka bu görseli sıfırdan üretmiyor — zaten var olan gerçek fotoğrafları birleştirip kompoze ediyor.

---

## Neden Gemini?

Gemini'nin en güçlü özelliklerinden biri: **verilen görseli olduğu gibi koruyarak kullanmak**. Yani bir ürün fotoğrafı verdiğinde, o ürünü tanınmaz hale getirmiyor — ürün aynı ürün kalıyor, sadece daha iyi bir kompozisyona yerleştiriliyor.

Bu proje için bu kritik. Çünkü amaç "güzel ama bizim ürün değil" görseller değil, **"bu bizim ürünümüz ve harika görünüyor"** görseller üretmek.

---

## Kullanıcının Elinde Ne Var?

- Kendi işletmesinin ürün fotoğrafları (pasta, croissant, kahve, vb.)
- Kendi mekanının fotoğrafları (masa, ambiyans, dekorasyon)
- Bunların tamamı gerçek, kendi çektikleri

Sistem bu fotoğrafları **assets** olarak tutuyor. Her üretimde doğru fotoğraflar seçilip Gemini'ye veriliyor.

---

## Sistem Nasıl Çalışıyor? (Büyük Resim)

```
Gerçek fotoğraflar (assets)
        ↓
Senaryo seç (hangi kompozisyon? hangi atmosfer?)
        ↓
Gemini: fotoğrafları birleştir, yeni görsel üret
        ↓
Telegram: "Bu görsel hazır, onaylıyor musun?"
        ↓
Onay → Instagram'a otomatik yayınla
```

Her adım mümkün olduğunca **otomatik** — insan müdahalesi sadece son onay anında.

---

## Ne Değil Bu Proje?

- Stok fotoğraf kullanan bir sistem değil
- Genel AI görsel üretici değil (Midjourney, DALL-E gibi)
- Sadece şablonla çalışan bir sosyal medya aracı değil

**Fark:** Kullanıcının kendi gerçek içeriğini, kendi markasının estetiğiyle, otomatik olarak Instagram'a taşıyan bir sistem.

---

---

## İki Ana Kanat

### 1. Otomasyon Pipeline (Mevcut)
Senaryo modeli üzerinden çalışır. Senaryo, hangi görsellerin bir arada kullanılacağını ve nasıl kompoze edileceğini tanımlar. Sonuç: tek bir Instagram görseli → Telegram onayı → otomatik yayın.

### 2. Fotoğraf Stüdyosu (Geliştirilecek)
Kullanıcının tek bir ürün fotoğrafıyla elle, interaktif olarak çalışabileceği sayfa. Pixury benzeri. Şu an kısmen mevcut (`Fotoğraf İyileştir` sayfası), ama genişletilecek.

**Hedef özellikler:**
- Arka plan kaldırma / değiştirme — tek tıkla ✅ (kısmen mevcut)
- **Şeffaf arka plan + doğal gölge** — ürün izole edilir, gölgesi korunur → her kompozisyona, postere, arka plana kolayca uyum sağlar. Evrensel yapı taşı.
- Görsel iyileştirme (netlik, renk, kalite) ✅ (kısmen mevcut)
- Ürünü gerçek yaşam sahnelerine yerleştirme (model/lifestyle üretimi)
- Poster ve pazarlama görseli şablonları ✅ (poster-maker mevcut)
- Toplu işleme — birden fazla görsel aynı anda
- Pazarlama takvimi — tatil/kampanya dönemlerine özel otomatik üretim ✅ (scheduler mevcut)
- Video özellikleri — ilerleyen aşama, şimdilik plan

---

## Ne Değil Bu Proje?

- Stok fotoğraf kullanan bir sistem değil
- Genel AI görsel üretici değil (Midjourney, DALL-E gibi)
- Sadece şablonla çalışan bir sosyal medya aracı değil

**Fark:** Kullanıcının kendi gerçek içeriğini, kendi markasının estetiğiyle, otomatik olarak Instagram'a taşıyan bir sistem. Hem tam otomatik pipeline (senaryo bazlı), hem de elle kullanılabilen stüdyo aracı olarak çalışır.

---

*Son güncelleme: 2026-03-28*

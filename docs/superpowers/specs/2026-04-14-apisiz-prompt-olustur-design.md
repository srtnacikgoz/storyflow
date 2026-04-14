# API'siz Prompt Oluştur — Tasarım Dokümanı

**Tarih:** 2026-04-14
**Durum:** Onaylandı

## Problem

"Prompt Üret" butonu her tıklamada Claude API'ye token harcıyor. Ama kullanıcı zaten ChatGPT'ye hem promptu hem ürün fotoğrafını yüklüyor — Claude'un ürünü analiz etmesi gereksiz maliyet.

## Çözüm

PromptGenerator bileşenini kaldır. Yerine stilin `dallEPrompt` alanındaki placeholder'ları kullanıcı girdisiyle değiştiren basit bir "Promptu Oluştur" butonu koy. API çağrısı sıfır.

## Akış

1. Kullanıcı stil seçer, başlık/alt başlık/fiyat yazar
2. "Promptu Oluştur" butonuna tıklar
3. Seçili stilin `dallEPrompt` alanından placeholder'lar değiştirilir:
   - `{PRODUCT}` → başlık (title)
   - `{TITLE}` → başlık (title)
   - `{SUBTITLE}` → alt başlık (subtitle)
   - `{PRICE}` → fiyat (price)
4. Oluşan prompt koyu arka planlı blokta gösterilir
5. "Kopyala" butonu → clipboard
6. Kullanıcı ChatGPT'ye yapıştırır + ürün fotoğrafını yükler

## Kaldırılanlar

- `admin/src/components/poster/PromptGenerator.tsx` — bileşen tamamen kaldırılır
- `Poster.tsx`'ten PromptGenerator import'u ve kullanımı
- API çağrısı yok — `api.generatePosterPrompt` frontend'den çağrılmaz

## Eklenenler

- `Poster.tsx`'te:
  - `buildPromptFromStyle(style, title, subtitle, price)` fonksiyonu — placeholder replace
  - Prompt gösterim alanı (koyu arka plan, mono font, max-height scroll)
  - "Promptu Oluştur" butonu
  - "Kopyala" butonu (clipboard API)
  - Stil'de `dallEPrompt` yoksa uyarı mesajı

## Değişmeyen

- Stil seçimi, mood seçimi, ürün görseli yükleme, başlık/alt başlık/fiyat alanları
- PosterAnalyzer (referans poster analiz)
- Backend endpoint'leri (silinmez)

## Edge Case

- Stil'de `dallEPrompt` yoksa (eski stiller): "Bu stilin DALL-E promptu tanımlı değil. Stili düzenleyip DALL-E Prompt alanını doldurun." uyarısı

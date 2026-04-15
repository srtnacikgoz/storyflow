# QrMenu Prompt Oluşturucu — Yeniden Tasarım

**Tarih:** 2026-04-14
**Durum:** Onaylandı

## Problem

QrMenu sayfası poster stillerini paylaşıyor, gereksiz karmaşıklık yaratıyor. Görsel analiz, referans fotoğraf yükleme, Gemini ile üret, stil CRUD — hiçbiri kullanılmıyor. Kullanıcı sadece ChatGPT/DALL-E ile üretiyor.

Ayrıca stil bazlı renk paleti (roasted tomato, pesto green gibi) yanlış ürüne uygulanınca çelişki yaratıyor.

## Çözüm

QrMenu prompt oluşturucuyu sadeleştir. Tek sabit şablon, 4 input, API çağrısı sıfır.

## Kaldırılanlar

- Stil seçimi (poster stillerini paylaşma)
- Görsel analiz bölümü (modal, DNA çıkarma, stil formu)
- Referans ürün fotoğrafı yükleme alanı
- "Gemini ile Üret" butonu ve API çağrısı
- Stil yönetimi (StyleCard, CRUD, düzenleme)
- Tüm stil ile ilgili state'ler, veri yüklemeleri, tipler

## Yeni UI — 4 Input

| Input | Tipi | Zorunlu | Açıklama |
|---|---|---|---|
| Ürün Adı | text (InputWithRecent) | Evet | "Cruffin", "Croissant" |
| Zemin Dokusu | dropdown (3 seçenek) | Evet | kumlu matte, pürüzsüz beton, ince keten |
| Zemin Detayları | serbest metin (InputWithRecent) | Hayır | "antepfıstığı kırıntıları, birkaç ahududu tanesi" |
| Tabakta Sun | checkbox | Hayır | Ürün tabakta mı yoksa doğrudan zeminde mi |

## Sabit Değerler (kodda)

- Arka plan rengi: `#F0E6D8` (sıcak krem-bej)
- Işık: overhead soft diffused, 5000K, 2:1 key-to-fill
- Kompozisyon: ürün merkezde, overhead flat-lay veya 30° açı
- Format: no text, no watermark, no branding

## Zemin Dokusu Seçenekleri

| ID | Türkçe | Prompt karşılığı |
|---|---|---|
| `sandy-matte` | Kumlu Matte | "sandy matte" |
| `smooth-concrete` | Pürüzsüz Beton | "smooth concrete" |
| `fine-linen` | İnce Keten | "fine linen fabric" |

Kodda sabit array — Firestore'a gerek yok (3 seçenek, değişme ihtimali düşük).

## Prompt Şablonu

```
Professional product photo of "{PRODUCT}" on a warm cream (#F0E6D8) {TEXTURE} surface.
{SCATTERED}
{ON_PLATE}
Overhead soft diffused lighting, 5000K neutral daylight, 2:1 key-to-fill ratio, minimal soft shadow beneath product.
Clean, minimal, catalog-quality food photography. No text, no watermark, no branding.
```

Değişkenler:
- `{PRODUCT}` → Ürün Adı input'undan
- `{TEXTURE}` → Zemin Dokusu dropdown'undan (İngilizce karşılık)
- `{SCATTERED}` → Zemin Detayları doluysa: `Scattered around the base: [metin].` Boşsa: satır yok
- `{ON_PLATE}` → Tabakta Sun işaretliyse: `Served on an appropriate ceramic plate that suits the product.` İşaretsizse: `Product placed directly on surface, no plate.`

## Dosya Değişiklikleri

| Dosya | İşlem |
|---|---|
| `admin/src/components/qr-menu/QrMenuPromptGenerator.tsx` | Tamamen yeniden yaz — stil prop'u kaldır, sabit şablon |
| `admin/src/pages/QrMenu.tsx` | Görsel analiz bölümü, stil yönetimi, StyleCard kaldır. Sadece QrMenuPromptGenerator kalsın |

## Dokunulmayacaklar

- Backend endpoint'leri (silinmez)
- Poster sayfası (ayrı sistem)
- Firestore koleksiyonları (stiller orada kalır, sadece QrMenu'dan erişilmez)

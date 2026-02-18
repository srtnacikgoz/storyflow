# Settings Sayfasi Kapsamli Audit Raporu

> **Tarih:** 2026-02-11
> **Yontem:** 6 paralel arastirma agent'i ile derinlemesine analiz
> **Kapsam:** Settings.tsx + backend entegrasyonu + pipeline kullanimi

---

## Genel Degerlendirme

Settings sayfasinda 7 bolum (section) var. Bu audit'te her bolumun:
- Frontend'deki alanlari
- Backend'deki gercek kullanimi
- Hardcoded degerler
- Dead field'lar
- Sorunlar

incelendi.

### Bolum Listesi

| # | Bolum | Dosya |
|---|-------|-------|
| 1 | Instagram Baglantisi | [01-instagram-baglantisi.md](./01-instagram-baglantisi.md) |
| 2 | Zamanlanmis Paylasim | [02-zamanlanmis-paylasim.md](./02-zamanlanmis-paylasim.md) |
| 3 | Isletme Baglami | [03-isletme-baglami.md](./03-isletme-baglami.md) |
| 4 | Asset Secim Kurallari | [04-asset-secim-kurallari.md](./04-asset-secim-kurallari.md) |
| 5 | Urun Tipi Slot Varsayilanlari | [05-urun-tipi-slot-defaults.md](./05-urun-tipi-slot-defaults.md) |
| 6 | API Bilgileri + Tanitim Turlari | [06-api-bilgileri-turlar.md](./06-api-bilgileri-turlar.md) |
| 7 | Backend Entegrasyon + Mimari | [07-backend-entegrasyon.md](./07-backend-entegrasyon.md) |

---

## Oncelik Siralamasi (Kritikten Dusuge)

### KRITIK
1. **promptContext dead field** — "EN ONEMLI" diyor ama kullanilmiyor. Ya pipeline'a entegre et ya da label'i duzelt
2. **9 dead field (Business Context)** — Gereksiz karmasiklik. Kullanilmayan alanlar kaldirilmali veya pipeline'a baglanmali
3. **Asset Selection toggle'lari yaniltici** — "ZORUNLU/HARIC" diyor ama sadece prompt hint'i. Cutlery mapping hatasi

### ORTA
4. **Hardcoded degerler** — 15dk, timezone, region, project ID — SaaS-dostu degil
5. **Frontend validation eksik** — Tum input'lara temel validation eklenmeli

### DUSUK
6. **PRODUCT_TYPE_LABELS / SLOT_LABELS hardcoded** — Dinamik sisteme uyumsuz
7. **Tour sistemi localStorage** — Multi-device sync yok (minor)

---

## Sayisal Ozet

| Metrik | Deger |
|--------|-------|
| Toplam alan (field) | ~30 |
| Calisan alan | ~12 |
| Dead field | ~10 |
| Hardcoded bilgi | 6+ |
| Frontend validation | 0 |
| Backend validation | Var (tip kontrolu) |
| Paralel API cagri (sayfa acilis) | 5 |

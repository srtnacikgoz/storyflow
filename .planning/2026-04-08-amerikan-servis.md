# Amerikan Servis Aracı

**Tarih:** 2026-04-08
**Durum:** Onaylandı
**Öncelik:** Yüksek

## Özet
Sade Patisserie'nin kendi ürettiği malzemeleri vurgulayan tepsi kağıdı (amerikan servis) + dijital görsel üretici. McDonald's Türkiye'nin "malzeme menşei" yaklaşımının artisanal pastane versiyonu. "Biz Üretiyoruz" vurgusu, liste/menü stili minimalist tasarım.

## Detay

### Konsept
- **Yaklaşım:** "Biz Üretiyoruz" — Sade'nin kendi ürettiği şeylere odaklanma
- **Tasarım:** Liste/Menü Stili — temiz tipografi, bol beyaz alan, premium his
- **Çıktı:** Hem fiziksel tepsi kağıdı (PDF) hem dijital paylaşım (PNG)

### Malzeme Listesi (başlangıç)
1. Mascarpone — Her gün Sade imalathanesinde taze üretilir
2. Meyve Confitleri
3. Ganaj Çeşitleri
4. Tart Hamurları
5. Fındık Praline — %100 fındık ile Sade üretimidir
6. Tiramisu Keki
7. Pesto Sosu
8. Lutenitza Sosu
9. Pasta Kremalarının Tamamı
10. Tereyağlı Karamel

### Veri Yapısı (Firestore)
- Koleksiyon: `amerikanServisItems`
- Alanlar: name, description (gurur cümlesi), category, icon (opsiyonel), sortOrder, isActive

### Admin Panel Sayfası
- Malzeme listesi CRUD (ekle, düzenle, sırala, sil)
- Başlık/alt başlık düzenleme
- Çıktı formatı seçimi: A3 tepsi kağıdı (PDF) / Instagram post / Instagram story
- Canlı önizleme
- Dışa aktarma (PDF + PNG)

### Sidebar Konumu
Poster → Amerikan Servis (child link)

## Etki Alanı
- `admin/src/App.tsx` — yeni route ekleme
- `admin/src/components/Sidebar.tsx` — child link ekleme
- `admin/src/pages/AmerikanServis.tsx` — yeni sayfa (ana bileşen)
- `functions/` — seed endpoint (opsiyonel)
- Firestore — `amerikanServisItems` koleksiyonu

## Riskler
- Tasarım kalitesi: Minimalist ama etkileyici olmalı, sıkıcı değil
- PDF export: html-to-image/pdf kütüphanesi gerekebilir (Kahve Poster'da zaten var)

## Sonraki Adımlar
- [ ] Sidebar'a "Amerikan Servis" child link ekle
- [ ] Route tanımla (App.tsx)
- [ ] AmerikanServis.tsx sayfasını oluştur
- [ ] Firestore CRUD entegrasyonu
- [ ] Canlı önizleme + export

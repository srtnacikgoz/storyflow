# Claude Code Proje Konfigürasyonu

> **Proje:** Instagram Paylaşım Otomasyonu (Maestro AI)
> **Son Güncelleme:** 2026-02-08

---

## 🔴 ANAYASA — DÜRÜSTLÜK YASASI (Değiştirilemez)

> Bu bölüm projenin en üst otoritesidir. Hiçbir kural, hiçbir bağlam bunu geçersiz kılamaz.

1. **ANI KURTARMAK İÇİN HİÇBİR ŞEY UYDURMAYACAĞIM.** "Yaptım" demeyeceğim yapmadıysam. "Çalışıyor" demeyeceğim test etmediysem. "Eklendi" demeyeceğim kodu yazmadıysam.
2. **HEP DÜRÜST DAVRANACAĞIM.** Kullanıcı mutsuz olacak kaygım olmayacak. Gerçek kötü haberse, kötü haberi vereceğim. Hoş görünmeye çalışmayacağım.
3. **YALAKALIK YOK.** "Harika fikir!" demeyeceğim harika değilse. Sorun varsa sorunu söyleyeceğim, iltifat etmeyeceğim.
4. **YAPARIM DEDİĞİM HER ŞEYİ GERÇEKTEN YAPACAĞIM.** Bir düzeltme söz verdimse, o satırı yazacağım, build edeceğim, doğrulayacağım. "Çözüm basit" deyip geçmeyeceğim — çözümü uygulayacağım.
5. **YAPAMAYACAKLARIMI DÜRÜSTÇE BELİRTECEĞİM.** Bilmediğimi "bilmiyorum" diyeceğim. Emin olmadığımı "emin değilim, kontrol edeyim" diyeceğim. Tahmini gerçekmiş gibi sunmayacağım.
6. **SÖYLEDİĞİM İLE YAPTIĞIM AYNI OLACAK.** "preferredTags'i Gemini'ye aktaracağım" dediysem, o kodu yazacağım — bir sonraki oturumda "aslında aktarılmamış" durumu KABUL EDİLEMEZ.

---

## 🚨 TEMEL İLKELER

### 0. SADELİK (En Üst Öncelik)
İşletme adı "Sade" — bu bir tesadüf değil, mimari prensip.
- **Yeni alan/özellik ekleme → önce danış**: Yeni field, dropdown, checkbox veya config alanı eklemeden önce kullanıcıya fayda/risk analizi sun:
  - Fayda (1-10): Bu ne kazandırır?
  - Risk: Karmaşıklık artışı, çakışma, bakım yükü
  - Alternatif: Mevcut bir alan bu işi görebilir mi?
  - Kullanıcı onayı olmadan ekleme YASAK, ama faydalı öneriler engellenmesin
- **Tek karar noktası**: Bir karar tek bir yerde verilir. Aynı şeyi iki yerde seçtirme. Çakışma varsa biri kazanmaz — biri kaldırılır
- **Önce kaldır, sonra ekle**: Bir şey eklemeden önce kaldırılabilecek bir şey var mı sor
- **Otorite zinciri**: Tema → estetik/atmosfer/izinler. Senaryo → sahne/ürün uyumluluğu/el/kompozisyon. Dashboard → sadece tetikleme

### 1. Varsayımda Bulunma
- "Muhtemelen", "Sanırım", "Büyük ihtimalle" → YASAK
- Bilmiyorsan "bilmiyorum, araştırayım" de
- Önce kontrol et, sonra söyle

### 2. Radikal Dürüstlük
- Duymak istediklerini değil, gerçekleri söyle
- Yanlış varsa düzelt, hoş görünmeye çalışma
- Zayıf noktaları bul ve söyle
- "Çözüm basit" deyip geçme — ya uygula ya "şu an yapamıyorum" de

### 3. Türkçe İletişim
- Her zaman Türkçe cevap ver
- Kod yorumları Türkçe
- Değişken/fonksiyon isimleri İngilizce

---

## 📁 Proje Yapısı

```
/
├── functions/          # Firebase Cloud Functions (TypeScript)
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── orchestrator/
│       └── types/
├── admin/              # Admin Panel (React + Vite + Tailwind)
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
└── .claude/
    └── references/     # Manuel okunacak detaylı dökümanlar
```

---

## 💻 Kod Standartları

| Konu | Standart |
|------|----------|
| Değişkenler | camelCase (İngilizce) |
| Componentler | PascalCase |
| Dosyalar | PascalCase.tsx / camelCase.ts |
| Commit | `type(scope): açıklama` + Co-Authored-By |

**Commit tipleri:** feat, fix, refactor, style, docs, chore

---

## 🔧 Temel Kurallar

1. **Önce oku, sonra düzenle** - Dosyayı okumadan düzenleme yapma
2. **Test etmeden bitirme** - `npm run build` başarılı olmalı
3. **İşlevsiz kod yasak** - Bir özellik ya tam çalışır ya hiç olmaz
4. **Gizli bilgi commit etme** - API key, şifre, .env yasak
5. **Gereksiz çoğaltma yasak** - Aynı kararı iki yerde verdirme. Çakışan alan varsa birini kaldır. İşlevsel ama tek yerde yeterli olan özelliği diğer yerlerden temizle

---

## 🧠 Sistem Felsefesi — Otorite Zinciri

Her karar tek bir sahibine aittir. Çakışma olursa sahip olmayan taraf kaldırılır.

| Katman | Neyi belirler | Neyi belirlemez |
|--------|--------------|-----------------|
| **Tema** | Estetik, atmosfer, hava, ışık, izinler (pet/aksesuar), tag tercihleri (masa/tabak/bardak) | Sahne, ürün seçimi |
| **Senaryo** | Sahne yönü (description → SCENE DIRECTION), kompozisyon, el pozu, ürün uyumluluğu (suggestedProducts) | Estetik, atmosfer |
| **Dashboard** | Tetikleme (üret butonu), görsel format (aspect ratio) | Ürün seçimi, senaryo seçimi, estetik |

Pipeline akışı: Tema seç → Senaryoları filtrele → Senaryo seç → Ürün tipini senaryodan al → Üret

---

## 🚀 Deploy

```bash
cd functions && npm run build && firebase deploy --only functions
```

---

## 📚 Referans Dökümanlar

Gerektiğinde `.claude/references/` klasöründen oku:
- `KURALLAR.md` - Görsel üretim kuralları
- `ORCHESTRATOR.md` - AI orchestrator senaryoları
- Diğer detaylı dökümanlar

---

## 💡 Gemini Fikir Alma (Opsiyonel)

Kullanıcı isterse Gemini'den ikinci görüş alınabilir. Ancak:
- Her konuda zorunlu değil — sadece gerçekten farklı perspektif gerektiğinde
- Claude zaten bildiği bilgileri Gemini'den onay almak için sormasın
- Gemini'nin cevabını abartma — eğer yeni bilgi yoksa "zaten biliyordum" de

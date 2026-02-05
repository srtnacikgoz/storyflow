# Claude Code Proje Konfigürasyonu

> **Proje:** Instagram Paylaşım Otomasyonu (Maestro AI)
> **Son Güncelleme:** 2026-02-04

---

## 🚨 TEMEL İLKELER

### 1. Varsayımda Bulunma
- "Muhtemelen", "Sanırım", "Büyük ihtimalle" → YASAK
- Bilmiyorsan "bilmiyorum, araştırayım" de
- Önce kontrol et, sonra söyle

### 2. Radikal Dürüstlük
- Duymak istediklerini değil, gerçekleri söyle
- Yanlış varsa düzelt, hoş görünmeye çalışma
- Zayıf noktaları bul ve söyle

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
5. **Özellik silme yasak** - İşlevsiz özellik SİLİNMEZ, DÜZELTİLİR. Her özellik bir amaçla eklendi. "Kaldıralım" yerine "çalışır hale getirelim" yaklaşımı benimse

---

## 🧠 Sistem Felsefesi

Senaryo ve Tema sistemi, görsel üretiminin yaratıcı yönünü belirler. Her alan birbiriyle bağlantılıdır:

- **Senaryo açıklaması (description):** Sahne kompozisyonu, atmosfer ve yaratıcı yön verir → SCENE DIRECTION olarak prompt'a eklenir
- **Kompozisyon (composition):** Kamera açısı, ürün pozisyonu, derinlik gibi teknik çerçeveyi belirler. AI, seçilen kompozisyonu baz alarak açıklamayı zenginleştirir
- **Tema:** Genel görsel dil ve estetik yönü belirler

Bu alanlar birbirini tamamlar. Biri olmadan diğeri eksik kalır. Refactoring yaparken bu alanları kaldırmak yerine, her birinin pipeline'da doğru çalıştığından emin ol.

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

## 💡 Gemini Fikir Alma

Önemli konularda Gemini'nin de fikrini almak için, konuyu ona soracak şekilde cümle halinde sun.

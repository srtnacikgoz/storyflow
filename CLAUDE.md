# Claude Code Proje Konfigürasyonu

## Oturum Başlangıç Protokolü

Her oturum başında aşağıdaki dosyaları **sırasıyla oku ve uygula**:

### 1. Proje Kuralları (Zorunlu)
```
.claude/project-rules.md
```
- Kod yazım standartları
- Naming conventions
- Git commit formatı
- Test gereksinimleri
- Güvenlik kuralları

### 2. Kişisel Bağlam (Zorunlu)
```
.claude/kişiselbağlam.md
```
- İletişim tarzı tercihleri
- Radikal dürüstlük ilkesi
- Yazılım jargonu öğretimi
- Eleştirel geri bildirim beklentisi

### 3. Geri Bildirimler (Zorunlu)
```
.claude/FEEDBACK.md
```
- Aktif bug'lar
- İyileştirme önerileri
- Refactor ihtiyaçları
- TODO listesi

### 4. Proje Yol Haritası (Zorunlu)
```
.planning/ROADMAP.md
.planning/phases/
```
- Mevcut phase durumu
- Tamamlanan ve bekleyen planlar
- Bağımlılıklar

### 5. Zihinsel Algoritma İnşası (Zorunlu)
```
zihinsel-algoritma-inşası.md
```
- **Tetikleyici:** `REPO-FIRST`
- GitHub araştırma metodolojisi
- Kritik eşikler: Genesis, The Wall, The Void
- Kalite değerlendirme piramidi
- Gelişmiş arama sözdizimi
- Güvenlik kontrol listesi

### 6. Risk ve Dayanıklılık Planı (Zorunlu)
```
Risk-ve-Dayanıklılık-Planı.md
```
- **Tetikleyici:** `RISK-CHECK`
- Anti-Fragile yazılım geliştirme
- Risk değerlendirme matrisi
- Bağımlılık analizi protokolü
- Fallback stratejileri (Multi-Provider, Circuit Breaker, Cache-First)
- Monitoring ve alerting
- Vendor lock-in azaltma

---

## İş Tamamlama Kuralları

### Roadmap Güncelleme (Kritik)
Bir görev veya phase tamamlandığında:

1. **ROADMAP.md dosyasını güncelle:**
   - `- [ ]` → `- [x]` olarak işaretle
   - Progress tablosunu güncelle
   - Status'ü "Completed" yap

2. **Phase plan dosyalarını güncelle:**
   - `.planning/phases/XX-XX-PLAN.md` içindeki task'ları işaretle

3. **Commit mesajında belirt:**
   ```
   feat(phase-X): [Açıklama]

   Completed: Phase X - [Phase adı]
   ```

### Örnek Güncelleme
```markdown
# ROADMAP.md içinde:

## Phases
- [x] **Phase 1: Foundation & Setup** - TAMAMLANDI
- [ ] **Phase 2: API Integrations** - Devam ediyor

## Progress
| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Setup | 2/2 | Completed | 2026-01-14 |
```

---

## Kod Yazım Kuralları (Özet)

- **Değişkenler:** camelCase (İngilizce)
- **Componentler:** PascalCase
- **Dosyalar:** PascalCase.tsx / camelCase.ts
- **Yorumlar:** Türkçe
- **Commit:** `type(scope): açıklama`

---

## Proje Yapısı

```
/
├── CLAUDE.md                         # Bu dosya (ana konfigürasyon)
├── zihinsel-algoritma-inşası.md      # GitHub araştırma SOP (REPO-FIRST)
├── Risk-ve-Dayanıklılık-Planı.md     # Anti-Fragile SOP (RISK-CHECK)
├── .claude/
│   ├── project-rules.md              # Detaylı kurallar
│   ├── kişiselbağlam.md              # İletişim tercihleri
│   └── FEEDBACK.md                   # Bug/improvement takibi
├── .planning/
│   ├── ROADMAP.md                    # Ana yol haritası
│   ├── BRIEF.md                      # Proje özeti
│   └── phases/                       # Phase planları
├── functions/                        # Firebase Cloud Functions
└── admin/                            # Admin panel (Frontend)
```

---

## Hatırlatmalar

1. **Her oturumda** yukarıdaki 6 dosyayı oku ve uygula
2. **Her iş bitiminde** ROADMAP'i güncelle
3. **Bug bulduğunda** FEEDBACK.md'ye ekle
4. **Yeni özellik tamamlandığında** checkbox'ı işaretle `[x]`
5. **Commit atarken** project-rules.md formatına uy
6. **Yeni konu/teknolojiye başlarken** `REPO-FIRST` protokolünü uygula
7. **Yeni bağımlılık eklerken** `RISK-CHECK` protokolünü uygula

---

## Tetikleyiciler (SOP)

| Tetikleyici | Dosya | Ne Zaman Kullan? |
|-------------|-------|------------------|
| `REPO-FIRST` | zihinsel-algoritma-inşası.md | Yeni konu, tıkanma, derinleşme |
| `RISK-CHECK` | Risk-ve-Dayanıklılık-Planı.md | Yeni bağımlılık, mimari karar |

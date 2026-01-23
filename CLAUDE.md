# Claude Code Proje Konfigürasyonu

---

## 🚨🚨🚨 EN ÖNEMLİ KURAL 🚨🚨🚨

# ARAŞTIRMADAN, İNCELEMEDEN, EMİN OLMADAN VARSAYIMDA BULUNMA!

**Bu kural TÜM diğer kuralların üstündedir.**

| YASAK | ZORUNLU |
|-------|---------|
| "Muhtemelen şöyledir" | Önce kontrol et, sonra söyle |
| "Büyük ihtimalle..." | Veriyi oku, logları incele |
| "Sanırım..." | Emin ol, sonra konuş |
| "Olabilir ki..." | Araştır, bul, göster |

**Bilmiyorsan "bilmiyorum, araştırayım" de.**
**Varsayım yapma, veri topla.**
**Tahmin etme, doğrula.**

### Spesifik Durumlar

#### Sorun Teşhisi Yaparken
- "Muhtemelen X'e gitmiyor" deme → Kodu oku, akışı takip et, kanıtla
- Başarılı ve başarısız örnekleri karşılaştır
- Eğer önceki üretimde çalıştıysa, farkın ne olduğunu bul

#### Kendi Kodumuz Hakkında
- "Bu özellik X yapıyor" deme → Gerçekten yapıp yapmadığını kontrol et
- Eğer bir özellik eklediysen (örn: Sorun Bildir), o özellik ÇALIŞMALI
- Sadece kayıt tutan ama etkisi olmayan özellikler KABUL EDİLEMEZ

#### Kullanıcı Geri Bildirimi Verdiğinde
- Hemen savunmaya geçme
- Kullanıcının söylediğini doğrula (log, kod, önceki örnekler)
- Eksiklik varsa kabul et ve düzelt

---

> **🔒 KURAL SİSTEMİ AKTİF:** Bu projede `.claude/rules/` klasöründeki kurallar **otomatik yüklenir** ve `rules-enforcer.js` hook'u ile **oturum boyunca zorunlu kılınır**. Kuralları görmezden gelme - hook sistemi hatırlatacak.

---

## ⚡ Otomatik Yüklenen Kurallar

`.claude/rules/` klasöründeki tüm `.md` dosyaları **Claude Code tarafından otomatik okunur** ve her oturumda context'e eklenir. Bu kurallar **her zaman geçerlidir**.

### Aktif Kural Dosyaları (Otomatik Yüklenen):
| Dosya | İçerik | Öncelik |
|-------|--------|---------|
| `Iron-Rules.md` | Temel güvenlik ve iş akışı kuralları | 🔴 Kritik |
| `PROJE-KURALLARI.md` | Kod standartları, mimari, git kuralları | 🔴 Kritik |
| `BIREYSEL-ISTEKLER.md` | Kullanıcı iletişim tercihleri | 🟢 Normal |

> **Not:** Bu dosyalar `.claude/rules/` içinde olduğu için Claude Code bunları otomatik olarak her conversation başında yükler.

### İsteğe Bağlı Referanslar (Manuel Okunur):
| Dosya | İçerik | Ne Zaman Oku? |
|-------|--------|---------------|
| `KURALLAR.md` | Görsel üretim kuralları (prompt yazımı) | Görsel/prompt çalışırken |
| `ORCHESTRATOR.md` | AI orchestrator senaryoları ve çeşitlilik | Orchestrator geliştirirken |

> **Not:** Bu dosyalar `.claude/references/` içinde. Token tasarrufu için her oturumda yüklenmez. Gerektiğinde `Read` ile okunur.

---

## Oturum Başlangıç Protokolü

Otomatik yüklenen kuralların yanı sıra, aşağıdaki dosyaları **sırasıyla oku ve uygula**:

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

### 3.5. Problem Kayıt Defteri (Zorunlu - KRİTİK)
```
.claude/PROBLEM-REGISTRY.md
```
- **Çözülmüş sorunlar ve nasıl çözüldüğü**
- **İşe yaramayan yaklaşımlar**
- **Tekrar eden pattern'ler**
- Aktif/araştırılan sorunlar

> ⚠️ **ÖNEMLİ:** Aynı sorunu tekrar çözmemek için bu dosyayı mutlaka oku. Token ve zaman israfını önler.

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
│   ├── rules/                        # ⚡ OTOMATİK YÜKLENEN KURALLAR
│   │   ├── Iron-Rules.md             # Temel güvenlik kuralları
│   │   ├── PROJE-KURALLARI.md        # Kod standartları, mimari
│   │   └── BIREYSEL-ISTEKLER.md      # İletişim tercihleri
│   ├── references/                   # 📖 İSTEĞE BAĞLI REFERANSLAR
│   │   ├── KURALLAR.md               # Görsel üretim kuralları
│   │   └── ORCHESTRATOR.md           # Orchestrator senaryoları
│   ├── hooks/                        # Otomatik hook scriptleri
│   │   ├── rules-enforcer.js         # ⚡ KURAL ZORLAMA (her oturumda çalışır)
│   │   ├── orchestrator-sync.js      # ORCHESTRATOR.md değişince çalışır
│   │   └── validate-config.js        # Deploy öncesi validasyon
│   ├── skills/                       # Claude Code skills
│   ├── project-rules.md              # Detaylı kod kuralları
│   ├── kişiselbağlam.md              # İletişim tercihleri
│   ├── settings.local.json           # Hook ve permission ayarları
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

1. **Her oturumda** yukarıdaki 7 dosyayı oku ve uygula
2. **`.claude/rules/` kuralları** otomatik yüklenir - her zaman uygula
3. **Her iş bitiminde** ROADMAP'i güncelle
4. **Bug bulduğunda** FEEDBACK.md'ye ekle
5. **Yeni özellik tamamlandığında** checkbox'ı işaretle `[x]`
6. **Commit atarken** project-rules.md formatına uy
7. **Yeni konu/teknolojiye başlarken** `REPO-FIRST` protokolünü uygula
8. **Yeni bağımlılık eklerken** `RISK-CHECK` protokolünü uygula
9. **Görsel üretirken** `.claude/references/KURALLAR.md` oku ve uygula
10. **Orchestrator çalışırken** `.claude/references/ORCHESTRATOR.md` oku ve uygula
11. **Sorun çözmeye başlamadan önce** `PROBLEM-REGISTRY.md` kontrol et (aynı sorun daha önce çözüldü mü?)
12. **Ciddi sorun çözdükten sonra** `PROBLEM-REGISTRY.md`'ye kaydet (çözüm + işe yaramayanlar)

---

## Hooks Sistemi (Kural Zorlama)

`.claude/hooks/` klasöründeki scriptler **otomatik çalışır** ve kuralların uygulanmasını garanti eder.

### Ana Hook: rules-enforcer.js

| Mod | Tetikleyici | Ne Yapar |
|-----|-------------|----------|
| `session-start` | **Her mesajda** (UserPromptSubmit) | Tüm kuralları yükler, hızlı hatırlatma gösterir |
| `pre-write` | Dosya yazmadan önce (PreToolUse Write) | Yazma kurallarını hatırlatır |
| `pre-bash` | `rm` komutu öncesi (PreToolUse Bash) | Tehlikeli komutları engeller |
| `pre-deploy` | Deploy öncesi (PreToolUse Bash) | Kontrol listesi gösterir |
| `reminder` | Dosya okuma sonrası (PostToolUse Read) | Rastgele kural hatırlatması |

### Diğer Hook'lar

| Hook | Tetikleyici | Ne Yapar |
|------|-------------|----------|
| `orchestrator-sync.js` | ORCHESTRATOR.md değişince | Kuralları parse edip JSON'a çevirir |
| `validate-config.js` | Deploy öncesi | Konfigürasyon doğrulaması |

### Konfigürasyon

Hook'lar `settings.local.json` içinde tanımlanır:

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "command": "rules-enforcer.js session-start" }],
    "PreToolUse": [
      { "matcher": "Write", "command": "rules-enforcer.js pre-write" },
      { "matcher": "Bash(firebase deploy*)", "command": "rules-enforcer.js pre-deploy" },
      { "matcher": "Bash(rm *)", "command": "rules-enforcer.js pre-bash" }
    ],
    "PostToolUse": [
      { "matcher": "Read", "command": "rules-enforcer.js reminder" }
    ]
  }
}
```

> **Önemli:** Bu sistem sayesinde kurallar her oturumda otomatik yüklenir ve oturum boyunca hatırlatılır.

---

## Tetikleyiciler (SOP)

| Tetikleyici | Dosya | Ne Zaman Kullan? |
|-------------|-------|------------------|
| `REPO-FIRST` | zihinsel-algoritma-inşası.md | Yeni konu, tıkanma, derinleşme |
| `RISK-CHECK` | Risk-ve-Dayanıklılık-Planı.md | Yeni bağımlılık, mimari karar |

---

## Kural Ekleme Rehberi

Yeni kural eklemek için:

1. `.claude/rules/` klasörüne `.md` dosyası ekle
2. Dosya adı açıklayıcı olsun (örn: `YENI-KURAL.md`)
3. İçerikte kuralları açık ve net yaz
4. Claude Code bir sonraki oturumda otomatik yükleyecek

> **Önemli:** `rules/` klasöründeki her `.md` dosyası Claude Code context'ine otomatik eklenir.

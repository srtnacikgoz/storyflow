# Claude Code Hooks

Bu klasördeki scriptler Claude Code hooks sistemi ile otomatik çalışır.

> Son Güncelleme: 2026-01-20

---

## Hook Sistemi Genel Bakış

```
.claude/hooks/
├── rules-enforcer.js      # Kural zorlama ve hatırlatma
├── orchestrator-sync.js   # ORCHESTRATOR.md sync
├── validate-config.js     # Deploy öncesi validasyon
└── README.md              # Bu dosya
```

---

## 1. rules-enforcer.js (YENİ)

**Amaç:** Kuralların okunduğundan ve oturum boyunca uygulandığından emin olmak.

### Modlar

| Mod | Açıklama | Tetikleyici |
|-----|----------|-------------|
| `session-start` | Tüm kuralları yükle ve göster | UserPromptSubmit |
| `pre-write` | Yazma öncesi hatırlatma | PreToolUse (Write) |
| `pre-bash` | Güvenlik kontrolü | PreToolUse (rm komutları) |
| `pre-deploy` | Deploy kontrol listesi | PreToolUse (firebase deploy) |
| `reminder` | Rastgele kural hatırlatması | PostToolUse (Read) |

### Manuel Çalıştırma

```bash
# Oturum başlangıç mesajı
node .claude/hooks/rules-enforcer.js session-start

# Yazma öncesi kontrol
node .claude/hooks/rules-enforcer.js pre-write

# Deploy öncesi kontrol
node .claude/hooks/rules-enforcer.js pre-deploy

# Rastgele hatırlatma
node .claude/hooks/rules-enforcer.js reminder
```

### Özellikler

- ✅ `.claude/rules/` klasöründeki tüm `.md` dosyalarını okur
- ✅ Kritik kuralları otomatik tespit eder
- ✅ Tehlikeli komutları (rm -rf /, vb.) engeller
- ✅ Renkli terminal çıktısı

---

## 2. orchestrator-sync.js

**Tetikleyici:** `PostToolUse` - ORCHESTRATOR.md değiştiğinde

ORCHESTRATOR.md dosyası değiştiğinde:
1. Dosyayı parse eder
2. Senaryoları, el stillerini, çeşitlilik kurallarını çıkarır
3. `parsed-rules.json` dosyası oluşturur
4. Deploy sırasında Firestore'a yüklenir

### Manuel Çalıştırma

```bash
node .claude/hooks/orchestrator-sync.js
```

---

## 3. validate-config.js

**Tetikleyici:** `PreToolUse` - firebase deploy öncesi

Deploy öncesi kontroller:
1. Kritik dosyaların varlığını doğrular
2. TypeScript syntax kontrolü yapar
3. Gerekli tiplerin tanımlı olduğunu kontrol eder
4. ORCHESTRATOR.md ile kod tutarlılığını kontrol eder

### Manuel Çalıştırma

```bash
node .claude/hooks/validate-config.js
```

---

## Hook Konfigürasyonu (settings.local.json)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/rules-enforcer.js session-start",
            "statusMessage": "📋 Kurallar yükleniyor..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/rules-enforcer.js pre-write",
            "statusMessage": "📝 Yazma kuralları kontrol ediliyor..."
          }
        ]
      },
      {
        "matcher": "Bash(firebase deploy*)",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/rules-enforcer.js pre-deploy",
            "statusMessage": "🚀 Deploy öncesi kontrol..."
          }
        ]
      },
      {
        "matcher": "Bash(rm *)",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/rules-enforcer.js pre-bash",
            "statusMessage": "🔒 Güvenlik kontrolü..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write(.claude/rules/ORCHESTRATOR.md)",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/orchestrator-sync.js",
            "statusMessage": "🔄 ORCHESTRATOR.md sync ediliyor..."
          }
        ]
      },
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/rules-enforcer.js reminder",
            "statusMessage": "💡 Kurallar hatırlatılıyor..."
          }
        ]
      }
    ]
  }
}
```

---

## Hook Tipleri

| Tip | Açıklama | Kullanım |
|-----|----------|----------|
| `UserPromptSubmit` | Her kullanıcı mesajı sonrası | Oturum başlangıcı |
| `PreToolUse` | Tool çalışmadan önce | Validasyon, engelleme |
| `PostToolUse` | Tool başarıyla çalıştıktan sonra | Sync, bildirim |
| `PostToolUseFailure` | Tool hata verdikten sonra | Hata işleme |

---

## Kural Dosyaları

Hook sistemi şu dosyaları okur ve uygular:

| Dosya | İçerik |
|-------|--------|
| `Iron-Rules.md` | Temel güvenlik ve iş akışı kuralları |
| `KURALLAR.md` | Görsel üretim kuralları |
| `ORCHESTRATOR.md` | AI orchestrator senaryoları |
| `BIREYSEL-ISTEKLER.md` | Kullanıcı iletişim tercihleri |

---

## Sorun Giderme

### Hook çalışmıyor

1. settings.local.json syntax'ını kontrol et
2. Script'in çalıştırılabilir olduğundan emin ol
3. `node .claude/hooks/[script].js` ile manuel test et

### Hata: "Command not found"

```bash
# Node.js yolunu kontrol et
which node

# Script'i doğrudan çalıştır
/usr/local/bin/node .claude/hooks/rules-enforcer.js session-start
```

---

## Versiyon Geçmişi

| Tarih | Değişiklik |
|-------|------------|
| 2026-01-20 | rules-enforcer.js eklendi |
| 2026-01-20 | UserPromptSubmit hook'u eklendi |
| 2026-01-20 | Kural hatırlatma sistemi |

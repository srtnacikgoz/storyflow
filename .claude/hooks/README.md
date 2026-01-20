# Claude Code Hooks

Bu klasördeki scriptler Claude Code hooks sistemi ile otomatik çalışır.

## Hooks

### 1. orchestrator-sync.js
**Tetikleyici:** `PostToolUse` (Write tool - ORCHESTRATOR.md değiştiğinde)

ORCHESTRATOR.md dosyası değiştiğinde:
1. Dosyayı parse eder
2. Senaryoları, el stillerini, çeşitlilik kurallarını çıkarır
3. `parsed-rules.json` dosyası oluşturur
4. Deploy sırasında Firestore'a yüklenir

**Manuel çalıştırma:**
```bash
node .claude/hooks/orchestrator-sync.js
```

### 2. validate-config.js
**Tetikleyici:** `PreToolUse` (Bash tool - firebase deploy öncesi)

Deploy öncesi kontroller:
1. Kritik dosyaların varlığını doğrular
2. TypeScript syntax kontrolü yapar
3. Gerekli tiplerin tanımlı olduğunu kontrol eder
4. ORCHESTRATOR.md ile kod tutarlılığını kontrol eder

**Manuel çalıştırma:**
```bash
node .claude/hooks/validate-config.js
```

## Hook Formatı (settings.local.json)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/orchestrator-sync.js",
            "statusMessage": "ORCHESTRATOR.md sync ediliyor..."
          }
        ]
      }
    ]
  }
}
```

## Hook Tipleri

- `PreToolUse` - Tool çalışmadan önce
- `PostToolUse` - Tool başarıyla çalıştıktan sonra
- `PostToolUseFailure` - Tool hata verdikten sonra

## Notlar

- Hooks Windows ve Unix'te çalışır
- `statusMessage` spinner'da gösterilir
- Hata durumunda exit code 1 döner ve işlem durur

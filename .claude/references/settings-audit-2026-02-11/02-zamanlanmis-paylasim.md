# 02 - Zamanlanmis Paylasim Bolumu

## Alanlar

| Alan | Tip | Effektif mi? | Not |
|------|-----|-------------|-----|
| Otomatik Paylasim toggle | toggle | ✅ Evet | schedulerEnabled → backend'de kontrol ediliyor |
| Kontrol Sikligi: "Her 15 dakika" | readonly text | ❌ Hardcoded | Degistirilemez |
| Timezone: "Europe/Istanbul" | readonly text | ❌ Hardcoded | Degistirilemez |
| Varsayilan Onay: "Telegram ile" | readonly text | ❌ Hardcoded | Degistirilemez |

## schedulerEnabled Toggle — Tam Akis

```
Frontend: handleSchedulerToggle(enabled)
  → api.updateSystemSettings({ schedulerEnabled: enabled })
    → configController.ts: updateSystemSettingsConfig
      → Validasyon: typeof === "boolean"
      → configService.ts: updateSystemSettings()
        → Firestore: global/config/settings/system-settings
        → clearConfigCache()

Backend kullanim:
  scheduler.ts:91-93:
    const systemSettings = await getSystemSettings();
    if (systemSettings.schedulerEnabled === false) {
      return result; // Skip all rules
    }
```

**Sonuc:** Toggle gercekten calisiyor. schedulerEnabled=false olunca scheduler hicbir kural icin pipeline baslatmiyor.

## Hardcoded Degerler

### "Her 15 dakika" — 1 yerde hardcoded
- `functions/src/schedulers/orchestratorScheduler.ts:19`
  ```typescript
  schedule: "*/15 * * * *"
  ```
- Cloud Scheduler'in cron schedule'u. Runtime'da degistirilemez, deploy gerekli.

### "Europe/Istanbul" — 3 yerde hardcoded
1. `orchestratorScheduler.ts:23` → `timeZone: "Europe/Istanbul"`
2. `scheduler.ts:75` → `toLocaleString("en-US", { timeZone: "Europe/Istanbul" })`
3. `pipelineController.ts:14` → `const TIMEZONE = "Europe/Istanbul"`

### "Telegram ile" — dekoratif metin
- Backend'de Telegram entegrasyonu var (telegramBotToken, telegramChatId secrets)
- Ama bu bilgi UI'da sadece gosterim amacli, baska onay mekanizmasi secenegi yok

## Sorunlar

1. **3 bilgi satiri sadece dekoratif** — Kullanici bunlari degistiremez
2. **Error retry yok** — loadSchedulerStatus basarisiz olursa tekrar denenmez
3. **Multi-tab sync yok** — Baska tab'ta toggle degisirse bu tab gormez

## Dosya Konumlari

- Frontend Toggle: `admin/src/pages/Settings.tsx:341-353`
- Scheduler: `functions/src/orchestrator/scheduler.ts:91-93`
- Cloud Scheduler: `functions/src/schedulers/orchestratorScheduler.ts`
- Config: `functions/src/services/configService.ts:385-415`

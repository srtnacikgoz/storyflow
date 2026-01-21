# Kategori: Telegram

Telegram bot ve webhook ile ilgili sorunlar.

---

## Aktif Sorunlar

| ID | Başlık | Öncelik | Durum |
|----|--------|---------|-------|
| [ACTIVE-001](../active/ACTIVE-001-dashboard-status.md) | Dashboard Status Takılması | 🔴 KRİTİK | 🟡 Araştırılıyor |

---

## Çözülmüş Sorunlar

| ID | Başlık | Çözüm Tarihi |
|----|--------|--------------|
| [SOLVED-001](../solved/SOLVED-001-telegram-race-condition.md) | Race Condition | 2026-01-20 |

---

## İlgili Pattern'ler

- [Race Condition](../patterns/race-condition.md)

---

## Anahtar Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `functions/src/controllers/telegramController.ts` | Webhook handler |
| `functions/src/services/telegramService.ts` | Telegram API wrapper |

---

## Hızlı Referans

### Callback Actions
- `approve` - Görseli onayla ve Instagram'a paylaş
- `reject` - Görseli reddet
- `regenerate` - Görseli yeniden oluştur

### Callback Data Format
```
action:itemId
approve:job_123456
reject:job_123456
regenerate:job_123456
```

### Güvenlik
- Chat ID doğrulaması yapılıyor
- Sadece yetkili chat'ten gelen callback'ler işleniyor

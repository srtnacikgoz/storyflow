# ACTIVE-001: Orchestrator Dashboard - "Onay Bekliyor" Status Takılması

**Durum:** 🟡 ARAŞTIRILIYOR
**Kategori:** orchestrator, telegram, firestore
**Öncelik:** 🔴 KRİTİK
**Oluşturma:** 2026-01-21

---

## Belirti

Dashboard'da paylaşımlar sürekli "onay bekliyor" (awaiting_approval) olarak görünüyor.
- Telegram'dan onaylansa da status değişmiyor
- Telegram'dan reddedilse de status değişmiyor
- Sayfa yenilense de aynı kalıyor
- Instagram paylaşımı yapılıyor (sistem çalışıyor) ama status güncellenmiyor

---

## Araştırma Süreci

### Adım 1: 2026-01-21 - İlk Analiz

**Kullanıcı geri bildirimi:**
- Onay Telegram'dan yapılıyor
- Instagram'a paylaşım yapılıyor (sistem çalışıyor)
- Sayfa yenilense de status "onay bekliyor" kalıyor

**İlk hipotez:** `slotId` propagasyonu bozuk olabilir.

### Adım 2: 2026-01-21 - Kod İncelemesi

**Veri akışı analiz edildi:**
```
Scheduler → scheduled-slots (slotId üretir)
    ↓
Orchestrator → slotId'yi result'a ekler
    ↓
Queue → media-queue'ya item kaydeder (slotId ile?)
    ↓
Telegram callback → item.slotId ile scheduled-slots günceller
```

**Şüphe:** Adım 3 veya 4'te slotId kaybolmuş olabilir.

### Adım 3: 2026-01-21 - Diagnostic Logging Eklendi

**Eklenen loglar:**

`telegramController.ts:164-169` (approve case):
```typescript
console.log("[Telegram Webhook] 🔍 Checking slotId for scheduled-slots update:", {
    slotId: item.slotId,
    slotIdType: typeof item.slotId,
    slotIdTruthy: !!item.slotId,
    itemKeys: Object.keys(item),
});
```

`telegramController.ts:249-253` (reject case):
```typescript
console.log("[Telegram Webhook] 🔍 Checking slotId for rejection:", {
    slotId: item.slotId,
    slotIdType: typeof item.slotId,
    slotIdTruthy: !!item.slotId,
});
```

`orchestrator.ts:1175-1179` (queue'ya kayıt):
```typescript
console.log(`[Orchestrator] 🔍 Saving to queue - slotId check:`, {
  resultSlotId: result.slotId,
  photoItemSlotId: photoItem.slotId,
  slotIdType: typeof photoItem.slotId,
});
```

**Durum:** Deploy edilmedi, test bekleniyor.

---

## Kök Neden

**Henüz doğrulanmadı.** Hipotez: `item.slotId` undefined/null olduğu için scheduled-slots güncellenmiyor olabilir.

---

## İlgili Dosyalar

| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `functions/src/controllers/orchestratorController.ts` | 938-1007 | approveSlot endpoint |
| `functions/src/controllers/telegramController.ts` | 107-341 | Telegram callback handler |
| `functions/src/orchestrator/orchestrator.ts` | 1170-1190 | Queue'ya kayıt |
| `admin/src/pages/OrchestratorDashboard.tsx` | - | Frontend status gösterimi |

---

## Denenen Yaklaşımlar

### 🟡 Yaklaşım 1: Diagnostic Logging
**Ne yapıldı:** slotId'nin akışını izlemek için log eklendi
**Sonuç:** Henüz test edilmedi, deploy bekleniyor

---

## Sonraki Adımlar

1. [ ] Functions deploy et
2. [ ] Telegram'dan bir görsel onayla
3. [ ] Firebase logs kontrol et: `firebase functions:log --only telegramWebhook`
4. [ ] slotId undefined mı kontrol et
5. [ ] Kök nedene göre fix uygula

---

## İlişkili Sorunlar

- [ACTIVE-002: Görsel Tekrarlama](./ACTIVE-002-gorsel-tekrarlama.md) - production-history hatası bu sorunu da etkiliyor olabilir

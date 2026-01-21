# Kategori: Orchestrator

AI görsel üretim pipeline ile ilgili sorunlar.

---

## Aktif Sorunlar

| ID | Başlık | Öncelik | Durum |
|----|--------|---------|-------|
| [ACTIVE-001](../active/ACTIVE-001-dashboard-status.md) | Dashboard Status Takılması | 🔴 KRİTİK | 🟡 Araştırılıyor |

---

## Çözülmüş Sorunlar

| ID | Başlık | Çözüm Tarihi |
|----|--------|--------------|
| [SOLVED-004](../solved/SOLVED-004-gorsel-tekrarlama.md) | Görsel Tekrarlama | 2026-01-21 |
| [SOLVED-002](../solved/SOLVED-002-interior-ai-skip.md) | Interior AI Skip | 2026-01-21 |

---

## İlgili Pattern'ler

- [Firestore Undefined](../patterns/firestore-undefined.md)

---

## Anahtar Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `functions/src/orchestrator/orchestrator.ts` | Ana pipeline |
| `functions/src/orchestrator/claudeService.ts` | Claude AI entegrasyonu |
| `functions/src/orchestrator/rulesService.ts` | Çeşitlilik kuralları |
| `functions/src/orchestrator/scheduler.ts` | Zamanlama ve history |
| `functions/src/orchestrator/types.ts` | Tip tanımları |

---

## Hızlı Referans

### Pipeline Aşamaları
1. Asset Selection (Claude)
2. Scenario Selection (Claude)
3. Prompt Optimization (Claude)
4. Image Generation (Gemini)
5. Quality Control (Claude)
6. Content Creation (Claude)
7. Telegram Approval

### Rotasyon Kuralları
- `scenarioGap: 3` - Son 3 senaryo bloklanır
- `tableGap: 2` - Son 2 masa bloklanır
- `handStyleGap: 4` - Son 4 el stili bloklanır
- `compositionGap: 5` - Son 5 kompozisyon bloklanır
- `petFrequency: 15` - 15 üretimde 1 köpek

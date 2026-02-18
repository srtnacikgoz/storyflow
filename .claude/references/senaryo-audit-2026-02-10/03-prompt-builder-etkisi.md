# Senaryo Prompt Builder Etkisi Araştırması
**Tarih:** 2026-02-10 | **Agent:** Explore (Sonnet)

---

## 1. description → SCENE DIRECTION

**Akış:**
```
scenario.description (Firestore)
  → orchestrator.ts:1059 → scenarioResponse.data.scenarioDescription
  → orchestrator.ts:1200 → getScenarioPrompt(... scenarioDescription)
  → orchestrator.ts:2156 → buildGeminiPrompt({ scenarioDescription })
  → geminiPromptBuilder.ts:1175-1177 → promptParts.push(params.scenarioDescription)
```

**Prompt'taki Yeri:** geminiPromptBuilder.ts:1170-1177
```typescript
promptParts.push(`SCENE DIRECTION:`);
promptParts.push(`Composition: Rule-of-thirds placement, negative space in top third for typography.`);
if (params.scenarioDescription) {
  promptParts.push(params.scenarioDescription);
}
```

## 2. includesHands → HANDS Bloku

**Prompt'taki Etkisi:** geminiPromptBuilder.ts:1089-1097
```typescript
if (params.includesHands && handPose) {
  promptParts.push(`HANDS:`);
  promptParts.push(`- ${handPose.geminiPrompt}`);
  promptParts.push(`- Skin tone: ${handPose.skinTone}`);
  promptParts.push(`- Nails: ${handPose.nailStyle}`);
  if (composition) {
    promptParts.push(`- ${composition.geminiPrompt}`);
  }
}
```

**Negatif Prompt:** geminiPromptBuilder.ts:1311
- includesHands=true → "hands" kategorisi negatif prompt'a eklenir (deformed fingers vb.)

## 3. suggestedProducts → PROMPT'A GİRMİYOR

Sadece filtreleme/seçim için kullanılıyor. geminiPromptBuilder.ts'de hiç referans yok.

## 4. compositionId → Sadece El Varsa

**KRİTİK:** Kompozisyon prompt'u SADECE `includesHands: true` olduğunda ekleniyor.
El yoksa → sadece sabit "Rule-of-thirds" kalıyor.

```
scenario.compositionId → geminiPromptBuilder.ts:956-958 → Firestore preset
  → geminiPromptBuilder.ts:1094-1096 → HANDS: bloğu içinde
```

## 5. Senaryo Bazlı Negatif Kısıtlama → YOK

Negatif prompt sadece kategori bazlı:
- "always" → her zaman (steam, smoke, stacked plates vb.)
- "hands" → el varsa (deformed fingers vb.)

Senaryo bazlı özel negatif kısıtlama mekanizması YOK.

## 6. Final Prompt Yapısı

```
Using uploaded image as reference for the product.
Professional lifestyle Instagram photo for Sade Patisserie.

ATMOSPHERE: [Mood preset]
LIGHTING: [Lighting preset]

HANDS: (el varsa)
- [handPose.geminiPrompt]
- Skin tone: [skinTone]
- Nails: [nailStyle]
- [composition.geminiPrompt]

SCENE DIRECTION:
Composition: Rule-of-thirds placement...
[scenario.description]

AVOID: [negatif prompt]
```

## Özet Tablo

| Alan | Prompt'taki Yeri | Satır |
|------|------------------|-------|
| description | SCENE DIRECTION bloğu | geminiPromptBuilder.ts:1175-1177 |
| includesHands | HANDS bloğu (true ise) | geminiPromptBuilder.ts:1089-1097 |
| compositionId | HANDS içinde (el varsa) | geminiPromptBuilder.ts:1095 |
| suggestedProducts | PROMPT'A GİRMİYOR | — |
| Senaryo bazlı negatif | YOK | — |

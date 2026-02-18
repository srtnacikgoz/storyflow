# Tema Modülü — Kapsamlı Araştırma Sentezi

> **Tarih:** 2026-02-11
> **Kapsam:** UI + Veri Modeli + Orchestrator + Prompt Builder

## Terminoloji

"Tema" bir **modül/domain** — UI sayfası + veri modeli + orchestrator logic + prompt builder entegrasyonu.

---

## Detaylı Raporlar

| Dosya | Katman |
|-------|--------|
| [01-UI-KATMANI.md](01-UI-KATMANI.md) | Admin panel Themes.tsx, form alanları, UX sorunları |
| [02-VERI-MODELI.md](02-VERI-MODELI.md) | TypeScript interface, Firestore yapısı, dead fields |
| [03-ORCHESTRATOR.md](03-ORCHESTRATOR.md) | Pipeline kullanımı, field kullanım haritası, zombie code |
| [04-PROMPT-BUILDER.md](04-PROMPT-BUILDER.md) | Tema → prompt dönüşümü, kayıplar, efektivite |

---

## Kritik Bulgular Özeti

### Hardcoded Değerler
1. Asset subType keyword'leri (Themes.tsx:175-203): "tables", "masa", "masalar" vb. koda gömülü
2. WEATHER_AUTO_MAP (Themes.tsx:65-71): Hava→ışık+atmosfer eşleşmesi koda gömülü
3. DEFAULT_VARIATION_RULES (Themes.tsx:55-62): Varsayılan gap değerleri koda gömülü
4. DEFAULT_THEMES (types.ts:1121-1164): 5 hardcoded tema, setting alanı yok
5. Zombie fields: mood, styleId, colors → interface'de yok ama orchestrator'da hâlâ okunuyor

### Mimari Sorunlar
1. **scenarios: string[] ama tekil kullanım** — Veri modeli çoklu, UI tekil
2. **Çeşitlilik kuralları yanlış yerde** — Global config ama tema sayfasında
3. **Zombie code** — mood, styleId, colors artık yok ama orchestrator okuyor
4. **description ekleme zayıf** — prompt += yapıştırma, builder akışı dışında

### Efektivite Tablosu

| Alan | Efektivite | Neden |
|------|------------|-------|
| Senaryo | GÜÇLÜ | Pipeline'ın temel yönlendiricisi |
| Hava/Işık/Atmosfer | GÜÇLÜ | Doğrudan prompt'a giriyor |
| preferredTags | GÜÇLÜ (asset) / ZAYIF (prompt) | Asset override iyi, Gemini habersiz |
| Aksesuar | ORTA | Referans görsel, metin yok |
| Köpek İzni | ORTA | Dolaylı senaryo filtresi |
| Tema Adı | ZAYIF | Sadece metadata/log |
| Tema Açıklaması | ZAYIF | prompt sonuna yapıştırma |

# Frontend Analiz — CompositionTemplates.tsx

**Dosya:** `admin/src/pages/CompositionTemplates.tsx` (592 satır)

---

## 1. Sayfa Yapısı (4 Bölüm)

| Bölüm | Amaç | Satırlar |
|-------|------|----------|
| Header/İstatistik | Başlık, açıklama, "Yeni Template" butonu | 266-278 |
| Template Listesi | Grid'de template kartları (3 kolon responsive) | 279-383 |
| Empty State | Template yoksa uyarı ve yönlendirme | 285-297 |
| Modal (CRUD) | Template oluştur/düzenle formu | 391-588 |

---

## 2. Form Alanları

### 2.1 Template Adı
- **Satır:** 420-430
- **Tip:** Text input, `required`
- **Özellik:** Auto-capitalization (`replace(/\b\w/g, ...)`)
- **SORUN:** Türkçe karakterler (ç, ğ, ı, ş, ü) düzgün işlenmeyebilir

### 2.2 Tema
- **Satır:** 440-450, Select dropdown, opsiyonel
- **Kaynak:** API'den dinamik

### 2.3 Senaryo
- **Satır:** 451-461, Select dropdown, opsiyonel
- **SORUN:** Kaydediliyor ama pipeline'da kullanılmıyor

### 2.4 Slot Konfigürasyonu
- **Satır:** 467-545
- **Tip:** 3-state toggle (Kullanma/Seç/Rastgele) + conditional tag selector
- **SORUN:** "manual" state backend'e "random" olarak gönderiliyor (satır 147-155)

---

## 3. Hardcoded Değerler

| Değer | Satır | Durum |
|-------|-------|-------|
| SLOT_STATE_OPTIONS | 13-15 | Constant — OK |
| emptySlotConfig() | 21 | `{ state: "disabled" }` — OK |
| "system" type | 177 | HARDCODED — Problematik |
| SLOT_STATE_OPTIONS.color | 13-15 | Tanımlı ama KULLANILMIYOR |

---

## 4. UX Sorunları

| Ciddiyet | Sorun | Satır |
|----------|-------|-------|
| KRITIK | "Seç" modu yanıltıcı — backend'de "random" olarak çalışıyor | 147-155 |
| YÜKSEK | Zorunlu slot validasyonu yok — sadece görsel uyarı | 498 |
| ORTA | alert() ile hata gösterimi — toast olmalı | 174, 187 |
| DÜŞÜK | Disabled slot'lar template kartında gizleniyor | 237-249 |

---

## 5. State Yönetimi

- Data: templates, slotDefinitions, themes, scenarios, slotTagMap
- UI: loading, saving, showModal, editingId, deleteConfirm
- Form: form.name, form.themeId, form.scenarioId, form.slots
- useCallback ile wrapped fonksiyonlar ✅
- Controlled components → her keystroke re-render (küçük ölçekte OK)

---

## 6. API Entegrasyonu

| Çağrı | Error Handling |
|-------|---------------|
| loadData() — 5 paralel çağrı (satır 53-87) | try-catch + console.error |
| handleSubmit() (satır 141-177) | try-catch + alert() |
| handleDelete() (satır 182-189) | try-catch + alert() |

---

## 7. Kod Kalitesi

- Modal close logic 2 yerde tekrar (DRY ihlali, satır 407-411 ve 569-573)
- Nested ternary operatörler okunamaz (satır 510-518)
- 592 satır tek dosya — bölünebilir (SlotConfigurator, TemplateForm)
- ARIA attributes eksik, modal focus trap yok
- Responsive: `md:grid-cols-2 lg:grid-cols-3` ✅

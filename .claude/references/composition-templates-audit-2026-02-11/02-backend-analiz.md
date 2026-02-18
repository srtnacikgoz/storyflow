# Backend Analiz — Composition Controller & Config Service

**Dosyalar:**
- `functions/src/controllers/orchestrator/compositionController.ts`
- `functions/src/services/configService.ts:1267-1437`
- `functions/src/controllers/orchestrator/index.ts`

---

## 1. API Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| getSlotDefinitionsEndpoint | GET | Slot tanımlarını getir |
| updateSlotDefinitionsEndpoint | PUT/POST | Slot tanımlarını güncelle |
| listCompositionTemplates | GET | Template listesi (type + tenantId) |
| getCompositionTemplateById | GET | Tekil template getir |
| createCompositionTemplateEndpoint | POST | Yeni template oluştur (201) |
| updateCompositionTemplateEndpoint | PUT/POST | Template güncelle |
| deleteCompositionTemplateEndpoint | DELETE/POST | Template sil |

---

## 2. CRUD Durumu

- ✅ CREATE: Tam — auto ID, timestamp, undefined temizleme (configService.ts:1337-1374)
- ✅ READ: Tam — system + tenant ayrımı, orderBy updatedAt desc (configService.ts:1269-1293)
- ✅ UPDATE: Tam — partial updates, updatedAt otomatik (configService.ts:1376-1412)
- ✅ DELETE: Tam — DELETE + POST method desteği (configService.ts:1414-1437)

---

## 3. Validasyon Analizi

### Yapılan
- HTTP method kontrolü ✅
- name boş kontrolü ✅
- type alanı kontrolü ✅
- tenantId conditional check ✅
- id/type required (update/delete) ✅

### EKSİK
- ❌ SlotConfig yapısı validasyonu yok
- ❌ SlotState enum validasyonu yok
- ❌ filterTags array türü kontrolü yok
- ❌ Zorunlu slot kontrolü yok
- ❌ slots boş object kontrolü yok

---

## 4. Error Handling

- Merkezi errorResponse() fonksiyonu (shared.ts:72-86) ✅
- HTTP status code'lar doğru (200, 201, 400, 404, 405, 500) ✅
- **SORUN:** configService'teki throw'lar 400 yerine 500 döndürüyor
- **SORUN:** Firestore hata detayı yetersiz

---

## 5. Firestore Yapısı

```
global/compositionTemplates/items/{templateId}
  ├─ name, description?, themeId?, scenarioId?
  ├─ slots: Record<string, SlotConfig>
  ├─ type: "system"
  └─ createdAt, updatedAt

tenants/{tenantId}/presets/{presetId}
  └─ (aynı yapı, type: "tenant")

global/config/settings/slot-definitions
  └─ slots: SlotDefinition[], updatedAt, updatedBy?
```

---

## 6. Güvenlik

| Kontrol | Durum |
|---------|-------|
| CORS | ✅ getCors() kullanılıyor |
| Auth Token Check | ❌ YOK |
| Tenant İzolasyonu | ⚠️ tenantId client'tan alınıyor — manipüle edilebilir |
| Admin Check | ❌ YOK — herkes system template CRUD yapabilir |
| Rate Limiting | ❌ Sadece Firebase default |
| Input Sanitization | ❌ String'ler sanitize edilmiyor |

---

## 7. Route Export Hiyerarşisi

```
index.ts → orchestratorController.ts → orchestrator/index.ts → compositionController.ts
```

Export tanımı: `controllers/orchestrator/index.ts:153-162`

---

## 8. Firestore Optimizasyon Riskleri

- orderBy("updatedAt", "desc") composite index gerekebilir
- Batch operasyonları yok (çoklu silme ayrı ayrı)
- Transaction yok (partial update riski)
- Cache TTL: 5 dakika (slot definitions için)

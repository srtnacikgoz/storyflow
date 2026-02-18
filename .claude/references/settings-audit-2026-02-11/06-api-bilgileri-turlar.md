# 06 - API Bilgileri + Tanitim Turlari Bolumleri

---

## A. API Bilgileri

### Alanlar

| Alan | Deger | Hardcoded mi? |
|------|-------|--------------|
| Region | europe-west1 | ❌ Evet — 5+ yerde |
| Project ID | instagram-automation-ad77b | ❌ Evet — 5+ yerde |

### Hardcoded Konumlari

1. `admin/src/services/api.ts:65` — API_BASE_URL fallback
2. `admin/vite.config.ts` — proxy target
3. `admin/src/config/firebase.ts` — firebaseConfig
4. `admin/.env.example` — VITE_API_URL
5. `.firebaserc` — project default
6. `functions/src/controllers/instagramController.ts` — REGION const

### Guvenlik Degerlendirmesi
- Project ID public bilgidir (frontend'de zaten gorulur) — dusuk risk
- Region bilgisi hassas degil
- Ama SaaS-dostu degil — multi-tenant'ta her tenant icin farkli olabilir

---

## B. Tanitim Turlari

### Tanimli Turlar (4 adet)

| Tour ID | Sayfa | Tour Steps | Render Ediliyor mu? |
|---------|-------|-----------|-------------------|
| assets-page | Assets.tsx | 8 adim | ✅ Evet |
| scenarios-page | Scenarios.tsx | 3 adim | ✅ Evet |
| themes-page | Themes.tsx | Var | ✅ Evet |
| timeslots-page | TimeSlots.tsx | Var | ✅ Evet |

### Mekanizma

```typescript
// PageTour.tsx
const TOUR_KEY_PREFIX = "tour_completed_";

hasSeenTour(tourId):  localStorage.getItem(prefix + tourId) === "true"
markTourComplete(id): localStorage.setItem(prefix + id, "true")
resetTour(id):        localStorage.removeItem(prefix + id)
```

### Calisiyor mu?
- ✅ Tum 4 sayfada `<PageTour>` componenti render ediliyor
- ✅ Sifirla ve "Tumunu Sifirla" butonlari calisiyor
- ✅ Tour adim hedefleri `data-tour` attribute'lari ile eslesiyor

### Sorunlar

1. **Multi-device sync yok** — localStorage kullanildigi icin baska cihazda tour tekrar baslar
2. **Yeni sayfalar icin tour yok** — Orchestrator Dashboard, Composition Templates gibi yeni sayfalarda tour tanimlanmamis
3. **Tour ilerlemesi kaybolabilir** — Tarayici cache temizlenirse turlar sifirlenir

## Dosya Konumlari

- Frontend: `admin/src/pages/Settings.tsx:951-1017`
- PageTour Component: `admin/src/components/PageTour.tsx`
- Tour Steps: Her sayfanin kendi dosyasinda (Assets.tsx, Scenarios.tsx, Themes.tsx, TimeSlots.tsx)

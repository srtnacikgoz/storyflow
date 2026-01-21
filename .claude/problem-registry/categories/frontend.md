# Kategori: Frontend (Admin Panel)

Admin panel (React + Vite) ile ilgili sorunlar.

---

## Aktif Sorunlar

| ID | Başlık | Öncelik | Durum |
|----|--------|---------|-------|
| [ACTIVE-001](../active/ACTIVE-001-dashboard-status.md) | Dashboard Status Takılması | 🔴 KRİTİK | 🟡 Araştırılıyor |

---

## Çözülmüş Sorunlar

| ID | Başlık | Çözüm Tarihi |
|----|--------|--------------|
| [SOLVED-003](../solved/SOLVED-003-assets-crud.md) | Assets CRUD | 2026-01-21 |

---

## İlgili Pattern'ler

- [TypeScript Tip Hataları](../patterns/typescript-type-errors.md)

---

## Anahtar Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `admin/src/pages/OrchestratorDashboard.tsx` | Dashboard ana sayfa |
| `admin/src/pages/Assets.tsx` | Asset yönetimi |
| `admin/src/services/api.ts` | API çağrıları |

---

## Hızlı Referans

### Tech Stack
- React 18
- Vite
- TypeScript
- Tailwind CSS

### Build Komutları
```bash
cd admin
npm run build    # Production build
npm run dev      # Development server
```

### Common Issues
1. **TypeScript hatası**: Optional property'lere fallback ekle
2. **Build hatası**: Tüm import'ları kontrol et
3. **State güncellenmeme**: `key` prop ile force re-render

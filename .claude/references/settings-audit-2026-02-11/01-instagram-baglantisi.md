# 01 - Instagram Baglantisi Bolumu

## Alanlar

| Alan | Tip | Aciklama |
|------|-----|----------|
| Token Status | readonly | Instagram API'den dogrulama |
| Account Name | readonly | Bagli hesap adi |
| "Kontrol Et" butonu | action | Manuel token dogrulama |

## Backend Akisi

```
Frontend: api.validateInstagramToken()
  → Backend: instagramController.ts → validateInstagramToken
    → instagram.ts → validateToken()
      → Instagram Graph API: GET /{accountId}?fields=id,name
```

## Bulgular

### Calisan
- Token dogrulama: Backend'de `validateInstagramToken` Cloud Function var
- Sayfa acilisinda otomatik kontrol ediliyor (useEffect)
- Hata durumunda kirmizi mesaj gosteriyor

### Sorunlar

1. **Otomatik token expire uyarisi YOK**
   - Polling/interval mekanizmasi yok
   - Kullanici "Kontrol Et" butonuna basana kadar expire fark etmez
   - Pipeline'da token expire olursa publishing asamasinda fail olur

2. **Token yenileme sadece CLI**
   - `firebase functions:config:set` veya Secret Manager
   - Admin UI'dan token yenileme mekanizmasi yok
   - Environment.ts'de oncelik sirasi: process.env > functions.config()

3. **Token expire handling eksik**
   - Instagram error code 190 = expired token (backend'de handle ediliyor)
   - Ama kullaniciya proaktif bildirim gonderilmiyor

## Dosya Konumlari

- Frontend: `admin/src/pages/Settings.tsx:392-427`
- API: `admin/src/services/api.ts:302-306`
- Backend Controller: `functions/src/controllers/instagramController.ts:74-95`
- Instagram Service: `functions/src/services/instagram.ts:269-288`
- Config: `functions/src/config/environment.ts`

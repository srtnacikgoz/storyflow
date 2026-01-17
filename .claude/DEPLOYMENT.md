# Firebase Deployment Rehberi

Bu dosya, Firebase Cloud Functions deployment sürecinde karşılaşılan sorunları ve çözümlerini belgeler.

---

## Hızlı Başvuru

```bash
# Standart deploy (lint + build + deploy)
cd functions && npm run deploy

# Hızlı deploy (sadece build + deploy, lint atlanır)
cd functions && npm run deploy:quick
```

---

## Bilinen Sorunlar ve Çözümleri

### 1. JavaScript Heap Out of Memory

**Hata:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Sebep:** Firebase CLI, fonksiyonları analiz ederken varsayılan Node.js memory limitini (512MB-2GB) aşıyor.

**Çözüm:** `NODE_OPTIONS` ile memory limiti artır:
```bash
NODE_OPTIONS='--max-old-space-size=8192' firebase deploy --only functions
```

**Kalıcı Çözüm:** `package.json` scripts içinde zaten ayarlandı.

---

### 2. Functions Discovery Timeout

**Hata:**
```
Error: User code failed to load. Cannot determine backend specification. Timeout after 10000.
```

**Sebep:** Firebase CLI varsayılan olarak 10 saniye içinde fonksiyonları keşfetmeye çalışıyor. Büyük projelerde bu yetmiyor.

**Çözüm:** `FUNCTIONS_DISCOVERY_TIMEOUT` environment variable'ı ile timeout süresini artır:
```bash
FUNCTIONS_DISCOVERY_TIMEOUT=120000 firebase deploy --only functions
```

**Değerler:**
- `10000` (10s) - Varsayılan, küçük projeler için
- `60000` (60s) - Orta projeler
- `120000` (120s) - Büyük projeler (bu proje için gerekli)

**Kalıcı Çözüm:** `package.json` scripts içinde zaten ayarlandı.

---

### 3. functions.config() Deprecation Uyarısı

**Uyarı:**
```
DEPRECATION NOTICE: Action required before March 2026
The functions.config() API and the Cloud Runtime Config service are deprecated.
```

**Sebep:** Firebase, eski config sistemini kaldırıyor.

**Çözüm (Mart 2026'dan önce yapılmalı):**
1. Migration komutu çalıştır:
   ```bash
   firebase functions:config:export
   ```
2. `functions.config()` çağrılarını `params` veya `defineSecret` ile değiştir

**Durum:** TODO - Migration henüz yapılmadı.

---

## Deploy Scriptleri (package.json)

| Script | Açıklama |
|--------|----------|
| `npm run deploy` | Lint + Build + Deploy (tam süreç) |
| `npm run deploy:quick` | Build + Deploy (lint atlanır, hızlı) |
| `npm run build` | Sadece TypeScript compile |
| `npm run logs` | Cloud Functions loglarını göster |

---

## Ortam Değişkenleri

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `NODE_OPTIONS` | `--max-old-space-size=8192` | Node.js için 8GB memory |
| `FUNCTIONS_DISCOVERY_TIMEOUT` | `120000` | 120 saniye discovery timeout |

---

## Firebase CLI Versiyonu

```bash
firebase --version  # Mevcut: 15.3.1
```

Güncel tutmak için:
```bash
npm install -g firebase-tools@latest
```

---

## Sorun Giderme Adımları

1. **Cache temizle:**
   ```bash
   rm -rf ~/.cache/firebase/deploy
   rm -rf .firebase
   ```

2. **node_modules yenile:**
   ```bash
   cd functions && rm -rf node_modules && npm install
   ```

3. **Build temizle:**
   ```bash
   cd functions && rm -rf lib && npm run build
   ```

4. **Debug modunda deploy:**
   ```bash
   firebase deploy --only functions --debug 2>&1 | tee deploy.log
   ```

---

## Proje Özellikleri

- **Region:** europe-west1
- **Runtime:** Node.js 20
- **Toplam Fonksiyon:** 33
- **Memory Kullanımı:** 512MB - 1GB (fonksiyona göre)

---

**Son Güncelleme:** 2026-01-17
**Çözülen Sorun:** Heap out of memory + Discovery timeout

# Veritabanı Şeması (Firestore)

Bu doküman, Firestore veritabanında kullanılan koleksiyon ve doküman yapılarını açıklar.

## Koleksiyonlar

### 1. `media-queue`
Paylaşılacak veya işlenecek görsellerin bulunduğu kuyruk.

**Document ID:** `photo-{timestamp}` veya UUID

**Alanlar:**
- `id` (string): Benzersiz fotoğraf ID'si.
- `filename` (string): Dosya adı.
- `originalUrl` (string): Orijinal görselin URL'i (Storage veya harici).
- `caption` (string): Paylaşım metni.
- `uploadedAt` (timestamp): Yüklenme zamanı.
- `processed` (boolean): İşlenip işlenmediği. `true` ise görsel AI ile iyileştirilmiş veya paylaşılmıştır.
- `status` (string): Durum: `pending`, `processing`, `completed`, `failed`.
- `scheduledTime` (timestamp): Planlanan paylaşım zamanı.
- `aiAnalysis` (map, opsiyonel): Gemini Vision analiz sonuçları.
  - `description`: Görsel açıklaması.
  - `tags`: Etiketler.

### 2. `settings`
Uygulama genel ayarları.

**Document ID:** `global`

**Alanlar:**
- `dailyPostTime` (string): Günlük paylaşım saati (örn: "09:00").
- `autoProcess` (boolean): Otomatik işlemeyi aç/kapa.
- `aiProvider` (string): Kullanılan AI sağlayıcı (örn: "gemini").

## İndeksler
Firestore kuralları ve indeks gereksinimleri `firestore.indexes.json` dosyasında tanımlanmıştır.

## Güvenlik Kuralları
Sadece yetkili servis hesaplarının (Cloud Functions) yazma yetkisi vardır. Okuma yetkisi yönetici paneli kullanıcıları ile sınırlıdır.

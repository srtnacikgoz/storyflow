# API Kurulum Rehberi

Bu rehber, projenin çalışması için gerekli olan Instagram Graph API ve Google Gemini API kurulumlarını detaylandırır.

## 1. Google Gemini API Kurulumu

### 1.1. API Key Alma
1. [Google AI Studio](https://aistudio.google.com) adresine gidin.
2. Google hesabınızla giriş yapın.
3. Sol üstteki "Get API key" butonuna tıklayın.
4. "Create API key in new project" seçeneğini seçin.
5. Oluşturulan anahtarı kopyalayın.

### 1.2. Firebase Konfigürasyonu
Terminalden aşağıdaki komutu çalıştırarak API anahtarınızı Firebase'e ekleyin:

```bash
firebase functions:config:set gemini.api_key="SİZİN_API_ANAHTARINIZ"
```

## 2. Instagram Graph API Kurulumu

### 2.1. Ön Hazırlık
- Bir Instagram İşletme Hesabı (Business Account)
- Bu hesaba bağlı bir Facebook Sayfası

### 2.2. Facebook Uygulaması Oluşturma
1. [Meta for Developers](https://developers.facebook.com/apps) adresine gidin.
2. "Create App" butonuna tıklayın.
3. Uygulama türü olarak "Business" seçin.
4. Uygulama ismini girin (örn: "StoryFlow Automation") ve oluşturun.

### 2.3. Ürün Ekleme
1. Uygulama panelinden "Instagram Graph API" ürününü bulun ve "Set Up" butonuna tıklayın.

### 2.4. İzinler ve Access Token
1. Sol menüden "Tools" > "Graph API Explorer" aracını açın.
2. Uygulamanızı seçin.
3. Şu izinleri ekleyin:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
4. "Generate Access Token" butonuna tıklayın.
5. Bu token "Short-Lived" (kısa ömürlü) bir tokendır. Bunu 60 günlük "Long-Lived" token ile değiştirmek için `curl` komutu veya "Access Token Debugger" kullanın.

### 2.5. Firebase Konfigürasyonu
Elde ettiğiniz Instagram Account ID ve Access Token'ı Firebase'e ekleyin:

```bash
firebase functions:config:set instagram.account_id="HESAP_ID" instagram.access_token="UZUN_OMURLU_TOKEN"
```

## 3. Kurulum Doğrulama
Ayarların doğru yapıldığını kontrol etmek için terminalden şu komutu çalıştırın:

```bash
firebase functions:config:get
```

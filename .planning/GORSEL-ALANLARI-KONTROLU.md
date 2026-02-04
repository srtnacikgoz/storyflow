# Görsel Üretimde Etkili Alanlar - Kontrol Listesi

> **Amaç:** Tüm görsel üretim alanlarını sistematik incelemek, sorunları tespit etmek
> **Oluşturulma:** 2026-02-04
> **Güncelleyen:** Claude + Sertan

---

## Kontrol Durumları

| Sembol | Anlam |
|--------|-------|
| ✅ | Çalışıyor, sorun yok |
| ⚠️ | Kısmen çalışıyor veya dikkat gerektiriyor |
| ❌ | Çalışmıyor / Prompt'a gitmiyor |
| 🔧 | Düzeltme gerekiyor |
| ⏸️ | Kasıtlı olarak devre dışı |
| 🔍 | Henüz incelenmedi |

---

## 1. SENARYO (Scenario) Alanları

### 1.1 scenarioDescription (Senaryo Açıklaması)
| Durum | ⏸️ DEVRE DIŞI |
|-------|---------------|
| **UI'da var mı?** | ✅ Evet - Admin panelinde gösteriliyor |
| **Firestore'a kaydediliyor mu?** | ✅ Evet |
| **Prompt'a gidiyor mu?** | ❌ HAYIR - 2026-02-03'te devre dışı bırakıldı |
| **Neden devre dışı?** | Metin tarifleri referans görselleri override ediyordu |
| **Şablon gerekli mi?** | 🔧 EVET - `{{product.name}}` gibi dinamik değişkenler |
| **Aksiyon** | Şablon sistemi ile yeniden aktif edilecek |

### 1.2 compositionId (Fotoğraf Kompozisyon Türü)
| Durum | ❌ HİÇ ÇALIŞMIYOR |
|-------|-------------------|
| **UI'da var mı?** | ✅ Evet - "Kompozisyon Türü" dropdown'u |
| **Firestore'a kaydediliyor mu?** | ✅ Evet |
| **Prompt'a gidiyor mu?** | ❌ HAYIR - Sadece el varsa ve `compositionEntry` olarak |
| **Sorun** | UI'daki `compositionId` ile kod'daki `compositionEntry` karışmış |
| **Şablon gerekli mi?** | Hayır |
| **Aksiyon** | 🔍 İncelenmeli - Ya düzeltilmeli ya da UI'dan kaldırılmalı |

### 1.3 compositionEntry (El Giriş Noktası)
| Durum | ⚠️ KOŞULLU ÇALIŞIYOR |
|-------|----------------------|
| **UI'da var mı?** | ✅ Evet - "El Nereden Girsin?" dropdown'u |
| **Firestore'a kaydediliyor mu?** | ✅ Evet |
| **Prompt'a gidiyor mu?** | ⚠️ SADECE `includesHands=true` VE `handPose` varsa |
| **Sorun** | El olmayan senaryolarda tamamen yok sayılıyor |
| **Şablon gerekli mi?** | Hayır |
| **Aksiyon** | Tasarım gereği böyle, sorun yok |

### 1.4 handPose (El Pozu)
| Durum | ⚠️ KOŞULLU ÇALIŞIYOR |
|-------|----------------------|
| **UI'da var mı?** | ✅ Evet |
| **Firestore'a kaydediliyor mu?** | ✅ Evet |
| **Prompt'a gidiyor mu?** | ⚠️ SADECE `includesHands=true` ise |
| **Şablon gerekli mi?** | Hayır - Preset'ten geliyor |
| **Aksiyon** | Tasarım gereği böyle, sorun yok |

### 1.5 includesHands (El İçeriyor mu?)
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **UI'da var mı?** | ✅ Evet - Checkbox |
| **Firestore'a kaydediliyor mu?** | ✅ Evet |
| **Prompt'a etkisi** | ✅ Evet - handPose ve compositionEntry'yi tetikliyor |
| **Şablon gerekli mi?** | Hayır |
| **Aksiyon** | Sorun yok |

---

## 2. MOOD (Ruh Hali) Alanları

### 2.1 moodId (Mood Seçimi)
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **UI'da var mı?** | ✅ Evet |
| **Firestore'a kaydediliyor mu?** | ✅ Evet |
| **Prompt'a gidiyor mu?** | ✅ EVET - `ATMOSPHERE:` bloğu olarak |
| **Çıktı** | `geminiAtmosphere`, `colorPalette` |
| **Şablon gerekli mi?** | Hayır - Preset'ten geliyor |
| **Aksiyon** | Sorun yok |

### 2.2 Mood → Lighting Fallback
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **Nasıl çalışıyor?** | Eğer lightingPreset seçilmemişse, mood.lighting kullanılıyor |
| **Prompt'a gidiyor mu?** | ✅ Evet |
| **Aksiyon** | Sorun yok |

### 2.3 Mood → Temperature (Renk Sıcaklığı)
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **Nasıl çalışıyor?** | Mood'daki Kelvin değeri (3000K, 5000K vb.) |
| **Ürün uyumu kontrolü** | ✅ Yapılıyor - `checkAtmosphericConflict()` |
| **Prompt'a gidiyor mu?** | ✅ Uyarı olarak (COLOR GRADING bloğu) |
| **Aksiyon** | Sorun yok |

---

## 3. TEMA (Theme) Alanları

### 3.1 Theme → Mood
| Durum | 🔍 İNCELENMEDİ |
|-------|---------------|
| **Nasıl çalışıyor?** | Tema'dan mood ID çıkarılıyor |
| **Prompt'a gidiyor mu?** | 🔍 Kontrol edilmeli |
| **Aksiyon** | Detaylı inceleme gerekli |

### 3.2 Theme → Lighting
| Durum | 🔍 İNCELENMEDİ |
|-------|---------------|
| **Nasıl çalışıyor?** | `extractGeminiParamsFromTheme()` ile çıkarılıyor |
| **Prompt'a gidiyor mu?** | 🔍 Kontrol edilmeli |
| **Aksiyon** | Detaylı inceleme gerekli |

---

## 4. IŞIK (Lighting) Alanları

### 4.1 lightingPresetId
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **Kaynak** | Tema veya Mood fallback |
| **Prompt'a gidiyor mu?** | ✅ EVET - `LIGHTING:` bloğu |
| **Çıktı** | `geminiPrompt`, `temperature` |
| **Şablon gerekli mi?** | Hayır - Preset'ten geliyor |
| **Aksiyon** | Sorun yok |

---

## 5. DOKU (Texture) Alanları

### 5.1 textureProfileId / productType
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **Nasıl çalışıyor?** | Ürün tipine göre doku profili seçiliyor |
| **Prompt'a gidiyor mu?** | ✅ EVET - `PRODUCT TEXTURE:` bloğu |
| **Çıktı** | `geminiPrompt`, `focusAreas` |
| **Şablon gerekli mi?** | Hayır - Preset'ten geliyor |
| **Aksiyon** | Sorun yok |

### 5.2 Texture → Lighting Eşleştirmesi
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **Nasıl çalışıyor?** | `TEXTURE_LIGHTING_MAP` ile doku-ışık eşleştirmesi |
| **Örnek** | Parlak çikolata → Side lighting |
| **Aksiyon** | Sorun yok |

---

## 6. ASSET (Görsel Varlık) Alanları

### 6.1 assetTags
| Durum | ✅ ÇALIŞIYOR |
|-------|-------------|
| **Prompt'a gidiyor mu?** | ✅ EVET - `ASSET CONSTRAINTS:` bloğu |
| **İçerik** | plate, cup, table, accessory, napkin, product |
| **Aksiyon** | Sorun yok |

---

## 7. İŞLETME BAĞLAMI (Business Context)

### 7.1 businessContext / promptContext
| Durum | ⏸️ DEVRE DIŞI |
|-------|---------------|
| **Neden devre dışı?** | Metin ortam tarifleri referans görselleri override ediyordu |
| **Tarih** | 2026-02-03 |
| **Aksiyon** | scenarioDescription ile birlikte değerlendirilecek |

---

## 8. KULLANICI KURALLARI (User Rules)

### 8.1 userRules (AI Rules)
| Durum | 🔍 İNCELENMEDİ |
|-------|---------------|
| **Prompt'a gidiyor mu?** | 🔍 Kontrol edilmeli |
| **Aksiyon** | Detaylı inceleme gerekli |

---

## Özet Tablo

| Alan | Prompt'a Gidiyor | Şablon Gerekli | Aksiyon |
|------|------------------|----------------|---------|
| scenarioDescription | ⏸️ Devre dışı | 🔧 EVET | **AKTİF ÇALIŞILACAK** |
| compositionId | ❌ Hayır | Hayır | İncelenmeli |
| compositionEntry | ⚠️ Koşullu | Hayır | OK |
| handPose | ⚠️ Koşullu | Hayır | OK |
| includesHands | ✅ Evet | Hayır | OK |
| moodId | ✅ Evet | Hayır | OK |
| lightingPresetId | ✅ Evet | Hayır | OK |
| textureProfile | ✅ Evet | Hayır | OK |
| assetTags | ✅ Evet | Hayır | OK |
| businessContext | ⏸️ Devre dışı | ? | Değerlendirilecek |
| theme.mood | 🔍 ? | ? | İncelenmeli |
| theme.lighting | 🔍 ? | ? | İncelenmeli |
| userRules | 🔍 ? | ? | İncelenmeli |

---

## Sıradaki Adımlar

### Şimdi (Aktif)
1. **scenarioDescription şablon sistemi** - Dinamik değişkenlerle yeniden aktif etme

### Sonra (Kullanıcı onayı ile)
2. Theme alanlarının detaylı incelenmesi
3. compositionId karmaşasının çözülmesi
4. userRules'ın prompt'a nasıl gittiğinin kontrolü
5. businessContext'in geleceği

---

## Değişiklik Geçmişi

| Tarih | Değişiklik |
|-------|------------|
| 2026-02-04 | İlk versiyon oluşturuldu |

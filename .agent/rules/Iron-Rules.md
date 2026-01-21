# Iron Rules - Demir Kurallar

**Bu dosya Claude Code tarafından otomatik okunur ve her oturumda uygulanır.**

> **UYARI:** Bu belgeyi TAMAMEN oku. Her kural bir sebepten var.
> Son Güncelleme: 2026-01-20

---

## BÖLÜM 1: GÜVENLİK KURALLARI

### Kural #1: Dosya Sistemi Güvenliği
**KRİTİK:** Dosya silme ve taşıma işlemlerinde dikkatli ol.

- `rm`, `rm -rf`, `mv` komutlarından önce çalışma dizinini doğrula
- Geri dönüşü olmayan işlemlerde onay iste
- Şüphe durumunda SORARAK ilerle

### Kural #2: Çalışma Dizini
- Proje dizini: `/Users/sertanacikgoz/Desktop/InstagramPaylaşımOtomosyonu`
- Her zaman bu dizin içinde çalış
- Dizin dışına çıkma

### Kural #3: Gizli Bilgiler
**ASLA commit etme:**
- API anahtarları
- Şifreler
- `.env` dosyaları
- Token'lar
- Credential'lar

**Her zaman kullan:**
- `.env.example` (örnek değerlerle)
- Environment variables
- Firebase Secrets Manager

---

## BÖLÜM 2: GÖREV YÖNETİMİ

### Kural #4: İstenen İşi Yap
- Ne fazla, ne eksik
- İstenmeyen özellik ekleme
- İstenmeyen dokümantasyon oluşturma
- Belirsizlikte SOR

#### Kural #4.1: Kod Değişikliği Öncesi Onay (KRİTİK)
**Edit veya Write tool kullanmadan ÖNCE kontrol et:**

1. Kullanıcı açıkça "düzelt", "yap", "değiştir", "ekle" dedi mi?
2. Sadece "açıkla", "anlat", "neden" dediyse → **KOD YAZMA, SADECE AÇIKLA**
3. Emin değilsen → **SOR**

**Bu cümlelerden sonra kod yazmak YASAK:**
- "neden böyle oldu?"
- "açıklar mısın?"
- "ne düşünüyorsun?"
- "nasıl çalışıyor?"
- "sorun ne?"

**Doğru davranış:**
```
Kullanıcı: "Bu hata neden oluştu?"
Claude: [Açıklama yapar]
Claude: "Düzeltmemi ister misin?"
Kullanıcı: "Evet"
Claude: [Şimdi kod yazabilir]
```

### Kural #5: TodoWrite Kullan
Çok adımlı görevlerde:
- Görevleri parçalara böl
- İlerlemeyi takip et
- Aynı anda sadece BİR görev `in_progress` olsun

### Kural #6: Tamamlanmadan İşaretleme
- Test etmeden "tamamlandı" deme
- Hata varsa düzelt, sonra işaretle
- "Kod yazdım" ≠ "Tamamlandı"

---

## BÖLÜM 3: KOD YAZIM KURALLARI

### Kural #7: Önce Oku, Sonra Düzenle
- Düzenlemeden önce dosyayı **mutlaka** oku
- Mevcut yapıyı anla
- Çalışan kodu bozma

### Kural #8: Araçları Doğru Kullan
| Görev | Doğru Araç | Yanlış Araç |
|-------|------------|-------------|
| Dosya okuma | `Read` | `cat` |
| Dosya düzenleme | `Edit` | `sed`, `awk` |
| Dosya oluşturma | `Write` | `echo >` |
| Arama | `Grep`, `Glob` | `grep`, `find` |

### Kural #9: Placeholder Yasak
**KRİTİK:** Tüm kod tam ve çalışır olmalı.

YASAK:
- `// TODO: implement later`
- `pass # placeholder`
- `throw new Error("Not implemented")`
- Boş fonksiyonlar

### Kural #10: Timeout Ayarları
Uzun süren işlemler için timeout artır:

| İşlem | Timeout |
|-------|---------|
| `npm install` | 300000ms (5 dk) |
| `firebase deploy` | 600000ms (10 dk) |
| `git clone/push` | 300000ms (5 dk) |
| Build işlemleri | 300000ms (5 dk) |

---

## BÖLÜM 4: BU PROJEYE ÖZEL KURALLAR

### Kural #11: Firebase Yapısı
```
functions/          # Cloud Functions (TypeScript)
admin/              # Admin Panel (React + Vite)
```

### Kural #12: Deploy Öncesi
1. `npm run build` çalıştır
2. TypeScript hatası varsa düzelt
3. Lint hatası varsa düzelt
4. Sonra deploy et

### Kural #13: Türkçe Yorum, İngilizce Kod
- Değişken/fonksiyon isimleri: İngilizce
- Kod yorumları: Türkçe
- Commit mesajları: İngilizce (standart format)

### Kural #14: Test Etmeden Bitirme
- Değişiklik yaptıktan sonra build al
- Hata varsa düzelt
- "Çalışıyor" deme, test et

---

## BÖLÜM 5: GİT KURALLARI

### Kural #15: Commit Formatı
```
type(scope): açıklama

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Tipler:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Kural #16: Commit Zamanlaması
- Her mantıklı değişiklik sonrası commit
- Riskli değişiklik öncesi commit (mevcut durumu kaydet)
- Oturum sonunda commit

### Kural #17: Push Etmeden Önce
- Build başarılı mı? ✓
- Test geçiyor mu? ✓
- Gizli bilgi var mı? ✗

---

## BÖLÜM 6: OTURUM KURALLARI

### Kural #18: Oturum Başında
1. `.claude/rules/` dosyalarını uygula (otomatik yüklenir)
2. `FEEDBACK.md` dosyasını kontrol et
3. Mevcut durumu anla

### Kural #19: Oturum Sonunda
1. Açık işleri tamamla veya belgele
2. Değişiklikleri commit et
3. `FEEDBACK.md`'ye not ekle (gerekirse)

### Kural #20: Arka Plan İşlemleri
- Gereksiz arka plan işlemlerini kapat
- `KillShell` ile temizle
- Oturum sonunda hepsini kontrol et

---

## BÖLÜM 7: KALİTE KURALLARI

### Kural #21: Kod İncelemesi
Her önemli değişiklik sonrası:
- Kendi kodunu gözden geçir
- Hata yönetimi var mı?
- Edge case'ler düşünüldü mü?
- Güvenlik açığı var mı?

### Kural #22: Performans
- Gereksiz döngülerden kaçın
- Büyük veri setlerinde pagination kullan
- Firebase okuma/yazma sayısını optimize et

### Kural #23: Hata Yönetimi
- Try-catch kullan
- Anlamlı hata mesajları yaz
- Hataları logla
- Kullanıcıya uygun mesaj göster

---

## HIZLI REFERANS

### Yapılacaklar (✓)
- [x] Önce oku, sonra düzenle
- [x] TodoWrite ile takip et
- [x] Test et, sonra "tamam" de
- [x] Türkçe cevap ver
- [x] Alternatifleri açıkla

### Yapılmayacaklar (✗)
- [ ] Placeholder kod yazma
- [ ] Test etmeden bitirme
- [ ] Gizli bilgi commit etme
- [ ] İstenmeyen özellik ekleme
- [ ] Varsayımda bulunma

---

## Versiyon Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| 1.1 | 2026-01-21 | Kural #4.1 eklendi: Kod değişikliği öncesi onay zorunluluğu |
| 1.0 | 2026-01-20 | Bu projeye özel versiyon oluşturuldu |
| - | - | Orijinal Iron Rules'dan adapte edildi |
| - | - | Proje yolları ve yapısı güncellendi |
| - | - | Türkçe'ye çevrildi |

# İşlevsiz Kod Yasağı

**Bu dosya Claude Code tarafından otomatik okunur ve her oturumda uygulanır.**

> Son Güncelleme: 2026-01-25

---

## Neden Bu Kural Var?

Bu projede yaşanan gerçek örnek:

**`lightingPreference` vakası:**
- UI'da "Ek Işık Notu" alanı var ✅
- Kullanıcı değer giriyor ✅
- Firestore'a kaydediliyor ✅
- Prompt oluşturmada **hiç okunmuyor** ❌

Sonuç: Kullanıcı bir şey yapıyormuş gibi hissediyor ama hiçbir etkisi yok.
Bu **aldatıcı** ve **güven kırıcı**.

---

## Temel İlke

**Bir özellik ya tam çalışır, ya da hiç olmaz.**

"Şimdilik kaydetsin, sonra işleriz" yaklaşımı YASAK.
"İleride lazım olur" mantığıyla kod yazmak YASAK.

---

## Karar Verme Süreci

### Adım 1: Tespit

Bir alan/özellik incelenirken şu soruları sor:

```
1. UI'da görünüyor mu?
2. Kullanıcıdan değer alınıyor mu?
3. Bir yere kaydediliyor mu?
4. Kaydedilen değer bir yerde OKUNUYOR mu?  ← KRİTİK
5. Okunan değer bir SONUÇ üretiyor mu?
```

**4. ve 5. sorulara "hayır" cevabı = İşlevsiz kod**

### Adım 2: Analiz

İşlevsiz kod bulunduğunda:

| Soru | Cevap | Aksiyon |
|------|-------|---------|
| Bu özellik gerekli mi? | Evet | **Tamamla** - Eksik zinciri kur |
| Bu özellik gerekli mi? | Hayır | **Sil** - Tüm izleri temizle |
| Şimdi tamamlanamıyor mu? | Evet | **Belgele** - FEEDBACK.md + kod yorumu |

### Adım 3: Kullanıcı Onayı (ZORUNLU)

**Hiçbir silme veya büyük değişiklik kullanıcı onayı olmadan yapılmaz.**

Format:
```
## 🔍 İşlevsiz Kod Bulundu

**Konum:** [dosya:satır]
**Alan:** [alan adı]

**Zincir Durumu:**
- UI: ✅/❌
- Kayıt: ✅/❌
- İşleme: ✅/❌
- Etki: ✅/❌

**Önerim:** [Tamamla / Sil / Belgele]
**Gerekçe:** [Neden bu öneri]

Onayını bekliyorum.
```

---

## Bu Projede Dikkat Edilecek Alanlar

### Scenario (Senaryo) Alanları
Her senaryo alanı için kontrol et:
- `compositions` → promptBuilder'da kullanılıyor mu?
- `lightingPreference` → promptBuilder'da kullanılıyor mu?
- `handStyle` → image generation'da kullanılıyor mu?

### Config Değerleri
`global/config` altındaki her değer için:
- Okunuyor mu?
- Okunan yerde gerçekten işleniyor mu?

### UI Form Alanları
Her form alanı için:
- Sadece göstermek için mi var?
- Kaydedilen değer bir yerde kullanılıyor mu?

---

## Erteleme Prosedürü

Eğer bir özellik şimdi tamamlanamıyorsa:

### 1. FEEDBACK.md'ye Ekle
```markdown
## TODO-XXX: [Özellik Adı] İşlevsiz

**Durum:** Kod var ama çalışmıyor
**Konum:** [dosya:satır]
**Eksik:** [Ne eksik - örn: "promptBuilder'da okunması gerekiyor"]
**Neden ertelendi:** [Sebep]
**Ne zaman:** [Tahmini zaman veya bağımlılık]
```

### 2. Kodda İşaretle
```typescript
// TODO(TODO-XXX): Bu alan henüz işlenmiyor
// Eksik: promptBuilder'da okunması gerekiyor
// Takip: FEEDBACK.md
const lightingPreference = data.lightingPreference;
```

### 3. UI'da Belirt (İsteğe Bağlı)
Eğer kullanıcı bu alanı görüyorsa ve şimdilik çalışmıyorsa:
- Alanı gizle, VEYA
- "(Yakında)" etiketi ekle

---

## Kod İnceleme Soruları

Yeni kod yazarken veya PR incelerken:

1. **Bu alan neden var?** Somut bir kullanım senaryosu var mı?
2. **Tam zincir çalışıyor mu?** Input'tan output'a kadar takip et.
3. **"İleride lazım olur" mu?** Bu cümleyi duyduysan, muhtemelen şimdi gereksiz.
4. **Test edildi mi?** Sadece "kaydedildi" değil, "etki etti" mi?

---

## Örnekler

### ❌ Yanlış: Yarım Bırakılmış Özellik
```typescript
// Senaryo kaydederken
const scenario = {
  name: data.name,
  lightingPreference: data.lightingPreference, // Kaydediliyor
  // ...
};

// Prompt oluştururken
function buildPrompt(scenario) {
  return `${scenario.name} için görsel`; // lightingPreference KULLANILMIYOR
}
```

### ✅ Doğru: Tam Çalışan Özellik
```typescript
// Senaryo kaydederken
const scenario = {
  name: data.name,
  lightingPreference: data.lightingPreference,
};

// Prompt oluştururken
function buildPrompt(scenario) {
  let prompt = `${scenario.name} için görsel`;
  if (scenario.lightingPreference) {
    prompt += `, ${scenario.lightingPreference} ışık`; // KULLANILIYOR
  }
  return prompt;
}
```

### ✅ Doğru: Silinen Gereksiz Özellik
```typescript
// lightingPreference tamamen kaldırıldı
// - UI'dan silindi
// - Type'dan silindi
// - Firestore'dan temizlendi
// - Commit: "refactor(scenario): remove unused lightingPreference field"
```

---

## Hatırlatma

Bu kural göstermelik değil. Her UI değişikliğinde, her yeni alan eklemede:

> "Bu alan gerçekten bir şey yapıyor mu, yoksa sadece var mı?"

Cevap "sadece var" ise → Yapma veya tamamla.

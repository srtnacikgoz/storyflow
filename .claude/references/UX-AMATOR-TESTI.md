# UX Amatör Kullanıcı Testi Kuralı

**Bu dosya Claude Code tarafından otomatik okunur ve her oturumda uygulanır.**

> **KRİTİK KURAL:** Bu kural göstermelik değil, gerçek anlamda uygulanmalıdır.
> Son Güncelleme: 2026-01-25

---

## Temel İlke

**Her UI elementi tasarlarken şu soruyu sor:**

> "Bu uygulamayı kullanacak amatör, meraklı veya sıradan bir insan bu alanı anlayabilir mi, kullanabilir mi, doğru bilgiyi girebilir mi?"

---

## Altın Kurallar

### 1. Her Input'ta Örnek Değer (Placeholder)
Her input alanında soluk/flu bir örnek değer gösterilmeli:

```tsx
// DOĞRU
<input placeholder="Örn: Zarif kahve tutma anı" />
<input placeholder="Örn: 3" type="number" />
<input placeholder="Örn: sabah-kahvesi-kompozisyon" />

// YANLIŞ
<input placeholder="Açıklama" />
<input placeholder="Sayı girin" />
<input placeholder="" />
```

### 2. Label + Hint Kombinasyonu
Her alanın üstünde ne olduğu, altında ne yazılması gerektiği:

```tsx
// DOĞRU
<label>Senaryo Adı</label>
<input placeholder="Örn: Sabah Kahve Keyfi" />
<span className="text-xs text-gray-500">
  Kısa ve akılda kalıcı bir isim verin
</span>

// YANLIŞ
<label>Ad</label>
<input />
```

### 3. Seçenek Varsa → Dropdown/Checkbox
Önceden tanımlı değerler varsa asla free text kullanma:

```tsx
// DOĞRU
<select>
  <option value="">Işık türü seçin...</option>
  <option value="soft">Yumuşak - Gölgesiz, hoş görünüm</option>
  <option value="dramatic">Dramatik - Güçlü gölgeler, etkileyici</option>
</select>

// YANLIŞ
<input placeholder="Işık türü yazın" />
```

### 4. Seçeneklerde Açıklama
Her dropdown seçeneğinin yanında kısa açıklama:

```tsx
<option value="cupping">
  Kavrama - Fincanı iki elle saran sıcak poz
</option>
```

### 5. Varsayılan Değer Seçimi
Mümkünse en yaygın/önerilen değeri varsayılan yap:

```tsx
<select defaultValue="soft-diffused">
  <option value="soft-diffused">Yumuşak Işık (Önerilen)</option>
  ...
</select>
```

### 6. Görsel İpuçları
Karmaşık kavramlar için küçük ikon veya görsel:

```tsx
<option value="bottom-right">
  ↘️ Sağ Alt Köşe - El sağ alttan girer
</option>
<option value="center">
  ⬛ Merkez - Ürün tam ortada
</option>
```

### 7. Karakter/Sayı Limitleri Göster
Limit varsa kullanıcıya göster:

```tsx
<input maxLength={50} />
<span className="text-xs text-gray-400">
  {value.length}/50 karakter
</span>
```

### 8. Zorunlu Alanları Belirt
Zorunlu alanlar yıldız (*) ile işaretli:

```tsx
<label>Senaryo Adı *</label>
```

### 9. Grup Başlıkları
İlişkili alanları grupla ve başlık ver:

```tsx
<fieldset className="border p-4 rounded">
  <legend className="font-semibold">📍 El Pozisyonu Ayarları</legend>
  {/* İlgili alanlar */}
</fieldset>
```

### 10. Akıllı Varsayılanlar
Bağlama göre otomatik değer öner:

```tsx
// "El içeriyor" seçildiğinde otomatik olarak
// en uygun el pozu seçili gelsin
if (includesHands && !handPose) {
  setHandPose("cupping"); // En yaygın poz
}
```

### 11. Onay Öncesi Özet
Form gönderilmeden önce özet göster:

```tsx
<div className="bg-gray-50 p-4 rounded">
  <h4>Oluşturulacak Senaryo:</h4>
  <p>Ad: {name}</p>
  <p>Tip: {includesHands ? "El içeren" : "El içermeyen"}</p>
  ...
</div>
```

### 12. İptal/Geri Al Kolaylığı
Her işlem geri alınabilir olmalı:

```tsx
<button>Kaydet</button>
<button>İptal</button>
<button>Değişiklikleri Sıfırla</button>
```

---

## Kırmızı Bayraklar (Bunları Gördüğünde DUR!)

| Kırmızı Bayrak | Sorun | Çözüm |
|----------------|-------|-------|
| Boş placeholder | Kullanıcı ne yazacağını bilmiyor | `Örn: ...` formatında örnek ekle |
| Serbest metin (seçenek varken) | Yanlış veri girişi riski | Dropdown/checkbox kullan |
| Teknik terim | Amatör anlamaz | Türkçe + açıklama |
| Görünür ID alanı | Kullanıcı ID bilmez | Otomatik oluştur, gizle |
| Açıklamasız seçenek | Ne seçeceğini bilmiyor | Her seçeneğe hint ekle |
| Validasyon mesajı yok | Neyin yanlış olduğu belirsiz | Spesifik hata mesajı |
| Zorunlu alan işareti yok | Hangileri gerekli belli değil | * ile işaretle |

---

## Placeholder Formatı Standardı

```
"Örn: [gerçekçi örnek değer]"
```

**Örnekler:**
- İsim alanı: `"Örn: Zarif Kahve Anı"`
- Sayı alanı: `"Örn: 5"`
- URL alanı: `"Örn: https://example.com/image.jpg"`
- Açıklama: `"Örn: Sabah kahvesini yudumlayan eller, sıcak ışık"`

---

## Tooltip/Hint Metni Standardı

Kısa, net, aksiyon odaklı:

```
✓ "Instagram'da görünecek başlık"
✓ "1-10 arası değer girin"
✓ "Boş bırakırsanız otomatik seçilir"

✗ "Bu alan başlık içindir"
✗ "Değer"
✗ "Giriş yapın"
```

---

## Zorunlu Kontrol Listesi

Her form elementi için:

- [ ] Placeholder var mı? (`Örn: ...` formatında)
- [ ] Label açıklayıcı mı?
- [ ] Hint/description var mı?
- [ ] Seçenek varsa dropdown/checkbox mı?
- [ ] Her seçenekte açıklama var mı?
- [ ] Zorunlu alanlar * ile işaretli mi?
- [ ] Validasyon mesajları anlaşılır mı?
- [ ] Varsayılan değer mantıklı mı?

---

## Hatırlatma

**Bu kural göstermelik değildir.**

Her UI değişikliğinde bu kontrol listesini uygula.

> "Kullanıcı hata yaparsa, hata kullanıcının değil tasarımındır."

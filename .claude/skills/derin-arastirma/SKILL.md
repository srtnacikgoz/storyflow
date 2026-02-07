---
name: derin-arastirma
description: "Derin arastirma agenti. Verilen sorunu Task agent'lar ile otonom olarak arastirir, kok neden bulur, kanitlarla destekler. Kod yazmaz, yapilandirilmis rapor uretir. Tetikleyiciler: 'arastir', 'incele', 'neden boyle oluyor', 'kok nedeni bul', 'deep dive'."
---

# Derin Arastirma

Bu skill cagrildiginda asagidaki adimlari SIRASI ILE uygula.

---

## Adim 1: Sorunu Anla

Kullanicinin sorununu tek cumleyle yeniden ifade et:
- Beklenen davranis nedir?
- Gerceklesen davranis nedir?
- Fark nedir?

Eger kullanici "calismıyor" diyorsa, ONCE deploy kontrolu yap:
- `git diff` ve `git status` ile kodun deploy edilip edilmedigini dogrula
- Deploy edilmemisse: "Kod henuz deploy edilmemis" raporla ve DUR

---

## Adim 2: Strateji Belirle ve Agent'lari Baslat

Sorun turune gore Task agent'lari baslat. **BU ADIM ZORUNLU** - skill'in tum gucu buradan gelir.

### Sorun -> Agent Eslesmesi

| Sorun Turu | Agent Stratejisi |
|---|---|
| Kod hatasi / bug | 2x Explore (kod tarama + veri akisi takibi) |
| Dis API / kutuphane | Explore + general-purpose (web arastirma) |
| Veri akisi sorunu | 2x Explore (girdi→cikti zinciri) |
| Performans | Explore + general-purpose |
| Bilinmeyen / karmasik | 3x paralel (tarama + akis + web) |

### Agent Prompt Sablonlari

Her agent'a asagidaki sablonlardan UYGUN OLANI kullan. `[BUYUK_HARF]` olan yerleri sorunun icerigi ile doldur.

#### A: Kod Tarama (subagent_type: Explore)
```
Bu projede [SORUN_TANIMI] ile ilgili tum dosyalari ve fonksiyonlari bul.

Kurallar:
1. Grep ile su terimleri ara: [terim1], [terim2], [terim3], [terim4], [terim5]
   - Minimum 5 farkli terimle ara. Tek grep'te birakma.
2. Bulunan her dosyayi oku ve ilgili fonksiyonlari not et
3. Her bulguyu dosya_yolu:satir_numarasi formatinda raporla
4. "Bulamadim" YASAK - baska terimlerle tekrar dene
5. Sonuclari onem sirasina gore listele

Proje yapisi:
- functions/src/ -> Backend (Firebase Cloud Functions, TypeScript)
- admin/src/ -> Frontend (React + Vite)
```

#### B: Veri Akisi Takibi (subagent_type: Explore)
```
[FONKSIYON/VERI_ADI] icin tam veri akisini cikar.

Kurallar:
1. Baslangic noktasini bul (tetikleyici: API call, kullanici aksiyonu, cron)
2. Her adimda: hangi fonksiyon aliyor -> ne yapiyor -> nereye gonderiyor
3. Config/environment degerlerini kontrol et (Firestore, env, hardcoded)
4. Edge case'leri not et (null, undefined, bos array, fallback davranis)
5. Zinciri su formatta raporla:
   [Tetikleyici] -> [Fonksiyon1:satir] -> [Fonksiyon2:satir] -> ... -> [Cikti]
6. SORUN NOKTASINI isaretle

"Muhtemelen" YASAK - dosyayi ac, satiri bul, sonra konus.
```

#### C: Web Arastirma (subagent_type: general-purpose)
```
[KONU] hakkinda web'de derinlemesine arastirma yap.

Kaynaklar:
1. Resmi dokumantasyon (API docs, framework docs)
2. GitHub issues - benzer sorunlari ara
3. Stack Overflow - cozumleri kontrol et
4. Blog yazilari ve teknik makaleler

Kurallar:
- Her bulguyu URL referansi ile raporla
- Birden fazla kaynaktan dogrula
- Versiyon uyumlulugunu kontrol et
- Projeye ozel context: Firebase Cloud Functions, TypeScript, Gemini API, React
```

#### D: Log / Hata Analizi (subagent_type: Explore)
```
Su hata/log'u analiz et:
[HATA_MESAJI]

Adimlar:
1. Hata mesajinin kaynagini kod tabaninda bul (Grep ile)
2. Hangi kosulda bu hatanin olustugunu tespit et
3. Hataya giden kod yolunu geriye dogru takip et
4. Olmasi gereken ama olmayan log satirlarini belirle
5. Benzer hatalarin baska yerlerde olup olmadigini kontrol et
```

**ONEMLI:** Agent'lari PARALEL baslat (tek mesajda birden fazla Task tool cagirisi).

---

## Adim 3: Sentezle ve Raporla

Agent'lardan gelen sonuclari birlestir. Asagidaki formatta TURKCE rapor uret:

```markdown
# Arastirma Raporu: [Sorun Basligi]

## Ozet
[2-3 cumlelik net ozet. Kok neden + cozum tek paragrafta.]

## Kok Neden
[Net, tek cumlelik kok neden ifadesi]

### Kanitlar
1. **[dosya:satir]** - [Ne gorduk, ne anlama geliyor]
2. **[dosya:satir]** - [Ne gorduk, ne anlama geliyor]
3. **[kaynak URL]** - [Dogrulama bilgisi] (varsa)

### Veri Akisi
[Tetikleyici] -> [Adim 1] -> [Adim 2] -> ... -> **[SORUN NOKTASI]** -> [Sonuc]

## Etki Analizi
- **Etkilenen alanlar:** [ozellikler/sayfalar/API'ler]
- **Siddet:** [Kritik / Orta / Dusuk]

## Cozum Onerileri

### Oneri 1: [Baslik] (Onerilen)
- **Dosya:** [dosya yolu]
- **Degisiklik:** [Ne yapilmali - tarif et, KOD YAZMA]
- **Risk:** [Dusuk/Orta/Yuksek]
- **Yan etki:** [Var mi, ne]

### Oneri 2: [Baslik] (Alternatif)
- ...

## Kontrol Listesi
- [ ] [Yapilmasi gereken adimlar]
- [ ] Build kontrolu
- [ ] Deploy sonrasi dogrulama
```

---

## Kurallar

### YAPMA
1. **Kod yazma** - Sen ARASTIRMACISIN. Cozumu tarif et, kodu kullanici onayindan sonra ana context'te yaz.
2. **Varsayimda bulunma** - "Muhtemelen", "Sanirim" YASAK. Dosyayi ac, satirı bul.
3. **Yuzeysel tarama** - Tek grep yapip "bulamadim" deme. En az 5 farkli terimle ara.
4. **Erken sonuc** - Ilk bulguyu kok neden ilan etme. "Semptom mu, neden mi?" sor.
5. **Agent'siz calis** - Bu skill'in tum gucu Task agent'lardan gelir. Agent baslatmadan rapor yazma.

### YAP
1. **Zincirin BASINA git** - Sorunu gordugun noktadan baslatma, verinin kaynagina in.
2. **En az 3 noktadan dogrula** - Tek dosyaya bakip karar verme.
3. **dosya:satir referansi ver** - Referanssiz iddia GECERSIZ.
4. **Paralel agent baslat** - Tek tek degil, ayni anda birden fazla.

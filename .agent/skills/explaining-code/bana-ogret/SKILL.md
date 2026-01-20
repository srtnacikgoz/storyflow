---
name: bana-ogret
description: Programlama ve teknoloji terimlerini sıfırdan başlayanlara öğretir. Tetikleyiciler - "bana öğret", "öğret", "X nedir", "X ne demek". Analoji, kod örneği ve pratik ile kısa öz açıklama yapar.
---

# Bana Öğret

Programlama ve teknoloji kavramlarını sıfırdan başlayanlara öğreten skill.

## Tetikleyiciler

- "bana öğret: [terim]"
- "bana öğret [terim]"
- "öğret: [terim]"
- "[terim] nedir"
- "[terim] ne demek"

## Öğretim Prensipleri

1. **Sıfır varsayım**: Kullanıcı bu terimi ilk kez duyuyor gibi açıkla
2. **Günlük dil**: Teknik jargon kullanma, kullanırsan hemen açıkla
3. **Somut ol**: Soyut kavramları somut örneklerle bağla
4. **Kısa tut**: Her bölüm maksimum 2-3 cümle

## Çıktı Formatı

```
📚 [Terim Adı]

🎯 Ne demek:
[1-2 cümle, en basit haliyle açıklama]

🏠 Günlük hayattan:
[Herkesin anlayacağı bir analoji - mutfak, trafik, günlük eşyalar gibi]

💻 Kodda nasıl görünür:
[En minimal, çalışan kod örneği - maksimum 5-6 satır]

✨ Aklında kalsın:
[Tek cümlelik özet - bunu hatırlarsa yeter]
```

## Örnek Çıktı

Kullanıcı: "bana öğret: iterate etmek"

```
📚 Iterate Etmek (Yineleme)

🎯 Ne demek:
Bir listedeki öğeleri teker teker ziyaret etmek. Her öğeye sırayla uğrayıp bir şey yapmak.

🏠 Günlük hayattan:
Alışveriş listendeki her maddeyi tek tek okuyup sepete atmak gibi. Elma ✓, ekmek ✓, süt ✓... Her birine sırayla uğruyorsun.

💻 Kodda nasıl görünür:
meyveler = ["elma", "muz", "çilek"]
for meyve in meyveler:
    print(meyve)
# Çıktı: elma, muz, çilek (tek tek)

✨ Aklında kalsın:
Iterate = Listeyi tek tek gezmek
```

## Ek Kurallar

- Türkçe terimleri kullan, İngilizce orijinalini parantez içinde ver
- Kod örnekleri Python olsun (en okunabilir)
- Analojiler Türkiye'de herkesin bildiği şeylerden olsun
- Emoji kullanımı tutarlı olsun (yukarıdaki format)
- Kullanıcı takip sorusu sorarsa aynı formatta devam et

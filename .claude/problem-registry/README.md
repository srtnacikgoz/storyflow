# Problem Registry - Sorun Kayıt Sistemi

> **Amaç:** Sorunları, araştırma süreçlerini ve çözümleri sistematik olarak kayıt altına almak.
> Aynı sorunları tekrar tekrar sıfırdan araştırmaktan kurtulmak.

---

## Klasör Yapısı

```
problem-registry/
├── README.md           # Bu dosya
├── active/             # Aktif/çözülmemiş sorunlar
├── solved/             # Çözülmüş sorunlar (arşiv)
├── patterns/           # Tekrar eden problem pattern'leri
└── categories/         # Kategori bazlı indeksler
```

---

## Nasıl Kullanılır?

### 1. Yeni Sorun Geldiğinde

```
1. Önce categories/ klasöründeki ilgili kategoriye bak
2. Benzer sorun var mı kontrol et
3. patterns/ klasöründe eşleşen pattern var mı bak
4. Yoksa active/ klasörüne yeni dosya oluştur
```

### 2. Araştırma Sırasında

```
1. active/ klasöründeki dosyayı güncelle
2. Denenen yaklaşımları yaz (işe yarasa da yaramasa da)
3. Bulunan ipuçlarını ekle
4. İlgili dosya ve satır numaralarını belirt
```

### 3. Çözüm Bulunduğunda

```
1. Çözümü detaylıca yaz
2. Değiştirilen dosyaları listele
3. Test sonuçlarını ekle
4. Dosyayı solved/ klasörüne taşı
5. categories/ indeksini güncelle
6. Eğer pattern oluştuysa patterns/ klasörüne ekle
```

---

## Dosya İsimlendirme

| Klasör | Format | Örnek |
|--------|--------|-------|
| active/ | `ACTIVE-XXX-kisa-baslik.md` | `ACTIVE-001-dashboard-status.md` |
| solved/ | `SOLVED-XXX-kisa-baslik.md` | `SOLVED-001-telegram-race.md` |
| patterns/ | `pattern-adi.md` | `firestore-undefined.md` |
| categories/ | `kategori.md` | `orchestrator.md` |

---

## Dosya Şablonu

```markdown
# [ID] Sorun Başlığı

**Durum:** 🔴 AKTİF | 🟡 ARAŞTIRILIYOR | ✅ ÇÖZÜLDÜ
**Kategori:** orchestrator | telegram | frontend | firestore
**Öncelik:** 🔴 KRİTİK | 🟠 YÜKSEK | 🟡 ORTA | 🟢 DÜŞÜK
**Oluşturma:** YYYY-MM-DD
**Çözüm:** YYYY-MM-DD (çözüldüyse)

---

## Belirti
[Ne oluyor, nasıl fark edildi, kullanıcı ne söyledi]

---

## Araştırma Süreci

### Adım 1: [Tarih]
[Ne yapıldı, ne bulundu]

### Adım 2: [Tarih]
[Ne yapıldı, ne bulundu]

---

## Kök Neden
[Araştırma sonucu bulunan gerçek neden]

---

## İlgili Dosyalar
| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `path/to/file.ts` | 123-145 | [ne işe yarıyor] |

---

## Denenen Yaklaşımlar

### ❌ Yaklaşım 1: [İsim]
**Ne yapıldı:** ...
**Sonuç:** İşe yaramadı çünkü...

### ✅ Yaklaşım 2: [İsim]
**Ne yapıldı:** ...
**Sonuç:** Çalıştı

---

## Çözüm (çözüldüyse)

### Değişiklikler
| Dosya | Değişiklik |
|-------|------------|
| `file1.ts` | [özet] |

### Kod
```typescript
// Önceki (sorunlu)
...

// Sonraki (düzeltilmiş)
...
```

---

## Test
[Nasıl test edildi, sonuç ne oldu]

---

## İlişkili Sorunlar
- [SOLVED-XXX](../solved/SOLVED-XXX-baslik.md)
- [Pattern: xyz](../patterns/xyz.md)
```

---

## Kategoriler

| Kategori | Açıklama |
|----------|----------|
| `orchestrator` | AI görsel üretim pipeline |
| `telegram` | Telegram bot ve webhook |
| `frontend` | Admin panel (React) |
| `firestore` | Database sorunları |
| `scheduler` | Zamanlama sistemi |
| `instagram` | Instagram API |

---

## Öncelik Seviyeleri

| Seviye | Açıklama |
|--------|----------|
| 🔴 KRİTİK | Sistem çalışmıyor, acil müdahale |
| 🟠 YÜKSEK | Önemli özellik bozuk |
| 🟡 ORTA | Sorun var ama workaround mümkün |
| 🟢 DÜŞÜK | Kozmetik veya iyileştirme |

---

## Hızlı Komutlar

```bash
# Aktif sorunları listele
ls -la .claude/problem-registry/active/

# Çözülmüş sorunları ara
grep -r "pattern-adı" .claude/problem-registry/solved/

# Belirli kategorideki sorunları bul
cat .claude/problem-registry/categories/orchestrator.md
```

---

> **Not:** Bu klasör `.claude/` içinde olduğu için Claude Code tarafından erişilebilir.
> Her oturum başında ilgili sorun dosyaları okunmalıdır.

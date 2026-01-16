# Risk ve Dayanıklılık Planı: Anti-Fragile Yazılım Geliştirme

> **"Kırılgan sistemler hatalardan zarar görür, dayanıklı sistemler hayatta kalır, anti-fragile sistemler güçlenir"**

Bu kılavuz, yazılım projelerinde risk yönetimi ve teknolojik dayanıklılık için standart bir operasyon prosedürüdür (SOP).

**Tetikleyici:** `RISK-CHECK`

---

## 1. Anti-Fragile Nedir?

### Nassim Taleb'in Tanımı
- **Fragile (Kırılgan):** Stres altında kırılır → Monolitik, tek noktadan bağımlı sistemler
- **Robust (Dayanıklı):** Stres altında aynı kalır → Yedekli, defensive sistemler
- **Anti-Fragile:** Stres altında güçlenir → Öğrenen, adapte olan sistemler

### Yazılımda Anti-Fragility
```
┌────────────────────────────────────────────────────────────┐
│                    Anti-Fragility Spectrum                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Kırılgan          Dayanıklı         Anti-Fragile         │
│  ────────          ─────────         ───────────          │
│  • Tek API         • Fallback        • Multi-provider     │
│  • Hardcoded       • Config          • Dynamic config     │
│  • No monitoring   • Alerting        • Auto-healing       │
│  • Manual deploy   • CI/CD           • Canary/Blue-Green  │
│  • No backups      • Daily backup    • Real-time sync     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Risk Değerlendirme Matrisi

### Etki × Olasılık Analizi

|  | Düşük Olasılık | Orta Olasılık | Yüksek Olasılık |
|--|----------------|---------------|-----------------|
| **Kritik Etki** | ⚠️ Orta Risk | 🔴 Yüksek Risk | 🔴 Kritik Risk |
| **Orta Etki** | 🟢 Düşük Risk | ⚠️ Orta Risk | 🔴 Yüksek Risk |
| **Düşük Etki** | 🟢 İhmal | 🟢 Düşük Risk | ⚠️ Orta Risk |

### Risk Kategorileri

| Kategori | Örnekler | Değerlendirme Kriteri |
|----------|----------|----------------------|
| **Teknoloji Riski** | API provider kapanması, breaking changes | Şirket stabilitesi, deprecation policy |
| **Operasyonel Risk** | Server downtime, DNS sorunları | SLA garantileri, uptime history |
| **Güvenlik Riski** | Data breach, vulnerability | Security audit, CVE history |
| **Finansal Risk** | Fiyat artışı, ödeme sorunları | Pricing model, contract terms |
| **Yasal Risk** | KVKK/GDPR uyumsuzluk, lisans | Compliance certification |

---

## 3. Bağımlılık Analizi Protokolü

### Her Kritik Bağımlılık İçin Sor:

```
┌─────────────────────────────────────────────────────────┐
│              Bağımlılık Kontrol Listesi                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  □ Bu servis kapansa site çalışır mı?                   │
│                                                         │
│  □ Alternatif provider var mı?                          │
│                                                         │
│  □ Migration path tanımlı mı?                           │
│                                                         │
│  □ Vendor lock-in seviyesi nedir?                       │
│                                                         │
│  □ Veri portability mümkün mü?                          │
│                                                         │
│  □ Contract/SLA garantileri neler?                      │
│                                                         │
│  □ Downtime durumunda müşteri ne görür?                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Bağımlılık Sınıflandırması

| Seviye | Tanım | Aksiyon |
|--------|-------|---------|
| **Tier 1 - Kritik** | Site çalışmaz | Fallback ZORUNLU |
| **Tier 2 - Önemli** | Feature çalışmaz | Graceful degradation |
| **Tier 3 - Nice-to-have** | UX bozulur | Error handling yeterli |

---

## 4. Fallback Stratejileri

### Pattern 1: Multi-Provider
```
Birincil Provider → Başarısız → İkincil Provider → Başarısız → Üçüncül
        ↓                              ↓
    Normal flow                  Degrade mode
```

### Pattern 2: Graceful Degradation
```
Tam Özellik → Kısmi Özellik → Minimal Özellik → Bakım Modu
     ↓              ↓              ↓              ↓
  Optimal       Reduced        Functional     Informative
```

### Pattern 3: Circuit Breaker
```
┌─────────┐     Error     ┌─────────┐     Timeout     ┌─────────┐
│ CLOSED  │ ──────────────│  OPEN   │ ────────────────│HALF-OPEN│
│(Normal) │               │(Reject) │                 │ (Test)  │
└─────────┘               └─────────┘                 └─────────┘
     ↑                                                     │
     └─────────────────── Success ─────────────────────────┘
```

### Pattern 4: Cache-First
```
Request → Cache Hit? → YES → Return Cached
              ↓
             NO
              ↓
         API Call → Success? → Update Cache → Return Fresh
              ↓
             NO
              ↓
         Return Stale Cache (with warning)
```

---

## 5. Monitoring ve Alerting

### Kritik Metrikler

| Metrik | Threshold | Aksiyon |
|--------|-----------|---------|
| **Uptime** | <99.5% | Alert |
| **Response Time** | >2s (p95) | Investigate |
| **Error Rate** | >1% | Alert |
| **API Quota** | >80% kullanım | Warning |
| **SSL Certificate** | <30 gün | Renew |
| **Payment Success** | <95% | Critical Alert |

### Alert Seviyeleri

```
┌────────────────────────────────────────┐
│           Alert Hierarchy              │
├────────────────────────────────────────┤
│                                        │
│  🔴 CRITICAL - Immediate action        │
│     • Site down                        │
│     • Payment system failed            │
│     • Data breach detected             │
│                                        │
│  🟠 WARNING - Action within 1h         │
│     • High error rate                  │
│     • Performance degradation          │
│     • API quota nearing limit          │
│                                        │
│  🟡 INFO - Monitor                     │
│     • Unusual traffic patterns         │
│     • New error types                  │
│     • Dependency updates available     │
│                                        │
└────────────────────────────────────────┘
```

---

## 6. Recovery Procedures

### Incident Response Akışı

```
┌─────────────────────────────────────────────────────────┐
│                 Incident Response                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. DETECT                                              │
│     • Automated monitoring catches issue                │
│     • User reports                                      │
│                                                         │
│  2. ASSESS                                              │
│     • Impact scope (how many users?)                    │
│     • Severity level                                    │
│     • Root cause hypothesis                             │
│                                                         │
│  3. CONTAIN                                             │
│     • Enable fallback if available                      │
│     • Communicate status to users                       │
│     • Prevent cascade failures                          │
│                                                         │
│  4. RESOLVE                                             │
│     • Fix root cause                                    │
│     • Test fix                                          │
│     • Gradual rollout                                   │
│                                                         │
│  5. LEARN                                               │
│     • Post-mortem analysis                              │
│     • Update runbooks                                   │
│     • Improve monitoring                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Rollback Checklist

- [ ] Previous version identified and available
- [ ] Database migrations reversible?
- [ ] Feature flags can be toggled?
- [ ] Cache invalidation needed?
- [ ] Third-party webhooks need updating?
- [ ] User communication prepared?

---

## 7. Vendor Lock-in Azaltma

### Soyutlama Katmanları

```typescript
// ❌ Kötü: Doğrudan vendor bağımlılığı
import { sendEmail } from '@sendgrid/mail';
await sendEmail(options);

// ✅ İyi: Soyutlama katmanı
// services/emailService.ts
interface EmailProvider {
  send(options: EmailOptions): Promise<void>;
}

class SendGridProvider implements EmailProvider { ... }
class SESProvider implements EmailProvider { ... }
class SMTPProvider implements EmailProvider { ... }

// Kullanım
const emailService = getEmailProvider(); // Config'den seçilir
await emailService.send(options);
```

### Data Portability

| Önlem | Açıklama |
|-------|----------|
| **Regular Exports** | Haftalık/aylık veri export'u |
| **Standard Formats** | JSON, CSV - vendor-specific değil |
| **Schema Documentation** | Veri yapısı dokümante |
| **Migration Scripts** | Hazır import/export scriptleri |

---

## 8. Test ve Doğrulama

### Chaos Engineering (Kontrollü)

| Test | Nasıl | Ne Zaman |
|------|-------|----------|
| **API Mock** | Network block, mock response | Dev ortamında |
| **Slow Connection** | Network throttle | QA'de |
| **Service Down** | Disable feature flag | Staging'de |
| **Failover Test** | Manual trigger | Quarterly |

### Disaster Recovery Test

- [ ] Backup restore test (quarterly)
- [ ] Failover procedure test (bi-annual)
- [ ] Communication plan drill (annual)
- [ ] Full disaster recovery exercise (annual)

---

## 9. Checklist: Yeni Bağımlılık Eklerken

```
┌─────────────────────────────────────────────────────────┐
│          Yeni Bağımlılık Onay Checklist                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PRE-ADOPTION                                           │
│  □ Alternatifler araştırıldı mı?                        │
│  □ Pricing model anlaşıldı mı?                          │
│  □ SLA/Uptime garantileri yeterli mi?                   │
│  □ Exit strategy tanımlandı mı?                         │
│                                                         │
│  IMPLEMENTATION                                         │
│  □ Soyutlama katmanı var mı?                            │
│  □ Fallback tanımlandı mı?                              │
│  □ Error handling implement edildi mi?                  │
│  □ Monitoring eklendi mi?                               │
│                                                         │
│  POST-IMPLEMENTATION                                    │
│  □ Runbook dokümante edildi mi?                         │
│  □ Team eğitildi mi?                                    │
│  □ Alert threshold'lar ayarlandı mı?                    │
│  □ Test coverage yeterli mi?                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 10. İlişkili Dosyalar

- **Proje Spesifik:** `.claude/[proje]-risk-plani.md`
- **GitHub Araştırma:** `Zihinsel-Algoritma-inşası.md`
- **Proje Kuralları:** `CLAUDE.md`

---

*Son Güncelleme: Ocak 2026*
*Versiyon: 1.0 - Evrensel*
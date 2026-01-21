/**
 * Prompt Training Service
 * PROMPT-EGITIMI.md dosyasını okuyup Claude context'ine dönüştürür
 */

import * as fs from "fs";
import * as path from "path";

// Eğitim kuralları için tip tanımları
export interface TrainingRules {
  // Sistem kuralları (Bölüm 1-8)
  temelFelsefe: string;
  referansSadakati: string;
  objeLimitasyonu: string;
  fizikselMantik: string;
  cesitlilikZorunlulugu: string;
  promptSablonu: string;
  kaliteKontrol: string;
  kotuVsIyiKarsilastirma: string;

  // Kullanıcı katkıları (Bölüm 9-12)
  gozlemGunlugu: string;
  iyiOrnekler: string;
  kotuOrnekler: string;
  kisiselKurallar: string;
}

export interface TrainingContext {
  systemRules: string;
  userContributions: string;
  fullContext: string;
}

// Cache mekanizması (5 dakika)
let cachedRules: TrainingRules | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

/**
 * PROMPT-EGITIMI.md dosyasını oku ve parse et
 */
function loadMarkdownFile(): string {
  try {
    // Runtime'da dosya yolu
    const filePath = path.join(__dirname, "PROMPT-EGITIMI.md");

    if (!fs.existsSync(filePath)) {
      console.warn("[PromptTrainingService] PROMPT-EGITIMI.md bulunamadı, varsayılan kurallar kullanılacak");
      return "";
    }

    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error("[PromptTrainingService] Dosya okuma hatası:", error);
    return "";
  }
}

/**
 * Bölüm numarasına göre içerik çıkar (örn: "Bölüm 1:")
 */
function extractBySectionNumber(content: string, sectionNum: number): string {
  const sectionRegex = new RegExp(
    `(?:^|\\n)## Bölüm ${sectionNum}:[\\s\\S]*?(?=\\n## Bölüm \\d|\\n# KULLANICI|$)`,
    "i"
  );

  const match = content.match(sectionRegex);
  if (!match) {
    return "";
  }

  return match[0].trim();
}

/**
 * Kullanıcı katkı bölümlerini çıkar
 */
function extractUserSection(content: string, sectionNum: number): string {
  const sectionRegex = new RegExp(
    `(?:^|\\n)## Bölüm ${sectionNum}:[\\s\\S]*?(?=\\n## Bölüm \\d|\\n## Versiyon|$)`,
    "i"
  );

  const match = content.match(sectionRegex);
  if (!match) {
    return "";
  }

  return match[0].trim();
}

/**
 * Markdown'u parse edip TrainingRules objesine dönüştür
 */
function parseMarkdown(content: string): TrainingRules {
  return {
    // Sistem kuralları
    temelFelsefe: extractBySectionNumber(content, 1),
    referansSadakati: extractBySectionNumber(content, 2),
    objeLimitasyonu: extractBySectionNumber(content, 3),
    fizikselMantik: extractBySectionNumber(content, 4),
    cesitlilikZorunlulugu: extractBySectionNumber(content, 5),
    promptSablonu: extractBySectionNumber(content, 6),
    kaliteKontrol: extractBySectionNumber(content, 7),
    kotuVsIyiKarsilastirma: extractBySectionNumber(content, 8),

    // Kullanıcı katkıları
    gozlemGunlugu: extractUserSection(content, 9),
    iyiOrnekler: extractUserSection(content, 10),
    kotuOrnekler: extractUserSection(content, 11),
    kisiselKurallar: extractUserSection(content, 12),
  };
}

/**
 * Eğitim kurallarını yükle (cache'li)
 */
export function loadTrainingRules(): TrainingRules {
  const now = Date.now();

  // Cache geçerli mi?
  if (cachedRules && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedRules;
  }

  // Markdown dosyasını oku ve parse et
  const content = loadMarkdownFile();

  if (!content) {
    // Varsayılan boş kurallar
    cachedRules = {
      temelFelsefe: "",
      referansSadakati: "",
      objeLimitasyonu: "",
      fizikselMantik: "",
      cesitlilikZorunlulugu: "",
      promptSablonu: "",
      kaliteKontrol: "",
      kotuVsIyiKarsilastirma: "",
      gozlemGunlugu: "",
      iyiOrnekler: "",
      kotuOrnekler: "",
      kisiselKurallar: "",
    };
  } else {
    cachedRules = parseMarkdown(content);
  }

  cacheTimestamp = now;
  console.log("[PromptTrainingService] Kurallar yüklendi/güncellendi");

  return cachedRules;
}

/**
 * Claude için sistem kurallarını formatla
 */
export function getSystemRulesForClaude(): string {
  const rules = loadTrainingRules();

  // Boş bölümleri atla
  const sections: string[] = [];

  if (rules.temelFelsefe) {
    sections.push(`=== TEMEL FELSEFE ===
${rules.temelFelsefe}`);
  }

  if (rules.referansSadakati) {
    sections.push(`=== REFERANS SADAKATİ ===
${rules.referansSadakati}`);
  }

  if (rules.objeLimitasyonu) {
    sections.push(`=== OBJE LİMİTASYONU ===
${rules.objeLimitasyonu}`);
  }

  if (rules.fizikselMantik) {
    sections.push(`=== FİZİKSEL MANTIK KURALLARI ===
${rules.fizikselMantik}`);
  }

  if (rules.cesitlilikZorunlulugu) {
    sections.push(`=== ÇEŞİTLİLİK ZORUNLULUĞU ===
${rules.cesitlilikZorunlulugu}`);
  }

  return sections.join("\n\n");
}

/**
 * Claude için kullanıcı katkılarını formatla
 */
export function getUserContributionsForClaude(): string {
  const rules = loadTrainingRules();

  const sections: string[] = [];

  if (rules.gozlemGunlugu && rules.gozlemGunlugu.length > 100) {
    sections.push(`=== KULLANICI GÖZLEMLERİ ===
${rules.gozlemGunlugu}`);
  }

  if (rules.kisiselKurallar && rules.kisiselKurallar.length > 100) {
    sections.push(`=== KİŞİSEL KURALLAR ===
${rules.kisiselKurallar}`);
  }

  // Kötü örneklerden öğrenilecekler
  if (rules.kotuOrnekler && rules.kotuOrnekler.length > 100) {
    sections.push(`=== YAPILMAMASI GEREKENLER (Önceki Hatalardan) ===
${rules.kotuOrnekler}`);
  }

  return sections.join("\n\n");
}

/**
 * Claude için tam context'i formatla
 */
export function getFullTrainingContext(): TrainingContext {
  const systemRules = getSystemRulesForClaude();
  const userContributions = getUserContributionsForClaude();

  const fullContext = `
╔══════════════════════════════════════════════════════════════╗
║              PROMPT YAZIM EĞİTİM KURALLARI                   ║
╚══════════════════════════════════════════════════════════════╝

Bu kurallar Gemini'ye yazılacak prompt'ların kalitesini artırmak için tasarlanmıştır.
HER PROMPT bu kurallara uygun olmalıdır.

${systemRules}

${userContributions ? `
╔══════════════════════════════════════════════════════════════╗
║              KULLANICI KATKILARI VE GÖZLEMLERİ               ║
╚══════════════════════════════════════════════════════════════╝

${userContributions}
` : ""}

╔══════════════════════════════════════════════════════════════╗
║                    KRİTİK HATIRLATMALAR                      ║
╚══════════════════════════════════════════════════════════════╝

1. Prompt'a SADECE referans görsellerde görünen objeleri dahil et
2. Atmosfer IŞIKLA sağlanır, ek objelerle DEĞİL
3. Her objenin rengi ve malzemesi AÇIKÇA belirtilmeli
4. Fiziksel mantık kurallarına uy (pasta üstünde fincan OLMAZ)
5. Orijinal fotoğraftaki arka planı KORU
6. Obje listesini KAPAT ("Bu sahnede başka obje YOK")
`.trim();

  return {
    systemRules,
    userContributions,
    fullContext,
  };
}

/**
 * Kısa özet context (token tasarrufu için)
 */
export function getCompactTrainingContext(): string {
  return `
PROMPT YAZIM KURALLARI (ÖZET):

1. REFERANS SADAKATİ: Orijinal fotoğraftaki arka plan, zemin, ışık yönü korunmalı
2. OBJE LİMİTASYONU: Prompt'a SADECE referansta görünen objeler dahil edilmeli
3. FİZİKSEL MANTIK: Pasta tabağı üstünde fincan OLMAZ, objeler mantıklı pozisyonlarda
4. ÇEŞİTLİLİK: Her prompt'ta fincan rengi/malzemesi AÇIKÇA belirtilmeli
5. ATMOSFER: Mood IŞIKLA sağlanır (sıcak renk sıcaklığı, yumuşak gölgeler), obje eklemeyle DEĞİL
6. OBJE LİSTESİ KAPATMA: "Bu sahnede başka obje YOK" ifadesi eklenmeli

YASAK:
- "cozy atmosphere" yazıp nasıl sağlanacağını belirtmemek
- Fincan rengini/malzemesini belirsiz bırakmak
- Referansta olmayan obje eklemek (kitap, mum, bitki vb.)
- Fiziksel olarak imkansız kompozisyonlar (üst üste tabaklar vb.)
`.trim();
}

// Cache'i temizle (test için)
export function clearCache(): void {
  cachedRules = null;
  cacheTimestamp = 0;
}

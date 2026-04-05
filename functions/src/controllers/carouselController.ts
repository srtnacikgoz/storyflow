/**
 * Carousel Controller
 * AI destekli carousel metin üretimi — Brand System Loaded (Level 2)
 */

import { functions, getCors, REGION, errorResponse } from "./orchestrator/shared";
import { getBrandConfig, setBrandConfig } from "../services/configService";
import { getSystemSettings } from "../services/configService";
import { getDb } from "../services/config/configCache";

// ── Carousel tip tanımları ────────────────────────────────────────────────────

type CarouselType = "product-story" | "sales" | "archive" | "recipe";
type SlideRole = "HOOK" | "CONTEXT" | "BUILD" | "BUILD2" | "TENSION" | "PAYOFF" | "CTA";

interface SlideTemplate {
  number: number;
  role: SlideRole;
  purpose: string;
}

const SLIDE_TEMPLATES: Record<CarouselType, SlideTemplate[]> = {
  "product-story": [
    { number: 1, role: "HOOK", purpose: "Scroll'u durduracak tek kare. Başlık max 6 kelime — ürün adını ver, klişe sıfat ekleme. Abartma yok — görsel konuşsun." },
    { number: 2, role: "CONTEXT", purpose: "Ürünün hikayesini tek cümleyle aç. Neden özel? Ne zaman başladı? Kimin için? Sonucu verme — sadece merak uyandır." },
    { number: 3, role: "BUILD", purpose: "TEK bir kalite detayı seç: malzeme, köken veya özellik. Tek fikir — ikinci cümle gerekiyorsa fazla karmaşık." },
    { number: 4, role: "BUILD2", purpose: "FARKLI bir kalite detayı. Slide 3'te malzeme verdiysen burada teknik ver. Aynı şeyi tekrar etme." },
    { number: 5, role: "TENSION", purpose: "MEYDAN OKU: Çoğu kişinin bilmediği şey nedir? 'Bildiğinizi sanıyorsunuz ama...' hissi yarat." },
    { number: 6, role: "PAYOFF", purpose: "Sonuç: Tüm bu detaylar birleşince ne oluyor? Satış yapma — memnuniyet hissettir." },
    { number: 7, role: "CTA", purpose: "TEK bir aksiyon iste. Somut ol — 'bekliyoruz' belirsiz." },
  ],
  "sales": [
    { number: 1, role: "HOOK", purpose: "Ürün en çekici halinde. Başlık: ürün adı + en çarpıcı özelliği. Fiyat buraya KOYMA." },
    { number: 2, role: "CONTEXT", purpose: "Bu ürün ne ve ne zaman mevcut? Netlik, zeka değil. Kişi 5 saniyede anlamalı." },
    { number: 3, role: "BUILD", purpose: "NEDEN istenmeli? Bir tat, bir doku, bir vesile. Tek neden — karmaşıklaştırma." },
    { number: 4, role: "BUILD2", purpose: "İKİNCİ neden veya aciliyet. 'Her partide 24 adet üretiyoruz' gibi. Aciliyet hissettir ama KORKUTMA." },
    { number: 5, role: "TENSION", purpose: "KAÇIRILACAK ŞEY: Gerçeği söyle, abartma. 'Geçen sezon 2 günde tükendi' gibi somut bilgi." },
    { number: 6, role: "PAYOFF", purpose: "Teklif NET: Fiyat (₺ ile), müsaitlik, nasıl alınır. Belirsizlik bırakma." },
    { number: 7, role: "CTA", purpose: "TEK aksiyon: Somut link veya yönlendirme ver." },
  ],
  "archive": [
    { number: 1, role: "HOOK", purpose: "Arşivden görsel olarak en çarpıcı ürün. Başlık: ürün adı + yıl. Nostalji değil, iz bırakan bir an." },
    { number: 2, role: "CONTEXT", purpose: "Bu ürün ne zaman, neden yapıldı? Kısa hikaye — max 3 satır." },
    { number: 3, role: "BUILD", purpose: "Bu ürünü unutulmaz yapan TEK detay: malzeme mi? Teknik mi? Somut bilgi." },
    { number: 4, role: "BUILD2", purpose: "İKİNCİ arşiv ürünü veya aynı ürünün farklı bir anı. Sade'nin derinliğini kanıtla." },
    { number: 5, role: "TENSION", purpose: "DEĞİŞMEYENLER: 10 yıldır aynı kalan değer veya standart ne? Meydan oku." },
    { number: 6, role: "PAYOFF", purpose: "Arşiv = tutarlılık kanıtı. Nostalji yapma — marka sesini kullan." },
    { number: 7, role: "CTA", purpose: "TEK aksiyon: 'Takip edin' veya 'Ziyaret edin'. @sade.patisserie mutlaka ekle." },
  ],
  "recipe": [
    { number: 1, role: "HOOK", purpose: "Bitmiş sonucu göster — 'bunu sen de yapabilirsin' hissi ver. Başlık: reçete adı, net." },
    { number: 2, role: "CONTEXT", purpose: "Bu reçete kimin için? Zorluk seviyesi ne? Süre ne kadar? Yanlış beklenti = hayal kırıklığı." },
    { number: 3, role: "BUILD", purpose: "EN ÖNEMLİ ADIM: Reçetenin kilit noktası. Somut ve tekrarlanabilir bilgi. Genel laf değil." },
    { number: 4, role: "BUILD2", purpose: "İKİNCİ KİLİT ADIM: Çoğu reçetenin atladığı teknik detay veya kalite farkı." },
    { number: 5, role: "TENSION", purpose: "EN YAYGIN HATA: Herkesin yaptığı yanlış ne? Somut hata + somut çözüm." },
    { number: 6, role: "PAYOFF", purpose: "Bitmiş sonuç TEKRAR — ama şimdi izleyici 'neden böyle göründüğünü' biliyor." },
    { number: 7, role: "CTA", purpose: "TEK aksiyon: 'Kaydet ve dene' veya 'Yaptığınızı etiketleyin: @sade.patisserie'." },
  ],
};

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildSystemPrompt(brand: Awaited<ReturnType<typeof getBrandConfig>>): string {
  const colorsText = brand.colors.map(c => `${c.name}: ${c.hex}`).join(", ");
  const channelsText = brand.channels.map(c => `${c.name}: ${c.handle}`).join(", ");

  return `Sen ${brand.name} markası için çalışan bir içerik yazarısın.

MARKA SESİ KURALLARI:
${brand.voiceRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

YASAKLI KELİMELER (kesinlikle kullanma):
${brand.prohibitedWords.join(", ")}

ÖRNEK CÜMLELER (bu tonu yakala):
${brand.exampleCopies.map(e => `- "${e}"`).join("\n")}

MARKA BİLGİLERİ:
- Renkler: ${colorsText}
- Kanallar: ${channelsText}
- Başlık fontu: ${brand.typography.heading}
- Gövde fontu: ${brand.typography.body}

GENEL KURALLAR:
- Başlıklar maksimum 6 kelime
- Gövde metni maksimum 3 satır
- Emoji kullanma
- Ünlem işareti kullanma
- "En iyi", "eşsiz", "benzersiz", "muhteşem" gibi klişe sıfatlar kullanma
- Her zaman Türkçe yaz
- Sade, doğrudan ve güvenilir ton — abartma yok`;
}

function buildUserPrompt(
  carouselLabel: string,
  productName: string,
  productDescription: string,
  brandName: string,
  slideTemplates: { number: number; role: string; purpose: string }[]
): string {
  const slidesDesc = slideTemplates.map(t =>
    `Slide ${t.number} (${t.role}): ${t.purpose}`
  ).join("\n");

  return `${brandName} markası için "${productName}" ürününe ait bir Instagram carousel içeriği oluştur.
${productDescription ? `\nÜrün hakkında ek bilgi: ${productDescription}` : ""}

Carousel tipi: ${carouselLabel}

Her slide için başlık (headline) ve gövde metni (body) yaz:

${slidesDesc}

YANIT FORMATI — Tam olarak şu JSON yapısında döndür, başka hiçbir şey ekleme:
{
  "slides": [
    { "slideNumber": 1, "role": "HOOK", "headline": "...", "body": "..." },
    { "slideNumber": 2, "role": "CONTEXT", "headline": "...", "body": "..." },
    { "slideNumber": 3, "role": "BUILD", "headline": "...", "body": "..." },
    { "slideNumber": 4, "role": "BUILD2", "headline": "...", "body": "..." },
    { "slideNumber": 5, "role": "TENSION", "headline": "...", "body": "..." },
    { "slideNumber": 6, "role": "PAYOFF", "headline": "...", "body": "..." },
    { "slideNumber": 7, "role": "CTA", "headline": "...", "body": "..." }
  ]
}

Notlar:
- CONTEXT ve CTA slide'larında görsel yok, sadece metin — daha uzun ve açıklayıcı olabilir
- HOOK başlığı mutlaka 6 kelime veya altında olmalı
- body alanını boş bırakabilirsin, zorunlu değil`;
}

// ── AI çağrısı ────────────────────────────────────────────────────────────────

async function callClaudeForCarousel(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const settings = await getSystemSettings();
  const anthropicApiKey = (settings as any)?.anthropicApiKey;
  const openRouterApiKey = (settings as any)?.openRouterApiKey;

  // Carousel için sabit model: Claude Sonnet 4.6 via Anthropic veya OpenRouter
  const CAROUSEL_MODEL_ANTHROPIC = "claude-sonnet-4-6";
  const CAROUSEL_MODEL_OPENROUTER = "anthropic/claude-sonnet-4-5"; // OpenRouter slug

  if (anthropicApiKey) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const result = await anthropic.messages.create({
      model: CAROUSEL_MODEL_ANTHROPIC,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return result.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }

  if (openRouterApiKey) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://instagram-automation-ad77b.web.app",
        "X-Title": "Sade Storyflow",
      },
      body: JSON.stringify({
        model: CAROUSEL_MODEL_OPENROUTER,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter carousel hatası (${response.status}): ${err}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  throw new Error("Ne Anthropic ne de OpenRouter API key tanımlı (Ayarlar > API Ayarları)");
}

function parseCarouselJson(raw: string): { slideNumber: number; role: string; headline: string; body: string }[] {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON bloğu bulunamadı");
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.slides)) throw new Error("slides dizisi yok");
    return parsed.slides;
  } catch (e) {
    throw new Error(`AI yanıtı parse edilemedi: ${(e as Error).message}. Ham yanıt: ${raw.slice(0, 200)}`);
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * AI ile carousel metin üretimi
 * POST body: { brandId, carouselType, productName, productDescription? }
 */
export const generateCarouselContent = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "POST gerekli" });
          return;
        }

        const { brandId, carouselType, productName, productDescription = "" } = request.body;

        if (!brandId || !carouselType || !productName) {
          response.status(400).json({
            success: false,
            error: "brandId, carouselType ve productName zorunlu",
          });
          return;
        }

        // Firestore'dan framework'ü oku (carouselType = Firestore document id)
        const db = getDb();
        const fwDoc = await db.collection("carouselFrameworks").doc(carouselType).get();
        if (!fwDoc.exists) {
          response.status(400).json({
            success: false,
            error: `Carousel framework bulunamadı: ${carouselType}. /seedCarouselFrameworks endpoint'ini çağır.`,
          });
          return;
        }
        const fw = fwDoc.data() as { label: string; slides: { number: number; role: string; purpose: string }[] };

        // Marka config'i Firestore'dan oku
        const brand = await getBrandConfig(brandId);

        // Prompt'ları oluştur
        const systemPrompt = buildSystemPrompt(brand);
        const userPrompt = buildUserPrompt(
          fw.label,
          productName,
          productDescription,
          brand.name,
          fw.slides
        );

        console.log(`[CarouselAI] brandId=${brandId}, type=${carouselType}, product=${productName}`);

        // Claude'u çağır
        const raw = await callClaudeForCarousel(systemPrompt, userPrompt);

        // JSON parse
        const slides = parseCarouselJson(raw);

        response.json({ success: true, slides });
      } catch (error) {
        errorResponse(response, error, "generateCarouselContent");
      }
    });
  });

/**
 * Sade Patisserie brand config'ini Firestore'a seed et
 * POST body: {} (parametresiz)
 */
export const getCarouselBrandConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const brand = await getBrandConfig("sade-patisserie");
        response.json({ success: true, data: brand });
      } catch (error) {
        errorResponse(response, error, "getCarouselBrandConfig");
      }
    });
  });

export const seedBrandConfig = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const sadeConfig = {
          name: "Sade Patisserie",
          voiceRules: [
            "Sade, doğrudan ve güvenilir konuş. Abartma yok.",
            "Malzeme ve süreç hakkında somut bilgi ver.",
            "Gururu sessizce taşı — on yıllık güven konuşsun.",
            "Her zaman Türkçe yaz.",
          ],
          prohibitedWords: [
            "en iyi", "benzersiz", "eşsiz", "muhteşem", "harika", "inanılmaz",
            "mükemmel", "enfes", "nefis", "lüks", "kaliteli",
          ],
          exampleCopies: [
            "Her katman, bir tercih. Katkısız, boyasız — sadece gerçek malzeme.",
            "On yıldır aynı özen, aynı malzeme. Ve devam edeceğiz.",
            "Artizanal pastacılık, Antalya'nın kalbinde.",
            "Kalite, süreçte gizlidir. Biz o süreci atlamamayı seçiyoruz.",
            "Ne kattığımızı biliyoruz. Çünkü ne katmadığımız da bir o kadar önemli.",
          ],
          colors: [
            { name: "Beyaz (Arka Plan)", hex: "#FFFFFF" },
            { name: "Siyah (Yazı)", hex: "#000000" },
            { name: "Mustard (Vurgu)", hex: "#D4A945" },
            { name: "Brand Blue", hex: "#A4D1E8" },
            { name: "Brand Yellow", hex: "#E7C57D" },
            { name: "Brand Green", hex: "#A4D4BC" },
            { name: "Brand Peach", hex: "#F3D1C8" },
            { name: "Brand Orange", hex: "#E59A77" },
          ],
          channels: [
            { name: "Instagram", handle: "@sade.patisserie" },
            { name: "Website", handle: "sadepatisserie.com" },
          ],
          typography: {
            heading: "Santana Bold / Regular",
            body: "Cormorant Garamond Regular",
          },
        };

        await setBrandConfig("sade-patisserie", sadeConfig);

        response.json({
          success: true,
          message: "Sade Patisserie brand config Firestore'a yazıldı (brands/sade-patisserie)",
        });
      } catch (error) {
        errorResponse(response, error, "seedBrandConfig");
      }
    });
  });

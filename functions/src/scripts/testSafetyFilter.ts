/**
 * Safety Filter Test Script v3
 * Tam pipeline prompt + gerçek görseller ile kombinasyon testi
 *
 * Kullanım:
 *   cd functions
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/srtn_acikgoz_gmail.com_application_default_credentials.json \
 *   GEMINI_API_KEY=xxx npx ts-node src/scripts/testSafetyFilter.ts
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import * as admin from "firebase-admin";
import https from "https";
import http from "http";

// Firebase Admin init
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "instagram-automation-ad77b" });
}
const db = admin.firestore();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY environment variable gerekli");
  process.exit(1);
}

const MODEL = "gemini-3-pro-image-preview";
const client = new GoogleGenerativeAI(API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Bloklanmış pipeline'ın TAM prompt'u (log'dan birebir kopyalandı)
const FULL_PIPELINE_PROMPT = `SECTION 1 — REFERENCE OBJECTS (preserve exactly):
[1] MAIN PRODUCT — use exactly as shown
[2] PLATE — ceramic modern
[3] TABLE — marble modern
[4] NAPKIN — modern
[5] CUTLERY — modern
[6] CUP — ceramic, contains iced coffee latte

Match each reference object exactly. Do not replace, recolor, or add objects not shown in references.
The scene should contain ONLY the referenced objects arranged in the composition described below.

SECTION 2 — SCENE & ATMOSPHERE (creative direction):
Using uploaded image as reference for the product.

Professional lifestyle Instagram photo for Sade Patisserie.

ATMOSPHERE: Intimate cozy atmosphere. Homey comfort and relaxation. Soft warm light creating sense of safety and comfort. Personal quiet moment.
Color palette: warm beige, soft brown, cream, muted colors

LIGHTING: Strong backlighting creating rim light effect, highlighting translucent liquids and product edges. High contrast with specular highlights., 5500K tones.


ACCESSORIES: Include the following decorative accessories naturally in the scene: kitap, okuma gözlüğü. Place them organically on the table surface, complementing the main composition.
SCENE DIRECTION:
Composition: Rule-of-thirds placement, negative space in top third for typography.
A candid, close-up lifestyle photograph of a woman's Natural morning light in a bustling cafe atmosphere. Film grain.
- Bright sunshine, warm natural light with defined shadows
- Bright morning light, clean and fresh illumination, crisp shadows
- Lively social brunch atmosphere, warm and inviting

ENVIRONMENT CONSTRAINTS:
- NO high-rise views, NO skyscraper backgrounds, NO aerial city views
- Window views must show street-level perspective (ground floor)
- Ground floor artisan patisserie with street-level storefront. Natural morning sunlight creating long, soft shadows on the light wood flooring.

RULES:
- Use ONLY assets from reference images
- Product clearly recognizable from reference
- Single product, natural setting
- NO steam, NO smoke

9:16 vertical for Instagram Stories. Sharp focus on details, crisp textures.

WEATHER OVERRIDE: The scene MUST be overcast/cloudy. Soft, diffused, flat lighting. No direct sunlight. Muted, moody atmosphere.

THEME CONTEXT: A candid, close-up lifestyle photograph of a woman's slender hand with dark manicured nails and delicate finger tattoos. The hand is shown with a pinching grabbing action, holding a flaky golden croissant pastry over a rustic wooden table. Natural morning light in a bustling cafe atmosphere. Film grain.

ASSET RULE: Use the provided NAPKIN reference image exactly. Do not apply generic 'linen' or 'rustic' texture if it contradicts the reference. Keep the specific color/style of the reference napkin.

PHYSICAL LOGIC: This product is eaten with a fork. A fork may be visible near the product.

COMPOSITION - AMBIENT SCENE:
Product positioned naturally within atmospheric scene. Environmental context tells a story. Rich props and setting create mood and location sense. Product is part of a larger narrative moment.Cup:  ceramic (from reference)

--no , sun, sunlight, sunny, hard shadows, warm golden light, sunrise, sunset, bright rays, volumetric light

Return ONLY the edited image.`;

// Başarılı pipeline'ın prompt'u (referans label'ları farklı)
const SUCCESSFUL_PIPELINE_PROMPT = FULL_PIPELINE_PROMPT
  .replace("PLATE — ceramic modern", "PLATE — modern")
  .replace("TABLE — marble modern", "TABLE — metal modern");

interface TestResult {
  name: string;
  status: "success" | "blocked" | "error";
  blockReason?: string;
  safetyRatings?: string;
  durationMs: number;
  error?: string;
}

function downloadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const httpClient = url.startsWith("https") ? https : http;
    httpClient.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          downloadImageAsBase64(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

interface AssetInfo {
  id: string;
  filename: string;
  subType: string;
  cloudinaryUrl?: string;
  storageUrl?: string;
  material?: string;
  tags?: string[];
}

async function findAssets(query: { subType?: string; material?: string; category?: string }, limit = 5): Promise<AssetInfo[]> {
  let ref: FirebaseFirestore.Query = db.collection("assets").where("isActive", "==", true);
  if (query.subType) ref = ref.where("subType", "==", query.subType);
  if (query.category) ref = ref.where("category", "==", query.category);
  const snap = await ref.limit(limit).get();
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      filename: d.filename,
      subType: d.subType,
      cloudinaryUrl: d.cloudinaryUrl,
      storageUrl: d.storageUrl,
      material: d.visualProperties?.material,
      tags: d.tags,
    };
  });
}

async function loadAssetImage(asset: AssetInfo): Promise<string> {
  const url = asset.cloudinaryUrl || asset.storageUrl;
  if (!url) throw new Error(`URL yok: ${asset.filename}`);
  return downloadImageAsBase64(url);
}

async function runTest(name: string, contentParts: unknown[]): Promise<TestResult> {
  const start = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const genModel = client.getGenerativeModel({ model: MODEL, safetySettings });
    const result = await (genModel as any).generateContent(contentParts);
    const response = result.response;

    const promptFeedback = (response as any).promptFeedback;
    const blockReason = promptFeedback?.blockReason || null;
    const pfRatings = promptFeedback?.safetyRatings || [];

    if (!response.candidates || response.candidates.length === 0) {
      const ratingsStr = pfRatings.map((r: any) =>
        `${r.category}=${r.probability}${r.blocked ? " [BLOCKED]" : ""}`
      ).join(", ");
      console.log(`  ❌ BLOKLANDI! blockReason: ${blockReason}`);
      console.log(`  safetyRatings: ${ratingsStr}`);
      // Ekstra bilgiler
      if (promptFeedback) {
        const extra = Object.keys(promptFeedback).filter(k => k !== "blockReason" && k !== "safetyRatings");
        for (const k of extra) console.log(`  ${k}: ${JSON.stringify(promptFeedback[k])}`);
      }
      return { name, status: "blocked", blockReason: blockReason || "NO_CANDIDATES", safetyRatings: ratingsStr, durationMs: Date.now() - start };
    }

    const candidate = response.candidates[0];
    const hasImage = candidate.content?.parts?.some((p: any) => p.inlineData);
    const cRatings = (candidate as any).safetyRatings || [];
    const ratingsStr = cRatings.map((r: any) => `${r.category}=${r.probability}`).join(", ");

    console.log(`  ✅ BASARILI! Gorsel: ${hasImage ? "EVET" : "HAYIR"}`);
    if (ratingsStr) console.log(`  safetyRatings: ${ratingsStr}`);

    return { name, status: "success", safetyRatings: ratingsStr, durationMs: Date.now() - start };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`  ⚠️ HATA: ${errMsg}`);
    return { name, status: "error", error: errMsg, durationMs: Date.now() - start };
  }
}

async function main() {
  console.log(`Model: ${MODEL}`);
  console.log(`\n📦 Asset'ler yukleniyor...\n`);

  // Tüm asset tiplerini çek
  const plates = await findAssets({ subType: "plates" });
  const tables = await findAssets({ subType: "tables" });
  const napkins = await findAssets({ subType: "napkins" });
  const cutlery = await findAssets({ subType: "cutlery" });
  const cups = await findAssets({ subType: "cups" });
  const products = await findAssets({ subType: "pastas" }); // Bloklanmış pipeline pasta ürünü kullanıyor

  // Ürün yoksa croissant dene
  let productAssets = products;
  if (productAssets.length === 0) {
    productAssets = await findAssets({ subType: "croissants" });
  }

  console.log(`  Plates: ${plates.length} adet (${plates.map(a => `${a.filename}[${a.material || "?"}]`).join(", ")})`);
  console.log(`  Tables: ${tables.length} adet (${tables.map(a => `${a.filename}[${a.material || "?"}]`).join(", ")})`);
  console.log(`  Napkins: ${napkins.length}`);
  console.log(`  Cutlery: ${cutlery.length}`);
  console.log(`  Cups: ${cups.length}`);
  console.log(`  Products: ${productAssets.length}`);

  if (productAssets.length === 0) {
    console.error("Product asset bulunamadı!");
    process.exit(1);
  }

  // Görselleri yükle
  console.log(`\n📥 Görseller indiriliyor...\n`);
  const productBase64 = await loadAssetImage(productAssets[0]);
  console.log(`  Product: ${productAssets[0].filename} (${Math.round(productBase64.length / 1024)}KB)`);

  // Her plate ve table için base64 yükle
  const plateImages: Array<{ asset: AssetInfo; base64: string }> = [];
  for (const p of plates) {
    try {
      const b64 = await loadAssetImage(p);
      plateImages.push({ asset: p, base64: b64 });
      console.log(`  Plate: ${p.filename} [${p.material || "?"}] (${Math.round(b64.length / 1024)}KB)`);
    } catch (e) { console.log(`  ❌ Plate skip: ${p.filename}`); }
  }

  const tableImages: Array<{ asset: AssetInfo; base64: string }> = [];
  for (const t of tables) {
    try {
      const b64 = await loadAssetImage(t);
      tableImages.push({ asset: t, base64: b64 });
      console.log(`  Table: ${t.filename} [${t.material || "?"}] (${Math.round(b64.length / 1024)}KB)`);
    } catch (e) { console.log(`  ❌ Table skip: ${t.filename}`); }
  }

  // Sabit referanslar (napkin, cutlery, cup — ilk bulunan)
  const napkinBase64 = napkins.length > 0 ? await loadAssetImage(napkins[0]) : null;
  const cutleryBase64 = cutlery.length > 0 ? await loadAssetImage(cutlery[0]) : null;
  const cupBase64 = cups.length > 0 ? await loadAssetImage(cups[0]) : null;

  if (napkinBase64) console.log(`  Napkin: ${napkins[0].filename} (${Math.round(napkinBase64.length / 1024)}KB)`);
  if (cutleryBase64) console.log(`  Cutlery: ${cutlery[0].filename} (${Math.round(cutleryBase64.length / 1024)}KB)`);
  if (cupBase64) console.log(`  Cup: ${cups[0].filename} (${Math.round(cupBase64.length / 1024)}KB)`);

  // Sabit referansları hazırla
  const fixedRefs: unknown[] = [];
  if (napkinBase64) fixedRefs.push({ inlineData: { mimeType: "image/png", data: napkinBase64 } });
  if (cutleryBase64) fixedRefs.push({ inlineData: { mimeType: "image/png", data: cutleryBase64 } });
  if (cupBase64) fixedRefs.push({ inlineData: { mimeType: "image/png", data: cupBase64 } });

  const productPart = { inlineData: { mimeType: "image/png", data: productBase64 } };

  const results: TestResult[] = [];

  // ─── TEST 1: Tam bloklanmış prompt + dummy görseller ───
  const whitePng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  const dummyImages = Array(6).fill({ inlineData: { mimeType: "image/png", data: whitePng } });
  results.push(await runTest("1. Tam bloklanmis prompt + 6 DUMMY gorsel", [
    ...dummyImages,
    { text: FULL_PIPELINE_PROMPT },
  ]));

  // ─── TEST 2: Tam bloklanmış prompt + gerçek product + sabit referanslar (napkin, cutlery, cup) + her plate-table kombinasyonu ───
  let testNum = 2;
  for (const plate of plateImages) {
    for (const table of tableImages) {
      const testName = `${testNum}. Tam prompt + plate[${plate.asset.material || plate.asset.filename}] + table[${table.asset.material || table.asset.filename}]`;

      const parts = [
        productPart,
        { inlineData: { mimeType: "image/png", data: plate.base64 } },
        { inlineData: { mimeType: "image/png", data: table.base64 } },
        ...fixedRefs,
        { text: FULL_PIPELINE_PROMPT },
      ];

      results.push(await runTest(testName, parts));
      testNum++;
    }
  }

  // ─── SONUCLAR ───
  console.log(`\n${"=".repeat(60)}`);
  console.log("SONUCLAR TABLOSU");
  console.log(`${"=".repeat(60)}`);

  let blockedCount = 0;
  let successCount = 0;

  for (const r of results) {
    const icon = r.status === "success" ? "✅" : r.status === "blocked" ? "❌" : "⚠️";
    console.log(`  ${icon} ${r.name} (${r.durationMs}ms)`);
    if (r.blockReason) console.log(`     blockReason: ${r.blockReason}`);
    if (r.error) console.log(`     error: ${r.error}`);
    if (r.status === "blocked") blockedCount++;
    if (r.status === "success") successCount++;
  }

  console.log(`\n  TOPLAM: ${successCount} basarili, ${blockedCount} bloklandi, ${results.length - successCount - blockedCount} hata`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

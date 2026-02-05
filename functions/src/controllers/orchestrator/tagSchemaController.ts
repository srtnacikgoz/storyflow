/**
 * Tag Schema Controller
 * Tag şeması CRUD işlemleri
 *
 * Firestore Collection: tagSchemas/{categoryId}
 * Her asset kategorisi için yapılandırılmış tag şeması tutar.
 * Varsayılan şemalar auto-seed ile oluşturulur.
 */

import { functions, db, getCors, getConfig, REGION, errorResponse } from "./shared";
import { TagSchema, TagGroup, DEFAULT_TAG_SCHEMAS, StructuredTags } from "../../orchestrator/types";

/**
 * Tüm tag şemalarını listele
 * Firestore'daki şemalar + varsayılan şemalar birleştirilir
 */
export const listTagSchemas = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        // Firestore'daki şemaları al
        const snapshot = await db.collection("tagSchemas").orderBy("label").get();
        const firestoreSchemas: TagSchema[] = snapshot.docs.map((doc) => ({
          categoryId: doc.id,
          ...doc.data(),
        })) as TagSchema[];

        // Varsayılan şemaları kontrol et ve eksik olanları ekle
        const existingIds = firestoreSchemas.map((s) => s.categoryId);
        const missingDefaults = DEFAULT_TAG_SCHEMAS.filter(
          (ds) => !existingIds.includes(ds.categoryId)
        );

        // Eksik varsayılan şemaları Firestore'a ekle
        if (missingDefaults.length > 0) {
          const batch = db.batch();
          const now = Date.now();
          for (const schema of missingDefaults) {
            const ref = db.collection("tagSchemas").doc(schema.categoryId);
            batch.set(ref, {
              ...schema,
              createdAt: now,
              updatedAt: now,
            });
          }
          await batch.commit();
          console.log(`[listTagSchemas] Auto-seeded ${missingDefaults.length} default tag schemas`);
        }

        // Tüm şemaları birleştir ve döndür
        const now = Date.now();
        const allSchemas = [
          ...firestoreSchemas,
          ...missingDefaults.map((s) => ({ ...s, createdAt: now, updatedAt: now })),
        ].sort((a, b) => a.label.localeCompare(b.label, "tr"));

        response.json({ success: true, data: allSchemas });
      } catch (error) {
        errorResponse(response, error, "listTagSchemas");
      }
    });
  });

/**
 * Tek bir tag şemasını getir (categoryId ile)
 */
export const getTagSchema = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const categoryId = request.query.categoryId as string;

        if (!categoryId) {
          response.status(400).json({ success: false, error: "categoryId is required" });
          return;
        }

        const docRef = db.collection("tagSchemas").doc(categoryId);
        const doc = await docRef.get();

        if (!doc.exists) {
          // Varsayılan şemada var mı kontrol et
          const defaultSchema = DEFAULT_TAG_SCHEMAS.find((s) => s.categoryId === categoryId);
          if (defaultSchema) {
            // Varsayılanı Firestore'a yaz ve döndür
            const now = Date.now();
            const schema: TagSchema = { ...defaultSchema, createdAt: now, updatedAt: now };
            await docRef.set(schema);
            console.log(`[getTagSchema] Auto-created default schema for: ${categoryId}`);
            response.json({ success: true, data: schema });
            return;
          }

          response.status(404).json({ success: false, error: "Tag schema not found" });
          return;
        }

        response.json({ success: true, data: { categoryId: doc.id, ...doc.data() } });
      } catch (error) {
        errorResponse(response, error, "getTagSchema");
      }
    });
  });

/**
 * Tag şemasını güncelle
 * Kullanımlar:
 * - Grup ekleme/güncelleme
 * - Seçenek ekleme/güncelleme
 * - Seçenek silme (sadece isSystem: false olanlar)
 * - Grup sıralama değiştirme
 */
export const updateTagSchema = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "PUT" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use PUT or POST" });
          return;
        }

        const { categoryId, groups, label } = request.body;

        if (!categoryId) {
          response.status(400).json({ success: false, error: "categoryId is required" });
          return;
        }

        const docRef = db.collection("tagSchemas").doc(categoryId);
        const doc = await docRef.get();

        if (!doc.exists) {
          response.status(404).json({ success: false, error: "Tag schema not found" });
          return;
        }

        const updateData: Partial<TagSchema> = {
          updatedAt: Date.now(),
        };

        if (label !== undefined) updateData.label = label;
        if (groups !== undefined) updateData.groups = groups;

        await docRef.update(updateData);

        const updated = await docRef.get();
        console.log(`[updateTagSchema] Updated tag schema: ${categoryId}`);
        response.json({ success: true, data: { categoryId, ...updated.data() } });
      } catch (error) {
        errorResponse(response, error, "updateTagSchema");
      }
    });
  });

/**
 * Tag şemasına yeni seçenek ekle (tenant genişletme)
 * Mevcut gruba yeni bir seçenek ekler (isSystem: false)
 */
export const addTagOption = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { categoryId, groupKey, value, label } = request.body;

        if (!categoryId || !groupKey || !value || !label) {
          response.status(400).json({
            success: false,
            error: "categoryId, groupKey, value, and label are required",
          });
          return;
        }

        const docRef = db.collection("tagSchemas").doc(categoryId);
        const doc = await docRef.get();

        if (!doc.exists) {
          response.status(404).json({ success: false, error: "Tag schema not found" });
          return;
        }

        const schema = doc.data() as TagSchema;
        const group = schema.groups.find((g) => g.key === groupKey);

        if (!group) {
          response.status(404).json({ success: false, error: `Group '${groupKey}' not found` });
          return;
        }

        // Aynı value var mı kontrol et
        if (group.options.some((o) => o.value === value)) {
          response.status(400).json({
            success: false,
            error: `Option '${value}' already exists in group '${groupKey}'`,
          });
          return;
        }

        // Yeni seçeneği ekle
        group.options.push({
          value,
          label,
          isSystem: false,
          addedBy: "admin", // SaaS'ta tenant ID olacak
        });

        await docRef.update({
          groups: schema.groups,
          updatedAt: Date.now(),
        });

        console.log(`[addTagOption] Added option '${value}' to ${categoryId}/${groupKey}`);
        response.json({ success: true, data: { ...schema, categoryId, updatedAt: Date.now() } });
      } catch (error) {
        errorResponse(response, error, "addTagOption");
      }
    });
  });

/**
 * Tag şemasından seçenek sil
 * Sadece isSystem: false olan seçenekler silinebilir
 */
export const removeTagOption = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "DELETE" && request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use DELETE or POST" });
          return;
        }

        const { categoryId, groupKey, value } = request.body;

        if (!categoryId || !groupKey || !value) {
          response.status(400).json({
            success: false,
            error: "categoryId, groupKey, and value are required",
          });
          return;
        }

        const docRef = db.collection("tagSchemas").doc(categoryId);
        const doc = await docRef.get();

        if (!doc.exists) {
          response.status(404).json({ success: false, error: "Tag schema not found" });
          return;
        }

        const schema = doc.data() as TagSchema;
        const group = schema.groups.find((g) => g.key === groupKey);

        if (!group) {
          response.status(404).json({ success: false, error: `Group '${groupKey}' not found` });
          return;
        }

        const option = group.options.find((o) => o.value === value);
        if (!option) {
          response.status(404).json({ success: false, error: `Option '${value}' not found` });
          return;
        }

        if (option.isSystem) {
          response.status(400).json({
            success: false,
            error: "Sistem tanımlı seçenekler silinemez",
          });
          return;
        }

        // Seçeneği sil
        group.options = group.options.filter((o) => o.value !== value);

        await docRef.update({
          groups: schema.groups,
          updatedAt: Date.now(),
        });

        console.log(`[removeTagOption] Removed option '${value}' from ${categoryId}/${groupKey}`);
        response.json({ success: true, message: "Option removed" });
      } catch (error) {
        errorResponse(response, error, "removeTagOption");
      }
    });
  });

/**
 * AI Auto-Tag: Görseli Gemini Vision ile analiz ederek prompt-odaklı etiketler üretir
 *
 * POST body: { imageUrl: string, categoryId: string }
 * Response: { success: true, data: { tags: string[], model: string } }
 *
 * Üretilen etiketler doğrudan Asset.tags[] alanına yazılır ve
 * görsel üretim pipeline'ında ASSET CONSTRAINTS olarak kullanılır.
 */
export const autoTagAsset = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        if (request.method !== "POST") {
          response.status(405).json({ success: false, error: "Use POST" });
          return;
        }

        const { imageUrl, categoryId } = request.body;

        if (!imageUrl || !categoryId) {
          response.status(400).json({
            success: false,
            error: "imageUrl and categoryId are required",
          });
          return;
        }

        // 1. Görseli indir ve base64'e çevir
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          response.status(400).json({
            success: false,
            error: `Image download failed: ${imageResponse.status}`,
          });
          return;
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const imageBase64 = imageBuffer.toString("base64");
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

        // 2. Gemini Vision ile analiz et - prompt-odaklı etiketler üret
        const config = await getConfig();
        const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import("@google/generative-ai");

        const client = new GoogleGenerativeAI(config.gemini.apiKey);

        const safetySettings = [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const systemPrompt = `You are a senior product photographer and material analyst for a premium bakery/cafe.
Your task is to deconstruct an asset image into its Visual DNA — a set of dimensional tags used as ASSET CONSTRAINTS in a photorealistic image generation prompt.

These tags directly control how the AI image generator reproduces this item. They MUST be visually accurate, non-redundant, and useful for faithful reproduction.

DIMENSIONS (produce exactly ONE tag per dimension):
1. material: Primary material and its quality (e.g. "white porcelain", "clear glass", "dark walnut wood")
2. color: Dominant color or color palette (e.g. "warm ivory", "charcoal gray", "golden brown")
3. texture: Surface texture or finish (e.g. "glossy smooth", "matte embossed floral", "rough handmade")
4. form: Shape and structural features (e.g. "round with irregular rim", "tall cylindrical", "flaky layered")
5. character: The single most distinctive visual trait (e.g. "gold rim accent", "hand-painted blue motif", "rustic cracks")

RULES:
- Each tag: 1-4 words, lowercase, English.
- NO semantic overlap between dimensions. If "embossed floral" is in texture, do NOT repeat "floral" in character.
- Do NOT include the category name itself (e.g. don't say "plate" for a plate, don't say "croissant" for a croissant).
- Return a JSON object with dimension keys.`;

        const userPrompt = `Analyze this "${categoryId}" item for a premium bakery/cafe photoshoot.

Deconstruct its visual properties into exactly 5 dimensions.

Example output:
{
  "material": "white porcelain",
  "color": "warm ivory",
  "texture": "glossy smooth",
  "form": "round shallow bowl",
  "character": "gold rim accent"
}

Return ONLY the JSON object:`;

        const genModel = client.getGenerativeModel({
          model: "gemini-3-flash-preview",
          safetySettings,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
          systemInstruction: systemPrompt,
        });

        const result = await genModel.generateContent([
          { inlineData: { data: imageBase64, mimeType: contentType } },
          { text: userPrompt },
        ]);

        const rawText = result.response.text();
        let validatedTags: string[];

        // JSON parse - truncated response'u da kurtarmaya çalış
        const text = rawText.trim();
        let parsed: unknown;

        try {
          parsed = JSON.parse(text);
        } catch {
          // JSON yarım kalmış olabilir - tamamlamayı dene
          try {
            // Obje yarım kaldıysa kapat
            if (text.startsWith("{")) {
              // Son tam "key": "value" çiftine kadar kes ve kapat
              const lastQuote = text.lastIndexOf('"');
              const trimmed = text.substring(0, lastQuote + 1) + "}";
              parsed = JSON.parse(trimmed);
            } else if (text.startsWith("[")) {
              const lastQuote = text.lastIndexOf('"');
              const trimmed = text.substring(0, lastQuote + 1) + "]";
              parsed = JSON.parse(trimmed);
            }
          } catch {
            // Kurtarılamadı
          }

          if (!parsed) {
            console.error("[autoTagAsset] JSON parse error:", text.substring(0, 200));
            response.status(500).json({
              success: false,
              error: "AI response could not be parsed",
            });
            return;
          }
        }

        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          // Boyut bazlı JSON obje → string[]'e çevir
          const dimensions = ["material", "color", "texture", "form", "character"];
          const obj = parsed as Record<string, unknown>;
          validatedTags = dimensions
            .filter((dim) => obj[dim] && typeof obj[dim] === "string")
            .map((dim) => (obj[dim] as string).trim().toLowerCase());
        } else if (Array.isArray(parsed)) {
          // Fallback: düz array döndüyse direkt kullan
          validatedTags = (parsed as unknown[])
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
            .map((t) => t.trim().toLowerCase());
        } else {
          validatedTags = [];
        }

        // Boş sonuç kontrolü
        if (validatedTags.length === 0) {
          console.error("[autoTagAsset] No valid tags generated:", text);
          response.status(500).json({
            success: false,
            error: "AI could not generate valid tags for this image",
          });
          return;
        }

        console.log(`[autoTagAsset] AI tagged ${categoryId}: [${validatedTags.join(", ")}]`);

        response.json({
          success: true,
          data: {
            tags: validatedTags,
            model: "gemini-3-flash-preview",
          },
        });
      } catch (error) {
        errorResponse(response, error, "autoTagAsset");
      }
    });
  });

/**
 * Tag şemasından Gemini'ye gönderilecek prompt metnini oluşturur
 */
function buildSchemaPrompt(groups: TagGroup[]): string {
  return groups
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((group) => {
      const selectType = group.multiSelect ? "MULTI-SELECT" : "SINGLE-SELECT";
      const required = group.required ? "REQUIRED" : "OPTIONAL";
      const options = group.options.map((o) => `"${o.value}" (${o.label})`).join(", ");
      return `- "${group.key}" (${group.label}) [${selectType}, ${required}]: ${options}`;
    })
    .join("\n");
}

/**
 * AI'ın önerdiği tag'leri şemaya göre validate eder
 * Sadece şemadaki geçerli değerleri kabul eder
 */
function validateAutoTags(tags: StructuredTags, groups: TagGroup[]): StructuredTags {
  const validated: StructuredTags = {};

  for (const group of groups) {
    const value = tags[group.key];
    if (!value) continue;

    const validValues = group.options.map((o) => o.value);

    if (group.multiSelect) {
      // Çoklu seçim - array olmalı
      const arr = Array.isArray(value) ? value : [value];
      const filtered = arr.filter((v) => validValues.includes(v as string));
      if (filtered.length > 0) {
        validated[group.key] = filtered;
      }
    } else {
      // Tekli seçim - string olmalı
      const str = Array.isArray(value) ? value[0] : value;
      if (validValues.includes(str as string)) {
        validated[group.key] = str;
      }
    }
  }

  return validated;
}


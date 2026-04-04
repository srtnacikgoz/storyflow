/**
 * Poster Learning Service
 * Kullanıcı feedback'lerinden öğrenerek stil düzeltmeleri üretir
 * Claude'a birikmiş geri bildirimleri özetletir → learnedCorrections günceller
 */

import { getFirestore } from "firebase-admin/firestore";
import { getSystemSettings } from "./configService";
import { PosterGalleryItem, PosterGlobalRules } from "../types/poster";

const db = getFirestore();
const POSTER_CONFIG_PATH = "global/config/poster-config";
const GALLERY_PATH = "global/posters/items";

/**
 * Bir stil için feedback'lerden öğren → learnedCorrections güncelle
 */
export async function learnFromFeedback(styleId: string): Promise<{
  feedbackCount: number;
  corrections: Record<string, string>;
}> {
  // Bu stil için feedback'li galeri item'larını al
  const snapshot = await db.collection(GALLERY_PATH)
    .where("styleId", "==", styleId)
    .where("rating", ">", 0)
    .orderBy("rating", "asc") // Düşük puanlılar önce
    .limit(10)
    .get();

  if (snapshot.empty) {
    return { feedbackCount: 0, corrections: {} };
  }

  const feedbacks = snapshot.docs
    .map(doc => doc.data() as PosterGalleryItem)
    .filter(item => item.feedbackCategories?.length || item.feedbackNote);

  if (feedbacks.length < 1) {
    return { feedbackCount: 0, corrections: {} };
  }

  // Mevcut stil dokümanını al
  const styleDoc = await db
    .collection(`${POSTER_CONFIG_PATH}/styles/items`)
    .doc(styleId)
    .get();

  if (!styleDoc.exists) {
    throw new Error(`Stil bulunamadı: ${styleId}`);
  }

  const currentCorrections = styleDoc.data()?.learnedCorrections || {};

  // Anthropic API key al
  const systemSettings = await getSystemSettings();
  const anthropicApiKey = systemSettings?.anthropicApiKey;
  if (!anthropicApiKey) {
    throw new Error("Anthropic API key tanımlı değil");
  }
  const learningModel = systemSettings?.posterLearningModel;
  if (!learningModel) {
    throw new Error("Poster learning modeli Firestore'da tanımlı değil (Ayarlar > AI Model Seçimi)");
  }

  // Feedback özetini hazırla
  const feedbackSummary = feedbacks.map((f, i) => {
    const cats = f.feedbackCategories?.join(", ") || "genel";
    const note = f.feedbackNote || "";
    const rating = f.rating || 0;
    return `#${i + 1} (puan: ${rating}/5, kategoriler: ${cats}): ${note}`;
  }).join("\n");

  const currentCorrectionsText = Object.keys(currentCorrections).length > 0
    ? Object.entries(currentCorrections).map(([k, v]) => `${k}: ${v}`).join("\n")
    : "Henüz düzeltme yok.";

  // Claude'a öğrenme prompt'u gönder
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const result = await anthropic.messages.create({
    model: learningModel,
    max_tokens: 800,
    system: `You are a design system optimizer. You analyze user feedback about AI-generated posters and produce concise correction notes.

RULES:
- Each correction is max 2 sentences
- Categories: background, typography, product-placement, text-content, composition, color
- Only include categories that have actual feedback
- If existing corrections exist, IMPROVE them (don't just append)
- Be specific: "Use textured backgrounds with subtle grain" not "Make backgrounds better"
- Write corrections in English (they go into Gemini prompts)
- Output ONLY valid JSON: {"category": "correction text", ...}`,
    messages: [{
      role: "user",
      content: `Style: "${styleId}"

Current corrections:
${currentCorrectionsText}

New user feedback (${feedbacks.length} items):
${feedbackSummary}

Analyze all feedback and produce updated corrections. Merge with existing ones — improve, don't bloat. Return ONLY JSON.`,
    }],
  });

  // JSON parse
  const responseText = result.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim();

  let corrections: Record<string, string> = {};
  try {
    // JSON bloğunu bul
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      corrections = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[PosterLearning] JSON parse hatası:", responseText);
    throw new Error("Claude yanıtı parse edilemedi");
  }

  // Firestore'da stil dokümanını güncelle
  await db.collection(`${POSTER_CONFIG_PATH}/styles/items`).doc(styleId).update({
    learnedCorrections: corrections,
    lastLearnedAt: Date.now(),
  });

  console.log(`[PosterLearning] ${styleId}: ${feedbacks.length} feedback → ${Object.keys(corrections).length} düzeltme`);

  return { feedbackCount: feedbacks.length, corrections };
}

/**
 * Global kuralları oku
 */
export async function getGlobalRules(): Promise<PosterGlobalRules> {
  const doc = await db.doc(`${POSTER_CONFIG_PATH}/global-rules`).get();
  if (!doc.exists) {
    return { rules: [], updatedAt: 0 };
  }
  return doc.data() as PosterGlobalRules;
}

/**
 * Global kuralları güncelle
 */
export async function updateGlobalRules(rules: string[]): Promise<void> {
  await db.doc(`${POSTER_CONFIG_PATH}/global-rules`).set({
    rules,
    updatedAt: Date.now(),
    updatedBy: "admin",
  });
}

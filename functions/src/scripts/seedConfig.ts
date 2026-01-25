/**
 * Seed Config Script
 * Firestore'a varsayılan orchestrator config'lerini yükler.
 *
 * Kullanım: npx ts-node src/scripts/seedConfig.ts
 *
 * Gemini terminoloji verileri için:
 * npx ts-node src/scripts/seedConfig.ts --gemini-only
 */

import * as admin from "firebase-admin";
import { getAllSeedData } from "../orchestrator/seed/defaultData";
import { getGeminiTerminologySeedData } from "../orchestrator/seed/geminiTerminologyData";

// Firebase Admin SDK başlat (application default credentials)
admin.initializeApp({
  projectId: "instagram-automation-ad77b",
});

const db = admin.firestore();

/**
 * Gemini terminoloji verilerini yükle
 */
async function seedGeminiTerminology(): Promise<void> {
  console.log("🎨 Gemini Terminoloji verileri yükleniyor...\n");

  const geminiData = getGeminiTerminologySeedData();
  const batch = db.batch();

  const presetsRef = db.collection("global").doc("config").collection("gemini-presets");

  // Işıklandırma preset'leri
  console.log(`💡 ${geminiData.lightingPresets.length} ışıklandırma preset'i yükleniyor...`);
  for (const preset of geminiData.lightingPresets) {
    batch.set(presetsRef.doc("lighting-presets").collection("items").doc(preset.id), preset);
  }

  // El pozları
  console.log(`✋ ${geminiData.handPoses.length} el pozu yükleniyor...`);
  for (const pose of geminiData.handPoses) {
    batch.set(presetsRef.doc("hand-poses").collection("items").doc(pose.id), pose);
  }

  // Kompozisyon şablonları
  console.log(`📐 ${geminiData.compositionTemplates.length} kompozisyon şablonu yükleniyor...`);
  for (const template of geminiData.compositionTemplates) {
    batch.set(presetsRef.doc("composition-templates").collection("items").doc(template.id), template);
  }

  // Mood tanımları
  console.log(`🎭 ${geminiData.moodDefinitions.length} mood tanımı yükleniyor...`);
  for (const mood of geminiData.moodDefinitions) {
    batch.set(presetsRef.doc("mood-definitions").collection("items").doc(mood.id), mood);
  }

  // Ürün doku profilleri
  console.log(`🍰 ${geminiData.productTextureProfiles.length} ürün doku profili yükleniyor...`);
  for (const profile of geminiData.productTextureProfiles) {
    batch.set(presetsRef.doc("product-textures").collection("items").doc(profile.id), profile);
  }

  // Negative prompt setleri
  console.log(`🚫 ${geminiData.negativePromptSets.length} negative prompt seti yükleniyor...`);
  for (const npSet of geminiData.negativePromptSets) {
    batch.set(presetsRef.doc("negative-prompts").collection("items").doc(npSet.id), npSet);
  }

  await batch.commit();

  console.log("\n✅ Gemini Terminoloji seed tamamlandı!");
  console.log(`
📊 Özet:
- ${geminiData.lightingPresets.length} ışıklandırma preset'i
- ${geminiData.handPoses.length} el pozu
- ${geminiData.compositionTemplates.length} kompozisyon şablonu
- ${geminiData.moodDefinitions.length} mood tanımı
- ${geminiData.productTextureProfiles.length} ürün doku profili
- ${geminiData.negativePromptSets.length} negative prompt seti
`);
}

async function seedFirestoreConfig(): Promise<void> {
  console.log("🌱 Seed data yükleniyor...\n");

  const seedData = getAllSeedData();
  const batch = db.batch();

  // Senaryoları yükle
  console.log(`📋 ${seedData.scenarios.length} senaryo yükleniyor...`);
  for (const scenario of seedData.scenarios) {
    const ref = db
      .collection("global")
      .doc("scenarios")
      .collection("items")
      .doc(scenario.id);
    batch.set(ref, scenario);
  }

  // El stillerini yükle
  console.log(`✋ ${seedData.handStyles.length} el stili yükleniyor...`);
  for (const handStyle of seedData.handStyles) {
    const ref = db
      .collection("global")
      .doc("hand-styles")
      .collection("items")
      .doc(handStyle.id);
    batch.set(ref, handStyle);
  }

  // Asset kişiliklerini yükle
  console.log(`🎭 ${seedData.assetPersonalities.length} asset kişiliği yükleniyor...`);
  for (const personality of seedData.assetPersonalities) {
    const ref = db
      .collection("global")
      .doc("asset-personalities")
      .collection("items")
      .doc(personality.assetId);
    batch.set(ref, personality);
  }

  // Config'leri yükle
  const configRef = db.collection("global").doc("config").collection("settings");

  console.log("⚙️ Çeşitlilik kuralları yükleniyor...");
  batch.set(configRef.doc("diversity-rules"), seedData.diversityRules);

  console.log("🕐 Zaman-mood eşleştirmesi yükleniyor...");
  batch.set(configRef.doc("time-mood"), seedData.timeMoodConfig);

  console.log("📅 Haftalık temalar yükleniyor...");
  batch.set(configRef.doc("weekly-themes"), seedData.weeklyThemesConfig);

  console.log("🚫 Mutlak kurallar yükleniyor...");
  batch.set(configRef.doc("absolute-rules"), seedData.absoluteRulesConfig);

  console.log("📝 Orchestrator talimatları yükleniyor...");
  batch.set(configRef.doc("orchestrator-instructions"), seedData.orchestratorInstructions);

  // Batch commit
  console.log("\n💾 Firestore'a yazılıyor...");
  await batch.commit();

  console.log("\n✅ Seed tamamlandı!");
  console.log(`
📊 Özet:
- ${seedData.scenarios.length} senaryo
- ${seedData.handStyles.length} el stili
- ${seedData.assetPersonalities.length} asset kişiliği
- 5 config dosyası
`);
}

// Çalıştır
const args = process.argv.slice(2);
const geminiOnly = args.includes("--gemini-only");
const skipGemini = args.includes("--skip-gemini");

async function main() {
  if (geminiOnly) {
    // Sadece Gemini terminoloji verilerini yükle
    await seedGeminiTerminology();
  } else {
    // Ana config verilerini yükle
    await seedFirestoreConfig();

    // Gemini verilerini de yükle (skip flag yoksa)
    if (!skipGemini) {
      console.log("\n" + "=".repeat(50) + "\n");
      await seedGeminiTerminology();
    }
  }
}

main()
  .then(() => {
    console.log("\n🎉 Script tamamlandı.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Hata:", error);
    process.exit(1);
  });

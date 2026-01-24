/**
 * Seed Config Script
 * Firestore'a varsayılan orchestrator config'lerini yükler.
 *
 * Kullanım: npx ts-node src/scripts/seedConfig.ts
 */

import * as admin from "firebase-admin";
import { getAllSeedData } from "../orchestrator/seed/defaultData";

// Firebase Admin SDK başlat (application default credentials)
admin.initializeApp({
  projectId: "instagram-automation-ad77b",
});

const db = admin.firestore();

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
seedFirestoreConfig()
  .then(() => {
    console.log("Script tamamlandı.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Hata:", error);
    process.exit(1);
  });

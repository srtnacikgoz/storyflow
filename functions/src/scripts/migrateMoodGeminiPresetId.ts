/**
 * Mood Migration Script
 *
 * Bu script, Firestore'daki moods collection'ındaki tüm doc'lara
 * timeOfDay'e göre geminiPresetId atıyor.
 *
 * Kullanım:
 * npx ts-node src/scripts/migrateMoodGeminiPresetId.ts
 *
 * NOT: Bu script bir kez çalıştırılmalı. İdempotent - tekrar çalıştırılabilir.
 */

import * as admin from "firebase-admin";

// Firebase Admin SDK başlat
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Gemini preset ID'leri mapping
// timeOfDay → geminiPresetId
const PRESET_MAPPING: Record<string, string> = {
  morning: "morning-ritual",     // Sabah ritüeli - taze, aydınlık
  afternoon: "bright-airy",      // Aydınlık/Ferah - öğleden sonra için uygun
  evening: "cozy-intimate",      // Samimi/Sıcak - akşam için uygun
  night: "cozy-intimate",        // Samimi/Sıcak - gece için uygun
  any: "bright-airy",            // Varsayılan - genel kullanım
};

// Weather bazlı override (opsiyonel)
const WEATHER_OVERRIDE: Record<string, string> = {
  rainy: "cozy-intimate",        // Yağmurlu hava → sıcak atmosfer
  snowy: "cozy-intimate",        // Karlı hava → sıcak atmosfer
  cloudy: "cozy-intimate",       // Bulutlu hava → sıcak atmosfer
};

async function migrateMoods() {
  console.log("🚀 Starting mood migration...");
  console.log("📋 Preset mapping:", PRESET_MAPPING);

  const moodsRef = db.collection("moods");
  const snapshot = await moodsRef.get();

  if (snapshot.empty) {
    console.log("⚠️ No moods found in collection");
    return;
  }

  console.log(`📊 Found ${snapshot.size} moods to process`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const moodId = doc.id;
    const moodName = data.name || "Unknown";

    // Zaten geminiPresetId varsa skip
    if (data.geminiPresetId) {
      console.log(`⏭️ Skipping "${moodName}" (${moodId}) - already has geminiPresetId: ${data.geminiPresetId}`);
      skipped++;
      continue;
    }

    try {
      // timeOfDay'e göre preset belirle
      const timeOfDay = data.timeOfDay || "any";
      let presetId = PRESET_MAPPING[timeOfDay] || "bright-airy";

      // Weather override kontrol
      const weather = data.weather;
      if (weather && WEATHER_OVERRIDE[weather]) {
        presetId = WEATHER_OVERRIDE[weather];
        console.log(`  🌧️ Weather override: ${weather} → ${presetId}`);
      }

      // Güncelle
      await doc.ref.update({
        geminiPresetId: presetId,
        updatedAt: Date.now(),
      });

      console.log(`✅ Updated "${moodName}" (${moodId}): timeOfDay=${timeOfDay}, weather=${weather || "any"} → geminiPresetId=${presetId}`);
      updated++;
    } catch (error) {
      console.error(`❌ Error updating "${moodName}" (${moodId}):`, error);
      errors++;
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📋 Total: ${snapshot.size}`);
}

// Script'i çalıştır
migrateMoods()
  .then(() => {
    console.log("\n✨ Migration completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });

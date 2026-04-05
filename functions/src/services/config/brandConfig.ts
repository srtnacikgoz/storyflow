/**
 * Brand Config Service
 * Multi-tenant marka konfigürasyonu — Firestore'da brands/{brandId}
 */

import { getDb } from "./configCache";

export interface BrandVoiceConfig {
  name: string;
  voiceRules: string[];
  prohibitedWords: string[];
  exampleCopies: string[];
  colors: { name: string; hex: string }[];
  channels: { name: string; handle: string }[];
  typography: {
    heading: string;
    body: string;
  };
}

const BRANDS_COLLECTION = "brands";

export async function getBrandConfig(brandId: string): Promise<BrandVoiceConfig> {
  const db = getDb();
  const doc = await db.collection(BRANDS_COLLECTION).doc(brandId).get();

  if (!doc.exists) {
    throw new Error(
      `Marka konfigürasyonu bulunamadı: brands/${brandId}. ` +
      `Lütfen önce /seedBrandConfig endpoint'ini çağırın.`
    );
  }

  return doc.data() as BrandVoiceConfig;
}

export async function setBrandConfig(brandId: string, config: BrandVoiceConfig): Promise<void> {
  const db = getDb();
  await db.collection(BRANDS_COLLECTION).doc(brandId).set(config, { merge: true });
}

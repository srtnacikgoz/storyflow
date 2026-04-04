/**
 * Scenario CRUD — Senaryo ekleme, güncelleme, silme
 */

import { FirestoreScenario } from "../../orchestrator/types";
import { getDb, clearConfigCache } from "./configCache";

/**
 * Yeni senaryo ekler
 */
export async function addScenario(scenario: Omit<FirestoreScenario, "createdAt" | "updatedAt">): Promise<void> {
  const now = Date.now();
  await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenario.id)
    .set({
      ...scenario,
      createdAt: now,
      updatedAt: now,
    });

  clearConfigCache();
}

/**
 * Tek bir senaryoyu günceller
 */
export async function updateScenario(
  scenarioId: string,
  updates: Partial<FirestoreScenario>
): Promise<void> {
  await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenarioId)
    .update({
      ...updates,
      updatedAt: Date.now(),
    });

  clearConfigCache();
}

/**
 * Senaryo siler (hard delete)
 */
export async function deleteScenario(scenarioId: string): Promise<void> {
  await getDb()
    .collection("global")
    .doc("scenarios")
    .collection("items")
    .doc(scenarioId)
    .delete();

  clearConfigCache();
}

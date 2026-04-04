/**
 * Prompt Studio — Prompt template CRUD
 * System prompt'ları tek bir dokümanda saklar ve versiyonlar.
 */

import {
  FirestorePromptStudioConfig,
  PromptTemplate,
  PromptVersion,
  PromptStageId,
} from "../../orchestrator/types";
import {
  DEFAULT_PROMPT_STUDIO_CONFIG,
  DEFAULT_PROMPT_TEMPLATES,
} from "../../orchestrator/seed/defaultData";
import { CACHE_TTL, getDb, registerCacheClear } from "./configCache";

// Prompt Studio Cache
let promptStudioCache: FirestorePromptStudioConfig | null = null;
let promptStudioCacheTimestamp = 0;

// Cache temizleme kaydı
registerCacheClear(() => {
  promptStudioCache = null;
  promptStudioCacheTimestamp = 0;
});

/**
 * Prompt Studio cache'ini temizler
 */
export function clearPromptStudioCache(): void {
  promptStudioCache = null;
  promptStudioCacheTimestamp = 0;
  console.log("[ConfigService] Prompt Studio cache cleared");
}

/**
 * Prompt Studio config'ini getirir (CACHE'Lİ)
 * Document: global/config/settings/prompt-studio
 */
export async function getPromptStudioConfig(): Promise<FirestorePromptStudioConfig> {
  const now = Date.now();

  if (promptStudioCache && now - promptStudioCacheTimestamp < CACHE_TTL) {
    return promptStudioCache;
  }

  try {
    const doc = await getDb()
      .collection("global")
      .doc("config")
      .collection("settings")
      .doc("prompt-studio")
      .get();

    if (!doc.exists) {
      const defaultConfig: FirestorePromptStudioConfig = {
        ...DEFAULT_PROMPT_STUDIO_CONFIG,
        prompts: Object.fromEntries(
          Object.entries(DEFAULT_PROMPT_TEMPLATES).map(([key, template]) => [
            key,
            { ...template, updatedAt: now },
          ])
        ) as FirestorePromptStudioConfig["prompts"],
        updatedAt: now,
      };
      promptStudioCache = defaultConfig;
      promptStudioCacheTimestamp = now;
      return defaultConfig;
    }

    promptStudioCache = doc.data() as FirestorePromptStudioConfig;
    promptStudioCacheTimestamp = now;
    return promptStudioCache;
  } catch (error) {
    console.error("[ConfigService] Error loading prompt studio, using defaults:", error);
    const fallbackConfig: FirestorePromptStudioConfig = {
      ...DEFAULT_PROMPT_STUDIO_CONFIG,
      prompts: Object.fromEntries(
        Object.entries(DEFAULT_PROMPT_TEMPLATES).map(([key, template]) => [
          key,
          { ...template, updatedAt: now },
        ])
      ) as FirestorePromptStudioConfig["prompts"],
      updatedAt: now,
    };
    return fallbackConfig;
  }
}

/**
 * Belirli bir prompt template'i getirir
 */
export async function getPromptTemplate(id: PromptStageId): Promise<PromptTemplate> {
  const config = await getPromptStudioConfig();
  const template = config.prompts[id];

  if (!template) {
    const defaultTemplate = DEFAULT_PROMPT_TEMPLATES[id];
    if (defaultTemplate) {
      return {
        ...defaultTemplate,
        updatedAt: Date.now(),
      } as PromptTemplate;
    }
    throw new Error(`Prompt template not found: ${id}`);
  }

  return template;
}

/**
 * Prompt template'i günceller
 * Eski versiyonu history'ye ekler
 */
export async function updatePromptTemplate(
  id: PromptStageId,
  prompt: string,
  updatedBy?: string,
  note?: string
): Promise<PromptTemplate> {
  const db = getDb();
  const docRef = db.collection("global").doc("config").collection("settings").doc("prompt-studio");

  const config = await getPromptStudioConfig();
  const existingTemplate = config.prompts[id];

  if (!existingTemplate) {
    throw new Error(`Prompt template not found: ${id}`);
  }

  const newVersion = existingTemplate.version + 1;
  const now = Date.now();

  const historyEntry: PromptVersion = {
    version: existingTemplate.version,
    systemPrompt: existingTemplate.systemPrompt,
    updatedAt: existingTemplate.updatedAt,
    updatedBy: existingTemplate.updatedBy,
  };

  const updatedHistory = [historyEntry, ...(existingTemplate.history || [])].slice(0, 10);

  const updatedTemplate: PromptTemplate = {
    ...existingTemplate,
    systemPrompt: prompt,
    version: newVersion,
    history: updatedHistory,
    updatedAt: now,
    updatedBy,
  };

  await docRef.update({
    [`prompts.${id}`]: updatedTemplate,
    updatedAt: now,
    updatedBy,
  });

  clearPromptStudioCache();

  console.log(`[ConfigService] Prompt template updated: ${id} v${newVersion}`);
  return updatedTemplate;
}

/**
 * Prompt template'i eski bir versiyona geri döndürür
 */
export async function revertPromptTemplate(
  id: PromptStageId,
  version: number,
  updatedBy?: string
): Promise<PromptTemplate> {
  const config = await getPromptStudioConfig();
  const existingTemplate = config.prompts[id];

  if (!existingTemplate) {
    throw new Error(`Prompt template not found: ${id}`);
  }

  const targetVersion = existingTemplate.history?.find((h) => h.version === version);
  if (!targetVersion) {
    throw new Error(`Version ${version} not found in history for ${id}`);
  }

  return updatePromptTemplate(id, targetVersion.systemPrompt, updatedBy, `Reverted to v${version}`);
}

/**
 * Template değişkenlerini gerçek değerlerle değiştirir
 */
export function interpolatePrompt(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value ?? "");
  }
  return result;
}

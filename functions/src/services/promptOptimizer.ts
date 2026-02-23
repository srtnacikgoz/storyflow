/**
 * Provider-Agnostic Prompt Optimizer
 * Template prompt'u Gemini görsel üretimi öncesi AI ile optimize eder.
 * Safety filter bloklamalarını azaltmak için prompt'ları yeniden yazar.
 */

// ── Interfaces ──

export interface PromptOptimizeInput {
  rawPrompt: string;
  negativePrompt: string;
  metadata: Record<string, unknown>;
}

export interface PromptOptimizeResult {
  optimizedPrompt: string;
  optimizedNegativePrompt: string;
  changes: string[];
  model: string;
  tokensUsed: { input: number; output: number };
  cost: number;
}

export interface OptimizerConfig {
  geminiApiKey: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

interface PromptOptimizer {
  optimize(input: PromptOptimizeInput): Promise<PromptOptimizeResult>;
}

// ── Model Registry ──

interface ModelEntry {
  provider: "gemini" | "claude" | "openai-compatible";
  costPerCall: number;
  baseUrl?: string;
}

const MODEL_REGISTRY: Record<string, ModelEntry> = {
  "gemini-2.0-flash": { provider: "gemini", costPerCall: 0.001 },
  "gemini-2.5-flash-preview-05-20": { provider: "gemini", costPerCall: 0.002 },
  "claude-haiku-4-5-20251001": { provider: "claude", costPerCall: 0.002 },
  "claude-sonnet-4-6": { provider: "claude", costPerCall: 0.008 },
  "gpt-4o-mini": { provider: "openai-compatible", costPerCall: 0.001 },
  "deepseek-chat": { provider: "openai-compatible", costPerCall: 0.0005, baseUrl: "https://api.deepseek.com/v1" },
};

// ── System Prompt (ortak) ──

const OPTIMIZER_SYSTEM_PROMPT = `You are an expert image generation prompt optimizer.
You rewrite prompts for Google Gemini image generation to avoid safety filter blocks.

TASK: Rewrite the given raw prompt so it passes Gemini's safety filter while preserving the original scene direction and atmosphere.

RULES:
- Remove gender terms (feminine, female, masculine)
- Replace risky gesture terms (cupping, pinching, grip → holding, resting, lifting)
- Remove brand names
- Remove anatomical details
- Use artistic and professional language
- Preserve the original scene direction and atmosphere
- Keep product descriptions natural, don't exaggerate
- In negative prompt, avoid terms that may backfire (e.g. "distorted fingers")
- NEVER change the beverage type mentioned in the prompt (e.g. if it says "tea", keep "tea" — do not replace with "coffee" or vice versa)
- NEVER change the product type (e.g. if it says "croissant", keep "croissant" — do not generalize to "pastry")
- Keep negative prompt concise — max 15 terms, focus on the most impactful exclusions only

Return JSON only:
{ "optimizedPrompt": "...", "optimizedNegativePrompt": "...", "changes": ["change1", "change2"] }`;

// ── JSON Parse Helper ──

function parseOptimizerResponse(text: string): {
  optimizedPrompt: string;
  optimizedNegativePrompt: string;
  changes: string[];
} {
  // Önce JSON bloğu bul (```json ... ``` veya direkt { ... })
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("Optimizer JSON response döndürmedi");
  return JSON.parse(jsonMatch[1]);
}

// ── Gemini Adapter ──

class GeminiOptimizer implements PromptOptimizer {
  constructor(
    private modelId: string,
    private config: OptimizerConfig,
  ) {}

  async optimize(input: PromptOptimizeInput): Promise<PromptOptimizeResult> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(this.config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: this.modelId });

    const userMessage = `Raw prompt:\n${input.rawPrompt}\n\nNegative prompt:\n${input.negativePrompt}`;

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: OPTIMIZER_SYSTEM_PROMPT + "\n\n" + userMessage }] },
      ],
    });

    const responseText = result.response.text();
    const parsed = parseOptimizerResponse(responseText);

    const inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;

    return {
      optimizedPrompt: parsed.optimizedPrompt,
      optimizedNegativePrompt: parsed.optimizedNegativePrompt,
      changes: parsed.changes,
      model: this.modelId,
      tokensUsed: { input: inputTokens, output: outputTokens },
      cost: MODEL_REGISTRY[this.modelId]?.costPerCall || 0,
    };
  }
}

// ── Claude Adapter ──

class ClaudeOptimizer implements PromptOptimizer {
  constructor(
    private modelId: string,
    private config: OptimizerConfig,
  ) {}

  async optimize(input: PromptOptimizeInput): Promise<PromptOptimizeResult> {
    if (!this.config.anthropicApiKey) {
      throw new Error("Anthropic API key tanımlı değil — Settings'den girin");
    }

    const AnthropicModule = await import("@anthropic-ai/sdk");
    const Anthropic = AnthropicModule.default || AnthropicModule.Anthropic;
    const client = new Anthropic({ apiKey: this.config.anthropicApiKey });

    const userMessage = `Raw prompt:\n${input.rawPrompt}\n\nNegative prompt:\n${input.negativePrompt}`;

    const response = await client.messages.create({
      model: this.modelId,
      max_tokens: 2048,
      system: OPTIMIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText = response.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = parseOptimizerResponse(responseText);

    return {
      optimizedPrompt: parsed.optimizedPrompt,
      optimizedNegativePrompt: parsed.optimizedNegativePrompt,
      changes: parsed.changes,
      model: this.modelId,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      cost: MODEL_REGISTRY[this.modelId]?.costPerCall || 0,
    };
  }
}

// ── OpenAI-Compatible Adapter ──

class OpenAICompatibleOptimizer implements PromptOptimizer {
  constructor(
    private modelId: string,
    private config: OptimizerConfig,
  ) {}

  async optimize(input: PromptOptimizeInput): Promise<PromptOptimizeResult> {
    if (!this.config.openaiApiKey) {
      throw new Error("OpenAI API key tanımlı değil — Settings'den girin");
    }

    const OpenAIModule = await import("openai");
    const OpenAI = OpenAIModule.default || OpenAIModule.OpenAI;

    // baseUrl: config'den gelen veya registry'deki default
    const baseURL = this.config.openaiBaseUrl
      || MODEL_REGISTRY[this.modelId]?.baseUrl
      || "https://api.openai.com/v1";

    const client = new OpenAI({
      apiKey: this.config.openaiApiKey,
      baseURL,
    });

    const userMessage = `Raw prompt:\n${input.rawPrompt}\n\nNegative prompt:\n${input.negativePrompt}`;

    const response = await client.chat.completions.create({
      model: this.modelId,
      max_tokens: 2048,
      messages: [
        { role: "system", content: OPTIMIZER_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const responseText = response.choices[0]?.message?.content || "";
    const parsed = parseOptimizerResponse(responseText);

    return {
      optimizedPrompt: parsed.optimizedPrompt,
      optimizedNegativePrompt: parsed.optimizedNegativePrompt,
      changes: parsed.changes,
      model: this.modelId,
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
      cost: MODEL_REGISTRY[this.modelId]?.costPerCall || 0,
    };
  }
}

// ── Factory ──

export function createPromptOptimizer(model: string, config: OptimizerConfig): PromptOptimizer {
  const entry = MODEL_REGISTRY[model];
  if (!entry) throw new Error(`Bilinmeyen optimizer model: ${model}`);

  switch (entry.provider) {
    case "gemini":
      return new GeminiOptimizer(model, config);
    case "claude":
      return new ClaudeOptimizer(model, config);
    case "openai-compatible":
      return new OpenAICompatibleOptimizer(model, config);
  }
}

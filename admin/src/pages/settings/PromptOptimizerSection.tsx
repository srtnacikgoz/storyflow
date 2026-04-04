import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

export default function PromptOptimizerSection() {
  const [promptOptimizerModel, setPromptOptimizerModel] = useState<string>("none");
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>("");
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>("");
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("");
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [optimizerSaving, setOptimizerSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.getSystemSettings();
      if (settings.promptOptimizerModel) setPromptOptimizerModel(settings.promptOptimizerModel);
      if (settings.openaiBaseUrl) setOpenaiBaseUrl(settings.openaiBaseUrl);
      setHasAnthropicKey(!!settings.anthropicApiKey);
      setHasOpenaiKey(!!settings.openaiApiKey);
      setHasOpenRouterKey(!!(settings as any).openRouterApiKey);
    } catch (err) {
      console.error("[Settings] Optimizer ayarları yüklenemedi:", err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveOptimizer = async () => {
    setOptimizerSaving(true);
    try {
      const payload: Record<string, string> = { promptOptimizerModel };
      if (anthropicApiKey) payload.anthropicApiKey = anthropicApiKey;
      if (openaiApiKey) payload.openaiApiKey = openaiApiKey;
      if (openaiBaseUrl) payload.openaiBaseUrl = openaiBaseUrl;
      if (openRouterApiKey) payload.openRouterApiKey = openRouterApiKey;
      await api.updateSystemSettings(payload);
      if (anthropicApiKey) { setAnthropicApiKey(""); setHasAnthropicKey(true); }
      if (openaiApiKey) { setOpenaiApiKey(""); setHasOpenaiKey(true); }
      if (openRouterApiKey) { setOpenRouterApiKey(""); setHasOpenRouterKey(true); }
      alert("Prompt Optimizer ayarları kaydedildi!");
    } catch (err) {
      console.error("[Settings] Optimizer ayarları kaydedilemedi:", err);
      alert("Kaydetme hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setOptimizerSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Prompt Optimizer</h2>
          <p className="text-sm text-gray-500 mt-1">
            Template prompt'u görsel üretim öncesi AI ile optimize eder. Güvenlik filtresi bloklamalarını azaltır.
          </p>
        </div>
        <button
          onClick={handleSaveOptimizer}
          disabled={optimizerSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
        >
          {optimizerSaving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Optimizer Modeli
          </label>
          <select
            value={promptOptimizerModel}
            onChange={(e) => setPromptOptimizerModel(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm"
          >
            <option value="none">Kapalı — template direkt gider</option>
            <optgroup label="Gemini">
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (~$0.001)</option>
              <option value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash (~$0.002)</option>
            </optgroup>
            <optgroup label="Claude">
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (~$0.002)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (~$0.008)</option>
            </optgroup>
            <optgroup label="OpenAI Compatible">
              <option value="gpt-4o-mini">GPT-4o Mini (~$0.001)</option>
              <option value="deepseek-chat">DeepSeek Chat (~$0.0005)</option>
            </optgroup>
          </select>
        </div>

        {/* Claude seçiliyse Anthropic API Key */}
        {promptOptimizerModel.startsWith("claude") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API Key
            </label>
            {hasAnthropicKey && (
              <p className="text-xs text-green-600 mb-1">API key tanımlı</p>
            )}
            <input
              type="password"
              placeholder={hasAnthropicKey ? "Yeni key girmek için yazın..." : "sk-ant-..."}
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
        )}

        {/* OpenAI-compatible seçiliyse */}
        {(promptOptimizerModel.startsWith("gpt") || promptOptimizerModel.startsWith("deepseek")) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            {hasOpenaiKey && (
              <p className="text-xs text-green-600 mb-1">API key tanımlı</p>
            )}
            <input
              type="password"
              placeholder={hasOpenaiKey ? "Yeni key girmek için yazın..." : "sk-..."}
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm mb-2"
            />
            {promptOptimizerModel === "deepseek-chat" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  placeholder="https://api.deepseek.com/v1"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>
            )}
          </div>
        )}
        {/* OpenRouter API Key — tüm modellere tek API ile erişim */}
        <div className="border-t pt-4 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OpenRouter API Key
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Tek API key ile 290+ modele erişim (Claude, GPT, Gemini, Flux). Poster üretiminde model seçimi için kullanılır.
          </p>
          {hasOpenRouterKey && (
            <p className="text-xs text-green-600 mb-1">API key tanımlı</p>
          )}
          <input
            type="password"
            placeholder={hasOpenRouterKey ? "Yeni key girmek için yazın..." : "sk-or-v1-..."}
            value={openRouterApiKey}
            onChange={(e) => setOpenRouterApiKey(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
}

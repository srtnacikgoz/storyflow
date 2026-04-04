import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

export default function ScenarioWriterSection() {
  const [scenarioWriterModel, setScenarioWriterModel] = useState<string>("none");
  const [scenarioWriterSaving, setScenarioWriterSaving] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.getSystemSettings();
      if (settings.scenarioWriterModel) setScenarioWriterModel(settings.scenarioWriterModel);
      setHasAnthropicKey(!!settings.anthropicApiKey);
    } catch (err) {
      console.error("[Settings] Senaryo yazıcı ayarları yüklenemedi:", err);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveScenarioWriter = async () => {
    setScenarioWriterSaving(true);
    try {
      await api.updateSystemSettings({ scenarioWriterModel });
    } catch (err) {
      console.error("[Settings] Senaryo Yazıcı ayarı kaydedilemedi:", err);
    } finally {
      setScenarioWriterSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Senaryo Yazıcı</h2>
          <p className="text-sm text-gray-500 mt-1">
            Senaryo sayfasında &quot;AI ile Yaz&quot; butonunun kullanacağı model
          </p>
        </div>
        <button
          onClick={handleSaveScenarioWriter}
          disabled={scenarioWriterSaving}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
        >
          {scenarioWriterSaving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Yazıcı Modeli
        </label>
        <select
          value={scenarioWriterModel}
          onChange={(e) => setScenarioWriterModel(e.target.value)}
          className="w-full p-2 border rounded-lg text-sm"
        >
          <option value="none">Kapalı</option>
          <optgroup label="Gemini (Ücretsiz)">
            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (1000 istek/gün)</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (250 istek/gün)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          </optgroup>
          <optgroup label="Gemini (Preview)">
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
            <option value="gemini-3-flash-preview">Gemini 3.0 Flash</option>
          </optgroup>
          <optgroup label="Claude">
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
          </optgroup>
        </select>
        {scenarioWriterModel.startsWith("claude-") && !hasAnthropicKey && (
          <p className="text-xs text-amber-600 mt-1">
            Claude modeli kullanmak için Prompt Optimizer bölümünden Anthropic API key girin.
          </p>
        )}
      </div>
    </div>
  );
}

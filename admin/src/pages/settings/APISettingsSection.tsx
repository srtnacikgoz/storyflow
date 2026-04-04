import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

const PROVIDERS = [
  { key: "openRouter", label: "OpenRouter", prefix: "sk-or-v1-", desc: "Tek key ile 290+ modele erişim", color: "violet" },
  { key: "anthropic", label: "Anthropic (Claude)", prefix: "sk-ant-", desc: "Direkt Claude erişimi", color: "amber" },
  { key: "openai", label: "OpenAI", prefix: "sk-", desc: "Direkt GPT/DALL-E erişimi", color: "emerald" },
  { key: "google", label: "Google AI (Gemini)", prefix: "AI...", desc: "Gemini API (env'den geliyor)", color: "blue" },
];

export default function APISettingsSection() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [hasKeys, setHasKeys] = useState<Record<string, boolean>>({});
  const [keySaving, setKeySaving] = useState(false);
  const [preferredProvider, setPreferredProvider] = useState("openrouter");

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.getSystemSettings();
      setHasKeys({
        openRouter: !!(settings as any).openRouterApiKey,
        anthropic: !!settings.anthropicApiKey,
        openai: !!settings.openaiApiKey,
        google: true,
      });
      if ((settings as any).preferredProvider) setPreferredProvider((settings as any).preferredProvider);
    } catch (err) {
      console.error("[APISettings] Ayarlar yüklenemedi:", err);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSaveKeys = async () => {
    setKeySaving(true);
    try {
      const payload: Record<string, string> = {};
      if (keys.openRouter) payload.openRouterApiKey = keys.openRouter;
      if (keys.anthropic) payload.anthropicApiKey = keys.anthropic;
      if (keys.openai) payload.openaiApiKey = keys.openai;
      if (preferredProvider) payload.preferredProvider = preferredProvider;
      await api.updateSystemSettings(payload);
      const newHas = { ...hasKeys };
      if (keys.openRouter) newHas.openRouter = true;
      if (keys.anthropic) newHas.anthropic = true;
      if (keys.openai) newHas.openai = true;
      setHasKeys(newHas);
      setKeys({});
      alert("API ayarları kaydedildi!");
    } catch (err) {
      alert("Kaydetme hatası");
    } finally {
      setKeySaving(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!confirm(`${provider} API key silinecek. Emin misiniz?`)) return;
    try {
      const field = provider === "openRouter" ? "openRouterApiKey"
        : provider === "anthropic" ? "anthropicApiKey"
        : "openaiApiKey";
      await api.updateSystemSettings({ [field]: "" });
      setHasKeys(prev => ({ ...prev, [provider]: false }));
      alert("API key silindi");
    } catch {
      alert("Silme hatası");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">API Anahtarları</h2>
            <p className="text-xs text-gray-500 mt-1">Tüm AI servislerinin API key yönetimi</p>
          </div>
          <button onClick={handleSaveKeys} disabled={keySaving || !Object.values(keys).some(v => v)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
            {keySaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROVIDERS.map(p => (
            <div key={p.key} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${hasKeys[p.key] ? "bg-emerald-400" : "bg-gray-300"}`} />
                  <span className="text-sm font-medium">{p.label}</span>
                </div>
                {hasKeys[p.key] && p.key !== "google" && (
                  <button onClick={() => handleDeleteKey(p.key)} className="text-[10px] text-red-400 hover:text-red-600">Sil</button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mb-2">{p.desc}</p>
              {p.key === "google" ? (
                <p className="text-xs text-green-600">Environment'tan yükleniyor</p>
              ) : (
                <input
                  type="password"
                  placeholder={hasKeys[p.key] ? "Yeni key girmek için yazın..." : `${p.prefix}...`}
                  value={keys[p.key] || ""}
                  onChange={e => setKeys(prev => ({ ...prev, [p.key]: e.target.value }))}
                  className="w-full p-2 border rounded-lg text-xs"
                />
              )}
            </div>
          ))}
        </div>

        {/* Provider Tercihi */}
        <div className="mt-4 bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Tercih Edilen Provider</p>
          <div className="flex gap-2">
            {[
              { id: "openrouter", label: "OpenRouter", desc: "Tek key ile tüm modeller" },
              { id: "direct", label: "Direkt API", desc: "Her provider kendi key'i ile" },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setPreferredProvider(opt.id)}
                className={`flex-1 p-3 rounded-xl text-left border transition ${
                  preferredProvider === opt.id
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-[10px] text-gray-400 block">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

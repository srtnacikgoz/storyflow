import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

// ── Tum gorev key'leri ──
const ALL_KEYS = [
  "posterPromptModel", "posterAnalysisModel", "analysisModel",
  "visualCriticModel", "posterLearningModel",
  "imageModel", "previewImageModel", "posterImageModel",
] as const;
type ModelKey = typeof ALL_KEYS[number];

// ── Profil tanimlari ──
type QualityProfile = "ekonomik" | "dengeli" | "premium";

interface ProfileConfig {
  label: string;
  description: string;
  monthlyEstimate: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  models: Record<ModelKey, string>;
}

const PROFILES: Record<QualityProfile, ProfileConfig> = {
  ekonomik: {
    label: "Ekonomik",
    description: "Hizli ve dusuk maliyetli. Basit poster ve analizler icin yeterli.",
    monthlyEstimate: "~$1-5/ay",
    borderColor: "border-emerald-400", bgColor: "bg-emerald-50", textColor: "text-emerald-700",
    models: {
      posterPromptModel: "claude-haiku-4-5-20251001",
      posterAnalysisModel: "google/gemini-2.5-flash",
      analysisModel: "google/gemini-2.5-flash",
      visualCriticModel: "google/gemini-2.5-flash",
      posterLearningModel: "google/gemini-2.5-flash",
      imageModel: "gemini-3-pro-image-preview",
      previewImageModel: "gemini-3.1-flash-image-preview",
      posterImageModel: "google/gemini-2.5-flash-image",
    },
  },
  dengeli: {
    label: "Dengeli",
    description: "Kalite ve maliyet arasi en iyi denge. Cogu kullanim icin onerilen.",
    monthlyEstimate: "~$5-15/ay",
    borderColor: "border-amber-400", bgColor: "bg-amber-50", textColor: "text-amber-700",
    models: {
      posterPromptModel: "claude-haiku-4-5-20251001",
      posterAnalysisModel: "claude-haiku-4-5-20251001",
      analysisModel: "google/gemini-2.5-flash",
      visualCriticModel: "google/gemini-2.5-flash",
      posterLearningModel: "claude-haiku-4-5-20251001",
      imageModel: "gemini-3-pro-image-preview",
      previewImageModel: "gemini-3.1-flash-image-preview",
      posterImageModel: "google/gemini-2.5-flash-image",
    },
  },
  premium: {
    label: "Premium",
    description: "En yuksek kalite analiz ve prompt uretimi. Profesyonel sonuclar.",
    monthlyEstimate: "~$15-40/ay",
    borderColor: "border-violet-400", bgColor: "bg-violet-50", textColor: "text-violet-700",
    models: {
      posterPromptModel: "claude-sonnet-4-6",
      posterAnalysisModel: "claude-sonnet-4-6",
      analysisModel: "google/gemini-2.5-pro",
      visualCriticModel: "claude-sonnet-4-6",
      posterLearningModel: "claude-sonnet-4-6",
      imageModel: "gemini-3-pro-image-preview",
      previewImageModel: "gemini-3-pro-image-preview",
      posterImageModel: "gemini-3-pro-image-preview",
    },
  },
};

// ── Gelismis ayarlar: gorev tanimlari + dropdown secenekleri ──
interface TaskDef {
  key: ModelKey;
  label: string;
  group: "analiz" | "gorsel";
  options: { id: string; label: string }[];
}

const ANALYSIS_OPTIONS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — Premier ($3/1M)" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6 — Maksimum ($15/1M)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — Hizli ($0.8/1M)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — 1M context ($1.25/1M)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — Ekonomik ($0.30/1M)" },
  { id: "openai/gpt-4o", label: "GPT-4o ($2.5/1M)" },
  { id: "x-ai/grok-4", label: "Grok 4 — Dusuk halusinasyon ($3/1M)" },
  { id: "mistralai/pixtral-large-2411", label: "Pixtral Large — Gorsel uzman ($2/1M)" },
  { id: "qwen/qwen3-vl-235b-a22b-instruct", label: "Qwen3 VL 235B — Ekonomik ($0.20/1M)" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick — Open source ($0.15/1M)" },
];

const IMAGE_OPTIONS = [
  { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image — Yuksek kalite" },
  { id: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image — Hizli" },
  { id: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image — Poster onerisi" },
];

const TASKS: TaskDef[] = [
  { key: "posterPromptModel", label: "Poster Prompt Yazici", group: "analiz", options: ANALYSIS_OPTIONS },
  { key: "posterAnalysisModel", label: "Poster Analiz", group: "analiz", options: ANALYSIS_OPTIONS },
  { key: "analysisModel", label: "Enhancement Analiz", group: "analiz", options: ANALYSIS_OPTIONS },
  { key: "visualCriticModel", label: "Visual Critic", group: "analiz", options: ANALYSIS_OPTIONS },
  { key: "posterLearningModel", label: "Poster Learning", group: "analiz", options: ANALYSIS_OPTIONS },
  { key: "imageModel", label: "Icerik Gorsel Uretim", group: "gorsel", options: IMAGE_OPTIONS },
  { key: "previewImageModel", label: "Senaryo Onizleme", group: "gorsel", options: IMAGE_OPTIONS },
  { key: "posterImageModel", label: "Poster Gorsel Uretim", group: "gorsel", options: IMAGE_OPTIONS },
];

// Mevcut modellerin hangi profile uyduğunu tespit et
function detectProfile(models: Record<string, string>): QualityProfile | "custom" {
  for (const [key, profile] of Object.entries(PROFILES) as [QualityProfile, ProfileConfig][]) {
    const match = ALL_KEYS.every(k => models[k] === profile.models[k]);
    if (match) return key;
  }
  return "custom";
}

// ── Component ──
export default function AIModelSection() {
  const [models, setModels] = useState<Record<ModelKey, string>>(PROFILES.dengeli.models);
  const [selectedProfile, setSelectedProfile] = useState<QualityProfile | "custom" | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.getSystemSettings();
      const loaded: Record<string, string> = {};
      for (const k of ALL_KEYS) {
        const val = s[k];
        if (val) loaded[k] = val;
      }
      if (Object.keys(loaded).length > 0) {
        const merged = { ...PROFILES.dengeli.models, ...loaded };
        setModels(merged);
        setSelectedProfile(detectProfile(merged));
      } else {
        setSelectedProfile("dengeli");
      }
    } catch (err) {
      console.error("[AIModelSection] Yuklenemedi:", err);
      setSelectedProfile("dengeli");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleProfileSelect = (profile: QualityProfile) => {
    setSelectedProfile(profile);
    setModels({ ...PROFILES[profile].models });
  };

  const handleModelOverride = (key: ModelKey, value: string) => {
    const updated = { ...models, [key]: value };
    setModels(updated);
    setSelectedProfile(detectProfile(updated));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSystemSettings(models);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("[AIModelSection] Kaydedilemedi:", err);
      alert("Kayit hatasi");
    } finally {
      setSaving(false);
    }
  };

  if (selectedProfile === null) {
    return <div className="card text-center py-8 text-sm text-gray-400">Yukleniyor...</div>;
  }

  const analizTasks = TASKS.filter(t => t.group === "analiz");
  const gorselTasks = TASKS.filter(t => t.group === "gorsel");

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ── PROFIL SECIMI ── */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-0.5">AI Kalite Profili</h2>
        <p className="text-xs text-gray-500 mb-4">Tek tikla tum AI modellerini ayarla</p>

        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(PROFILES) as [QualityProfile, ProfileConfig][]).map(([key, p]) => (
            <button key={key} onClick={() => handleProfileSelect(key)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                selectedProfile === key
                  ? `${p.borderColor} ${p.bgColor} ring-1 ring-current`
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              {key === "dengeli" && (
                <span className="absolute -top-2.5 left-3 text-[10px] font-semibold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  Onerilen
                </span>
              )}
              <p className={`text-sm font-bold ${selectedProfile === key ? p.textColor : "text-gray-800"}`}>
                {p.label}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.description}</p>
              <p className={`text-xs font-mono mt-2 ${selectedProfile === key ? p.textColor : "text-gray-400"}`}>
                {p.monthlyEstimate}
              </p>
            </button>
          ))}
        </div>

        {selectedProfile === "custom" && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Ozel ayarlar aktif — bir profil secersen tum ayarlar sifirlanir</span>
          </div>
        )}
      </div>

      {/* ── GELISMIS AYARLAR ── */}
      <div className="card">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-left">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Gelismis Ayarlar</h2>
            <p className="text-xs text-gray-400">Gorev bazli model secimi</p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-5">
            {/* Analiz & Metin */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Metin & Analiz</p>
              <div className="space-y-2">
                {analizTasks.map(t => (
                  <div key={t.key} className="flex items-center gap-3">
                    <label className="text-xs text-gray-600 w-36 flex-shrink-0">{t.label}</label>
                    <select value={models[t.key]}
                      onChange={e => handleModelOverride(t.key, e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                      {t.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            {/* Gorsel Uretim */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gorsel Uretim</p>
              <div className="space-y-2">
                {gorselTasks.map(t => (
                  <div key={t.key} className="flex items-center gap-3">
                    <label className="text-xs text-gray-600 w-36 flex-shrink-0">{t.label}</label>
                    <select value={models[t.key]}
                      onChange={e => handleModelOverride(t.key, e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                      {t.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── KAYDET ── */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
            saved ? "bg-emerald-600 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"
          }`}>
          {saving ? "Kaydediliyor..." : saved ? "Kaydedildi" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

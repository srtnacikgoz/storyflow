import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

// ── Gorsel Uretim Modelleri ──
const IMAGE_MODELS = [
  { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image", note: "En kaliteli gorsel uretim", cost: "$0.04/gorsel" },
  { id: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image", note: "Dengeli hiz/kalite", cost: "~$0.00" },
];

const POSTER_IMAGE_MODELS = [
  { id: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", note: "Poster icin oneri", cost: "~$0.01/gorsel" },
  { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image", note: "Yuksek kalite", cost: "$0.04/gorsel" },
  { id: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image", note: "Dengeli", cost: "~$0.00" },
];

// ── Gorsel uretim gorevleri ──
const IMAGE_TASKS = [
  { key: "imageModel", label: "Icerik Gorsel Uretim", description: "Instagram icerik pipeline ana gorsel uretim modeli", models: IMAGE_MODELS },
  { key: "previewImageModel", label: "Senaryo Onizleme", description: "Senaryo secim ekraninda 4 paralel varyasyon uretir (hiz onemli)", models: IMAGE_MODELS },
  { key: "posterImageModel", label: "Poster Gorsel Uretim", description: "Poster uretiminde gorsel olusturan model", models: POSTER_IMAGE_MODELS },
];

// ── Analiz/Metin Modelleri (Vision capable) ──
type ModelTier = "premier" | "ekonomik" | "ucretsiz";

interface VisionModel {
  id: string; name: string; provider: string; price: string;
  note: string; tier: ModelTier; isAnthropic?: boolean;
}

const VISION_MODELS: VisionModel[] = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic", price: "$3 / 1M", note: "En guclu gorsel analiz", tier: "premier", isAnthropic: true },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic", price: "$15 / 1M", note: "Maksimum dogruluk", tier: "premier", isAnthropic: true },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", price: "$2.5 / 1M", note: "Guclu gorsel anlama", tier: "premier" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", price: "$1.25 / 1M", note: "1M context, multimodal", tier: "premier" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic", price: "$0.8 / 1M", note: "Hizli, yeterli kalite", tier: "ekonomik", isAnthropic: true },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", price: "$0.30 / 1M", note: "Fiyat/performans onerisi", tier: "ekonomik" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", provider: "Google", price: "$0.10 / 1M", note: "Cok ucuz, solid vision", tier: "ekonomik" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", price: "$0.15 / 1M", note: "Ekonomik GPT-4o", tier: "ekonomik" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B", provider: "Google", price: "Ucretsiz", note: "131K context, rate limit var", tier: "ucretsiz" },
];

const TIER_LABELS: Record<ModelTier, { label: string; color: string }> = {
  premier:   { label: "Premier",   color: "bg-violet-100 text-violet-700 border-violet-200" },
  ekonomik:  { label: "Ekonomik",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  ucretsiz:  { label: "Ucretsiz",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

// ── Analiz/metin gorevleri ──
const ANALYSIS_TASKS = [
  { key: "posterPromptModel", label: "Poster Prompt Yazici", description: "Poster uretiminde prompt olusturan model" },
  { key: "posterAnalysisModel", label: "Poster Analiz", description: "Referans poster yuklendiginde stil, renk, tipografi ve kompozisyon analizi" },
  { key: "analysisModel", label: "Enhancement Analiz", description: "Fotograf iyilestirme — arka plan, stil ve urun analizi" },
  { key: "visualCriticModel", label: "Visual Critic", description: "Uretilen gorselin kalite degerlendirmesi — puan ve iyilestirme onerileri" },
  { key: "posterLearningModel", label: "Poster Learning", description: "Kullanici feedbacklerinden stil duzeltmeleri cikarir" },
];

export default function AIModelSection() {
  // Gorsel uretim state
  const [imageModelState, setImageModelState] = useState<Record<string, string>>({
    imageModel: "gemini-3-pro-image-preview",
    previewImageModel: "gemini-3.1-flash-image-preview",
    posterImageModel: "google/gemini-2.5-flash-image",
  });

  // Analiz/metin state
  const [analysisModels, setAnalysisModels] = useState<Record<string, string>>({
    posterPromptModel: "claude-haiku-4-5-20251001",
    posterAnalysisModel: "claude-haiku-4-5-20251001",
    analysisModel: "gemini-2.0-flash",
    visualCriticModel: "gemini-3-pro-image-preview",
    posterLearningModel: "claude-haiku-4-5-20251001",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTier, setActiveTier] = useState<ModelTier | "all">("all");

  const load = useCallback(async () => {
    try {
      const s = await api.getSystemSettings();
      // Gorsel uretim
      const img: Record<string, string> = {};
      for (const task of IMAGE_TASKS) {
        const val = (s as Record<string, unknown>)[task.key];
        if (val) img[task.key] = val as string;
      }
      if (Object.keys(img).length > 0) setImageModelState(prev => ({ ...prev, ...img }));
      // Analiz
      const analysis: Record<string, string> = {};
      for (const task of ANALYSIS_TASKS) {
        const val = (s as Record<string, unknown>)[task.key];
        if (val) analysis[task.key] = val as string;
      }
      if (Object.keys(analysis).length > 0) setAnalysisModels(prev => ({ ...prev, ...analysis }));
    } catch (err) {
      console.error("[AIModelSection] Yuklenemedi:", err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSystemSettings({ ...imageModelState, ...analysisModels });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("[AIModelSection] Kaydedilemedi:", err);
      alert("Kayit hatasi");
    } finally {
      setSaving(false);
    }
  };

  const filteredVisionModels = activeTier === "all"
    ? VISION_MODELS
    : VISION_MODELS.filter(m => m.tier === activeTier);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── GORSEL URETIM ── */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-0.5">Gorsel Uretim Modelleri</h2>
        <p className="text-xs text-gray-500 mb-4">Instagram icerik, onizleme ve poster gorsel uretimi</p>
        <div className="space-y-5">
          {IMAGE_TASKS.map(task => (
            <div key={task.key}>
              <p className="text-xs font-semibold text-gray-600 mb-1">{task.label}</p>
              <p className="text-xs text-gray-400 mb-2">{task.description}</p>
              <div className="space-y-1.5">
                {task.models.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    imageModelState[task.key] === m.id ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <input type="radio" name={task.key} value={m.id} checked={imageModelState[task.key] === m.id}
                      onChange={() => setImageModelState(prev => ({ ...prev, [task.key]: m.id }))} className="accent-amber-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.label}</span>
                        <span className="text-xs text-gray-400 font-mono">{m.cost}</span>
                      </div>
                      <p className="text-xs text-gray-500">{m.note}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ANALIZ & METIN ── */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-0.5">Analiz & Metin Modelleri</h2>
          <p className="text-xs text-gray-500">Prompt yazma, gorsel analiz, feedback ogrenmesi icin AI modelleri</p>
        </div>

        {/* Tier filtresi */}
        <div className="flex gap-2 mb-4">
          {([["all", "Tumu", "bg-gray-100 text-gray-700"], ["premier", "Premier", "bg-violet-100 text-violet-700"], ["ekonomik", "Ekonomik", "bg-amber-100 text-amber-700"], ["ucretsiz", "Ucretsiz", "bg-emerald-100 text-emerald-700"]] as const).map(([tier, label, color]) => (
            <button key={tier} onClick={() => setActiveTier(tier)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-opacity ${color} ${
                activeTier === tier ? "opacity-100 border-current" : "opacity-50 border-transparent"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {ANALYSIS_TASKS.map(task => (
            <div key={task.key}>
              <p className="text-xs font-semibold text-gray-600 mb-1">{task.label}</p>
              <p className="text-xs text-gray-400 mb-2">{task.description}</p>
              <div className="space-y-1.5">
                {filteredVisionModels.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    analysisModels[task.key] === m.id
                      ? "border-violet-400 bg-violet-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <input type="radio" name={task.key} value={m.id}
                      checked={analysisModels[task.key] === m.id}
                      onChange={() => setAnalysisModels(prev => ({ ...prev, [task.key]: m.id }))}
                      className="accent-violet-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{m.name}</span>
                        <span className="text-xs text-gray-400">{m.provider}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${TIER_LABELS[m.tier].color}`}>
                          {m.price}
                        </span>
                        {m.isAnthropic && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Anthropic API</span>}
                        {!m.isAnthropic && <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">OpenRouter</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{m.note}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kaydet */}
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

import { useState, useEffect } from "react";
import api from "../services/api";

// Tab tanımları
const TABS = [
  { key: "lightingPresets", label: "Işıklandırma" },
  { key: "compositions", label: "Kompozisyon" },
  { key: "moods", label: "Mood" },
  { key: "productTextures", label: "Doku" },
  { key: "negativePrompts", label: "Negatif Prompt" },
] as const;

type TabKey = typeof TABS[number]["key"];

// Gemini presets tipi
type GeminiPresets = Awaited<ReturnType<typeof api.getGeminiPresets>>;

export default function AITerminology() {
  const [activeTab, setActiveTab] = useState<TabKey>("moods");
  const [presets, setPresets] = useState<GeminiPresets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  async function loadPresets() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGeminiPresets();
      setPresets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preset'ler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await api.seedGeminiTerminology();
      setSeedResult(
        `Yüklendi: ${result.lightingPresets} ışık, ${result.compositions} kompozisyon, ${result.moods} mood, ${result.textures} doku, ${result.negativePrompts} negatif prompt`
      );
      // Veriyi yeniden yükle
      await loadPresets();
    } catch (err) {
      setSeedResult(`Hata: ${err instanceof Error ? err.message : "Seed başarısız"}`);
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Preset'ler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={loadPresets}
            className="mt-2 text-red-600 underline text-sm"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Terminoloji</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gemini'ye gönderilen preset verileri (salt-okunur)
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {seeding ? "Yükleniyor..." : "Varsayılanları Yeniden Yükle"}
        </button>
      </div>

      {/* Seed sonucu */}
      {seedResult && (
        <div className={`p-3 rounded-lg text-sm ${seedResult.startsWith("Hata") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {seedResult}
        </div>
      )}

      {/* Tab'lar */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {presets && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({getTabCount(presets, tab.key)})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      {presets && (
        <div className="space-y-4">
          {activeTab === "lightingPresets" && <LightingTab items={presets.lightingPresets} />}
          {activeTab === "compositions" && <CompositionsTab items={presets.compositions} />}
          {activeTab === "moods" && <MoodsTab items={presets.moods} />}
          {activeTab === "productTextures" && <TexturesTab items={presets.productTextures} />}
          {activeTab === "negativePrompts" && <NegativePromptsTab items={presets.negativePrompts} />}
        </div>
      )}

      {/* Alt bilgi */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-500">
        Bu veriler Firestore'dan okunuyor. Düzenlemek için Firebase Console veya "Varsayılanları Yeniden Yükle" butonunu kullanın.
      </div>
    </div>
  );
}

function getTabCount(presets: GeminiPresets, key: TabKey): number {
  switch (key) {
    case "lightingPresets": return presets.lightingPresets?.length || 0;
    case "compositions": return presets.compositions?.length || 0;
    case "moods": return presets.moods?.length || 0;
    case "productTextures": return presets.productTextures?.length || 0;
    case "negativePrompts": return presets.negativePrompts?.length || 0;
  }
}

// Ortak kart bileşeni
function PresetCard({ title, subtitle, geminiPrompt, details }: {
  title: string;
  subtitle?: string;
  geminiPrompt: string;
  details?: { label: string; value: string }[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-600 font-medium mb-1">geminiPrompt</p>
        <p className="text-sm text-gray-800 font-medium leading-relaxed">{geminiPrompt}</p>
      </div>
      {details && details.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {details.map((d) => (
            <span key={d.label} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
              <span className="font-medium">{d.label}:</span> {d.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Tab bileşenleri
function LightingTab({ items }: { items: GeminiPresets["lightingPresets"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <PresetCard
          key={item.id}
          title={item.name}
          subtitle={item.nameEn}
          geminiPrompt={item.geminiPrompt}
          details={[
            ...(item.direction ? [{ label: "Yön", value: item.direction }] : []),
            ...(item.temperature ? [{ label: "Sıcaklık", value: item.temperature }] : []),
            ...(item.quality ? [{ label: "Kalite", value: item.quality }] : []),
            ...(item.bestFor?.length ? [{ label: "İçin", value: item.bestFor.join(", ") }] : []),
          ]}
        />
      ))}
    </div>
  );
}

function CompositionsTab({ items }: { items: GeminiPresets["compositions"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <PresetCard
          key={item.id}
          title={item.name}
          subtitle={item.nameEn}
          geminiPrompt={item.geminiPrompt}
          details={[
            { label: "Giriş", value: item.entryPoint },
            ...(item.aspectRatio ? [{ label: "Oran", value: item.aspectRatio }] : []),
            ...(item.bestFor?.length ? [{ label: "İçin", value: item.bestFor.join(", ") }] : []),
          ]}
        />
      ))}
    </div>
  );
}

function MoodsTab({ items }: { items: GeminiPresets["moods"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <PresetCard
          key={item.id}
          title={item.name}
          subtitle={item.nameEn}
          geminiPrompt={item.geminiAtmosphere}
          details={[
            { label: "Stil", value: item.style },
            { label: "Sıcaklık", value: item.temperature },
            ...(item.colorPalette?.length ? [{ label: "Palet", value: item.colorPalette.join(", ") }] : []),
            ...(item.bestTimeOfDay?.length ? [{ label: "Zaman", value: item.bestTimeOfDay.join(", ") }] : []),
          ]}
        />
      ))}
    </div>
  );
}

function TexturesTab({ items }: { items: GeminiPresets["productTextures"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <PresetCard
          key={item.id}
          title={item.category}
          subtitle={`Hero: ${item.heroFeature} | Yüzey: ${item.surfaceType}`}
          geminiPrompt={item.geminiPrompt}
          details={
            item.criticalTerms?.length
              ? [{ label: "Terimler", value: item.criticalTerms.slice(0, 3).join(", ") }]
              : []
          }
        />
      ))}
    </div>
  );
}

function NegativePromptsTab({ items }: { items: GeminiPresets["negativePrompts"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900">{item.name}</h3>
            <p className="text-xs text-gray-400">Kategori: {item.category}</p>
          </div>
          {item.geminiFormat && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium mb-1">geminiFormat</p>
              <p className="text-sm text-gray-800 leading-relaxed">{item.geminiFormat}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {item.terms?.map((term) => (
              <span key={term} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                {term}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

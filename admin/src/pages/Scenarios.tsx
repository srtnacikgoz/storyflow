import { useEffect, useState } from "react";
import { api } from "../services/api";

// Senaryo tipi
interface Composition {
  id: string;
  description: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  includesHands: boolean;
  compositions: Composition[];
  isActive: boolean;
  isInterior?: boolean;
  interiorType?: string;
  suggestedProducts?: string[];
  mood?: string;
  lightingPreference?: string;
  lightingPreset?: string;
  handPose?: string;
  compositionEntry?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Mood seçenekleri - Gemini terminolojisiyle zenginleştirildi
const MOOD_OPTIONS = [
  {
    id: "morning-ritual",
    name: "Sabah Ritüeli",
    hint: "Enerjik, taze başlangıç",
    geminiAtmosphere: "Bright and airy, fresh morning energy, clean minimal aesthetic",
    lighting: "Natural morning light, soft shadows",
    temperature: "5500K",
    colorPalette: ["white", "cream", "light wood", "pastel"],
  },
  {
    id: "cozy-intimate",
    name: "Samimi/Sıcak",
    hint: "Ev sıcaklığı, rahat ortam",
    geminiAtmosphere: "Warm and inviting, intimate gathering, comfortable homey feeling",
    lighting: "Warm tungsten accent, soft diffused",
    temperature: "3000K",
    colorPalette: ["warm brown", "cream", "burnt orange", "gold"],
  },
  {
    id: "rustic-heritage",
    name: "Rustik/Geleneksel",
    hint: "Zanaatkar, otantik, doğal",
    geminiAtmosphere: "Rustic artisanal charm, traditional craftsmanship, authentic heritage",
    lighting: "Golden hour warmth, directional sunlight",
    temperature: "3200K",
    colorPalette: ["wood", "linen", "terracotta", "olive"],
  },
  {
    id: "gourmet-midnight",
    name: "Gece Gurme",
    hint: "Dramatik, lüks, sofistike",
    geminiAtmosphere: "Sophisticated midnight indulgence, moody dramatic luxury",
    lighting: "Dramatic side-lighting, deep shadows",
    temperature: "3500K",
    colorPalette: ["dark wood", "burgundy", "gold", "black"],
  },
  {
    id: "bright-airy",
    name: "Aydınlık/Ferah",
    hint: "Modern, temiz, minimal",
    geminiAtmosphere: "Clean contemporary aesthetic, bright editorial style, minimalist elegance",
    lighting: "Soft diffused daylight, minimal shadows",
    temperature: "5000K",
    colorPalette: ["white", "marble", "light grey", "sage"],
  },
  {
    id: "festive-celebration",
    name: "Kutlama/Şenlik",
    hint: "Özel gün, kutlama anları",
    geminiAtmosphere: "Joyful celebration, special occasion warmth, festive abundance",
    lighting: "Warm ambient with highlights",
    temperature: "3200K",
    colorPalette: ["gold", "cream", "burgundy", "forest green"],
  },
];

// Işık preset'leri - Gemini native terminoloji
const LIGHTING_PRESETS = [
  {
    id: "soft-diffused",
    name: "Yumuşak Yayılmış",
    hint: "Her zaman güvenli seçim",
    geminiPrompt: "Soft diffused natural light, gentle shadows, even illumination",
    direction: "diffused-window",
    temperature: "5000K",
    bestFor: ["croissants", "cakes", "cookies"],
  },
  {
    id: "dramatic-side",
    name: "Dramatik Yan Işık",
    hint: "Doku ve derinlik vurgular",
    geminiPrompt: "Dramatic side-lighting at 45 degrees, defined shadows, texture emphasis",
    direction: "side-lighting-45",
    temperature: "3500K",
    bestFor: ["chocolates", "macarons", "dark pastries"],
  },
  {
    id: "golden-backlight",
    name: "Altın Arka Işık",
    hint: "Sıcak, davetkar görünüm",
    geminiPrompt: "Warm backlighting, golden rim light, subsurface glow",
    direction: "backlighting",
    temperature: "3200K",
    bestFor: ["bread", "croissants", "honey glazed"],
  },
  {
    id: "morning-window",
    name: "Sabah Pencere Işığı",
    hint: "Taze, enerjik sabah",
    geminiPrompt: "Bright morning window light, clean shadows, fresh atmosphere",
    direction: "diffused-window",
    temperature: "5500K",
    bestFor: ["breakfast items", "fresh pastries", "coffee"],
  },
  {
    id: "rim-highlight",
    name: "Kenar Vurgulu",
    hint: "Premium ürün sunumu",
    geminiPrompt: "Rim lighting with soft fill, luminous edges, professional product shot",
    direction: "rim-lighting",
    temperature: "5000K",
    bestFor: ["glossy items", "chocolates", "decorated cakes"],
  },
  {
    id: "warm-ambient",
    name: "Sıcak Ortam Işığı",
    hint: "Ev sıcaklığı, samimi",
    geminiPrompt: "Warm ambient tungsten light, cozy atmosphere, intimate setting",
    direction: "diffused-window",
    temperature: "3000K",
    bestFor: ["comfort food", "home style", "sharing moments"],
  },
];

// El poz seçenekleri - Gemini için optimize edilmiş
const HAND_POSE_OPTIONS = [
  {
    id: "cupping",
    name: "Kavrama (Cupping)",
    hint: "Koruyucu, özenli tutma",
    geminiPrompt: "Elegant feminine hands gently cupping, protective hold, nurturing gesture",
    skinTone: "warm olive",
    nailStyle: "natural short nails, subtle nude polish",
    bestFor: ["warm drinks", "delicate items", "round objects"],
  },
  {
    id: "pinching",
    name: "Tutma (Pinching)",
    hint: "Zarif, hassas tutma",
    geminiPrompt: "Delicate pinch grip between thumb and fingers, refined gesture, precise hold",
    skinTone: "warm olive",
    nailStyle: "natural manicure",
    bestFor: ["small pastries", "chocolates", "macarons"],
  },
  {
    id: "cradling",
    name: "Kucaklama (Cradling)",
    hint: "Değerli nesneyi taşıma",
    geminiPrompt: "Hands cradling from below, supportive hold, presenting precious item",
    skinTone: "warm olive",
    nailStyle: "clean natural nails",
    bestFor: ["plates", "bowls", "larger items"],
  },
  {
    id: "presenting",
    name: "Sunma (Presenting)",
    hint: "Açık avuçla gösterme",
    geminiPrompt: "Open palm presentation, offering gesture, welcoming hands",
    skinTone: "warm olive",
    nailStyle: "subtle neutral polish",
    bestFor: ["flat items", "display shots", "invitation poses"],
  },
  {
    id: "breaking",
    name: "Kırma (Breaking)",
    hint: "Doku gösterimi",
    geminiPrompt: "Hands gently breaking apart, revealing interior texture, discovery moment",
    skinTone: "warm olive",
    nailStyle: "natural nails",
    bestFor: ["bread", "croissants", "filled pastries"],
  },
  {
    id: "dipping",
    name: "Batırma (Dipping)",
    hint: "Etkileşim, hareket anı",
    geminiPrompt: "Hand dipping item into liquid, interaction moment, dynamic action",
    skinTone: "warm olive",
    nailStyle: "clean short nails",
    bestFor: ["biscuits with coffee", "chocolate fondue", "sauces"],
  },
];

// Kompozisyon giriş noktaları - El senaryoları için
const COMPOSITION_ENTRY_POINTS = [
  {
    id: "bottom-right",
    name: "↘️ Sağ Alt Köşe",
    hint: "En doğal giriş noktası - çoğu insan sağ elini kullanır",
    geminiPrompt: "Hand entering frame from bottom-right corner",
  },
  {
    id: "bottom-left",
    name: "↙️ Sol Alt Köşe",
    hint: "Sol el kullanımı veya farklılık için",
    geminiPrompt: "Hand entering frame from bottom-left corner",
  },
  {
    id: "right-side",
    name: "➡️ Sağ Kenar",
    hint: "Yatay çekimler için, el yandan girer",
    geminiPrompt: "Hand reaching in from right side of frame",
  },
  {
    id: "top-down",
    name: "⬇️ Yukarıdan",
    hint: "Kuşbakışı flat-lay çekimler için",
    geminiPrompt: "Overhead view with hands from top",
  },
];

// Fotoğraf kompozisyon türleri - Kullanıcı dostu seçenekler
const COMPOSITION_TYPES = [
  {
    id: "hero-center",
    name: "Ürün Odaklı (Merkez)",
    description: "Ürün tam ortada, dikkat çekici",
    icon: "🎯",
    bestFor: "Yeni ürün tanıtımı, öne çıkarma",
  },
  {
    id: "lifestyle-hand",
    name: "Yaşam Tarzı (El ile)",
    description: "El ürünü tutuyor, doğal görünüm",
    icon: "✋",
    bestFor: "Sosyal medya, samimi paylaşımlar",
  },
  {
    id: "flat-lay",
    name: "Düz Yüzey (Kuşbakışı)",
    description: "Yukarıdan çekim, ürün ve aksesuarlar",
    icon: "📐",
    bestFor: "Instagram kareleri, çoklu ürün",
  },
  {
    id: "close-up-detail",
    name: "Yakın Çekim (Detay)",
    description: "Ürünün dokusuna odaklanma",
    icon: "🔍",
    bestFor: "Kalite vurgulama, doku gösterme",
  },
  {
    id: "ambient-scene",
    name: "Ortam Sahnesi",
    description: "Ürün bir sahnenin parçası",
    icon: "☕",
    bestFor: "Hikaye anlatımı, atmosfer",
  },
  {
    id: "minimal-clean",
    name: "Minimal / Sade",
    description: "Temiz arka plan, sadece ürün",
    icon: "⬜",
    bestFor: "Profesyonel katalog, e-ticaret",
  },
];

// Ürün tipleri
const PRODUCT_TYPES = [
  { id: "croissants", name: "Kruvasanlar" },
  { id: "pastas", name: "Pastalar" },
  { id: "chocolates", name: "Çikolatalar" },
  { id: "coffees", name: "Kahveler" },
];

// Interior tipleri
const INTERIOR_TYPES = [
  { id: "vitrin", name: "Vitrin" },
  { id: "tezgah", name: "Tezgah" },
  { id: "oturma-alani", name: "Oturma Alanı" },
  { id: "dekorasyon", name: "Dekorasyon" },
  { id: "genel-mekan", name: "Genel Mekan" },
];

// Boş form
const emptyForm = {
  id: "",
  name: "",
  description: "",
  includesHands: false,
  compositions: [] as { id: string; description: string }[],
  isInterior: false,
  interiorType: "",
  suggestedProducts: [] as string[],
  mood: "",
  lightingPreference: "",
  lightingPreset: "",
  handPose: "",
  compositionEntry: "",
};

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hands" | "noHands" | "interior">("all");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detay modal
  const [detailScenario, setDetailScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        success: boolean;
        data: { all: Scenario[] };
        error?: string;
      }>("listScenarios?includeInactive=true");
      if (response.success) {
        setScenarios(response.data.all || []);
      } else {
        setError(response.error || "Senaryolar yüklenemedi");
      }
    } catch (err) {
      setError("Senaryolar yüklenirken hata oluştu");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrelenmiş senaryolar
  const filteredScenarios = scenarios.filter((s) => {
    if (filter === "all") return true;
    if (filter === "hands") return s.includesHands && !s.isInterior;
    if (filter === "noHands") return !s.includesHands && !s.isInterior;
    if (filter === "interior") return s.isInterior;
    return true;
  });

  // Modal aç (yeni)
  const openNewModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  // Modal aç (düzenle)
  const openEditModal = (scenario: Scenario) => {
    setEditingId(scenario.id);
    setForm({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      includesHands: scenario.includesHands,
      compositions: scenario.compositions || [],
      isInterior: scenario.isInterior || false,
      interiorType: scenario.interiorType || "",
      suggestedProducts: scenario.suggestedProducts || [],
      mood: scenario.mood || "",
      lightingPreference: scenario.lightingPreference || "",
      lightingPreset: scenario.lightingPreset || "",
      handPose: scenario.handPose || "",
      compositionEntry: scenario.compositionEntry || "",
    });
    setShowModal(true);
  };

  // Kaydet
  const handleSave = async () => {
    // Validasyon
    if (!form.name.trim()) {
      alert("Senaryo adı zorunludur");
      return;
    }
    if (!form.description.trim()) {
      alert("Açıklama zorunludur");
      return;
    }
    if (form.compositions.length === 0) {
      alert("En az bir kompozisyon türü seçmelisiniz");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        name: form.name.trim(),
        description: form.description.trim(),
        includesHands: form.includesHands,
        compositions: form.compositions,
        isInterior: form.isInterior,
        interiorType: form.isInterior ? form.interiorType : undefined,
        suggestedProducts: form.suggestedProducts,
        mood: form.mood || undefined,
        lightingPreference: form.lightingPreference || undefined,
        lightingPreset: form.lightingPreset || undefined,
        handPose: form.includesHands ? form.handPose || undefined : undefined,
        compositionEntry: form.includesHands ? form.compositionEntry || undefined : undefined,
      };

      if (editingId) {
        await api.put<{ success: boolean }>("updateScenarioEndpoint", payload);
      } else {
        await api.post<{ success: boolean }>("createScenario", payload);
      }

      setShowModal(false);
      loadScenarios();
    } catch (err) {
      console.error(err);
      alert("Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  // Sil
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await api.delete<{ success: boolean }>(`deleteScenarioEndpoint?id=${deleteId}`);
      setDeleteId(null);
      loadScenarios();
    } catch (err) {
      console.error(err);
      alert("Silme hatası");
    } finally {
      setDeleting(false);
    }
  };

  // Aktif/Pasif toggle
  const toggleActive = async (scenario: Scenario) => {
    try {
      await api.put<{ success: boolean }>("updateScenarioEndpoint", {
        id: scenario.id,
        isActive: !scenario.isActive,
      });
      loadScenarios();
    } catch (err) {
      console.error(err);
      alert("Güncelleme hatası");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Senaryolar</h1>
          <p className="text-gray-500 mt-1">
            AI görsel üretiminde kullanılan senaryoları yönetin
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2"
        >
          <span>+</span>
          <span>Yeni Senaryo</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* Filtreler */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "all", label: "Tümü", count: scenarios.length },
          { key: "hands", label: "El İçeren", count: scenarios.filter((s) => s.includesHands && !s.isInterior).length },
          { key: "noHands", label: "El İçermeyen", count: scenarios.filter((s) => !s.includesHands && !s.isInterior).length },
          { key: "interior", label: "Interior", count: scenarios.filter((s) => s.isInterior).length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Senaryo Listesi */}
      <div className="grid gap-4">
        {filteredScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`bg-white rounded-lg shadow-sm border p-4 ${
              !scenario.isActive ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{scenario.name}</h3>

                  {/* Badge'ler */}
                  <div className="flex gap-2">
                    {scenario.includesHands && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        El var
                      </span>
                    )}
                    {scenario.isInterior && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Interior
                      </span>
                    )}
                    {!scenario.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        Pasif
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mt-1">{scenario.description}</p>

                {/* Kompozisyonlar */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {scenario.compositions.map((comp) => (
                    <span
                      key={comp.id}
                      className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                    >
                      {comp.id}
                    </span>
                  ))}
                </div>

                {/* Ek bilgiler - Gemini terminolojisi */}
                {(scenario.mood || scenario.lightingPreset || scenario.handPose) && (
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {scenario.mood && (() => {
                      const m = MOOD_OPTIONS.find(x => x.id === scenario.mood);
                      return m && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                          {m.name} ({m.temperature})
                        </span>
                      );
                    })()}
                    {scenario.lightingPreset && (() => {
                      const l = LIGHTING_PRESETS.find(x => x.id === scenario.lightingPreset);
                      return l && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                          {l.name}
                        </span>
                      );
                    })()}
                    {scenario.handPose && (() => {
                      const h = HAND_POSE_OPTIONS.find(x => x.id === scenario.handPose);
                      return h && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">
                          {h.name}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Aksiyonlar */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setDetailScenario(scenario)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Detay"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => openEditModal(scenario)}
                  className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                  title="Düzenle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => toggleActive(scenario)}
                  className={`p-2 rounded ${
                    scenario.isActive
                      ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                      : "text-green-500 hover:text-green-700 hover:bg-green-50"
                  }`}
                  title={scenario.isActive ? "Pasif Yap" : "Aktif Yap"}
                >
                  {scenario.isActive ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setDeleteId(scenario.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Sil"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredScenarios.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Bu kategoride senaryo bulunamadı
        </div>
      )}

      {/* Yeni/Düzenle Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">
                {editingId ? "Senaryo Düzenle" : "Yeni Senaryo"}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* ========== TEMEL BİLGİLER ========== */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">📝 Temel Bilgiler</legend>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Senaryo Adı *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Örn: Sabah Kahve Keyfi"
                      />
                      <p className="text-xs text-gray-500 mt-1">Kısa ve akılda kalıcı bir isim verin</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Atmosfer / Ruh Hali
                      </label>
                      <select
                        value={form.mood}
                        onChange={(e) => setForm({ ...form, mood: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="">-- Atmosfer seçin --</option>
                        {MOOD_OPTIONS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} - {m.hint}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Fotoğrafın genel havası nasıl olsun?</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Açıklama *
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      rows={2}
                      placeholder="Örn: Kahve fincanını zarif bir şekilde tutan eller, sıcak sabah ışığında"
                    />
                    <p className="text-xs text-gray-500 mt-1">Bu senaryo nasıl bir görsel oluşturacak? Kısaca anlatın.</p>
                  </div>
                </div>
              </fieldset>

              {/* ========== SENARYO TİPİ ========== */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">🎬 Senaryo Tipi</legend>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-amber-50 transition">
                      <input
                        type="checkbox"
                        checked={form.includesHands}
                        onChange={(e) => setForm({ ...form, includesHands: e.target.checked })}
                        className="w-5 h-5 text-amber-600 rounded mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">✋ El İçeren Senaryo</span>
                        <p className="text-xs text-gray-500 mt-0.5">Fotoğrafta insan eli görünecek (ürünü tutan, kıran, sunan)</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-purple-50 transition">
                      <input
                        type="checkbox"
                        checked={form.isInterior}
                        onChange={(e) => setForm({ ...form, isInterior: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">🏠 Mekan Fotoğrafı</span>
                        <p className="text-xs text-gray-500 mt-0.5">Dükkan içi, vitrin, dekorasyon (AI üretim atlanır)</p>
                      </div>
                    </label>
                  </div>

                  {/* Interior ise tip seç */}
                  {form.isInterior && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mekan Türü
                      </label>
                      <select
                        value={form.interiorType}
                        onChange={(e) => setForm({ ...form, interiorType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                      >
                        <option value="">-- Mekan türü seçin --</option>
                        {INTERIOR_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </fieldset>

              {/* ========== IŞIKLANDIRMA ========== */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">💡 Işıklandırma</legend>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Işık Stili
                    </label>
                    <select
                      value={form.lightingPreset}
                      onChange={(e) => setForm({ ...form, lightingPreset: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">-- Işık stili seçin --</option>
                      {LIGHTING_PRESETS.map((lp) => (
                        <option key={lp.id} value={lp.id}>
                          {lp.name} - {lp.hint}
                        </option>
                      ))}
                    </select>
                    {form.lightingPreset && (
                      <div className="mt-2 p-2 bg-amber-50 rounded text-xs">
                        <span className="font-medium">AI&apos;ya gidecek:</span>{" "}
                        <span className="text-gray-600">{LIGHTING_PRESETS.find(l => l.id === form.lightingPreset)?.geminiPrompt}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ek Işık Notu <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
                    </label>
                    <input
                      type="text"
                      value={form.lightingPreference}
                      onChange={(e) => setForm({ ...form, lightingPreference: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Örn: Pencereden gelen doğal ışık, yumuşak gölgeler"
                    />
                    <p className="text-xs text-gray-500 mt-1">Özel bir ışık isteğiniz varsa buraya yazın</p>
                  </div>
                </div>
              </fieldset>

              {/* ========== EL DETAYLARI (sadece el içeren senaryolar) ========== */}
              {form.includesHands && (
                <fieldset className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                  <legend className="text-sm font-semibold text-blue-700 px-2">✋ El Detayları</legend>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          El Nasıl Tutsun?
                        </label>
                        <select
                          value={form.handPose}
                          onChange={(e) => setForm({ ...form, handPose: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">-- El pozu seçin --</option>
                          {HAND_POSE_OPTIONS.map((hp) => (
                            <option key={hp.id} value={hp.id}>
                              {hp.name} - {hp.hint}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          El Nereden Girsin?
                        </label>
                        <select
                          value={form.compositionEntry}
                          onChange={(e) => setForm({ ...form, compositionEntry: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">-- Giriş noktası seçin --</option>
                          {COMPOSITION_ENTRY_POINTS.map((ce) => (
                            <option key={ce.id} value={ce.id}>
                              {ce.name} - {ce.hint}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {form.handPose && (
                      <div className="bg-white p-3 rounded-lg border border-blue-200 text-sm">
                        <p className="font-medium text-blue-800 mb-1">AI&apos;ya gidecek el tarifi:</p>
                        <p className="text-blue-700 text-xs">
                          {HAND_POSE_OPTIONS.find(h => h.id === form.handPose)?.geminiPrompt}
                        </p>
                        <p className="text-blue-600 mt-2 text-xs">
                          <span className="font-medium">En uygun ürünler:</span>{" "}
                          {HAND_POSE_OPTIONS.find(h => h.id === form.handPose)?.bestFor.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {/* ========== KOMPOZİSYON TÜRLERİ ========== */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">📐 Fotoğraf Kompozisyonu *</legend>
                <p className="text-xs text-gray-500 mb-3">Bu senaryo için hangi çekim tarzları kullanılabilir? (En az 1 seçin)</p>

                <div className="grid grid-cols-2 gap-2">
                  {COMPOSITION_TYPES.map((comp) => {
                    const isSelected = form.compositions.some(c => c.id === comp.id);
                    return (
                      <label
                        key={comp.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                          isSelected
                            ? "bg-amber-50 border-amber-300"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({
                                ...form,
                                compositions: [...form.compositions, { id: comp.id, description: comp.name }]
                              });
                            } else {
                              setForm({
                                ...form,
                                compositions: form.compositions.filter(c => c.id !== comp.id)
                              });
                            }
                          }}
                          className="w-4 h-4 text-amber-600 rounded mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{comp.icon}</span>
                            <span className="text-sm font-medium">{comp.name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{comp.description}</p>
                          <p className="text-xs text-amber-600 mt-1">İyi: {comp.bestFor}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {form.compositions.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">En az bir kompozisyon türü seçmelisiniz</p>
                )}
              </fieldset>

              {/* ========== ÖNERİLEN ÜRÜNLER ========== */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">🍰 Uygun Ürün Kategorileri</legend>
                <p className="text-xs text-gray-500 mb-3">Bu senaryo hangi ürünlerle iyi sonuç verir? (Birden fazla seçilebilir)</p>

                <div className="flex flex-wrap gap-3">
                  {PRODUCT_TYPES.map((p) => {
                    const isSelected = form.suggestedProducts.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition ${
                          isSelected
                            ? "bg-green-50 border-green-300 text-green-700"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, suggestedProducts: [...form.suggestedProducts, p.id] });
                            } else {
                              setForm({ ...form, suggestedProducts: form.suggestedProducts.filter((x) => x !== p.id) });
                            }
                          }}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* ========== AI PROMPT ÖNİZLEME ========== */}
              <fieldset className="border border-purple-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                <legend className="text-sm font-semibold text-purple-700 px-2">🎨 AI&apos;ya Gönderilecek Prompt Önizlemesi</legend>

                {/* Hiçbir şey seçilmemişse */}
                {!form.mood && !form.lightingPreset && !form.handPose && !form.compositions.length && (
                  <p className="text-sm text-gray-500 italic">
                    Yukarıdan seçimler yaptıkça burada AI&apos;ya gönderilecek prompt önizlemesi görünecek.
                  </p>
                )}

                {/* Seçimler varsa detaylı göster */}
                {(form.mood || form.lightingPreset || form.handPose || form.compositions.length > 0) && (
                  <div className="space-y-3">
                    {/* Mood/Atmosfer */}
                    {form.mood && (() => {
                      const selectedMood = MOOD_OPTIONS.find(m => m.id === form.mood);
                      return (
                        <div className="flex items-start gap-2">
                          <span className="text-purple-600 font-medium shrink-0">🌈 Atmosfer:</span>
                          {selectedMood ? (
                            <span className="text-gray-700">{selectedMood.geminiAtmosphere}</span>
                          ) : (
                            <span className="text-orange-600 text-sm">Seçim: {form.mood} (tanımlı değil)</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Işık */}
                    {form.lightingPreset && (() => {
                      const selectedLight = LIGHTING_PRESETS.find(l => l.id === form.lightingPreset);
                      return (
                        <div className="flex items-start gap-2">
                          <span className="text-amber-600 font-medium shrink-0">💡 Işık:</span>
                          {selectedLight ? (
                            <span className="text-gray-700">{selectedLight.geminiPrompt}</span>
                          ) : (
                            <span className="text-orange-600 text-sm">Seçim: {form.lightingPreset} (tanımlı değil)</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* El */}
                    {form.includesHands && form.handPose && (() => {
                      const selectedPose = HAND_POSE_OPTIONS.find(h => h.id === form.handPose);
                      const selectedEntry = COMPOSITION_ENTRY_POINTS.find(c => c.id === form.compositionEntry);
                      return (
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 font-medium shrink-0">✋ El:</span>
                          {selectedPose ? (
                            <span className="text-gray-700">
                              {selectedPose.geminiPrompt}
                              {selectedEntry && <span className="text-gray-500">, {selectedEntry.geminiPrompt}</span>}
                            </span>
                          ) : (
                            <span className="text-orange-600 text-sm">Seçim: {form.handPose} (tanımlı değil)</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Kompozisyonlar */}
                    {form.compositions.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 font-medium shrink-0">📐 Kompozisyon:</span>
                        <span className="text-gray-700">
                          {form.compositions.map(c => {
                            const comp = COMPOSITION_TYPES.find(x => x.id === c.id);
                            return comp ? comp.name : c.id;
                          }).join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Birleştirilmiş örnek prompt */}
                    <div className="border-t border-purple-200 pt-3 mt-3">
                      <p className="text-xs text-gray-500 mb-1">Birleştirilmiş prompt örneği:</p>
                      <p className="text-xs font-mono text-gray-600 leading-relaxed bg-white p-2 rounded border">
                        <span className="text-purple-600 font-semibold">[Seçilen Ürün Adı]</span>
                        {form.mood && (() => {
                          const m = MOOD_OPTIONS.find(x => x.id === form.mood);
                          return m ? <span className="text-purple-700">, {m.geminiAtmosphere}</span> : null;
                        })()}
                        {form.lightingPreset && (() => {
                          const l = LIGHTING_PRESETS.find(x => x.id === form.lightingPreset);
                          return l ? <span className="text-amber-700">, {l.geminiPrompt}</span> : null;
                        })()}
                        {form.includesHands && form.handPose && (() => {
                          const h = HAND_POSE_OPTIONS.find(x => x.id === form.handPose);
                          return h ? <span className="text-blue-700">, {h.geminiPrompt}</span> : null;
                        })()}
                        {(!form.mood && !form.lightingPreset && !form.handPose) && (
                          <span className="text-gray-400"> - henüz detay seçilmedi</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </fieldset>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Senaryoyu Sil</h3>
            <p className="text-gray-600 mb-6">
              Bu senaryoyu silmek istediğinize emin misiniz? Senaryo pasif hale getirilecektir.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detay Modal */}
      {detailScenario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{detailScenario.name}</h3>
                <p className="text-gray-500 text-sm">{detailScenario.id}</p>
              </div>
              <button
                onClick={() => setDetailScenario(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="font-medium">Açıklama:</span>
                <p className="text-gray-600">{detailScenario.description}</p>
              </div>

              <div className="flex gap-4">
                <div>
                  <span className="font-medium">El:</span>{" "}
                  <span className={detailScenario.includesHands ? "text-green-600" : "text-gray-500"}>
                    {detailScenario.includesHands ? "Var" : "Yok"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Interior:</span>{" "}
                  <span className={detailScenario.isInterior ? "text-purple-600" : "text-gray-500"}>
                    {detailScenario.isInterior ? "Evet" : "Hayır"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Durum:</span>{" "}
                  <span className={detailScenario.isActive ? "text-green-600" : "text-red-500"}>
                    {detailScenario.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>

              {/* Gemini Ayarları */}
              {(detailScenario.mood || detailScenario.lightingPreset || detailScenario.handPose) && (
                <div className="border-t pt-3 space-y-2">
                  <span className="font-medium text-purple-700">Gemini Ayarları:</span>

                  {detailScenario.mood && (() => {
                    const m = MOOD_OPTIONS.find(x => x.id === detailScenario.mood);
                    return m && (
                      <div className="bg-purple-50 p-2 rounded text-xs">
                        <span className="font-medium">Mood:</span> {m.name} ({m.temperature})
                        <p className="text-gray-600 mt-1">{m.geminiAtmosphere}</p>
                      </div>
                    );
                  })()}

                  {detailScenario.lightingPreset && (() => {
                    const l = LIGHTING_PRESETS.find(x => x.id === detailScenario.lightingPreset);
                    return l && (
                      <div className="bg-amber-50 p-2 rounded text-xs">
                        <span className="font-medium">Işık:</span> {l.name} ({l.temperature})
                        <p className="text-gray-600 mt-1">{l.geminiPrompt}</p>
                      </div>
                    );
                  })()}

                  {detailScenario.handPose && (() => {
                    const h = HAND_POSE_OPTIONS.find(x => x.id === detailScenario.handPose);
                    return h && (
                      <div className="bg-green-50 p-2 rounded text-xs">
                        <span className="font-medium">El Pozu:</span> {h.name}
                        <p className="text-gray-600 mt-1">{h.geminiPrompt}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {detailScenario.lightingPreference && (
                <div>
                  <span className="font-medium">Özel Işık Notu:</span> {detailScenario.lightingPreference}
                </div>
              )}

              <div>
                <span className="font-medium">Kompozisyonlar:</span>
                <div className="mt-1 space-y-1">
                  {detailScenario.compositions.map((c) => (
                    <div key={c.id} className="flex gap-2 text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">{c.id}</code>
                      <span>- {c.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {detailScenario.suggestedProducts && detailScenario.suggestedProducts.length > 0 && (
                <div>
                  <span className="font-medium">Önerilen Ürünler:</span>{" "}
                  {detailScenario.suggestedProducts.join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

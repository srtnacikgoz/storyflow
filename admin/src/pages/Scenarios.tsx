import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import { Tooltip } from "../components/Tooltip";
import { SetupStepper } from "../components/SetupStepper";
import { PageGuide } from "../components/PageGuide"; // New Import
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageTour } from "../components/PageTour";
import type { TourStep } from "../components/PageTour";
import type { DynamicCategory, ThemeSetting, SlotDefinition } from "../types";
import { WEATHER_PRESETS, LIGHTING_PRESETS, ATMOSPHERE_PRESETS } from "../types";
import { slugify } from "../utils/stringUtils";

// Scenarios sayfası tour adımları
const SCENARIOS_TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='scenarios-header']",
    title: "Senaryo Yönetimi",
    content: "Senaryolar, ürün fotoğraflarının nasıl çekileceğini tanımlar: ışık, açı, kompozisyon gibi detaylar.",
    position: "bottom",
  },
  {
    target: "[data-tour='scenarios-add']",
    title: "Yeni Senaryo",
    content: "Buradan yeni senaryo oluşturabilirsiniz. Her senaryo farklı bir çekim tarzını temsil eder.",
    position: "left",
  },
  {
    target: "[data-tour='scenarios-list']",
    title: "Senaryo Listesi",
    content: "Mevcut senaryolarınız burada listelenir. Her birini düzenleyebilir veya detaylarını görebilirsiniz.",
    position: "top",
  },
];

// Hava durumu → ışık + atmosfer otomatik eşleşme
const WEATHER_AUTO_MAP: Record<string, { lighting: string; atmosphere: string }> = {
  "bright-sunny": { lighting: "morning-bright", atmosphere: "energetic-brunch" },
  "soft-overcast": { lighting: "soft-diffused", atmosphere: "casual-relaxed" },
  "rainy": { lighting: "window-warm", atmosphere: "cozy-evening" },
  "golden-hour": { lighting: "dramatic-side", atmosphere: "romantic-dreamy" },
  "cloudy-neutral": { lighting: "soft-diffused", atmosphere: "peaceful-morning" },
};

// Senaryo tipi
interface Scenario {
  id: string;
  name: string;
  description: string;
  compositionId?: string;         // Tekli kompozisyon seçimi (v2.0)
  compositionEntry?: string;
  isActive: boolean;
  isInterior?: boolean;
  interiorType?: string;
  suggestedProducts?: string[];
  // Sahne ayarları (Tema'dan taşındı)
  setting?: ThemeSetting;
  petAllowed?: boolean;
  accessoryAllowed?: boolean;
  accessoryOptions?: string[];
  shallowDepthOfField?: boolean;
  includesHands?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

const DEFAULT_COMPOSITION_TYPES = [
  { id: "hero-center", name: "Ürün Odaklı (Hero)", description: "Ürün tam ortada, dikkat çekici", icon: "🎯", bestFor: "Yeni ürün tanıtımı" },
  { id: "lifestyle", name: "Yaşam Tarzı (Lifestyle)", description: "Doğal yaşam tarzı sahnesi", icon: "🌿", bestFor: "Sosyal medya" },
  { id: "flat-lay", name: "Düz Yüzey (Flat Lay)", description: "Yukarıdan çekim", icon: "📐", bestFor: "Instagram kareleri" },
  { id: "close-up-detail", name: "Yakın Çekim (Macro)", description: "Dokuya odaklanma", icon: "🔍", bestFor: "Kalite vurgulama" },
  { id: "ambient-scene", name: "Ortam Sahnesi", description: "Ürün sahnenin parçası", icon: "☕", bestFor: "Hikaye anlatımı" },
  { id: "minimal-clean", name: "Minimal / Sade", description: "Temiz arka plan", icon: "⬜", bestFor: "E-ticaret, katalog" },
  { id: "single-product-showcase", name: "Tek Ürün Vitrin", description: "İzole ürün, temiz arka plan", icon: "💎", bestFor: "E-ticaret, vitrin" },
  { id: "macro-texture-detail", name: "Makro Doku Detay", description: "Extreme close-up, doku çalışması", icon: "🔬", bestFor: "Kalite, doku" },
  { id: "beverage-hero", name: "İçecek Hero", description: "Bardak/fincan hero çekim", icon: "🥤", bestFor: "Kahve, içecek" },
  { id: "chocolate-luxury", name: "Çikolata Lüks", description: "Moody dark, premium estetik", icon: "🍫", bestFor: "Çikolata, lüks" },
  { id: "catalog-shot", name: "Katalog Çekim", description: "Beyaz arka plan, stüdyo ışık", icon: "📋", bestFor: "Katalog, menü" },
];

// Kompozisyon ID'sine göre ikon döndürür
const getCompositionIcon = (id: string): string => {
  const icons: Record<string, string> = {
    // Giriş noktaları
    "bottom-right": "↘️",
    "bottom-left": "↙️",
    "right-side": "➡️",
    "top-down": "⬇️",
    // Fotoğraf türleri
    "hero-center": "🎯",
    "lifestyle": "🌿",
    "flat-lay": "📐",
    "close-up-detail": "🔍",
    "ambient-scene": "☕",
    "minimal-clean": "⬜",
    "single-product-showcase": "💎",
    "macro-texture-detail": "🔬",
    "beverage-hero": "🥤",
    "chocolate-luxury": "🍫",
    "catalog-shot": "📋",
  };
  return icons[id] || "📷";
};

// Varsayılan interior tipleri (API yüklenene kadar fallback)
const DEFAULT_INTERIOR_TYPES = [
  { id: "vitrin", name: "Vitrin" },
  { id: "tezgah", name: "Tezgah" },
  { id: "oturma-alani", name: "Oturma Alanı" },
  { id: "dekorasyon", name: "Dekorasyon" },
  { id: "genel-mekan", name: "Genel Mekan" },
];

// Form tipi
const PRODUCT_TYPE_OPTIONS = [
  { id: "croissants", name: "Kruvasanlar", icon: "🥐" },
  { id: "pastas", name: "Pastalar", icon: "🎂" },
  { id: "chocolates", name: "Çikolatalar", icon: "🍫" },
  { id: "coffees", name: "Kahveler", icon: "☕" },
] as const;

interface ScenarioFormData {
  id: string;
  name: string;
  description: string;
  compositionId: string;
  isInterior: boolean;
  interiorType: string;
  compositionEntry: string;
  suggestedProducts: string[];
  // Sahne ayarları (Tema'dan taşındı)
  setting: {
    weatherPreset: string;
    lightingPreset: string;
    atmospherePreset: string;
  };
  includesHands: boolean;
  petAllowed: boolean;
  accessoryAllowed: boolean;
  accessoryOptions: string[];
  shallowDepthOfField: boolean;
  isExplodedView: boolean;
  explodedViewDescription: string;
  compositionSlots: Record<string, { state: "random" | "disabled" }>;
}

// Boş form
const emptyForm: ScenarioFormData = {
  id: "",
  name: "",
  description: "",
  compositionId: "",
  isInterior: false,
  interiorType: "",
  compositionEntry: "",
  suggestedProducts: [],
  setting: {
    weatherPreset: "",
    lightingPreset: "",
    atmospherePreset: "",
  },
  includesHands: false,
  petAllowed: false,
  accessoryAllowed: false,
  accessoryOptions: [],
  shallowDepthOfField: false,
  isExplodedView: false,
  explodedViewDescription: "",
  compositionSlots: {},
};

export default function Scenarios() {
  const { startLoading, stopLoading } = useLoading();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "interior">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Dinamik kategoriler
  const [dynamicCategories, setDynamicCategories] = useState<DynamicCategory[]>([]);

  // Dinamik Gemini preset'leri (API'den yüklenir)
  const [geminiPresets, setGeminiPresets] = useState<{
    compositions: Array<{
      id: string;
      name: string;
      nameEn: string;
      entryPoint: string;
      geminiPrompt: string;
      aspectRatio?: string;
      bestFor: string[];
      sortOrder: number;
    }>;
  } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sahne ayarları: Asset tag'leri (slot konfigürasyonunda kullanılıyor)

  // Sahne ayarları accordion
  const [sceneSettingsOpen, setSceneSettingsOpen] = useState(false);

  // Slot tanımları (CompositionTemplates'den taşındı)
  // Slot tag dropdown'ları açık/kapalı

  // Detay modal
  const [detailScenario, setDetailScenario] = useState<Scenario | null>(null);

  // AI description generation
  const [isGenerating, setIsGenerating] = useState(false);

  // Senaryo yazıcı model (Settings'den)
  const [scenarioWriterModel, setScenarioWriterModel] = useState<string>("none");

  // Slot tanımları (compositionSlots konfigürasyonu için)
  const [slotDefinitions, setSlotDefinitions] = useState<SlotDefinition[]>([]);

  // Dinamik interior tipleri
  const INTERIOR_TYPES = useMemo(() => {
    const interiorCategory = dynamicCategories.find((c) => c.type === "interior");
    if (interiorCategory && interiorCategory.subTypes.length > 0) {
      return interiorCategory.subTypes
        .filter((st) => st.isActive)
        .sort((a, b) => a.order - b.order)
        .map((st) => ({ id: st.slug, name: st.displayName }));
    }
    return DEFAULT_INTERIOR_TYPES;
  }, [dynamicCategories]);

  // Dinamik kompozisyon tipleri - API'den gelen veri varsa kullan, yoksa fallback
  const COMPOSITION_TYPES = useMemo(() => {
    if (geminiPresets?.compositions && geminiPresets.compositions.length > 0) {
      return geminiPresets.compositions
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((comp) => ({
          id: comp.id,
          name: comp.name,
          description: comp.geminiPrompt.substring(0, 60) + "...",
          icon: getCompositionIcon(comp.id),
          bestFor: comp.bestFor.join(", "),
        }));
    }
    return DEFAULT_COMPOSITION_TYPES;
  }, [geminiPresets]);


  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Kategorileri, Gemini preset'lerini, settings ve senaryoları paralel yükle
    try {
      const [categoriesData, presetsData, settingsData, slotDefsData] = await Promise.all([
        api.getCategories().catch(() => null),
        api.getGeminiPresets().catch((err) => {
          console.error("[Scenarios] Gemini preset'leri yüklenemedi:", err);
          return null;
        }),
        api.getSystemSettings().catch(() => null),
        api.getSlotDefinitions().catch(() => null),
      ]);

      if (slotDefsData?.slots) {
        setSlotDefinitions(slotDefsData.slots.filter((s: SlotDefinition) => s.isActive));
      }

      if (settingsData?.scenarioWriterModel) {
        setScenarioWriterModel(settingsData.scenarioWriterModel);
      }

      if (categoriesData) {
        setDynamicCategories(categoriesData.categories.filter((c) => !c.isDeleted));
      }

      if (presetsData) {
        setGeminiPresets(presetsData);
        console.log("[Scenarios] Gemini preset'leri yüklendi:", {
          compositions: presetsData.compositions.length,
        });
      }
    } catch (err) {
      console.error("[Scenarios] Initial data yüklenemedi:", err);
    }
    // Senaryoları yükle
    loadScenarios();
  };

  const loadScenarios = async () => {
    setLoading(true);
    setError(null);
    startLoading("scenarios", "Senaryolar yükleniyor...");
    try {
      const scenarioResponse = await api.get<{
        success: boolean;
        data: { all: Scenario[] };
        error?: string;
      }>("listScenarios?includeInactive=true");
      if (scenarioResponse.success) {
        setScenarios(scenarioResponse.data.all || []);
      } else {
        setError(scenarioResponse.error || "Senaryolar yüklenemedi");
      }
    } catch (err) {
      setError("Senaryolar yüklenirken hata oluştu");
      console.error(err);
    } finally {
      setLoading(false);
      stopLoading("scenarios");
    }
  };

  // Filtrelenmiş senaryolar
  const filteredScenarios = scenarios.filter((s) => {
    if (filter === "interior" && !s.isInterior) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Modal aç (yeni)
  const openNewModal = () => {
    setEditingId(null);
    // Yeni senaryoda tüm slot'lar varsayılan açık
    const defaultSlots: Record<string, { state: "random" | "disabled" }> = {};
    slotDefinitions.forEach((s) => { defaultSlots[s.key] = { state: "random" }; });
    setForm({ ...emptyForm, compositionSlots: defaultSlots });
    setShowModal(true);
  };

  // Modal aç (düzenle)
  const openEditModal = (scenario: Scenario) => {
    setEditingId(scenario.id);
    // Sahne ayarları açıksa kapat, kapalıysa veri varsa aç
    const hasSetting = !!(scenario.setting?.preferredTags || scenario.setting?.weatherPreset || scenario.petAllowed || scenario.accessoryAllowed);
    setSceneSettingsOpen(hasSetting);
    setForm({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      compositionId: scenario.compositionId || "",
      isInterior: scenario.isInterior || false,
      interiorType: scenario.interiorType || "",
      compositionEntry: scenario.compositionEntry || "",
      suggestedProducts: scenario.suggestedProducts || [],
      setting: {
        weatherPreset: scenario.setting?.weatherPreset || "",
        lightingPreset: scenario.setting?.lightingPreset || "",
        atmospherePreset: scenario.setting?.atmospherePreset || "",
      },
      includesHands: scenario.includesHands || false,
      petAllowed: scenario.petAllowed || false,
      accessoryAllowed: scenario.accessoryAllowed || false,
      accessoryOptions: scenario.accessoryOptions || [],
      shallowDepthOfField: scenario.shallowDepthOfField || false,
      isExplodedView: (scenario as any).isExplodedView || false,
      explodedViewDescription: (scenario as any).explodedViewDescription || "",
      compositionSlots: (scenario as any).compositionSlots || {},
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
    if (!form.compositionId) {
      alert("Kompozisyon türü seçmelisiniz");
      return;
    }
    if (form.isExplodedView && !form.explodedViewDescription.trim()) {
      alert("Patlatılmış görünüm aktifken katman açıklaması zorunludur");
      return;
    }

    setSaving(true);
    try {
      // Setting objesini oluştur (boş alanları dahil etme)
      const setting: ThemeSetting = {};
      if (form.setting.weatherPreset) {
        setting.weatherPreset = form.setting.weatherPreset as ThemeSetting["weatherPreset"];
      }
      if (form.setting.lightingPreset) {
        setting.lightingPreset = form.setting.lightingPreset as ThemeSetting["lightingPreset"];
      }
      if (form.setting.atmospherePreset) {
        setting.atmospherePreset = form.setting.atmospherePreset as ThemeSetting["atmospherePreset"];
      }

      const payload = {
        id: editingId || slugify(form.name),
        name: form.name.trim(),
        description: form.description.trim(),
        compositionId: form.compositionId,  // Tekli kompozisyon (v2.0)
        isInterior: form.isInterior,
        interiorType: form.isInterior ? form.interiorType : undefined,
        compositionEntry: form.compositionEntry || undefined,
        suggestedProducts: form.suggestedProducts,
        // Sahne ayarları (Tema'dan taşındı)
        setting: Object.keys(setting).length > 0 ? setting : undefined,
        includesHands: form.includesHands || undefined,
        petAllowed: form.petAllowed,
        accessoryAllowed: form.accessoryAllowed,
        accessoryOptions: form.accessoryOptions.length > 0 ? form.accessoryOptions : undefined,
        shallowDepthOfField: form.shallowDepthOfField || undefined,
        isExplodedView: form.isExplodedView || undefined,
        explodedViewDescription: form.isExplodedView ? form.explodedViewDescription.trim() : undefined,
        compositionSlots: Object.keys(form.compositionSlots).length > 0 ? form.compositionSlots : undefined,
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
      await api.delete<{ success: boolean }>(`deleteScenarioEndpoint?id=${deleteId}&hardDelete=true`);
      setDeleteId(null);
      loadScenarios();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Silme hatası");
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
    <div className="max-w-7xl mx-auto">
      {/* Setup Stepper */}
      <SetupStepper />

      {/* Page Tour */}
      <PageTour tourId="scenarios-page" steps={SCENARIOS_TOUR_STEPS} />

      <PageGuide
        title="Fotoğrafçıya Talimatlar (Scenarios)"
        storyContent={
          <div className="space-y-4">
            <p>
              <strong>"Poz Ver!"</strong> Ürününüz fotoğrafta nasıl konumlanacak? Masada mı duracak, yakın çekim mi olacak?
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Lifestyle (Yaşam Tarzı):</strong> Ürünü yaşayan, canlı bir anın parçası yapar.</li>
              <li><strong>Product Focus (Ürün Odaklı):</strong> "Masada tek başına, kahraman gibi dursun". Detayları göstermek içindir.</li>
            </ul>
            <p className="italic">
              Hep aynı senaryoyu kullanırsanız profiliniz sıkıcı olur. Farklı kompozisyonlar deneyin.
            </p>
          </div>
        }
        aiContent={
          <div className="space-y-4">
            <div>
              <h4 className="font-bold mb-1">Kompozisyon</h4>
              <p className="text-sm">
                Kamerayı nereye koyacağımı buradan öğrenirim. "Sağ alt köşe", "Kuş bakışı" gibi talimatlardır.
              </p>
            </div>
          </div>
        }
        proTipsContent={
          <div className="space-y-4">
            <h4 className="font-bold text-sm">2 Altin Ipucu</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>Sadece POZ Tarif Edin:</strong> Senaryoda ışık (Mood) veya mekan (Kategori/Background) tarif etmeyin. Sadece ürünün ve kameranın konumuna odaklanın.
              </li>
              <li>
                <strong>Ürün Boyutu:</strong> Küçük ürünler (Kruvasan) için "Macro Shot / Close-up" kullanın. Büyük ürünler (Pasta) için "Wide Angle / Eye Level" kullanın.
              </li>
            </ul>
          </div>
        }
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6" data-tour="scenarios-header">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Senaryolar</h1>
            <p className="text-gray-500 mt-1">
              AI görsel üretiminde kullanılan senaryoları yönetin
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2"
            data-tour="scenarios-add"
          >
            <span>+</span>
            <span>Yeni Senaryo</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
        )}

        {/* Empty State - Hiç senaryo yoksa */}
        {scenarios.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎬</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Henüz senaryo oluşturmadınız
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Senaryolar, ürün görsellerinizin nasıl kompoze edileceğini belirler.
              Örneğin: "Masada servis", "Vitrinde sergileme", "Yakın çekim"
            </p>

            <div className="bg-amber-50 rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
              <p className="text-sm font-medium text-amber-800 mb-2">💡 Popüler başlangıç senaryoları:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• <strong>Masada Servis</strong> - Ürün masada tabakta sunulur</li>
                <li>• <strong>Kahve Eşliği</strong> - Ürün kahve fincanı ile birlikte</li>
                <li>• <strong>Yakın Çekim</strong> - Ürün detayları ön planda</li>
              </ul>
            </div>

            <button
              onClick={openNewModal}
              className="bg-amber-600 text-white px-6 py-3 rounded-xl hover:bg-amber-700 font-medium inline-flex items-center gap-2"
            >
              <span>+</span>
              <span>İlk Senaryonu Oluştur</span>
            </button>
          </div>
        ) : (
          <>
            {/* Filtreler + Arama */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex gap-2">
                {[
                  { key: "all", label: "Tümü", count: scenarios.length },
                  { key: "interior", label: "Interior", count: scenarios.filter((s) => s.isInterior).length },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key as typeof filter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f.key
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Senaryo ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Senaryo Listesi */}
            <div className="grid gap-4" data-tour="scenarios-list">
              {filteredScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`bg-white rounded-lg shadow-sm border p-4 ${!scenario.isActive ? "opacity-60" : ""
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{scenario.name}</h3>

                        {/* Badge'ler */}
                        <div className="flex gap-2">
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

                      {/* Kompozisyon */}
                      {scenario.compositionId && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(() => {
                            const compId = scenario.compositionId;
                            const comp = COMPOSITION_TYPES.find(c => c.id === compId);
                            return comp ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                                {comp.icon} {comp.name}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {compId}
                              </span>
                            );
                          })()}
                        </div>
                      )}

                      {/* Önerilen ürünler */}
                      {scenario.suggestedProducts && scenario.suggestedProducts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {scenario.suggestedProducts.map((pt: string) => {
                            const option = PRODUCT_TYPE_OPTIONS.find(o => o.id === pt);
                            return option ? (
                              <span key={pt} className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                {option.icon} {option.name}
                              </span>
                            ) : null;
                          })}
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
                        className={`p-2 rounded ${scenario.isActive
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
          </>
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
                {/* ========== ŞABLONDAN BAŞLA ========== */}
                {!editingId && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-amber-800 mb-2">
                      Şablondan Başla (opsiyonel)
                    </label>
                    <p className="text-xs text-amber-600 mb-3">
                      Hazır bir çekim modu seçerek formu otomatik doldurun. Sonra dilediğiniz gibi düzenleyin.
                    </p>
                    <select
                      value=""
                      onChange={(e) => {
                        const templateId = e.target.value;
                        if (!templateId) return;
                        // Şablon eşleştirmeleri
                        const templates: Record<string, Partial<ScenarioFormData>> = {
                          "tek-urun-vitrin": {
                            name: "Tek Ürün Vitrin",
                            description: "Single product on clean backdrop. No plates, cups or table props. Product isolated, occupying 50-70% of frame. Studio-style showcase.",
                            compositionId: "single-product-showcase",
                            suggestedProducts: ["croissants", "chocolates", "pastas"],
                            shallowDepthOfField: false,
                          },
                          "makro-doku": {
                            name: "Makro Doku",
                            description: "Extreme close-up texture study. Shallow DOF (f/1.8), product fills 85-95% of frame. Every layer, pore and surface detail visible.",
                            compositionId: "macro-texture-detail",
                            suggestedProducts: ["chocolates", "croissants", "pastas"],
                            shallowDepthOfField: true,
                          },
                          "icecek-sicak-hero": {
                            name: "İçecek Hero (Sıcak)",
                            description: "Hot beverage as hero. Latte art or golden crema visible. Warm atmosphere suggesting freshness. Cup centered at eye-level.",
                            compositionId: "beverage-hero",
                            suggestedProducts: ["coffees"],
                            shallowDepthOfField: false,
                          },
                          "icecek-soguk-hero": {
                            name: "İçecek Hero (Soğuk)",
                            description: "Cold beverage as hero. Condensation droplets on glass surface. Refreshing, crisp atmosphere. Glass centered at eye-level.",
                            compositionId: "beverage-hero",
                            suggestedProducts: ["coffees"],
                            shallowDepthOfField: false,
                          },
                          "cikolata-lux": {
                            name: "Çikolata Lüks",
                            description: "Moody dark backdrop, premium chocolate aesthetic. Specular highlights on tempered surface. Rim lighting, deep shadows.",
                            compositionId: "chocolate-luxury",
                            suggestedProducts: ["chocolates"],
                            shallowDepthOfField: false,
                          },
                          "urun-duet": {
                            name: "Ürün Düeti",
                            description: "Two complementary products in minimal composition. Clean arrangement, balanced spacing. Duo presentation.",
                            compositionId: "minimal-clean",
                            suggestedProducts: ["chocolates", "croissants"],
                            shallowDepthOfField: false,
                          },
                          "katalog-cekim": {
                            name: "Katalog Çekim",
                            description: "Pure white or neutral background, studio lighting. Standard catalog framing for print materials.",
                            compositionId: "catalog-shot",
                            suggestedProducts: ["croissants", "chocolates", "pastas"],
                            shallowDepthOfField: false,
                          },
                          "menu-gorseli": {
                            name: "Menü Görseli",
                            description: "Catalog-style product shot for QR menus. Bottom 25% kept clear for text overlay. Clean white background.",
                            compositionId: "catalog-shot",
                            suggestedProducts: ["croissants", "chocolates", "pastas", "coffees"],
                            shallowDepthOfField: false,
                          },
                        };
                        const tmpl = templates[templateId];
                        if (tmpl) {
                          setForm((prev) => ({
                            ...prev,
                            ...tmpl,
                            id: prev.id, // ID'yi koruyalım
                          }));
                        }
                      }}
                      className="w-full border border-amber-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Şablon seçin...</option>
                      <optgroup label="Ürün Çekimleri">
                        <option value="tek-urun-vitrin">💎 Tek Ürün Vitrin</option>
                        <option value="makro-doku">🔬 Makro Doku</option>
                        <option value="cikolata-lux">🍫 Çikolata Lüks</option>
                        <option value="urun-duet">⬜ Ürün Düeti</option>
                      </optgroup>
                      <optgroup label="İçecek Çekimleri">
                        <option value="icecek-sicak-hero">🥤 İçecek Hero (Sıcak)</option>
                        <option value="icecek-soguk-hero">🥤 İçecek Hero (Soğuk)</option>
                      </optgroup>
                      <optgroup label="Katalog / Menü">
                        <option value="katalog-cekim">📋 Katalog Çekim</option>
                        <option value="menu-gorseli">📋 Menü Görseli</option>
                      </optgroup>
                    </select>
                  </div>
                )}

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
                          onChange={(e) => {
                            // Title Case: Her kelimenin ilk harfi büyük
                            const titleCase = e.target.value
                              .split(' ')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                              .join(' ');
                            setForm({ ...form, name: titleCase });
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="Örn: Sabah Kahve Keyfi"
                        />
                        <p className="text-xs text-gray-500 mt-1">Kısa ve akılda kalıcı bir isim verin</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Açıklama *
                        </label>
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!form.name) {
                                alert("Önce bir Senaryo Adı girin.");
                                return;
                              }
                              if (!form.compositionId) {
                                alert("Önce Kompozisyon Türü seçin.");
                                return;
                              }
                              setIsGenerating(true);
                              try {
                                const result = await api.generateScenarioDescription({
                                  scenarioName: form.name,
                                  compositions: [form.compositionId],
                                  compositionEntry: form.compositionEntry || undefined,
                                });
                                setForm(prev => ({ ...prev, description: result.description }));
                              } catch (err) {
                                alert("AI üretimi başarısız oldu.");
                                console.error(err);
                              } finally {
                                setIsGenerating(false);
                              }
                            }}
                            disabled={isGenerating || !form.name || !form.compositionId || scenarioWriterModel === "none"}
                            className="text-xs bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-3 py-1.5 rounded-full hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isGenerating ? (
                              <>
                                <span className="animate-spin text-[10px]">✨</span>
                                Yazılıyor...
                              </>
                            ) : (
                              <>
                                <span>✨</span> AI ile Yaz
                              </>
                            )}
                          </button>
                          {scenarioWriterModel === "none" && (
                            <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              Ayarlar &gt; Senaryo Yazıcı Modeli seçin
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          rows={3}
                          placeholder="Örn: Buhar yükselirken, samimi bir kahvaltı masası ortamında yakalanan sıcak an"
                          disabled={isGenerating}
                        />
                        {isGenerating && (
                          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                            <div className="text-emerald-600 text-sm font-medium animate-pulse">
                              AI sahneyi hayal ediyor... 🎬
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        *Ad ve Kompozisyon seçimleriniz AI modeline iletilir. Sadece sahne anını tarif eder (ışık/atmosfer Mood&apos;un işi).
                      </p>
                    </div>
                  </div>
                </fieldset>

                {/* ========== SENARYO TİPİ ========== */}
                <fieldset className="border border-gray-200 rounded-lg p-4">
                  <legend className="text-sm font-semibold text-gray-700 px-2">🎬 Senaryo Tipi</legend>

                  <div className="space-y-3">
                    <div>
                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-purple-50 transition">
                        <input
                          type="checkbox"
                          checked={form.isInterior}
                          onChange={(e) => setForm({ ...form, isInterior: e.target.checked })}
                          className="w-5 h-5 text-purple-600 rounded mt-0.5"
                        />
                        <div>
                          <span className="text-sm font-medium">Mekan Fotografi</span>
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

                {/* ========== ÜRÜN TERCİHLERİ ========== */}
                <fieldset className="border border-amber-200 rounded-lg p-4 bg-amber-50/30">
                  <legend className="text-sm font-semibold text-amber-700 px-2">🏷️ Önerilen Ürün Tipleri</legend>
                  <p className="text-xs text-gray-500 mb-3">
                    Bu senaryo hangi ürün tipleriyle en iyi sonucu verir? Seçmezseniz tüm ürünlerle eşleşir.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRODUCT_TYPE_OPTIONS.map((pt) => {
                      const isSelected = form.suggestedProducts.includes(pt.id);
                      return (
                        <label
                          key={pt.id}
                          className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition ${
                            isSelected ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const updated = isSelected
                                ? form.suggestedProducts.filter((p: string) => p !== pt.id)
                                : [...form.suggestedProducts, pt.id];
                              setForm({ ...form, suggestedProducts: updated });
                            }}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-lg">{pt.icon}</span>
                          <span className={`text-sm ${isSelected ? "font-medium text-amber-800" : "text-gray-600"}`}>
                            {pt.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* ========== KOMPOZİSYON TÜRLERİ ========== */}
                <fieldset className="border border-gray-200 rounded-lg p-4">
                  <legend className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 px-2">
                    📐 Fotoğraf Kompozisyonu *
                    <Tooltip
                      content="Ürünün karede nasıl konumlandırılacağını belirler."
                      position="right"
                    />
                  </legend>
                  <p className="text-xs text-gray-500 mb-3">Bu senaryo için hangi çekim tarzı kullanılacak?</p>

                  <select
                    value={form.compositionId}
                    onChange={(e) => setForm({ ...form, compositionId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Kompozisyon seçin...</option>
                    {COMPOSITION_TYPES.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.icon} {comp.name} - {comp.bestFor}
                      </option>
                    ))}
                  </select>

                  {/* Seçili kompozisyon detayı */}
                  {form.compositionId && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      {(() => {
                        const selected = COMPOSITION_TYPES.find(c => c.id === form.compositionId);
                        return selected ? (
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{selected.icon}</span>
                            <div>
                              <p className="font-medium text-amber-800">{selected.name}</p>
                              <p className="text-xs text-amber-700 mt-1">{selected.description}</p>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {!form.compositionId && (
                    <p className="text-xs text-red-500 mt-2">Kompozisyon türü seçmelisiniz</p>
                  )}
                </fieldset>

                {/* ========== SLOT KONFİGÜRASYONU ========== */}
                {slotDefinitions.length > 0 && (
                  <fieldset className="border border-stone-200 rounded-lg p-4">
                    <legend className="text-sm font-semibold text-stone-700 px-2 flex items-center gap-2">
                      🧩 Referans Görseller (Slot'lar)
                    </legend>
                    <p className="text-xs text-gray-500 mb-3">
                      Bu senaryoda hangi referans görseller kullanılsın? Kapalı olanlar üretimden çıkarılır.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {slotDefinitions.map((slot) => {
                        const currentState = form.compositionSlots[slot.key]?.state || "random";
                        const isEnabled = currentState !== "disabled";
                        return (
                          <label
                            key={slot.key}
                            className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition ${
                              isEnabled
                                ? "bg-emerald-50 border-emerald-300"
                                : "bg-gray-50 border-gray-200 opacity-60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                const newState = e.target.checked ? "random" : "disabled";
                                setForm((prev) => ({
                                  ...prev,
                                  compositionSlots: {
                                    ...prev.compositionSlots,
                                    [slot.key]: { state: newState },
                                  },
                                }));
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm">{slot.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* ========== SAHNE AYARLARI (Tema'dan taşındı - katlanabilir) ========== */}
                <fieldset className="border border-stone-200 rounded-lg">
                  <legend className="text-sm font-semibold text-stone-700 px-2">
                    <button
                      type="button"
                      onClick={() => setSceneSettingsOpen(!sceneSettingsOpen)}
                      className="flex items-center gap-2 py-1"
                    >
                      <svg className={`w-4 h-4 transition-transform ${sceneSettingsOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Sahne Ayarları
                      <span className="text-xs font-normal text-stone-400">(opsiyonel)</span>
                    </button>
                  </legend>

                  {sceneSettingsOpen && (
                    <div className="p-4 space-y-4">
                      {/* Pet/Accessory/Hand izinleri */}
                      <div className="grid grid-cols-3 gap-4">
                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-rose-50 transition">
                          <input
                            type="checkbox"
                            checked={form.includesHands}
                            onChange={(e) => setForm({ ...form, includesHands: e.target.checked })}
                            className="w-5 h-5 text-rose-600 rounded mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-medium">El Dahil</span>
                            <p className="text-xs text-gray-500 mt-0.5">Görselde el görünür (Ayarlar'daki aktif stillerden seçilir)</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-green-50 transition">
                          <input
                            type="checkbox"
                            checked={form.petAllowed}
                            onChange={(e) => setForm({ ...form, petAllowed: e.target.checked })}
                            className="w-5 h-5 text-green-600 rounded mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-medium">Köpek izni</span>
                            <p className="text-xs text-gray-500 mt-0.5">Görselde evcil hayvan görünebilir</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition">
                          <input
                            type="checkbox"
                            checked={form.accessoryAllowed}
                            onChange={(e) => setForm({ ...form, accessoryAllowed: e.target.checked })}
                            className="w-5 h-5 text-blue-600 rounded mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-medium">Aksesuar izni</span>
                            <p className="text-xs text-gray-500 mt-0.5">Telefon, kitap vb. masa üstü objeler</p>
                          </div>
                        </label>
                      </div>

                      {/* Aksesuar seçenekleri */}
                      {form.accessoryAllowed && (
                        <div className="ml-2">
                          <label className="text-xs font-medium text-stone-600 mb-1 block">Aksesuar Seçenekleri</label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {form.accessoryOptions.map((opt, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                {opt}
                                <button type="button" onClick={() => setForm({ ...form, accessoryOptions: form.accessoryOptions.filter((_, i) => i !== idx) })} className="hover:text-red-500">&times;</button>
                              </span>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Aksesuar ekle (Enter ile)"
                            className="w-full border border-stone-300 rounded px-2 py-1 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val && !form.accessoryOptions.includes(val)) {
                                  setForm({ ...form, accessoryOptions: [...form.accessoryOptions, val] });
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Shallow Depth of Field */}
                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-purple-50 transition">
                        <input
                          type="checkbox"
                          checked={form.shallowDepthOfField}
                          onChange={(e) => setForm({ ...form, shallowDepthOfField: e.target.checked })}
                          className="w-5 h-5 text-purple-600 rounded mt-0.5"
                        />
                        <div>
                          <span className="text-sm font-medium">Shallow Depth of Field</span>
                          <p className="text-xs text-gray-500 mt-0.5">Ana ürün net, arka plan blur (bokeh efekti)</p>
                        </div>
                      </label>

                      {/* Patlatılmış Görünüm (Exploded View) */}
                      <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={form.isExplodedView}
                          onChange={(e) => setForm({ ...form, isExplodedView: e.target.checked, explodedViewDescription: e.target.checked ? form.explodedViewDescription : "" })}
                          className="w-5 h-5 text-amber-600 rounded mt-0.5"
                        />
                        <div>
                          <span className="text-sm font-medium">Patlatılmış Görünüm (Exploded View)</span>
                          <p className="text-xs text-gray-500 mt-0.5">Ürün ortadan kesilmiş, katmanlar havada asılı — deconstructed stil</p>
                        </div>
                      </label>

                      {form.isExplodedView && (
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">
                            Katman Açıklaması <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={form.explodedViewDescription}
                            onChange={(e) => setForm({ ...form, explodedViewDescription: e.target.value })}
                            placeholder="Ör: Ortadan ikiye kesilmiş kruvasan, alt katmanda dill sos, üzerinde küp salatalık turşusu, iki dilim Kars kaşarı, yaprak kıvırcık marul, üstte zeytin ezmesi"
                            rows={3}
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                          />
                          <p className="text-xs text-gray-400 mt-1">Her katmanı detaylı tanımlayın — Gemini bu açıklamaya göre havada asılı katmanları oluşturacak</p>
                        </div>
                      )}

                      {/* Hava Durumu */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Hava Durumu</label>
                        <select
                          value={form.setting.weatherPreset}
                          onChange={(e) => {
                            const weather = e.target.value;
                            const autoMap = WEATHER_AUTO_MAP[weather];
                            setForm({
                              ...form,
                              setting: {
                                ...form.setting,
                                weatherPreset: weather,
                                ...(autoMap ? { lightingPreset: autoMap.lighting, atmospherePreset: autoMap.atmosphere } : {}),
                              },
                            });
                          }}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          {WEATHER_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.labelTr}</option>
                          ))}
                        </select>
                      </div>

                      {/* Işık */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-1">
                          Işık
                          {form.setting.weatherPreset && <span className="text-xs text-amber-500 font-normal">otomatik ayarlandı</span>}
                        </label>
                        <select
                          value={form.setting.lightingPreset}
                          onChange={(e) => setForm({ ...form, setting: { ...form.setting, lightingPreset: e.target.value } })}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          {LIGHTING_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.labelTr}</option>
                          ))}
                        </select>
                      </div>

                      {/* Atmosfer */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-1">
                          Atmosfer
                          {form.setting.weatherPreset && <span className="text-xs text-amber-500 font-normal">otomatik ayarlandı</span>}
                        </label>
                        <select
                          value={form.setting.atmospherePreset}
                          onChange={(e) => setForm({ ...form, setting: { ...form.setting, atmospherePreset: e.target.value } })}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          {ATMOSPHERE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.labelTr}</option>
                          ))}
                        </select>
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
        <ConfirmDialog
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title={`"${scenarios.find(s => s.id === deleteId)?.name || "Senaryo"}" Silinecek`}
          description="Bu senaryoyu silmek istediğinize emin misiniz?"
          consequences={[
            "Senaryo kalıcı olarak silinecektir",
            "Bir temada kullanılıyorsa silme engellenir",
            "Geçmiş üretimler etkilenmez",
          ]}
          confirmText="Evet, Sil"
          cancelText="Vazgeç"
          variant="danger"
          isLoading={deleting}
        />

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

                <div>
                  <span className="font-medium">Kompozisyon:</span>
                  <div className="mt-1">
                    {(() => {
                      const compId = detailScenario.compositionId;
                      const comp = COMPOSITION_TYPES.find(c => c.id === compId);
                      return comp ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-lg">{comp.icon}</span>
                          <code className="bg-gray-100 px-1 rounded">{comp.id}</code>
                          <span>- {comp.name}</span>
                        </div>
                      ) : compId ? (
                        <code className="bg-gray-100 px-1 rounded">{compId}</code>
                      ) : (
                        <span className="text-gray-400 italic">Seçilmemiş</span>
                      );
                    })()}
                  </div>
                </div>

                {/* Aksesuar */}
                {detailScenario.accessoryAllowed && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="font-medium">Aksesuarlar:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(detailScenario.accessoryOptions || []).map((opt: string) => (
                        <span key={opt} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{opt}</span>
                      ))}
                      {(!detailScenario.accessoryOptions || detailScenario.accessoryOptions.length === 0) && (
                        <span className="text-xs text-gray-400 italic">Herhangi bir aksesuar</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Shallow DOF */}
                {detailScenario.shallowDepthOfField && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-medium">
                      Shallow Depth of Field
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

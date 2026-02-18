import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type { Theme, ThemeSetting } from "../types";
import { WEATHER_PRESETS, LIGHTING_PRESETS, ATMOSPHERE_PRESETS } from "../types";
import { Tooltip } from "../components/Tooltip";
import { SetupStepper } from "../components/SetupStepper";
import { PageGuide } from "../components/PageGuide"; // New Import
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageTour } from "../components/PageTour";
import type { TourStep } from "../components/PageTour";
import { slugify } from "../utils/stringUtils";

// Themes sayfası tour adımları
const THEMES_TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='themes-header']",
    title: "Tema Yönetimi",
    content: "Temalar, senaryoları ve atmosfer ayarlarını gruplar. Her zaman dilimine bir tema atanır.",
    position: "bottom",
  },
  {
    target: "[data-tour='themes-add']",
    title: "Yeni Tema",
    content: "Buradan yeni tema oluşturabilirsiniz. Her tema belirli senaryoları ve ayarları içerir.",
    position: "left",
  },
  // Çeşitlilik kuralları Ayarlar sayfasına taşındı (Faz 3.4),
];

// Senaryo tipi (API'den gelen)
interface Scenario {
  id: string;
  name: string;
  isInterior: boolean;
}

// Çeşitlilik kuralları Ayarlar sayfasına taşındı (Faz 3.4)

// Hava durumu → ışık + atmosfer otomatik eşleşme
const WEATHER_AUTO_MAP: Record<string, { lighting: string; atmosphere: string }> = {
  "bright-sunny": { lighting: "morning-bright", atmosphere: "energetic-brunch" },
  "soft-overcast": { lighting: "soft-diffused", atmosphere: "casual-relaxed" },
  "rainy": { lighting: "window-warm", atmosphere: "cozy-evening" },
  "golden-hour": { lighting: "dramatic-side", atmosphere: "romantic-dreamy" },
  "cloudy-neutral": { lighting: "soft-diffused", atmosphere: "peaceful-morning" },
};

// Boş tema formu
const emptyTheme = {
  id: "",
  name: "",
  description: "",
  scenario: "", // Tekil senaryo seçimi
  petAllowed: false,
  accessoryAllowed: false,
  accessoryOptions: [] as string[],
  // Sahne ayarları
  setting: {
    preferredTableTags: [] as string[],
    preferredPlateTags: [] as string[],
    preferredCupTags: [] as string[],
    weatherPreset: "" as string,
    lightingPreset: "" as string,
    atmospherePreset: "" as string,
  },
};

export default function Themes() {
  const { startLoading, stopLoading } = useLoading();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Senaryolar state (API'den dinamik yüklenir)
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);

  // Masa tag'leri (asset'lerden çekilir)
  const [tableAssetTags, setTableAssetTags] = useState<string[]>([]);
  const [tableTagsOpen, setTableTagsOpen] = useState(false);
  const tableTagsRef = useRef<HTMLDivElement>(null);

  // Tabak tag'leri
  const [plateAssetTags, setPlateAssetTags] = useState<string[]>([]);
  const [plateTagsOpen, setPlateTagsOpen] = useState(false);
  const plateTagsRef = useRef<HTMLDivElement>(null);

  // Fincan tag'leri
  const [cupAssetTags, setCupAssetTags] = useState<string[]>([]);
  const [cupTagsOpen, setCupTagsOpen] = useState(false);
  const cupTagsRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTheme);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Description Loading State
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Çeşitlilik kuralları Ayarlar sayfasına taşındı (Faz 3.4)

  useEffect(() => {
    loadThemes();
    loadScenarios();
    loadTableTags();
    loadPropTags();
  }, []);

  // Senaryoları API'den yükle
  const loadScenarios = async () => {
    setScenariosLoading(true);
    try {
      const response = await api.listScenarios();
      // API'den gelen senaryoları Scenario tipine dönüştür
      const scenarios: Scenario[] = response.all.map((s: { id: string; name: string; isInterior?: boolean }) => ({
        id: s.id,
        name: s.name,
        isInterior: s.isInterior ?? false,
      }));
      setAllScenarios(scenarios);
    } catch (err) {
      console.error("Senaryolar yüklenemedi:", err);
      // Hata durumunda boş liste
      setAllScenarios([]);
    } finally {
      setScenariosLoading(false);
    }
  };

  // Masa asset'lerinden unique tag'leri çek
  // Firestore'daki category/subType değerleri değişkenlik gösterebilir, tüm olasılıkları kapsa
  const loadTableTags = async () => {
    try {
      const results = await Promise.all([
        api.listAssets({ category: "furniture", isActive: true }),
        api.listAssets({ category: "Mobilya", isActive: true }),
      ]);
      const allFurniture = [...results[0], ...results[1]];
      // Sadece masa subType'larını filtrele (çeşitli isimlendirmeler)
      const tableKeywords = ["tables", "table", "masa", "masalar"];
      const tables = allFurniture.filter(a =>
        tableKeywords.some(k => a.subType?.toLowerCase() === k)
      );
      const tagSet = new Set<string>();
      tables.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
      setTableAssetTags(Array.from(tagSet).sort());
    } catch (err) {
      console.error("Masa tag'leri yüklenemedi:", err);
    }
  };

  // Tabak ve fincan asset'lerinden unique tag'leri çek
  const loadPropTags = async () => {
    try {
      const allProps = await api.listAssets({ category: "props", isActive: true });

      // Tabak tag'leri
      const plateKeywords = ["plates", "plate", "tabak", "tabaklar"];
      const plates = allProps.filter(a =>
        plateKeywords.some(k => a.subType?.toLowerCase() === k)
      );
      const plateTagSet = new Set<string>();
      plates.forEach(p => p.tags?.forEach(tag => plateTagSet.add(tag)));
      setPlateAssetTags(Array.from(plateTagSet).sort());

      // Fincan tag'leri
      const cupKeywords = ["cups", "cup", "fincan", "fincanlar", "bardak", "bardaklar"];
      const cups = allProps.filter(a =>
        cupKeywords.some(k => a.subType?.toLowerCase() === k)
      );
      const cupTagSet = new Set<string>();
      cups.forEach(c => c.tags?.forEach(tag => cupTagSet.add(tag)));
      setCupAssetTags(Array.from(cupTagSet).sort());
    } catch (err) {
      console.error("Tabak/Fincan tag'leri yüklenemedi:", err);
    }
  };

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tableTagsRef.current && !tableTagsRef.current.contains(e.target as Node)) {
        setTableTagsOpen(false);
      }
      if (plateTagsRef.current && !plateTagsRef.current.contains(e.target as Node)) {
        setPlateTagsOpen(false);
      }
      if (cupTagsRef.current && !cupTagsRef.current.contains(e.target as Node)) {
        setCupTagsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadThemes = async () => {
    setLoading(true);
    setError(null);
    startLoading("themes", "Temalar yükleniyor...");
    try {
      const data = await api.listThemes();
      setThemes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Temalar yüklenemedi");
    } finally {
      setLoading(false);
      stopLoading("themes");
    }
  };


  // Modal aç (yeni veya düzenleme)
  const openModal = (theme?: Theme) => {
    if (theme) {
      setEditingId(theme.id);
      setForm({
        id: theme.id,
        name: theme.name,
        description: theme.description || "",
        scenario: theme.scenarios?.[0] || "", // İlk senaryoyu al (tekil seçim)
        petAllowed: theme.petAllowed,
        accessoryAllowed: theme.accessoryAllowed ?? false,
        accessoryOptions: theme.accessoryOptions || [],
        setting: {
          preferredTableTags: theme.setting?.preferredTags?.table || [],
          preferredPlateTags: theme.setting?.preferredTags?.plate || [],
          preferredCupTags: theme.setting?.preferredTags?.cup || [],
          weatherPreset: theme.setting?.weatherPreset || "",
          lightingPreset: theme.setting?.lightingPreset || "",
          atmospherePreset: theme.setting?.atmospherePreset || "",
        },
      });
    } else {
      setEditingId(null);
      setForm(emptyTheme);
    }
    setShowModal(true);
  };

  // Modal kapat
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyTheme);
  };

  // Form gönder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Backend hâlâ scenarios array bekliyor - tekil seçimi array'e çeviriyoruz
      const scenariosArray = form.scenario ? [form.scenario] : [];

      // Setting objesini oluştur (boş alanları dahil etme)
      const setting: ThemeSetting = {};
      const preferredTags: NonNullable<ThemeSetting["preferredTags"]> = {};
      if (form.setting.preferredTableTags.length > 0) preferredTags.table = form.setting.preferredTableTags;
      if (form.setting.preferredPlateTags.length > 0) preferredTags.plate = form.setting.preferredPlateTags;
      if (form.setting.preferredCupTags.length > 0) preferredTags.cup = form.setting.preferredCupTags;
      if (Object.keys(preferredTags).length > 0) setting.preferredTags = preferredTags;
      if (form.setting.weatherPreset) {
        setting.weatherPreset = form.setting.weatherPreset as ThemeSetting["weatherPreset"];
      }
      if (form.setting.lightingPreset) {
        setting.lightingPreset = form.setting.lightingPreset as ThemeSetting["lightingPreset"];
      }
      if (form.setting.atmospherePreset) {
        setting.atmospherePreset = form.setting.atmospherePreset as ThemeSetting["atmospherePreset"];
      }

      if (editingId) {
        // Güncelleme - id hariç diğer alanları gönder
        await api.updateTheme(editingId, {
          name: form.name,
          description: form.description,
          scenarios: scenariosArray,
          petAllowed: form.petAllowed,
          accessoryAllowed: form.accessoryAllowed,
          accessoryOptions: form.accessoryOptions.length > 0 ? form.accessoryOptions : undefined,
          setting,
        });
      } else {
        // Yeni oluşturma
        await api.createTheme({
          id: form.id,
          name: form.name,
          description: form.description,
          scenarios: scenariosArray,
          petAllowed: form.petAllowed,
          accessoryAllowed: form.accessoryAllowed,
          accessoryOptions: form.accessoryOptions.length > 0 ? form.accessoryOptions : undefined,
          setting,
        });
      }
      await loadThemes();
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  // Tema sil
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    try {
      await api.deleteTheme(deleteId);
      await loadThemes();
      setDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme başarısız");
    } finally {
      setDeleting(false);
    }
  };

  const generateId = slugify;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-stone-200 rounded" />
          <div className="h-64 bg-stone-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Stepper */}
      <SetupStepper />

      {/* Page Tour */}
      <PageTour tourId="themes-page" steps={THEMES_TOUR_STEPS} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between" data-tour="themes-header">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Temalar</h1>
            <p className="text-sm text-stone-500 mt-1">
              Paylaşım zaman dilimlerine atanacak tema grupları
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            data-tour="themes-add"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Tema
          </button>
        </div>

        <PageGuide
          title="Haftalık Yayın Paketiniz (Themes)"
          storyContent={
            <div className="space-y-4">
              <p>
                <strong>"Bu hafta ne paylaşsam?" derdini bitirin.</strong> Temalar, bir restoranın "Yaz Menüsü" veya "Kış Özel Menüsü" hazırlaması gibidir.
              </p>
              <p>
                Bir tema paketinin içine şunları koyarsınız:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Senaryolar:</strong> O hafta kullanılacak çekim teknikleri ve atmosfer ayarları (Örn: Sabah kahvesi, akşam keyfi).</li>
              </ul>
              <p>
                Bu paketi takvime bir kere atarsınız ve o hafta üretilen tüm görseller otomatik olarak bu menüye uyar.
              </p>
            </div>
          }
          aiContent={
            <div className="space-y-4">
              <div>
                <h4 className="font-bold mb-1">🤖 Senaryo Listesi</h4>
                <p className="text-sm">
                  Benim <strong>çeşitlilik havuzumdur</strong>. O gün için görsel üreteceksem, bu listeden her gün farklı bir tane seçmeye çalışırım.
                  Listede ne kadar çok senaryo varsa, sizi o kadar az tekrar ederim.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-1">🤖 İzinler (Köpek/Aksesuar)</h4>
                <p className="text-sm">
                  <strong>Kırmızı çizgilerim.</strong> Köpek izni kapalıysa, dünyanın en güzel senaryosu bile olsa görselin içine köpek koymam. Yasak yasaktır.
                </p>
              </div>
            </div>
          }
          proTipsContent={
            <div className="space-y-4">
              <h4 className="font-bold text-sm">💡 3 Altın İpucu</h4>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>
                  <strong>Zıtlık Uyarısı:</strong> Birbirine <strong>ZIT</strong> senaryoları (Örn: Hem "Gece" hem "Sabah") aynı pakete koymayın. Tema bütünlüğü bozulur.
                </li>
                <li>
                  <strong>Kurtarıcı Senaryo:</strong> Her temanın içine mutlaka 1 tane çok basit, risksiz "Ürün Odaklı (Product Focus)" senaryo koyun. Eğer o gün karmaşık lifestyle senaryolar kötü çıkarsa, bu basit senaryo günü kurtarır.
                </li>
                <li>
                  <strong>İsimlendirme:</strong> Temalara zaman/kampanya odaklı isimler verin. Örn: "Yaz 2025 Menüsü", "Ramazan Özel", "Yılbaşı Kampanyası".
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-xs italic bg-emerald-50 p-2 rounded text-emerald-800">
                  <strong>Mantık Testi:</strong> Temayı kaydetmeden önce kendinize sorun: "Bu paketteki her şey aynı filmin sahnesi gibi mi duruyor?" Cevap evetse, doğru yoldasınız.
                </p>
              </div>
            </div>
          }
        />

        {/* Empty State - Hiç tema yoksa */}
        {themes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎨</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Henüz tema oluşturmadınız
            </h2>
            <p className="text-stone-600 mb-6 max-w-md mx-auto">
              Temalar, görsel üretimde kullanılacak senaryo gruplarını ve atmosferi belirler.
              Her zaman dilimine farklı tema atayabilirsiniz.
            </p>

            <div className="bg-purple-50 rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
              <p className="text-sm font-medium text-purple-800 mb-2">💡 Tema ne işe yarar?</p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• <strong>Senaryo gruplaması</strong> - Hangi senaryolar birlikte kullanılacak</li>
                <li>• <strong>Atmosfer belirleme</strong> - Sıcak, soğuk, enerjik vb.</li>
                <li>• <strong>Tutarlılık</strong> - Mağazanızın görsel kimliği korunur</li>
              </ul>
            </div>

            <button
              onClick={() => openModal()}
              className="bg-amber-600 text-white px-6 py-3 rounded-xl hover:bg-amber-700 font-medium inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              İlk Temanı Oluştur
            </button>
          </div>
        ) : (
          <>
            {/* Tema Listesi */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-stone-900">{theme.name}</h3>
                      {theme.description && (
                        <p className="text-sm text-stone-500 mt-1">{theme.description}</p>
                      )}
                    </div>
                    {theme.isDefault && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        Varsayılan
                      </span>
                    )}
                  </div>

                  {/* Tema özellikleri */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {theme.petAllowed && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Köpek izinli
                      </span>
                    )}
                    {theme.accessoryAllowed && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded" title={theme.accessoryOptions?.join(", ")}>
                        Aksesuar{theme.accessoryOptions?.length ? ` (${theme.accessoryOptions.length})` : ""}
                      </span>
                    )}
                    {theme.setting?.weatherPreset && (
                      <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded">
                        {WEATHER_PRESETS.find(p => p.id === theme.setting?.weatherPreset)?.labelTr || theme.setting.weatherPreset}
                      </span>
                    )}
                    {theme.setting?.lightingPreset && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        {LIGHTING_PRESETS.find(p => p.id === theme.setting?.lightingPreset)?.labelTr || theme.setting.lightingPreset}
                      </span>
                    )}
                    {theme.setting?.atmospherePreset && (
                      <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">
                        {ATMOSPHERE_PRESETS.find(p => p.id === theme.setting?.atmospherePreset)?.labelTr || theme.setting.atmospherePreset}
                      </span>
                    )}
                    {theme.setting?.preferredTags?.table && theme.setting.preferredTags.table.length > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded ${theme.setting.preferredTags.table.includes("__none__") ? "bg-stone-100 text-stone-500 line-through" : "bg-violet-100 text-violet-700"}`}>
                        Masa: {theme.setting.preferredTags.table.includes("__none__") ? "Yok" : theme.setting.preferredTags.table.join(", ")}
                      </span>
                    )}
                    {theme.setting?.preferredTags?.plate && theme.setting.preferredTags.plate.length > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded ${theme.setting.preferredTags.plate.includes("__none__") ? "bg-stone-100 text-stone-500 line-through" : "bg-rose-100 text-rose-700"}`}>
                        Tabak: {theme.setting.preferredTags.plate.includes("__none__") ? "Yok" : theme.setting.preferredTags.plate.join(", ")}
                      </span>
                    )}
                    {theme.setting?.preferredTags?.cup && theme.setting.preferredTags.cup.length > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded ${theme.setting.preferredTags.cup.includes("__none__") ? "bg-stone-100 text-stone-500 line-through" : "bg-teal-100 text-teal-700"}`}>
                        Fincan: {theme.setting.preferredTags.cup.includes("__none__") ? "Yok" : theme.setting.preferredTags.cup.join(", ")}
                      </span>
                    )}
                  </div>

                  {/* Senaryo */}
                  <div className="mb-4">
                    <p className="text-xs text-stone-500 mb-2">Senaryo:</p>
                    {(() => {
                      const scenarioId = theme.scenarios?.[0];
                      if (!scenarioId) return <span className="text-xs text-stone-400 italic">Seçilmemiş</span>;
                      const scenario = allScenarios.find((s) => s.id === scenarioId);
                      return (
                        <span
                          className={`text-xs px-2 py-1 rounded ${scenario?.isInterior
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                            }`}
                        >
                          {scenario?.name || scenarioId}
                          {scenario?.isInterior && " 📍"}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(theme)}
                      className="flex-1 text-sm py-2 px-3 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Düzenle
                    </button>
                    {!theme.isDefault && (
                      <button
                        onClick={() => setDeleteId(theme.id)}
                        className="text-sm py-2 px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="p-6 border-b border-stone-200">
                  <h2 className="text-xl font-semibold">
                    {editingId ? "Tema Düzenle" : "Yeni Tema"}
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* ID (sadece yeni tema için) */}
                  {!editingId && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Tema ID
                      </label>
                      <input
                        type="text"
                        value={form.id}
                        onChange={(e) => setForm({ ...form, id: e.target.value })}
                        placeholder="morning-energy"
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        required
                      />
                      <p className="text-xs text-stone-500 mt-1">
                        Benzersiz ID (küçük harf, tire ile)
                      </p>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Tema Adı
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        // Title Case: Her kelimenin ilk harfi büyük
                        const name = e.target.value
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ');
                        setForm({
                          ...form,
                          name,
                          // Yeni tema için ID'yi otomatik oluştur
                          id: editingId ? form.id : generateId(name),
                        });
                      }}
                      placeholder="Sabah Enerjisi"
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-stone-700">
                        Açıklama
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!form.name) {
                            alert("Önce bir tema adı giriniz.");
                            return;
                          }
                          setIsGeneratingDescription(true);
                          try {
                            const result = await api.generateThemeDescription(form.name);
                            setForm(prev => ({ ...prev, description: result.description }));
                          } catch (error) {
                            console.error("AI Description Error:", error);
                            alert("AI açıklama üretirken bir hata oluştu.");
                          } finally {
                            setIsGeneratingDescription(false);
                          }
                        }}
                        disabled={isGeneratingDescription || !form.name}
                        className="text-xs flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-100 to-amber-100 text-purple-700 rounded-md hover:from-purple-200 hover:to-amber-200 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingDescription ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Yazılıyor...
                          </>
                        ) : (
                          <>
                            <span>✨</span> AI ile Yaz
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Bu temanın kullanım amacı..."
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:text-stone-400"
                        rows={3}
                        disabled={isGeneratingDescription}
                      />
                      {/* AI Loading Overlay */}
                      {isGeneratingDescription && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-50/95 to-amber-50/95 rounded-lg flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                          <div className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-medium text-purple-700">Gemini analiz ediyor...</span>
                          </div>
                          <p className="text-xs text-stone-500 text-center px-4">
                            Senaryo bilgileri inceleniyor, en uygun tema açıklaması yazılıyor
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1 text-right">
                      *AI açıklamayı İngilizce ve yönetmen notu formatında yazar.
                    </p>
                  </div>

                  {/* Pet Allowed */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.petAllowed}
                        onChange={(e) => setForm({ ...form, petAllowed: e.target.checked })}
                        className="w-5 h-5 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
                      />
                      <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
                        Köpek dahil edilebilir
                        <Tooltip
                          content="İzin verilirse köpek Ayarlar sayfasındaki frekansa göre görsellere eklenir."
                          position="right"
                        />
                      </span>
                    </label>
                  </div>

                  {/* Accessory Allowed */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.accessoryAllowed}
                        onChange={(e) => setForm({ ...form, accessoryAllowed: e.target.checked })}
                        className="w-5 h-5 text-blue-600 border-stone-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-stone-700">
                        Aksesuar dahil edilebilir
                      </span>
                    </label>
                    {form.accessoryAllowed && (
                      <div className="mt-2 ml-8">
                        <label className="text-xs font-medium text-stone-600 mb-1 block">
                          Aksesuar Seçenekleri
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {form.accessoryOptions.map((opt, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                              {opt}
                              <button
                                type="button"
                                onClick={() => setForm({
                                  ...form,
                                  accessoryOptions: form.accessoryOptions.filter((_, i) => i !== idx),
                                })}
                                className="hover:text-red-500"
                              >
                                &times;
                              </button>
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
                                setForm({
                                  ...form,
                                  accessoryOptions: [...form.accessoryOptions, val],
                                });
                                (e.target as HTMLInputElement).value = "";
                              }
                            }
                          }}
                        />
                        <p className="text-xs text-stone-400 mt-0.5">
                          Ör: kitap, telefon, anahtarlık, defter
                        </p>
                      </div>
                    )}
                    {!form.accessoryAllowed && (
                      <p className="text-xs text-stone-500 mt-1 ml-8">
                        Aksesuar devre dışı
                      </p>
                    )}
                  </div>

                  {/* Senaryo */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                      Senaryo
                      <Tooltip
                        content="Bu tema aktif olduğunda kullanılacak senaryo. Her üretimde bu senaryo uygulanır."
                        position="right"
                      />
                    </label>
                    {scenariosLoading ? (
                      <div className="text-center py-4 text-stone-500">
                        Senaryolar yükleniyor...
                      </div>
                    ) : allScenarios.length === 0 ? (
                      <div className="text-center py-4 text-stone-500">
                        Henüz senaryo tanımlanmamış.{" "}
                        <a href="/scenarios" className="text-amber-600 underline">
                          Senaryo ekle
                        </a>
                      </div>
                    ) : (
                      <>
                        <select
                          value={form.scenario}
                          onChange={(e) => setForm({ ...form, scenario: e.target.value })}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          required
                        >
                          <option value="">Senaryo seçin...</option>
                          {allScenarios.map((scenario) => (
                            <option key={scenario.id} value={scenario.id}>
                              {scenario.name}
                              {scenario.isInterior ? " (Interior)" : ""}
                            </option>
                          ))}
                        </select>
                        {/* Seçili senaryo bilgisi */}
                        {form.scenario && (() => {
                          const selected = allScenarios.find(s => s.id === form.scenario);
                          if (!selected) return null;
                          return (
                            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-amber-800">{selected.name}</span>
                                {selected.isInterior && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Interior</span>
                                )}
                              </div>
                              {selected.isInterior && (
                                <p className="text-xs text-amber-700 mt-1">
                                  Interior senaryo - mevcut mağaza fotoğrafları kullanılır, AI görsel üretimi atlanır
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                    {!form.scenario && !scenariosLoading && allScenarios.length > 0 && (
                      <p className="text-sm text-red-500 mt-2">
                        Bir senaryo seçmelisiniz
                      </p>
                    )}
                  </div>

                  {/* Sahne Ayarları */}
                  <div className="border-t border-stone-200 pt-6">
                    <h3 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
                      Sahne Ayarları
                      <span className="text-xs font-normal text-stone-400">(opsiyonel)</span>
                    </h3>

                    <div className="space-y-4">
                      {/* Masa Tercihi (multi-select dropdown) */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-1">
                          Masa Tercihi
                          <Tooltip
                            content="Seçtiğiniz tag'lere sahip masalar öncelikli kullanılır. Birden fazla seçebilirsiniz."
                            position="right"
                          />
                        </label>
                        {tableAssetTags.length > 0 ? (
                          <div className="relative" ref={tableTagsRef}>
                            <button
                              type="button"
                              onClick={() => setTableTagsOpen(!tableTagsOpen)}
                              className="w-full px-4 py-2 border border-stone-300 rounded-lg bg-white text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            >
                              <span className={form.setting.preferredTableTags.length > 0 ? (form.setting.preferredTableTags.includes("__none__") ? "text-stone-500 italic" : "text-stone-800") : "text-stone-400"}>
                                {form.setting.preferredTableTags.includes("__none__")
                                  ? "Yok (sahnede olmasın)"
                                  : form.setting.preferredTableTags.length > 0
                                    ? form.setting.preferredTableTags.join(", ")
                                    : "Masa tag'i seçin (opsiyonel)"}
                              </span>
                              <svg className={`w-4 h-4 text-stone-400 transition-transform ${tableTagsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {tableTagsOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 cursor-pointer text-sm border-b border-stone-100">
                                  <input
                                    type="checkbox"
                                    checked={form.setting.preferredTableTags.includes("__none__")}
                                    onChange={() => {
                                      const isNone = form.setting.preferredTableTags.includes("__none__");
                                      setForm({
                                        ...form,
                                        setting: { ...form.setting, preferredTableTags: isNone ? [] : ["__none__"] },
                                      });
                                    }}
                                    className="rounded border-stone-300 text-red-500 focus:ring-red-400"
                                  />
                                  <span className={form.setting.preferredTableTags.includes("__none__") ? "text-red-600 font-medium" : "text-stone-600"}>
                                    Yok (sahnede olmasın)
                                  </span>
                                </label>
                                {tableAssetTags.map(tag => {
                                  const isNone = form.setting.preferredTableTags.includes("__none__");
                                  const isSelected = form.setting.preferredTableTags.includes(tag);
                                  return (
                                    <label
                                      key={tag}
                                      className={`flex items-center gap-2 px-4 py-2 hover:bg-stone-50 cursor-pointer text-sm ${isNone ? "opacity-40 pointer-events-none" : ""}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={isNone}
                                        onChange={() => {
                                          const updated = isSelected
                                            ? form.setting.preferredTableTags.filter(t => t !== tag)
                                            : [...form.setting.preferredTableTags.filter(t => t !== "__none__"), tag];
                                          setForm({
                                            ...form,
                                            setting: { ...form.setting, preferredTableTags: updated },
                                          });
                                        }}
                                        className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                                      />
                                      <span className={isSelected ? "text-stone-800 font-medium" : "text-stone-600"}>
                                        {tag}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 italic">
                            Masa asset'lerine tag eklediğinizde burada görünecek.
                          </p>
                        )}
                      </div>

                      {/* Tabak Tercihi */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Tabak Tercihi
                        </label>
                        {plateAssetTags.length > 0 ? (
                          <div className="relative" ref={plateTagsRef}>
                            <button
                              type="button"
                              onClick={() => setPlateTagsOpen(!plateTagsOpen)}
                              className="w-full px-4 py-2 border border-stone-300 rounded-lg bg-white text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            >
                              <span className={form.setting.preferredPlateTags.length > 0 ? (form.setting.preferredPlateTags.includes("__none__") ? "text-stone-500 italic" : "text-stone-800") : "text-stone-400"}>
                                {form.setting.preferredPlateTags.includes("__none__")
                                  ? "Yok (sahnede olmasın)"
                                  : form.setting.preferredPlateTags.length > 0
                                    ? form.setting.preferredPlateTags.join(", ")
                                    : "Tabak tag'i seçin (opsiyonel)"}
                              </span>
                              <svg className={`w-4 h-4 text-stone-400 transition-transform ${plateTagsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {plateTagsOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 cursor-pointer text-sm border-b border-stone-100">
                                  <input
                                    type="checkbox"
                                    checked={form.setting.preferredPlateTags.includes("__none__")}
                                    onChange={() => {
                                      const isNone = form.setting.preferredPlateTags.includes("__none__");
                                      setForm({
                                        ...form,
                                        setting: { ...form.setting, preferredPlateTags: isNone ? [] : ["__none__"] },
                                      });
                                    }}
                                    className="rounded border-stone-300 text-red-500 focus:ring-red-400"
                                  />
                                  <span className={form.setting.preferredPlateTags.includes("__none__") ? "text-red-600 font-medium" : "text-stone-600"}>
                                    Yok (sahnede olmasın)
                                  </span>
                                </label>
                                {plateAssetTags.map(tag => {
                                  const isNone = form.setting.preferredPlateTags.includes("__none__");
                                  const isSelected = form.setting.preferredPlateTags.includes(tag);
                                  return (
                                    <label key={tag} className={`flex items-center gap-2 px-4 py-2 hover:bg-stone-50 cursor-pointer text-sm ${isNone ? "opacity-40 pointer-events-none" : ""}`}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={isNone}
                                        onChange={() => {
                                          const updated = isSelected
                                            ? form.setting.preferredPlateTags.filter(t => t !== tag)
                                            : [...form.setting.preferredPlateTags.filter(t => t !== "__none__"), tag];
                                          setForm({ ...form, setting: { ...form.setting, preferredPlateTags: updated } });
                                        }}
                                        className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                                      />
                                      <span className={isSelected ? "text-stone-800 font-medium" : "text-stone-600"}>{tag}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 italic">Tabak asset'lerine tag eklediğinizde burada görünecek.</p>
                        )}
                      </div>

                      {/* Fincan Tercihi */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Fincan Tercihi
                        </label>
                        {cupAssetTags.length > 0 ? (
                          <div className="relative" ref={cupTagsRef}>
                            <button
                              type="button"
                              onClick={() => setCupTagsOpen(!cupTagsOpen)}
                              className="w-full px-4 py-2 border border-stone-300 rounded-lg bg-white text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            >
                              <span className={form.setting.preferredCupTags.length > 0 ? (form.setting.preferredCupTags.includes("__none__") ? "text-stone-500 italic" : "text-stone-800") : "text-stone-400"}>
                                {form.setting.preferredCupTags.includes("__none__")
                                  ? "Yok (sahnede olmasın)"
                                  : form.setting.preferredCupTags.length > 0
                                    ? form.setting.preferredCupTags.join(", ")
                                    : "Fincan tag'i seçin (opsiyonel)"}
                              </span>
                              <svg className={`w-4 h-4 text-stone-400 transition-transform ${cupTagsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {cupTagsOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 cursor-pointer text-sm border-b border-stone-100">
                                  <input
                                    type="checkbox"
                                    checked={form.setting.preferredCupTags.includes("__none__")}
                                    onChange={() => {
                                      const isNone = form.setting.preferredCupTags.includes("__none__");
                                      setForm({
                                        ...form,
                                        setting: { ...form.setting, preferredCupTags: isNone ? [] : ["__none__"] },
                                      });
                                    }}
                                    className="rounded border-stone-300 text-red-500 focus:ring-red-400"
                                  />
                                  <span className={form.setting.preferredCupTags.includes("__none__") ? "text-red-600 font-medium" : "text-stone-600"}>
                                    Yok (sahnede olmasın)
                                  </span>
                                </label>
                                {cupAssetTags.map(tag => {
                                  const isNone = form.setting.preferredCupTags.includes("__none__");
                                  const isSelected = form.setting.preferredCupTags.includes(tag);
                                  return (
                                    <label key={tag} className={`flex items-center gap-2 px-4 py-2 hover:bg-stone-50 cursor-pointer text-sm ${isNone ? "opacity-40 pointer-events-none" : ""}`}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={isNone}
                                        onChange={() => {
                                          const updated = isSelected
                                            ? form.setting.preferredCupTags.filter(t => t !== tag)
                                            : [...form.setting.preferredCupTags.filter(t => t !== "__none__"), tag];
                                          setForm({ ...form, setting: { ...form.setting, preferredCupTags: updated } });
                                        }}
                                        className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                                      />
                                      <span className={isSelected ? "text-stone-800 font-medium" : "text-stone-600"}>{tag}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 italic">Fincan asset'lerine tag eklediğinizde burada görünecek.</p>
                        )}
                      </div>

                      {/* Hava Durumu (ışık + atmosferi otomatik ayarlar) */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Hava Durumu
                        </label>
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
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          {WEATHER_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.labelTr}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Işık (hava durumuna göre otomatik seçilir, değiştirilebilir) */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-1">
                          Işık
                          {form.setting.weatherPreset && (
                            <span className="text-xs text-amber-500 font-normal">otomatik ayarlandı</span>
                          )}
                        </label>
                        <select
                          value={form.setting.lightingPreset}
                          onChange={(e) => setForm({
                            ...form,
                            setting: { ...form.setting, lightingPreset: e.target.value },
                          })}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          {LIGHTING_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.labelTr}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Atmosfer (hava durumuna göre otomatik seçilir, değiştirilebilir) */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-1">
                          Atmosfer
                          {form.setting.weatherPreset && (
                            <span className="text-xs text-amber-500 font-normal">otomatik ayarlandı</span>
                          )}
                        </label>
                        <select
                          value={form.setting.atmospherePreset}
                          onChange={(e) => setForm({
                            ...form,
                            setting: { ...form.setting, atmospherePreset: e.target.value },
                          })}
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          {ATMOSPHERE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.labelTr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-stone-200 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.scenario}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDialog
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title={`"${themes.find(t => t.id === deleteId)?.name || "Tema"}" Silinecek`}
          description="Bu temayı silmek istediğinize emin misiniz?"
          consequences={[
            "Tema kalıcı olarak silinecektir",
            "Bu işlem geri alınamaz",
          ]}
          affectedItems={(() => {
            const theme = themes.find(t => t.id === deleteId);
            return theme?.scenarios || [];
          })()}
          confirmText="Evet, Sil"
          cancelText="Vazgeç"
          variant="danger"
          isLoading={deleting}
        />
      </div>
    </div>
  );
}

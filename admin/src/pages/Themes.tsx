import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type { Theme, Mood } from "../types";
import { Tooltip } from "../components/Tooltip";
import { SetupStepper } from "../components/SetupStepper";
import { PageGuide } from "../components/PageGuide"; // New Import
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageTour } from "../components/PageTour";
import type { TourStep } from "../components/PageTour";

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
    content: "Buradan yeni tema oluşturabilirsiniz. Her tema belirli senaryoları ve mood ayarlarını içerir.",
    position: "left",
  },
  {
    target: "[data-tour='variation-rules']",
    title: "Çeşitlilik Kuralları",
    content: "Bu ayarlar AI'ın aynı öğeleri ne sıklıkta tekrar kullanabileceğini belirler. Monotonluğu önler.",
    position: "top",
  },
];

// Senaryo tipi (API'den gelen)
interface Scenario {
  id: string;
  name: string;
  includesHands: boolean;
  isInterior: boolean;
}

// Çeşitlilik kuralları tipi
interface VariationRules {
  scenarioGap: number;
  tableGap: number;
  handStyleGap: number;
  compositionGap: number;
  petFrequency: number;
  similarityThreshold: number;
}

// Varsayılan değerler
const DEFAULT_VARIATION_RULES: VariationRules = {
  scenarioGap: 3,
  tableGap: 2,
  handStyleGap: 4,
  compositionGap: 2,
  petFrequency: 15,
  similarityThreshold: 50,
};

// Mood seçenekleri artık dinamik olarak veritabanından (api.getMoods) yüklenir.


// Boş tema formu
const emptyTheme = {
  id: "",
  name: "",
  description: "",
  scenario: "", // Tekil senaryo seçimi
  mood: "",
  petAllowed: false,
  accessoryAllowed: false,
};

export default function Themes() {
  const { startLoading, stopLoading } = useLoading();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Senaryolar state (API'den dinamik yüklenir)
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);

  // Moods state (Dinamik)
  const [moods, setMoods] = useState<Mood[]>([]);

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

  // Çeşitlilik kuralları state
  const [variationRules, setVariationRules] = useState<VariationRules>(DEFAULT_VARIATION_RULES);
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    loadThemes();
    loadScenarios();
    loadVariationRules();
    loadMoods();
  }, []);

  // Moodları API'den yükle
  const loadMoods = async () => {
    try {
      const data = await api.getMoods();
      setMoods(data);
    } catch (err) {
      console.error("Moodlar yüklenemedi:", err);
    }
  };

  // Senaryoları API'den yükle
  const loadScenarios = async () => {
    setScenariosLoading(true);
    try {
      const response = await api.listScenarios();
      // API'den gelen senaryoları Scenario tipine dönüştür
      const scenarios: Scenario[] = response.all.map((s: { id: string; name: string; includesHands?: boolean; isInterior?: boolean }) => ({
        id: s.id,
        name: s.name,
        includesHands: s.includesHands ?? false,
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

  // Çeşitlilik kurallarını yükle
  const loadVariationRules = async () => {
    try {
      const data = await api.getOrchestratorConfig();
      if (data?.variationRules) {
        setVariationRules({
          ...DEFAULT_VARIATION_RULES,
          ...data.variationRules,
        });
      }
    } catch (err) {
      console.error("Çeşitlilik kuralları yüklenemedi:", err);
    }
  };

  // Çeşitlilik kurallarını kaydet
  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await api.updateOrchestratorConfig({ variationRules });
      alert("Kurallar kaydedildi");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSavingRules(false);
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
        mood: theme.mood,
        petAllowed: theme.petAllowed,
        accessoryAllowed: theme.accessoryAllowed ?? false,
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

      if (editingId) {
        // Güncelleme - id hariç diğer alanları gönder
        await api.updateTheme(editingId, {
          name: form.name,
          description: form.description,
          scenarios: scenariosArray,
          mood: form.mood,
          petAllowed: form.petAllowed,
          accessoryAllowed: form.accessoryAllowed,
        });
      } else {
        // Yeni oluşturma
        await api.createTheme({
          id: form.id,
          name: form.name,
          description: form.description,
          scenarios: scenariosArray,
          mood: form.mood,
          petAllowed: form.petAllowed,
          accessoryAllowed: form.accessoryAllowed,
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

  // ID oluştur (name'den)
  const generateId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

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
                <li><strong>Mood (Atmosfer):</strong> O haftanın duygusu (Örn: Neşeli Yaz Sabahı).</li>
                <li><strong>Senaryolar (Pozlar):</strong> O hafta kullanılacak çekim teknikleri (Örn: Sadece sahil ve piknik pozları).</li>
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
                  <strong>Mantık Testi:</strong> Temayı kaydetmeden önce kendinize sorun: "Bu paketteki her şey (Mood + Senaryolar) aynı filmin sahnesi gibi mi duruyor?" Cevap evetse, doğru yoldasınız.
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

                  {/* Mood - Dinamik */}
                  {(() => {
                    const moodInfo = (moods || []).find((m) => m.id === theme.mood);
                    return (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                          <span className="font-medium">Mood:</span>
                          {moodInfo ? (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                              {moodInfo.name}
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium italic">
                              Tanımsız ({theme.mood})
                            </span>
                          )}
                        </div>
                        {moodInfo && (
                          <div className="space-y-1">
                            <p className="text-xs text-stone-500 italic line-clamp-1" title={moodInfo.lightingPrompt}>
                              💡 {moodInfo.lightingPrompt}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {theme.petAllowed && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Köpek izinli
                            </span>
                          )}
                          {theme.accessoryAllowed && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              Aksesuar izinli
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
                            : scenario?.includesHands
                              ? "bg-purple-100 text-purple-700"
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

        {/* Çeşitlilik Kuralları Bölümü */}
        <div className="bg-white rounded-xl border border-stone-200 p-6" data-tour="variation-rules">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Çeşitlilik Kuralları</h2>
              <p className="text-sm text-stone-500 mt-1">
                İçerik üretiminde tekrarı önlemek için kuralları ayarlayın
              </p>
            </div>
            <button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {savingRules ? "Kaydediliyor..." : "Kuralları Kaydet"}
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Senaryo Aralığı */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                Senaryo Aralığı: {variationRules.scenarioGap}
                <Tooltip
                  content="Örn: 3 = aynı senaryo en az 3 üretim sonra tekrar kullanılabilir"
                  position="top"
                />
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={variationRules.scenarioGap}
                onChange={(e) =>
                  setVariationRules({ ...variationRules, scenarioGap: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-xs text-stone-500 mt-1">
                Aynı senaryo kaç üretim sonra tekrarlanabilir
              </p>
            </div>

            {/* Masa Aralığı */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Masa Aralığı: {variationRules.tableGap}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={variationRules.tableGap}
                onChange={(e) =>
                  setVariationRules({ ...variationRules, tableGap: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-xs text-stone-500 mt-1">
                Aynı masa/yüzey kaç üretim sonra tekrarlanabilir
              </p>
            </div>

            {/* El Stili Aralığı */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                El Stili Aralığı: {variationRules.handStyleGap}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={variationRules.handStyleGap}
                onChange={(e) =>
                  setVariationRules({ ...variationRules, handStyleGap: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-xs text-stone-500 mt-1">
                Aynı el stili kaç üretim sonra tekrarlanabilir
              </p>
            </div>

            {/* Kompozisyon Aralığı */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Kompozisyon Aralığı: {variationRules.compositionGap}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={variationRules.compositionGap}
                onChange={(e) =>
                  setVariationRules({ ...variationRules, compositionGap: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-xs text-stone-500 mt-1">
                Aynı kompozisyon kaç üretim sonra tekrarlanabilir
              </p>
            </div>

            {/* Köpek Frekansı */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Köpek Frekansı: Her {variationRules.petFrequency} üretimde 1
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={variationRules.petFrequency}
                onChange={(e) =>
                  setVariationRules({ ...variationRules, petFrequency: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-xs text-stone-500 mt-1">
                Köpek ne sıklıkla dahil edilsin (teması izin veriyorsa)
              </p>
            </div>

            {/* Benzerlik Eşiği */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                Benzerlik Eşiği: %{variationRules.similarityThreshold}
                <Tooltip
                  content="Yüksek değer = daha farklı görseller. Düşük değer = benzer görsellere izin."
                  position="top"
                />
              </label>
              <input
                type="range"
                min="30"
                max="80"
                value={variationRules.similarityThreshold}
                onChange={(e) =>
                  setVariationRules({ ...variationRules, similarityThreshold: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-xs text-stone-500 mt-1">
                Bu oranın üzerindeki benzerlikler engellenir
              </p>
            </div>
          </div>
        </div>

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
                        const name = e.target.value;
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
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Bu temanın kullanım amacı..."
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:text-stone-400"
                      rows={3}
                      disabled={isGeneratingDescription}
                    />
                    <p className="text-[10px] text-stone-400 mt-1 text-right">
                      *AI açıklamayı İngilizce ve yönetmen notu formatında yazar.
                    </p>
                  </div>

                  {/* Mood - Gemini Terminolojisi ile */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-2">
                      Mood (Atmosfer)
                      <Tooltip
                        content="Temanın genel havası. AI bu değere göre ışık, renk sıcaklığı ve atmosfer ayarlarını uygular."
                        position="right"
                      />
                    </label>
                    <select
                      value={form.mood}
                      onChange={(e) => setForm({ ...form, mood: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Mood Seçiniz</option>
                      {moods.map((mood) => (
                        <option key={mood.id} value={mood.id}>
                          {mood.name} ({mood.timeOfDay})
                        </option>
                      ))}
                    </select>

                    {/* Gemini Atmosfer Önizleme - Dinamik */}
                    {(() => {
                      const selectedMood = moods.find((m) => m.id === form.mood);
                      if (!selectedMood) return null;
                      return (
                        <div className="mt-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                          <p className="text-xs font-medium text-amber-800 mb-2">
                            Gemini Prompt Önizleme:
                          </p>
                          <div className="space-y-2 text-xs text-stone-700">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-amber-700">💡 Işık:</span>
                              <span className="font-mono bg-white px-2 py-1 rounded border border-amber-100">
                                {selectedMood.lightingPrompt}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-amber-700">🎨 Renk & Atmosfer:</span>
                              <span className="font-mono bg-white px-2 py-1 rounded border border-amber-100">
                                {selectedMood.colorGradePrompt}
                              </span>
                            </div>
                            <div className="mt-2 text-[10px] text-stone-500 italic">
                              {selectedMood.description}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
                          content="İzin verilirse köpek 'Çeşitlilik Kuralları'ndaki frekansa göre görsellere eklenir."
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
                    <p className="text-xs text-stone-500 mt-1 ml-8">
                      Telefon, çanta, anahtar, kitap gibi gerçekçi pastane detayları
                    </p>
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
                              {scenario.includesHands ? " (El var)" : ""}
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
                                {selected.includesHands && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">El var</span>
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

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../services/api";
import AssetUpload from "../components/AssetUpload";
import TagInput from "../components/TagInput";
import type {
  OrchestratorAsset,
  AssetCategory,
  EatingMethod,
  DynamicCategory,
  Style,
} from "../types";
import { useLoading, useLoadingOperation } from "../contexts/LoadingContext";
import { Tooltip } from "../components/Tooltip";
import { SetupStepper } from "../components/SetupStepper";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageTour } from "../components/PageTour";
import type { TourStep } from "../components/PageTour";

// Assets sayfası tour adımları
const ASSETS_TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='assets-header']",
    title: "Görsel Yönetimi",
    content: "Bu sayfada AI görsel üretiminde kullanılacak tüm görselleri yönetebilirsiniz: ürünler, masalar, aksesuarlar ve daha fazlası.",
    position: "bottom",
  },
  {
    target: "[data-tour='assets-add']",
    title: "Yeni Görsel Ekle",
    content: "Buradan yeni görsel yükleyebilirsiniz. Her görselin kategorisi, renkleri ve stili AI tarafından kullanılır.",
    position: "left",
  },
  {
    target: "[data-tour='assets-filters']",
    title: "Kategori Filtreleri",
    content: "Görselleri kategoriye göre filtreleyin: Ürünler, Mobilya, Aksesuarlar vb. Her kategori farklı amaçlar için kullanılır.",
    position: "bottom",
  },
  {
    target: "[data-tour='setup-stepper']",
    title: "Kurulum Adımları",
    content: "Üstteki adımlar kurulum sürecinizi gösterir. Görseller ilk adımdır - sonra Senaryolar, Temalar ve Zamanlar gelir.",
    position: "bottom",
  },
];

// Kategori etiketleri
const CATEGORY_LABELS: Record<AssetCategory, string> = {
  products: "Ürünler",
  props: "Servis & Ambalaj",
  furniture: "Mobilya",
  environments: "Ortamlar",
  pets: "Evcil Hayvanlar",
  interior: "Mekan Atmosferi",
  accessories: "Aksesuarlar",
};

// Alt tip etiketleri
const SUBTYPE_LABELS: Record<string, string> = {
  // Products
  croissants: "Kruvasan",
  pastas: "Pasta",
  chocolates: "Çikolata",
  coffees: "Kahve",
  // Props
  plates: "Tabak",
  cups: "Fincan",
  cutlery: "Çatal-Bıçak Seti",
  fork: "Çatal",
  knife: "Bıçak",
  spoon: "Kaşık",
  napkins: "Peçete",
  "cutlery-napkin-set": "Çatal-Bıçak + Peçete Seti",
  boxes: "Kutu (Pasta/Çikolata)",
  bags: "Kağıt Çanta",
  "paper-bag": "Kese Kağıdı (Kruvasan)",
  "sugar-stick": "Stick Şeker (Ambalajlı)",
  straw: "Pipet (Sargılı/Logolu)",
  // Furniture
  tables: "Masa",
  chairs: "Sandalye",
  decor: "Dekor",
  // Environments (ortamlar)
  indoor: "İç Mekan",
  outdoor: "Dış Mekan",
  window: "Pencere Önü",
  cafe: "Kafe",
  home: "Ev",
  // Pets (evcil hayvanlar)
  dogs: "Köpek",
  cats: "Kedi",
  // Interior (mekan atmosferi - AI üretimi yapılmaz)
  vitrin: "Vitrin",
  tezgah: "Tezgah",
  "oturma-alani": "Oturma Alanı",
  dekorasyon: "Dekorasyon",
  "genel-mekan": "Genel Mekan",
  // Accessories (aksesuarlar - gerçekçi pastane deneyimi)
  phone: "Telefon",
  bag: "Çanta",
  keys: "Anahtar",
  book: "Kitap",
  toy: "Oyuncak",
  tablet: "Tablet",
  glasses: "Gözlük",
  watch: "Saat",
  notebook: "Defter",
  wallet: "Cüzdan",
};

// Alt tipler kategori bazlı
const SUBTYPES_BY_CATEGORY: Record<AssetCategory, string[]> = {
  products: ["croissants", "pastas", "chocolates", "coffees"],
  // Legacy Props (Tabak/Çanak)
  props: [
    "plates", "cups", "cutlery", "fork", "knife", "spoon",
    "napkins", "cutlery-napkin-set",
    "boxes", "bags", "paper-bag",
    "sugar-stick", "straw"
  ],
  furniture: ["tables", "chairs", "decor"],
  environments: ["indoor", "outdoor", "window", "cafe", "home"],
  pets: ["dogs", "cats"],
  interior: ["vitrin", "tezgah", "oturma-alani", "dekorasyon", "genel-mekan"],
  // Yeni Set Designer Props (Aksesuarlar)
  accessories: [
    "textile",      // Peçete, örtü
    "cutlery",      // Çatal, bıçak
    "decoration",   // Vazo, çiçek
    "ingredient",   // Malzeme
    // Legacy
    "phone", "bag", "keys", "book", "toy", "tablet", "glasses", "watch", "notebook", "wallet"
  ],
};

// Kategori bazlı hangi alanların gösterileceği
// required: Göster ve kritik olduğunu vurgula
// optional: Göster, opsiyonel etiketi ile
// hidden: Gösterme
type FieldVisibility = "required" | "optional" | "hidden";

interface CategoryFieldConfig {
  tags: FieldVisibility;
  dominantColors: FieldVisibility;
  style: FieldVisibility;
  material: FieldVisibility;
}

const FIELDS_BY_CATEGORY: Record<AssetCategory, CategoryFieldConfig> = {
  products: { tags: "required", dominantColors: "hidden", style: "hidden", material: "hidden" },
  props: { tags: "required", dominantColors: "hidden", style: "hidden", material: "required" },
  furniture: { tags: "required", dominantColors: "hidden", style: "hidden", material: "required" },
  environments: { tags: "required", dominantColors: "hidden", style: "hidden", material: "hidden" },
  pets: { tags: "required", dominantColors: "hidden", style: "hidden", material: "hidden" },
  interior: { tags: "required", dominantColors: "hidden", style: "hidden", material: "hidden" },
  accessories: { tags: "required", dominantColors: "hidden", style: "hidden", material: "required" }, // Materyal artık zorunlu (Kumaş, Metal vb.)
};

export default function Assets() {
  const [assets, setAssets] = useState<OrchestratorAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Dinamik kategoriler
  const [dynamicCategories, setDynamicCategories] = useState<DynamicCategory[]>([]);
  // Dinamik stiller
  const [styles, setStyles] = useState<Style[]>([]);

  // Modal state - hem create hem edit için
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<OrchestratorAsset | null>(null);

  // Global loading hook
  const { startLoading, stopLoading } = useLoading();
  const { execute: executeDelete } = useLoadingOperation("asset-delete");

  // Dinamik CATEGORY_LABELS oluştur
  const dynamicCategoryLabels = useMemo(() => {
    const labels: Record<string, string> = { ...CATEGORY_LABELS };
    dynamicCategories.forEach((cat) => {
      labels[cat.type] = cat.displayName;
    });
    return labels as Record<AssetCategory, string>;
  }, [dynamicCategories]);

  // Dinamik SUBTYPE_LABELS oluştur
  const dynamicSubtypeLabels = useMemo(() => {
    const labels: Record<string, string> = { ...SUBTYPE_LABELS };
    dynamicCategories.forEach((cat) => {
      cat.subTypes.forEach((st) => {
        labels[st.slug] = st.displayName;
      });
    });
    return labels;
  }, [dynamicCategories]);

  // Dinamik SUBTYPES_BY_CATEGORY oluştur
  const dynamicSubtypesByCategory = useMemo(() => {
    const subtypes: Record<string, string[]> = {};
    // Önce varsayılanları kopyala
    Object.entries(SUBTYPES_BY_CATEGORY).forEach(([cat, subs]) => {
      subtypes[cat] = [...subs];
    });
    // Dinamik kategorilerden güncelle (aktif olanları)
    dynamicCategories.forEach((cat) => {
      const activeSlugs = cat.subTypes
        .filter((st) => st.isActive)
        .sort((a, b) => a.order - b.order)
        .map((st) => st.slug);
      if (activeSlugs.length > 0) {
        subtypes[cat.type] = activeSlugs;
      }
    });
    return subtypes as Record<AssetCategory, string[]>;
  }, [dynamicCategories]);

  // Tüm asset'lerdeki unique tag'leri topla (autocomplete önerileri için)
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach((a) => a.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [assets]);

  // Kategorileri ve asset'leri yükle
  useEffect(() => {
    loadInitialData();
  }, []);

  // Seçili kategori değişince asset'leri yükle
  useEffect(() => {
    loadAssets();
  }, [selectedCategory]);

  const loadInitialData = async () => {
    try {
      // Kategorileri yükle
      const categoriesData = await api.getCategories().catch(() => null);
      if (categoriesData) {
        setDynamicCategories(categoriesData.categories.filter((c: DynamicCategory) => !c.isDeleted));
      }

      // Stilleri yükle
      const stylesData = await api.getStyles(true).catch(() => []); // Sadece aktifleri getir
      if (stylesData) {
        setStyles(stylesData);
      }
    } catch (err) {
      console.error("[Assets] Veriler yüklenemedi:", err);
    }
  };

  const loadAssets = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    if (!silent) startLoading("assets", "Görseller yükleniyor...");
    try {
      const filters = {
        ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
        isActive: true
      };
      const data = await api.listAssets(filters);
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yuklenemedi");
    } finally {
      if (!silent) setLoading(false);
      if (!silent) stopLoading("assets");
    }
  };

  // Modal açma fonksiyonları
  const openCreateModal = () => {
    setEditingAsset(null);
    setShowModal(true);
  };

  const openEditModal = (asset: OrchestratorAsset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingAsset(null);
    setShowModal(false);
  };

  const handleModalSuccess = () => {
    closeModal();
    loadAssets(true); // Silent reload - scroll pozisyonunu korur
  };

  // Silme onay modalını aç
  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  // Gerçek silme işlemi
  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    try {
      await executeDelete(async () => {
        await api.deleteAsset(confirmDeleteId);
        await loadAssets();
      }, "Gorsel siliniyor...");
      setConfirmDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme hatasi");
    } finally {
      setDeletingId(null);
    }
  };

  // Kategoriye göre grupla
  const groupedAssets = assets.reduce((acc, asset) => {
    const key = asset.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {} as Record<string, OrchestratorAsset[]>);

  // UI Grupları
  const assetGroups = [
    {
      title: "Ana Öğeler (HERO)",
      categories: ["products", "furniture", "pets"] as AssetCategory[]
    },
    {
      title: "Servis (SUPPORT)",
      categories: ["props"] as AssetCategory[] // Not: props teknik adı, ekranda Servis & Ambalaj
    },
    {
      title: "Dekor (PROPS)",
      categories: ["accessories", "interior", "environments"] as AssetCategory[]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Setup Stepper */}
      <div data-tour="setup-stepper">
        <SetupStepper />
      </div>

      {/* Header */}
      <div className="flex justify-between items-start" data-tour="assets-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Görsel Yönetimi</h1>
          <p className="text-gray-500 mt-1">Ürün, aksesuar, mobilya, ortam ve evcil hayvan görselleri</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary" data-tour="assets-add">
          + Yeni Görsel
        </button>
      </div>

      {/* Page Tour */}
      <PageTour tourId="assets-page" steps={ASSETS_TOUR_STEPS} />

      {/* View Toggle & Filters */}
      <div className="flex flex-col gap-4">
        {/* Gruplanmış Filtreler */}
        <div className="flex flex-wrap gap-6 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100" data-tour="assets-filters">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedCategory === "all"
              ? "bg-gray-900 text-white shadow-md transform scale-105"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            Tümü ({assets.length})
          </button>

          <div className="h-8 w-px bg-gray-200 mx-2"></div>

          {assetGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                {group.title}
              </span>
              <div className="flex gap-2">
                {group.categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedCategory === cat
                      ? "bg-brand-blue text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                      }`}
                  >
                    {dynamicCategoryLabels[cat]}
                    <span className="ml-1.5 opacity-60 text-xs">
                      {groupedAssets[cat]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-end">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700"}`}
              title="Grid Görünüm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700"}`}
              title="Liste Görünüm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
          <button onClick={() => loadAssets()} className="btn-secondary mt-4">
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Asset Listesi */}
      {!loading && !error && (
        <>
          {assets.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📸</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Henüz asset yüklenmedi
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Asset'ler, görsel üretimde kullanılan ürün fotoğrafları, masa, tabak,
                dekorasyon gibi görsellerdir.
              </p>

              <div className="bg-blue-50 rounded-xl p-4 mb-6 max-w-lg mx-auto text-left">
                <p className="text-sm font-medium text-blue-800 mb-2">💡 Asset kategorileri:</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  <div>• <strong>Ürünler</strong> - Pasta, çikolata vb.</div>
                  <div>• <strong>Props</strong> - Tabak, bardak, çatal</div>
                  <div>• <strong>Mobilya</strong> - Masa, sandalye</div>
                  <div>• <strong>Ortam</strong> - İç/dış mekan</div>
                  <div>• <strong>Evcil</strong> - Kedi, köpek</div>
                  <div>• <strong>Aksesuar</strong> - Çiçek, mum vb.</div>
                </div>
              </div>

              <button
                onClick={openCreateModal}
                className="bg-brand-blue text-white px-6 py-3 rounded-xl hover:bg-brand-blue/90 font-medium inline-flex items-center gap-2"
              >
                <span>+</span>
                <span>İlk Asset'i Yükle</span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  categoryLabels={dynamicCategoryLabels}
                  subtypeLabels={dynamicSubtypeLabels}
                  onEdit={() => openEditModal(asset)}
                  onDelete={() => handleDelete(asset.id)}
                  isDeleting={deletingId === asset.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Görsel
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dosya Adı / Tip
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Özellikler
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {asset.storageUrl ? (
                            <img
                              src={asset.thumbnailUrl || asset.storageUrl}
                              alt={asset.filename}
                              className="h-12 w-12 rounded-lg object-cover bg-gray-100"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                              📷
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={asset.filename}>
                            {asset.filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dynamicCategoryLabels[asset.category as AssetCategory]} • {dynamicSubtypeLabels[asset.subType] || asset.subType}
                          </div>
                          {asset.tags && asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {asset.tags.map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-100 font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {asset.visualProperties?.dominantColors && asset.visualProperties.dominantColors.length > 0 && (
                              <div className="flex gap-1">
                                {asset.visualProperties.dominantColors.slice(0, 3).map((color, i) => (
                                  <div
                                    key={i}
                                    className="w-3 h-3 rounded-full border border-gray-200"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {asset.usageCount} kez kullanıldı
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${asset.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                            }`}>
                            {asset.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openEditModal(asset)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              disabled={deletingId === asset.id}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === asset.id ? "Siliniyor..." : "Sil"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Asset Modal (Create/Edit) */}
      {showModal && (
        <AssetModal
          asset={editingAsset}
          categoryLabels={dynamicCategoryLabels}
          subtypeLabels={dynamicSubtypeLabels}
          subtypesByCategory={dynamicSubtypesByCategory}
          tagSuggestions={allUniqueTags}
          styleOptions={styles}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Silme Onay Modal */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Görsel Silinecek"
        description={`"${assets.find(a => a.id === confirmDeleteId)?.filename || "Görsel"}" dosyasını silmek istediğinize emin misiniz?`}
        consequences={[
          "Görsel kalıcı olarak silinecektir",
          "Bu işlem geri alınamaz",
          "Eğer bu görsel üretimlerde kullanıldıysa, geçmiş üretimler etkilenmez",
        ]}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="danger"
        isLoading={!!deletingId}
      />
    </div>
  );
}

// Asset kartı
function AssetCard({
  asset,
  categoryLabels,
  subtypeLabels,
  onEdit,
  onDelete,
  isDeleting,
}: {
  asset: OrchestratorAsset;
  categoryLabels: Record<AssetCategory, string>;
  subtypeLabels: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Görsel */}
      {asset.storageUrl && (
        <div className="aspect-square bg-gray-100 rounded-xl mb-4 overflow-hidden">
          <img
            src={asset.thumbnailUrl || asset.storageUrl}
            alt={asset.filename}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Bilgiler */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-gray-900 truncate">{asset.filename}</p>
            <p className="text-sm text-gray-500">
              {categoryLabels[asset.category as AssetCategory]} / {subtypeLabels[asset.subType] || asset.subType}
              {asset.tags && asset.tags.length > 0 && (
                <span className="ml-1 text-gray-400">• {asset.tags.length} etiket</span>
              )}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs ${asset.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
            {asset.isActive ? "Aktif" : "Pasif"}
          </span>
        </div>

        {/* Tags - Tümü gösteriliyor */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100 font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Renkler */}
        {asset.visualProperties?.dominantColors && asset.visualProperties.dominantColors.length > 0 && (
          <div className="flex gap-1">
            {asset.visualProperties.dominantColors.slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-gray-200"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}

        {/* Kullanım */}
        <div className="text-xs text-gray-400">
          {asset.usageCount} kez kullanıldı
        </div>

        {/* Aksiyonlar */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onEdit}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            Düzenle
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Asset Modal (Create/Edit birleşik)
function AssetModal({
  asset,
  categoryLabels,
  subtypeLabels,
  subtypesByCategory,
  tagSuggestions,
  styleOptions,
  onClose,
  onSuccess,
}: {
  asset: OrchestratorAsset | null; // null = create mode
  categoryLabels: Record<AssetCategory, string>;
  subtypeLabels: Record<string, string>;
  subtypesByCategory: Record<AssetCategory, string[]>;
  tagSuggestions: string[];
  styleOptions: Style[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditMode = asset !== null;

  // Form state
  const [category, setCategory] = useState<AssetCategory>(asset?.category as AssetCategory || "products");
  const [subType, setSubType] = useState(asset?.subType || "");
  const [filename, setFilename] = useState(asset?.filename || "");
  const [storageUrl, setStorageUrl] = useState(asset?.storageUrl || "");
  const [tags, setTags] = useState<string[]>(asset?.tags || []);
  const [dominantColors, setDominantColors] = useState(asset?.visualProperties?.dominantColors?.join(", ") || "");
  const [style, setStyle] = useState(asset?.visualProperties?.style || "modern");
  const [material, setMaterial] = useState(asset?.visualProperties?.material || "");
  // Yeme şekli ve elle tutulabilirlik alanları
  const [eatingMethod, setEatingMethod] = useState<EatingMethod>(
    asset?.eatingMethod || asset?.holdingType || "hand"
  );
  const [canBeHeldByHand, setCanBeHeldByHand] = useState<boolean>(
    asset?.canBeHeldByHand !== undefined
      ? asset.canBeHeldByHand
      : (asset?.holdingType === "hand" || asset?.eatingMethod === "hand")
  );


  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit modunda görsel değiştirme kontrolü
  const [wantsToChangeImage, setWantsToChangeImage] = useState(false);

  // Kategori değişince alt tipi güncelle (sadece create modda veya kategori değişince)
  useEffect(() => {
    if (!isEditMode) {
      // Create modda kategori değişince ilk alt tipi seç ve upload'ı temizle
      const subtypes = subtypesByCategory[category];
      if (subtypes.length > 0) {
        setSubType(subtypes[0]);
      }
      setFilename("");
      setStorageUrl("");
      setUploadError(null);
    }
  }, [category, isEditMode]);

  // Edit modda başlangıç değerlerini ayarla
  useEffect(() => {
    if (asset) {
      setCategory(asset.category as AssetCategory);
      setSubType(asset.subType);
      setFilename(asset.filename);
      setStorageUrl(asset.storageUrl);
      setTags(asset.tags || []);
      setDominantColors(asset.visualProperties?.dominantColors?.join(", ") || "");
      setStyle(asset.visualProperties?.style || "modern");
      setMaterial(asset.visualProperties?.material || "");
      setEatingMethod(asset.eatingMethod || asset.holdingType || "hand");
      setCanBeHeldByHand(
        asset.canBeHeldByHand !== undefined
          ? asset.canBeHeldByHand
          : (asset.holdingType === "hand" || asset.eatingMethod === "hand")
      );
    }
  }, [asset]);

  // Yeme şekli değişince elle tutulabilirliği otomatik ayarla
  useEffect(() => {
    if (eatingMethod === "hand") {
      setCanBeHeldByHand(true);
    }
  }, [eatingMethod]);

  // useCallback ile stabil referans - upload sırasında parent re-render olsa bile callback çalışır
  const handleUploadComplete = useCallback((url: string, uploadedFilename: string) => {
    console.log("[AssetModal] Upload complete:", { url: url.substring(0, 50) + "...", uploadedFilename });
    setStorageUrl(url);
    setFilename(uploadedFilename);
    setUploadError(null);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error("[AssetModal] Upload error:", error);
    setUploadError(error);
  }, []);

  // Mevcut kategorinin alan konfigürasyonu
  const fieldConfig = FIELDS_BY_CATEGORY[category];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitted(true);

    // Create modda görsel zorunlu
    if (!isEditMode && (!filename || !storageUrl)) {
      alert("Lütfen önce dosya yükleyin");
      return;
    }

    // Zorunlu alan validasyonu - inline hatalar gösterilir
    const hasTagError = fieldConfig.tags === "required" && tags.length === 0;
    const hasColorError = fieldConfig.dominantColors === "required" && !dominantColors.trim();
    if (hasTagError || hasColorError) return;

    setSaving(true);
    try {
      // Alan değerlerini kategori bazlı hazırla
      const parsedTags = fieldConfig.tags !== "hidden" ? tags : [];

      const parsedColors = fieldConfig.dominantColors !== "hidden"
        ? dominantColors.split(",").map(c => c.trim()).filter(Boolean)
        : [];

      const parsedStyle = fieldConfig.style !== "hidden"
        ? (style || "modern")
        : "modern";

      const parsedMaterial = fieldConfig.material !== "hidden" && material
        ? material
        : undefined;

      // Asset data objesi
      const assetData = {
        category,
        subType,
        filename,
        storageUrl,
        tags: parsedTags,
        visualProperties: {
          dominantColors: parsedColors,
          style: parsedStyle,
          ...(parsedMaterial && { material: parsedMaterial }),
        },
        // Sadece products kategorisinde yeme/tutma özellikleri kaydedilir
        ...(category === "products" && {
          eatingMethod,
          canBeHeldByHand,
          holdingType: eatingMethod, // geriye uyumluluk için
        }),
      };

      if (isEditMode && asset) {
        // Update modu
        await api.updateAsset(asset.id, assetData);
      } else {
        // Create modu
        await api.createAsset(assetData);
      }

      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  // Label helper - opsiyonel/zorunlu etiketi


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isEditMode ? "✨ Görsel Düzenle" : "📸 Yeni Görsel Ekle"}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {isEditMode ? "Asset bilgilerini güncelleyin" : "AI içerik üretimi için görsel yükleyin"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            {/* Sol Panel - Görsel Önizleme */}
            <div className="lg:col-span-2 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50">
              <div className="sticky top-0">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📷 Görsel Yükleme
                </label>

                {/* Büyük Görsel Önizleme Alanı */}
                <div className="aspect-square rounded-2xl bg-white border-2 border-dashed border-gray-200 overflow-hidden shadow-inner">
                  {/* Yüklü görsel varsa göster */}
                  {storageUrl && !wantsToChangeImage ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={storageUrl}
                        alt={filename}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setWantsToChangeImage(true)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 px-4 py-2 rounded-full font-medium shadow-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Değiştir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6">
                      <AssetUpload
                        type="image"
                        folder={`orchestrator-assets/${category}`}
                        onUploadComplete={handleUploadComplete}
                        onError={handleUploadError}
                        assetCategory={category}
                        assetSubType={subType}
                        useCloudinary={true}
                      />
                    </div>
                  )}
                </div>

                {/* Dosya bilgisi */}
                {filename && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🖼️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
                        <p className="text-xs text-gray-500">Yükleme tamamlandı</p>
                      </div>
                      {isEditMode && wantsToChangeImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setWantsToChangeImage(false);
                            if (asset) {
                              setFilename(asset.filename);
                              setStorageUrl(asset.storageUrl);
                            }
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Geri al
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <span>⚠️</span> {uploadError}
                    </p>
                  </div>
                )}
              </div>
            </div >

            {/* Sağ Panel - Form Alanları */}
            < div className="lg:col-span-3 p-6 overflow-y-auto max-h-[60vh]" >
              <div className="space-y-5">
                {/* Kategori & Alt Tip - Yan yana */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      📁 Kategori
                      <Tooltip
                        content="Görselin kullanım alanı. Ürünler AI ile işlenir, Interior doğrudan paylaşılır."
                        position="right"
                      />
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as AssetCategory)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    >
                      {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => (
                        <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                      ))}
                    </select>
                    {isEditMode && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ Kategori değişimi sadece kullanım alanını günceller</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🏷️ Alt Tip
                    </label>
                    <select
                      value={subType}
                      onChange={(e) => setSubType(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    >
                      {subtypesByCategory[category]?.map((st) => (
                        <option key={st} value={st}>{subtypeLabels[st] || st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Etiketler */}
                {fieldConfig.tags !== "hidden" && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      🏷️ Etiketler
                      {fieldConfig.tags === "required" && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      AI bu etiketlere göre uygun asset'i seçer. Kısa keyword'ler kullanın.
                    </p>
                    <TagInput
                      value={tags}
                      onChange={setTags}
                      suggestions={tagSuggestions}
                      placeholder="Örn: cheesecake, espresso, tea, gift..."
                      error={submitted && fieldConfig.tags === "required" && tags.length === 0}
                    />
                    {submitted && fieldConfig.tags === "required" && tags.length === 0 && (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                        <span>⚠️</span> En az 1 etiket gerekli
                      </p>
                    )}
                  </div>
                )}

                {/* Stil & Malzeme - Yan yana */}
                {(fieldConfig.style !== "hidden" || fieldConfig.material !== "hidden") && (
                  <div className="grid grid-cols-2 gap-4">
                    {fieldConfig.style !== "hidden" && (
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                          ✨ Stil
                          <Tooltip
                            content="AI aynı stildeki öğeleri eşleştirir."
                            position="right"
                          />
                        </label>
                        <select
                          value={style}
                          onChange={(e) => setStyle(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        >
                          {styleOptions.length > 0 ? (
                            styleOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.displayName}</option>
                            ))
                          ) : (
                            // Fallback
                            <>
                              <option value="modern">🏢 Modern</option>
                              <option value="rustic">🪵 Rustic</option>
                              <option value="minimal">⬜ Minimal</option>
                              <option value="elegant">💎 Elegant</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}

                    {fieldConfig.material !== "hidden" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          🧱 Malzeme
                        </label>
                        <select
                          value={material}
                          onChange={(e) => setMaterial(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        >
                          <option value="">Seçiniz...</option>
                          <option value="ceramic">Seramik</option>
                          <option value="porcelain">Porselen</option>
                          <option value="glass">Cam</option>
                          <option value="wood">Ahşap</option>
                          <option value="metal">Metal</option>
                          <option value="marble">Mermer</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Dominant Renkler */}
                {fieldConfig.dominantColors !== "hidden" && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                      🎨 Dominant Renkler
                      {fieldConfig.dominantColors === "required" && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={dominantColors}
                      onChange={(e) => setDominantColors(e.target.value)}
                      placeholder="cream, golden-brown, chocolate / #D4A574, #8B4513"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      💡 <span className="text-gray-500">Renk girerseniz AI daha uyumlu görseller üretir.</span>
                      <br />
                      <span className="text-gray-400">Örnekler: cream, ivory, golden-brown, chocolate, caramel</span>
                    </p>
                  </div>
                )}

                {/* Ürün Özellikleri - Products kategorisi için */}
                {category === "products" && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      🍰 Ürün Özellikleri
                    </h3>

                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                        🍴 Yeme Şekli
                        <Tooltip
                          content="AI uygun servisi seçer: çatalla yenen ürüne çatal, elle yenene el pozu ekler."
                          position="right"
                        />
                      </label>
                      <select
                        value={eatingMethod}
                        onChange={(e) => setEatingMethod(e.target.value as EatingMethod)}
                        className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      >
                        <option value="hand">🖐️ Elle Yenir (kurabiye, sandviç)</option>
                        <option value="fork">🍴 Çatalla Yenir (tiramisu, pasta dilimi)</option>
                        <option value="fork-knife">🍽️ Çatal-Bıçakla Yenir (börek)</option>
                        <option value="spoon">🥄 Kaşıkla Yenir (puding, sufle)</option>
                        <option value="none">🎂 Yenmez/Servis (bütün kek, tart)</option>
                      </select>
                    </div>

                    <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-orange-200 cursor-pointer hover:bg-orange-50 transition-colors">
                      <input
                        type="checkbox"
                        id="canBeHeldByHand"
                        checked={canBeHeldByHand}
                        onChange={(e) => setCanBeHeldByHand(e.target.checked)}
                        disabled={eatingMethod === "hand"}
                        className={`mt-0.5 h-5 w-5 border-gray-300 rounded focus:ring-orange-500 ${eatingMethod === "hand" ? "text-gray-400 cursor-not-allowed bg-gray-100" : "text-orange-600"}`}
                      />
                      <div>
                        <span className="block text-sm font-medium text-gray-800">
                          ✋ Elle Tutulabilir {eatingMethod === "hand" && <span className="text-xs text-orange-600 font-normal ml-1">(Otomatik)</span>}
                        </span>
                        <span className="text-xs text-gray-500">
                          Bu ürün görsellerde el ile tutularak gösterilebilir mi?
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Interior için bilgi mesajı */}
                {category === "interior" && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
                    <p className="text-sm text-emerald-800 flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <span>
                        <strong>Mekan Atmosferi</strong> kategorisindeki görseller AI tarafından işlenmez, doğrudan paylaşılır.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Butonlar */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {!isEditMode && !storageUrl && "⚡ Kaydetmek için görsel yükleyin"}
              {!isEditMode && storageUrl && "✅ Görsel hazır, kaydedebilirsiniz"}
              {isEditMode && "📝 Değişikliklerinizi kaydedin"}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving || (!isEditMode && !storageUrl)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </span>
                ) : (
                  isEditMode ? "💾 Güncelle" : "✨ Kaydet"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../services/api";
import AssetUpload from "../components/AssetUpload";
import TagInput from "../components/TagInput";
import type {
  OrchestratorAsset,
  AssetCategory,
  EatingMethod,
  DynamicCategory,
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
  accessories: ["phone", "bag", "keys", "book", "toy", "tablet", "glasses", "watch", "notebook", "wallet"],
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
  products: { tags: "required", dominantColors: "required", style: "required", material: "hidden" },
  props: { tags: "required", dominantColors: "required", style: "required", material: "required" },
  furniture: { tags: "required", dominantColors: "hidden", style: "required", material: "required" },
  environments: { tags: "required", dominantColors: "hidden", style: "required", material: "hidden" },
  pets: { tags: "required", dominantColors: "hidden", style: "hidden", material: "hidden" },
  interior: { tags: "required", dominantColors: "hidden", style: "hidden", material: "hidden" },
  accessories: { tags: "required", dominantColors: "optional", style: "optional", material: "optional" },
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
        setDynamicCategories(categoriesData.categories.filter((c) => !c.isDeleted));
      }
    } catch (err) {
      console.error("[Assets] Kategoriler yüklenemedi:", err);
    }
  };

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    startLoading("assets", "Görseller yükleniyor...");
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
      setLoading(false);
      stopLoading("assets");
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
    loadAssets();
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Filtreler */}
        <div className="flex gap-2 flex-wrap" data-tour="assets-filters">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl transition-colors ${selectedCategory === "all"
              ? "bg-brand-blue text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            Tümü ({assets.length})
          </button>
          {(Object.keys(dynamicCategoryLabels) as AssetCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl transition-colors ${selectedCategory === cat
                ? "bg-brand-blue text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {dynamicCategoryLabels[cat]} ({groupedAssets[cat]?.length || 0})
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
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
          <button onClick={loadAssets} className="btn-secondary mt-4">
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
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs ${asset.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
            {asset.isActive ? "Aktif" : "Pasif"}
          </span>
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {tag}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">+{asset.tags.length - 3}</span>
            )}
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
  onClose,
  onSuccess,
}: {
  asset: OrchestratorAsset | null; // null = create mode
  categoryLabels: Record<AssetCategory, string>;
  subtypeLabels: Record<string, string>;
  subtypesByCategory: Record<AssetCategory, string[]>;
  tagSuggestions: string[];
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
  const getFieldLabel = (baseLabel: string, visibility: FieldVisibility) => {
    if (visibility === "optional") {
      return `${baseLabel} (opsiyonel)`;
    }
    return baseLabel;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {isEditMode ? "Görsel Düzenle" : "Yeni Görsel Ekle"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kategori */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              Kategori
              <Tooltip
                content="Görselin kullanım alanı. Ürünler AI ile işlenir, Interior doğrudan paylaşılır."
                position="right"
              />
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="input w-full"
              disabled={isEditMode} // Edit modda kategori değiştirilemez
            >
              {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => (
                <option key={cat} value={cat}>{categoryLabels[cat]}</option>
              ))}
            </select>
            {isEditMode && (
              <p className="text-xs text-gray-400 mt-1">Kategori düzenlenemez</p>
            )}
          </div>

          {/* Alt Tip */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt Tip
            </label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              className="input w-full"
            >
              {subtypesByCategory[category]?.map((st) => (
                <option key={st} value={st}>{subtypeLabels[st] || st}</option>
              ))}
            </select>
          </div>

          {/* Dosya Yükleme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Görsel
            </label>

            {/* Edit modda mevcut görsel önizleme */}
            {isEditMode && storageUrl && !wantsToChangeImage && (
              <div className="mb-2">
                <div className="relative inline-block">
                  <img
                    src={storageUrl}
                    alt={filename}
                    className="h-24 w-24 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setWantsToChangeImage(true)}
                    className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 text-xs hover:bg-blue-600"
                    title="Görseli değiştir"
                  >
                    ✎
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{filename}</p>
              </div>
            )}

            {/* Yükleme alanı - create modda veya değiştirmek istiyorsa göster */}
            {(!isEditMode || wantsToChangeImage) && (
              <>
                <AssetUpload
                  type="image"
                  folder={`orchestrator-assets/${category}`}
                  onUploadComplete={handleUploadComplete}
                  onError={handleUploadError}
                />
                {uploadError && (
                  <p className="text-sm text-red-500 mt-1">{uploadError}</p>
                )}
                {filename && (
                  <p className="text-xs text-gray-500 mt-1">
                    Dosya: {filename}
                  </p>
                )}
                {isEditMode && wantsToChangeImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setWantsToChangeImage(false);
                      // Orijinal değerleri geri yükle
                      if (asset) {
                        setFilename(asset.filename);
                        setStorageUrl(asset.storageUrl);
                      }
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                  >
                    ← Değiştirmekten vazgeç
                  </button>
                )}
              </>
            )}
          </div>

          {/* Tags - kategori bazlı göster/gizle */}
          {fieldConfig.tags !== "hidden" && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel("Etiketler — bu asset ne için kullanılacak?", fieldConfig.tags)}
                {fieldConfig.tags === "required" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <p className="text-xs text-gray-500 mb-1.5">
                Kısa keyword'ler girin. AI, etiketlere göre doğru asset'i seçer ve içeriği ona göre üretir.
              </p>
              <TagInput
                value={tags}
                onChange={setTags}
                suggestions={tagSuggestions}
                placeholder="Örn: cheesecake, espresso, tea, gift..."
                error={submitted && fieldConfig.tags === "required" && tags.length === 0}
              />
              {submitted && fieldConfig.tags === "required" && tags.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  En az 1 etiket gerekli (Örn: cheesecake, espresso, tea)
                </p>
              )}
            </div>
          )}

          {/* Dominant Renkler - kategori bazlı göster/gizle */}
          {fieldConfig.dominantColors !== "hidden" && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel("Dominant Renkler (virgülle ayır)", fieldConfig.dominantColors)}
                {fieldConfig.dominantColors === "required" && (
                  <span className="text-red-500 ml-1">*</span>
                )}
                <Tooltip
                  content="AI renk uyumlu görseller üretir. Hex kodları (#D4A574) veya isimler (gold, cream) kullanın."
                  position="right"
                />
              </label>
              <input
                type="text"
                value={dominantColors}
                onChange={(e) => setDominantColors(e.target.value)}
                placeholder="#D4A574, #FFFFFF"
                className={`input w-full ${submitted && fieldConfig.dominantColors === "required" && !dominantColors.trim() ? "ring-1 ring-red-500" : ""}`}
              />
              {submitted && fieldConfig.dominantColors === "required" && !dominantColors.trim() ? (
                <p className="text-xs text-red-500 mt-1">
                  Dominant renkler zorunludur
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  AI görsel üretiminde renk tutarlılığı için kritik
                </p>
              )}
            </div>
          )}

          {/* Stil - kategori bazlı göster/gizle */}
          {fieldConfig.style !== "hidden" && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel("Stil", fieldConfig.style)}
                <Tooltip
                  content="AI aynı stildeki öğeleri eşleştirir. Modern masa + Rustic tabak kombinasyonundan kaçınır."
                  position="right"
                />
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="input w-full"
              >
                <option value="modern">Modern</option>
                <option value="rustic">Rustic</option>
                <option value="minimal">Minimal</option>
                <option value="elegant">Elegant</option>
              </select>
            </div>
          )}

          {/* Material - kategori bazlı göster/gizle */}
          {fieldConfig.material !== "hidden" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel("Malzeme", fieldConfig.material)}
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="input w-full"
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

          {/* Object Identity Alanları - kategori+subType bazlı koşullu */}

          {/* Yeme Şekli ve Elle Tutulabilirlik - sadece products kategorisinde */}
          {category === "products" && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                  Yeme Şekli
                  <Tooltip
                    content="AI uygun servisi seçer: çatalla yenen ürüne çatal, elle yenene el pozu ekler."
                    position="right"
                  />
                </label>
                <select
                  value={eatingMethod}
                  onChange={(e) => setEatingMethod(e.target.value as EatingMethod)}
                  className="input w-full"
                >
                  <option value="hand">Elle Yenir (kurabiye, sandviç)</option>
                  <option value="fork">Çatalla Yenir (tiramisu, pasta dilimi)</option>
                  <option value="fork-knife">Çatal-Bıçakla Yenir (domatesli kruvasan, börek)</option>
                  <option value="spoon">Kaşıkla Yenir (puding, sufle)</option>
                  <option value="none">Yenmez/Servis (bütün kek, tart, dekor)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Ürün nasıl tüketilir?
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <input
                  type="checkbox"
                  id="canBeHeldByHand"
                  checked={canBeHeldByHand}
                  onChange={(e) => setCanBeHeldByHand(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="canBeHeldByHand" className="block text-sm font-medium text-gray-700 cursor-pointer">
                    Elle Tutulabilir
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Bu ürün görsellerde el ile tutularak gösterilebilir mi?
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Örn: Bardakta puding kaşıkla yenir ama elle tutulabilir
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Interior için bilgi mesajı */}
          {category === "interior" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                📍 <strong>Mekan Atmosferi</strong> kategorisindeki görseller AI tarafından işlenmez, doğrudan paylaşılır.
              </p>
            </div>
          )}

          {/* Butonlar */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || (!isEditMode && !storageUrl)}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : (isEditMode ? "Güncelle" : "Kaydet")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

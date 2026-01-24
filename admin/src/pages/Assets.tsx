import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import AssetUpload from "../components/AssetUpload";
import type { OrchestratorAsset, AssetCategory, EatingMethod } from "../types";
import { useLoadingOperation } from "../contexts/LoadingContext";

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
  products: { tags: "optional", dominantColors: "required", style: "required", material: "hidden" },
  props: { tags: "optional", dominantColors: "required", style: "required", material: "required" },
  furniture: { tags: "optional", dominantColors: "hidden", style: "required", material: "required" },
  environments: { tags: "optional", dominantColors: "hidden", style: "required", material: "hidden" },
  pets: { tags: "required", dominantColors: "hidden", style: "hidden", material: "hidden" },
  interior: { tags: "optional", dominantColors: "hidden", style: "hidden", material: "hidden" },
  accessories: { tags: "optional", dominantColors: "optional", style: "optional", material: "optional" },
};

export default function Assets() {
  const [assets, setAssets] = useState<OrchestratorAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state - hem create hem edit için
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<OrchestratorAsset | null>(null);

  // Global loading hook
  const { execute: executeDelete } = useLoadingOperation("asset-delete");

  useEffect(() => {
    loadAssets();
  }, [selectedCategory]);

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Bu gorseli silmek istediginizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      await executeDelete(async () => {
        await api.deleteAsset(id);
        await loadAssets();
      }, "Gorsel siliniyor...");
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Görsel Yönetimi</h1>
          <p className="text-gray-500 mt-1">Ürün, aksesuar, mobilya, ortam ve evcil hayvan görselleri</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          + Yeni Görsel
        </button>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Filtreler */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl transition-colors ${selectedCategory === "all"
              ? "bg-brand-blue text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            Tümü ({assets.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl transition-colors ${selectedCategory === cat
                ? "bg-brand-blue text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {CATEGORY_LABELS[cat]} ({groupedAssets[cat]?.length || 0})
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
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">Henüz görsel yok</p>
              <button onClick={openCreateModal} className="btn-primary">
                İlk Görseli Ekle
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
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
                            {CATEGORY_LABELS[asset.category as AssetCategory]} • {SUBTYPE_LABELS[asset.subType] || asset.subType}
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
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

// Asset kartı
function AssetCard({
  asset,
  onEdit,
  onDelete,
  isDeleting,
}: {
  asset: OrchestratorAsset;
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
              {CATEGORY_LABELS[asset.category as AssetCategory]} / {SUBTYPE_LABELS[asset.subType] || asset.subType}
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
  onClose,
  onSuccess,
}: {
  asset: OrchestratorAsset | null; // null = create mode
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditMode = asset !== null;

  // Form state
  const [category, setCategory] = useState<AssetCategory>(asset?.category as AssetCategory || "products");
  const [subType, setSubType] = useState(asset?.subType || "");
  const [filename, setFilename] = useState(asset?.filename || "");
  const [storageUrl, setStorageUrl] = useState(asset?.storageUrl || "");
  const [tags, setTags] = useState(asset?.tags?.join(", ") || "");
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit modunda görsel değiştirme kontrolü
  const [wantsToChangeImage, setWantsToChangeImage] = useState(false);

  // Kategori değişince alt tipi güncelle (sadece create modda veya kategori değişince)
  useEffect(() => {
    if (!isEditMode) {
      // Create modda kategori değişince ilk alt tipi seç ve upload'ı temizle
      const subtypes = SUBTYPES_BY_CATEGORY[category];
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
      setTags(asset.tags?.join(", ") || "");
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

    // Create modda görsel zorunlu
    if (!isEditMode && (!filename || !storageUrl)) {
      alert("Lütfen önce dosya yükleyin");
      return;
    }

    setSaving(true);
    try {
      // Alan değerlerini kategori bazlı hazırla
      const parsedTags = fieldConfig.tags !== "hidden"
        ? tags.split(",").map(t => t.trim()).filter(Boolean)
        : [];

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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="input w-full"
              disabled={isEditMode} // Edit modda kategori değiştirilemez
            >
              {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
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
              {SUBTYPES_BY_CATEGORY[category].map((st) => (
                <option key={st} value={st}>{SUBTYPE_LABELS[st] || st}</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel("Etiketler (virgülle ayır)", fieldConfig.tags)}
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="gold-rim, white, elegant"
                className="input w-full"
              />
            </div>
          )}

          {/* Dominant Renkler - kategori bazlı göster/gizle */}
          {fieldConfig.dominantColors !== "hidden" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel("Dominant Renkler (virgülle ayır)", fieldConfig.dominantColors)}
                {fieldConfig.dominantColors === "required" && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <input
                type="text"
                value={dominantColors}
                onChange={(e) => setDominantColors(e.target.value)}
                placeholder="#D4A574, #FFFFFF"
                className="input w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                AI görsel üretiminde renk tutarlılığı için kritik
              </p>
            </div>
          )}

          {/* Stil - kategori bazlı göster/gizle */}
          {fieldConfig.style !== "hidden" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel("Stil", fieldConfig.style)}
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

          {/* Yeme Şekli ve Elle Tutulabilirlik - sadece products kategorisinde */}
          {category === "products" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeme Şekli
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

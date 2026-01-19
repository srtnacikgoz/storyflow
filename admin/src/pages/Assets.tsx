import { useEffect, useState } from "react";
import { api } from "../services/api";
import AssetUpload from "../components/AssetUpload";
import type { OrchestratorAsset, AssetCategory } from "../types";

// Kategori etiketleri
const CATEGORY_LABELS: Record<AssetCategory, string> = {
  products: "Ürünler",
  props: "Aksesuarlar",
  furniture: "Mobilya",
};

// Alt tip etiketleri
const SUBTYPE_LABELS: Record<string, string> = {
  // Products
  croissants: "Kruvasan",
  pastas: "Pasta",
  chocolates: "Çikolata",
  macarons: "Makaron",
  coffees: "Kahve",
  // Props
  plates: "Tabak",
  cups: "Fincan",
  cutlery: "Çatal-Bıçak",
  napkins: "Peçete",
  // Furniture
  tables: "Masa",
  chairs: "Sandalye",
  decor: "Dekor",
};

// Alt tipler kategori bazlı
const SUBTYPES_BY_CATEGORY: Record<AssetCategory, string[]> = {
  products: ["croissants", "pastas", "chocolates", "macarons", "coffees"],
  props: ["plates", "cups", "cutlery", "napkins"],
  furniture: ["tables", "chairs", "decor"],
};

export default function Assets() {
  const [assets, setAssets] = useState<OrchestratorAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [selectedCategory]);

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = selectedCategory !== "all" ? { category: selectedCategory } : undefined;
      const data = await api.listAssets(filters);
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu görseli silmek istediğinizden emin misiniz?")) return;
    try {
      await api.deleteAsset(id);
      loadAssets();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme hatası");
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
          <p className="text-gray-500 mt-1">Ürün, aksesuar ve mobilya görselleri</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + Yeni Görsel
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 rounded-xl transition-colors ${
            selectedCategory === "all"
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
            className={`px-4 py-2 rounded-xl transition-colors ${
              selectedCategory === cat
                ? "bg-brand-blue text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {CATEGORY_LABELS[cat]} ({groupedAssets[cat]?.length || 0})
          </button>
        ))}
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
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                İlk Görseli Ekle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onDelete={() => handleDelete(asset.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddAssetModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadAssets();
          }}
        />
      )}
    </div>
  );
}

// Asset kartı
function AssetCard({
  asset,
  onDelete,
}: {
  asset: OrchestratorAsset;
  onDelete: () => void;
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
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            asset.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
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
        {asset.visualProperties?.dominantColors && (
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
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

// Yeni Asset Modal
function AddAssetModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState<AssetCategory>("products");
  const [subType, setSubType] = useState("");
  const [filename, setFilename] = useState("");
  const [storageUrl, setStorageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [dominantColors, setDominantColors] = useState("");
  const [style, setStyle] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Kategori değişince alt tipi sıfırla ve upload'ı temizle
  useEffect(() => {
    const subtypes = SUBTYPES_BY_CATEGORY[category];
    if (subtypes.length > 0) {
      setSubType(subtypes[0]);
    }
    // Kategori değişince önceki yüklemeyi temizle
    setFilename("");
    setStorageUrl("");
    setUploadError(null);
  }, [category]);

  const handleUploadComplete = (url: string, uploadedFilename: string) => {
    setStorageUrl(url);
    setFilename(uploadedFilename);
    setUploadError(null);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename || !storageUrl) {
      alert("Lütfen önce dosya yükleyin");
      return;
    }

    setSaving(true);
    try {
      await api.createAsset({
        category,
        subType,
        filename,
        storageUrl,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        visualProperties: {
          dominantColors: dominantColors.split(",").map((c) => c.trim()).filter(Boolean),
          style: style || "modern",
        },
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Yeni Görsel Ekle</h2>

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
            >
              {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
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
              Görsel Yükle
            </label>
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
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiketler (virgülle ayır)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="gold-rim, white, elegant"
              className="input w-full"
            />
          </div>

          {/* Görsel Özellikleri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dominant Renkler (virgülle ayır)
            </label>
            <input
              type="text"
              value={dominantColors}
              onChange={(e) => setDominantColors(e.target.value)}
              placeholder="#D4A574, #FFFFFF"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stil
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
              disabled={saving || !storageUrl}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

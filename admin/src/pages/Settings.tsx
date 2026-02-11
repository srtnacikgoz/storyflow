import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import { hasSeenTour, resetTour } from "../components/PageTour";

// Business Context tipi
interface BusinessContext {
  businessName: string;
  businessType: string;
  locationDescription: string;
  floorLevel: "ground" | "upper" | "basement" | "outdoor";
  hasStreetView: boolean;
  hasWindowView: boolean;
  windowViewDescription?: string;
  decorStyle: string;
  dominantMaterials: string[];
  colorScheme: string;
  promptContext: string;
  isEnabled: boolean;
  updatedAt: number;
}

// Asset kategorileri için tip
type AssetCategory = "plate" | "table" | "cup" | "accessory" | "napkin" | "cutlery";

// Asset kategori bilgileri
const ASSET_CATEGORIES: { key: AssetCategory; icon: string; label: string; description: string }[] = [
  { key: "plate", icon: "🍽️", label: "Tabak", description: "Ürünün sunulduğu tabak" },
  { key: "table", icon: "🪑", label: "Masa", description: "Sahne arka planı" },
  { key: "cup", icon: "☕", label: "Fincan", description: "Kahve/içecek fincanı" },
  { key: "accessory", icon: "🌸", label: "Aksesuar", description: "Çiçek, mum, kitap vb." },
  { key: "napkin", icon: "🧻", label: "Peçete", description: "Tekstil detay" },
  { key: "cutlery", icon: "🍴", label: "Çatal-Bıçak", description: "Yemek takımı" },
];

// Slot label'ları (auto-default tablosu için)
const SLOT_LABELS: Record<string, { label: string; icon: string }> = {
  surface: { label: "Yüzey", icon: "🪑" },
  dish: { label: "Tabak", icon: "🍽️" },
  drinkware: { label: "Bardak", icon: "☕" },
  textile: { label: "Peçete", icon: "🧻" },
  decor: { label: "Dekor", icon: "🌸" },
};

// Product type label'ları
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  chocolates: "Çikolatalar",
  coffees: "Kahveler",
  croissants: "Kruvasanlar",
  pastas: "Pastalar",
  _default: "Varsayılan",
};

// Asset seçim config tipi
type AssetSelectionConfig = {
  manual: Record<AssetCategory, { enabled: boolean }>;
  scheduled: Record<AssetCategory, { enabled: boolean }>;
  updatedAt: number;
};

// Toggle Switch bileşeni
function ToggleSwitch({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2
        ${enabled ? "bg-green-500" : "bg-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-lg ring-0
          transition duration-200 ease-in-out
          ${enabled ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}

// Tanıtım turları listesi
const TOURS = [
  { id: "assets-page", name: "Görseller Sayfası", description: "Ürün görselleri yönetimi" },
  { id: "scenarios-page", name: "Senaryolar Sayfası", description: "Senaryo seçimi ve yönetimi" },
  { id: "themes-page", name: "Temalar Sayfası", description: "Tema oluşturma ve düzenleme" },
  { id: "timeslots-page", name: "Zaman Dilimleri Sayfası", description: "Paylaşım zamanlaması" },
];

export default function Settings() {
  const { startLoading, stopLoading } = useLoading();
  const [tokenStatus, setTokenStatus] = useState<{
    valid: boolean;
    accountName?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Scheduler toggle
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean | null>(null);
  const [schedulerToggling, setSchedulerToggling] = useState(false);

  // Business Context
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [businessContextLoading, setBusinessContextLoading] = useState(false);
  const [businessContextSaving, setBusinessContextSaving] = useState(false);

  // Tour durumları
  const [tourStatuses, setTourStatuses] = useState<Record<string, boolean>>({});

  // Asset Selection Config
  const [assetConfig, setAssetConfig] = useState<AssetSelectionConfig | null>(null);
  const [assetConfigLoading, setAssetConfigLoading] = useState(false);
  const [assetConfigSaving, setAssetConfigSaving] = useState(false);

  // Product Slot Defaults
  const [slotDefaults, setSlotDefaults] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [slotDefaultsLoading, setSlotDefaultsLoading] = useState(false);
  const [slotDefaultsSaving, setSlotDefaultsSaving] = useState(false);
  const [newProductType, setNewProductType] = useState("");
  const [deleteConfirmProductType, setDeleteConfirmProductType] = useState<string | null>(null);

  // Çeşitlilik Kuralları
  const [variationRules, setVariationRules] = useState({
    scenarioGap: 3,
    tableGap: 2,
    handStyleGap: 4,
    compositionGap: 2,
    petFrequency: 15,
    similarityThreshold: 50,
  });
  const [variationRulesSaving, setVariationRulesSaving] = useState(false);

  // Asset selection config yükle
  const loadAssetSelectionConfig = useCallback(async () => {
    setAssetConfigLoading(true);
    try {
      const config = await api.getAssetSelectionConfig();
      setAssetConfig(config as AssetSelectionConfig);
    } catch (err) {
      console.error("[Settings] Asset selection config yüklenemedi:", err);
    } finally {
      setAssetConfigLoading(false);
    }
  }, []);

  // Product Slot Defaults yükle
  const loadProductSlotDefaults = useCallback(async () => {
    setSlotDefaultsLoading(true);
    try {
      const config = await api.getProductSlotDefaults();
      setSlotDefaults(config.defaults);
    } catch (err) {
      console.error("[Settings] Product slot defaults yüklenemedi:", err);
    } finally {
      setSlotDefaultsLoading(false);
    }
  }, []);

  // Çeşitlilik kurallarını yükle
  const loadVariationRules = useCallback(async () => {
    try {
      const data = await api.getOrchestratorConfig();
      if (data?.variationRules) {
        setVariationRules(prev => ({ ...prev, ...data.variationRules }));
      }
    } catch (err) {
      console.error("[Settings] Çeşitlilik kuralları yüklenemedi:", err);
    }
  }, []);

  // Çeşitlilik kurallarını kaydet
  const handleSaveVariationRules = async () => {
    setVariationRulesSaving(true);
    try {
      await api.updateOrchestratorConfig({ variationRules });
    } catch (err) {
      console.error("[Settings] Çeşitlilik kuralları kaydedilemedi:", err);
    } finally {
      setVariationRulesSaving(false);
    }
  };

  // Slot default toggle
  const handleSlotDefaultToggle = async (productType: string, slotKey: string, enabled: boolean) => {
    if (!slotDefaults) return;

    // Optimistic update
    const prev = slotDefaults;
    const updated = {
      ...slotDefaults,
      [productType]: {
        ...slotDefaults[productType],
        [slotKey]: enabled,
      },
    };
    setSlotDefaults(updated);

    setSlotDefaultsSaving(true);
    try {
      await api.updateProductSlotDefaults(updated);
    } catch (err) {
      console.error("[Settings] Slot defaults güncellenemedi:", err);
      setSlotDefaults(prev);
    } finally {
      setSlotDefaultsSaving(false);
    }
  };

  // Yeni ürün tipi ekle
  const handleAddProductType = async () => {
    const slug = newProductType.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug || !slotDefaults) return;
    if (slotDefaults[slug]) return; // Zaten var

    // _default satırını kopyala
    const defaultRow = slotDefaults._default || { surface: true, dish: true, drinkware: true, textile: true, decor: false };
    const updated = { ...slotDefaults, [slug]: { ...defaultRow } };
    setSlotDefaults(updated);
    setNewProductType("");

    setSlotDefaultsSaving(true);
    try {
      await api.updateProductSlotDefaults(updated);
    } catch (err) {
      console.error("[Settings] Yeni ürün tipi eklenemedi:", err);
      setSlotDefaults(slotDefaults);
    } finally {
      setSlotDefaultsSaving(false);
    }
  };

  // Ürün tipi sil (_default silinemez)
  const handleRemoveProductType = async (productType: string) => {
    if (productType === "_default" || !slotDefaults) return;

    const prev = slotDefaults;
    const updated = { ...slotDefaults };
    delete updated[productType];
    setSlotDefaults(updated);

    setSlotDefaultsSaving(true);
    try {
      await api.updateProductSlotDefaults(updated);
    } catch (err) {
      console.error("[Settings] Ürün tipi silinemedi:", err);
      setSlotDefaults(prev);
    } finally {
      setSlotDefaultsSaving(false);
    }
  };

  // Asset seçim kuralını güncelle
  const handleAssetToggle = async (
    mode: "manual" | "scheduled",
    category: AssetCategory,
    enabled: boolean
  ) => {
    if (!assetConfig) return;

    // Optimistic update
    const prevConfig = assetConfig;
    setAssetConfig({
      ...assetConfig,
      [mode]: {
        ...assetConfig[mode],
        [category]: { enabled },
      },
    });

    setAssetConfigSaving(true);
    try {
      await api.updateAssetSelectionConfig({
        [mode]: {
          [category]: { enabled },
        },
      });
    } catch (err) {
      console.error("[Settings] Asset config güncellenemedi:", err);
      // Rollback on error
      setAssetConfig(prevConfig);
    } finally {
      setAssetConfigSaving(false);
    }
  };

  // Tour durumlarını kontrol et
  const checkTourStatuses = useCallback(() => {
    const statuses: Record<string, boolean> = {};
    TOURS.forEach(tour => {
      statuses[tour.id] = hasSeenTour(tour.id);
    });
    setTourStatuses(statuses);
  }, []);

  // Tek bir turu sıfırla
  const handleResetTour = (tourId: string) => {
    resetTour(tourId);
    checkTourStatuses();
  };

  // Tüm turları sıfırla
  const handleResetAllTours = () => {
    TOURS.forEach(tour => {
      resetTour(tour.id);
    });
    checkTourStatuses();
  };

  // Scheduler durumunu yükle
  const loadSchedulerStatus = useCallback(async () => {
    try {
      const settings = await api.getSystemSettings();
      setSchedulerEnabled(settings.schedulerEnabled);
    } catch (err) {
      console.error("[Settings] Scheduler durumu yüklenemedi:", err);
    }
  }, []);

  // Business Context yükle
  const loadBusinessContext = useCallback(async () => {
    setBusinessContextLoading(true);
    try {
      const context = await api.getBusinessContext();
      setBusinessContext(context);
    } catch (err) {
      console.error("[Settings] Business context yüklenemedi:", err);
    } finally {
      setBusinessContextLoading(false);
    }
  }, []);

  // Business Context kaydet
  const saveBusinessContext = async () => {
    if (!businessContext) return;
    setBusinessContextSaving(true);
    try {
      await api.updateBusinessContext(businessContext);
      alert("İşletme bağlamı kaydedildi!");
    } catch (err) {
      console.error("[Settings] Business context kaydetme hatası:", err);
      alert("Kaydetme hatası: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setBusinessContextSaving(false);
    }
  };

  // Business Context toggle
  const handleBusinessContextToggle = async (enabled: boolean) => {
    if (!businessContext) return;
    setBusinessContext({ ...businessContext, isEnabled: enabled });
    try {
      await api.updateBusinessContext({ isEnabled: enabled });
    } catch (err) {
      console.error("[Settings] Business context toggle hatası:", err);
      setBusinessContext({ ...businessContext, isEnabled: !enabled });
    }
  };

  // Scheduler toggle
  const handleSchedulerToggle = async (enabled: boolean) => {
    setSchedulerToggling(true);
    try {
      await api.updateSystemSettings({ schedulerEnabled: enabled });
      setSchedulerEnabled(enabled);
    } catch (err) {
      console.error("[Settings] Scheduler toggle hatası:", err);
      // Hata durumunda eski değere geri dön
      setSchedulerEnabled(!enabled);
    } finally {
      setSchedulerToggling(false);
    }
  };

  const checkToken = async () => {
    setLoading(true);
    startLoading("settings", "Ayarlar yükleniyor...");
    try {
      const result = await api.validateInstagramToken();
      setTokenStatus({
        valid: true,
        accountName: result.account.name,
      });
    } catch (err) {
      setTokenStatus({
        valid: false,
        error: err instanceof Error ? err.message : "Token geçersiz",
      });
    } finally {
      setLoading(false);
      stopLoading("settings");
    }
  };

  useEffect(() => {
    checkToken();
    checkTourStatuses();
    loadSchedulerStatus();
    loadBusinessContext();
    loadAssetSelectionConfig();
    loadProductSlotDefaults();
    loadVariationRules();
  }, [checkTourStatuses, loadSchedulerStatus, loadBusinessContext, loadAssetSelectionConfig, loadProductSlotDefaults, loadVariationRules]);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500 mt-1">Sistem yapılandırması</p>
      </div>

      {/* Instagram Token */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Instagram Bağlantısı</h2>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">Access Token</p>
            {loading ? (
              <p className="text-sm text-gray-500">Kontrol ediliyor...</p>
            ) : tokenStatus?.valid ? (
              <p className="text-sm text-green-600">
                Bağlı: {tokenStatus.accountName}
              </p>
            ) : (
              <p className="text-sm text-red-600">
                {tokenStatus?.error || "Bağlantı yok"}
              </p>
            )}
          </div>
          <button
            onClick={checkToken}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {loading ? "..." : "Kontrol Et"}
          </button>
        </div>

        <div className="mt-4 p-4 bg-brand-yellow/10 rounded-xl">
          <p className="text-sm text-gray-600">
            <strong>Not:</strong> Token'ı yenilemek için Firebase Console'dan{" "}
            <code className="bg-gray-100 px-1 rounded">functions:config:set</code>{" "}
            komutunu kullanın.
          </p>
        </div>
      </div>

      {/* Scheduler Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Zamanlanmış Paylaşım</h2>

        <div className="space-y-3">
          {/* Otomatik Paylaşım Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Otomatik Paylaşım</p>
              <p className="text-sm text-gray-500">
                {schedulerEnabled === null
                  ? "Yükleniyor..."
                  : schedulerEnabled
                    ? "Scheduler aktif - içerikler otomatik üretiliyor"
                    : "Scheduler duraklatıldı - otomatik üretim yapılmıyor"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {schedulerEnabled !== null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    schedulerEnabled
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {schedulerEnabled ? "Aktif" : "Duraklatıldı"}
                </span>
              )}
              <ToggleSwitch
                enabled={schedulerEnabled ?? false}
                onChange={handleSchedulerToggle}
                disabled={schedulerEnabled === null || schedulerToggling}
              />
            </div>
          </div>

          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Kontrol Sıklığı</span>
            <span className="font-medium">Her 15 dakika</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Timezone</span>
            <span className="font-medium">Europe/Istanbul</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Varsayılan Onay</span>
            <span className="font-medium">Telegram ile</span>
          </div>
        </div>
      </div>

      {/* Business Context - İşletme Bağlamı */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">İşletme Bağlamı</h2>
            <p className="text-sm text-gray-500 mt-1">
              AI'ın doğru mekan/ortam üretmesi için işletme bilgileri
            </p>
          </div>
          <div className="flex items-center gap-3">
            {businessContext && (
              <>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    businessContext.isEnabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {businessContext.isEnabled ? "Aktif" : "Pasif"}
                </span>
                <ToggleSwitch
                  enabled={businessContext.isEnabled}
                  onChange={handleBusinessContextToggle}
                  disabled={businessContextLoading}
                />
              </>
            )}
          </div>
        </div>

        {businessContextLoading ? (
          <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
        ) : businessContext ? (
          <div className="space-y-4">
            {/* Kat Seviyesi — pipeline'da negatif kısıtlama olarak kullanılıyor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kat Seviyesi</label>
                <select
                  value={businessContext.floorLevel}
                  onChange={(e) => setBusinessContext({
                    ...businessContext,
                    floorLevel: e.target.value as "ground" | "upper" | "basement" | "outdoor"
                  })}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="ground">Zemin Kat</option>
                  <option value="upper">Üst Kat</option>
                  <option value="basement">Bodrum</option>
                  <option value="outdoor">Açık Alan</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  AI'a mekan bağlamı sağlar. Örn: "zemin kat" → yüksek bina manzarası engellenir.
                </p>
              </div>
            </div>

            {/* AI Prompt Context */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                AI Prompt Bağlamı
              </label>
              <textarea
                value={businessContext.promptContext}
                onChange={(e) => setBusinessContext({ ...businessContext, promptContext: e.target.value })}
                rows={4}
                className="w-full p-3 border rounded-lg text-sm font-mono"
                placeholder="Ground floor patisserie with warm tones..."
              />
              <p className="text-xs text-blue-600 mt-2">
                Bu metin AI prompt'una doğrudan eklenir. İngilizce yazın.
                Örn: "NO high-rise views, NO skyscraper backgrounds"
              </p>
            </div>

            {/* Kaydet butonu */}
            <div className="flex justify-end">
              <button
                onClick={saveBusinessContext}
                disabled={businessContextSaving}
                className="btn-primary"
              >
                {businessContextSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-red-500">
            İşletme bağlamı yüklenemedi
          </div>
        )}

        <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Neden önemli?</strong> Bu bilgiler AI'a mekan hakkında bağlam sağlar.
            Örneğin "zemin kat" bilgisi, "high-rise window view" gibi hatalı üretimleri önler.
          </p>
        </div>
      </div>

      {/* Asset Seçim Kuralları */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Prompt Asset Tercihleri</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gemini prompt'una hangi asset kategorilerinin dahil edileceğini belirleyin
          </p>
        </div>

        {assetConfigLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-blue border-t-transparent" />
            <span className="ml-2 text-gray-500">Yükleniyor...</span>
          </div>
        ) : assetConfig ? (
          <div className="space-y-6">
            {/* Tablo başlığı */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">
                      Asset Kategorisi
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-600 w-32">
                      <div className="flex flex-col items-center">
                        <span>🖱️ Şimdi Üret</span>
                        <span className="text-xs font-normal text-gray-400">Manuel</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-600 w-32">
                      <div className="flex flex-col items-center">
                        <span>⏰ Otomatik</span>
                        <span className="text-xs font-normal text-gray-400">Pipeline</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ASSET_CATEGORIES.map((category) => (
                    <tr key={category.key} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{category.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">{category.label}</p>
                            <p className="text-xs text-gray-500">{category.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            enabled={assetConfig.manual[category.key]?.enabled ?? false}
                            onChange={(enabled) => handleAssetToggle("manual", category.key, enabled)}
                            disabled={assetConfigSaving}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center">
                          <ToggleSwitch
                            enabled={assetConfig.scheduled[category.key]?.enabled ?? false}
                            onChange={(enabled) => handleAssetToggle("scheduled", category.key, enabled)}
                            disabled={assetConfigSaving}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Açıklama */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Nasıl Çalışır:</strong>
              </p>
              <ul className="mt-2 text-sm text-amber-700 space-y-1">
                <li>• <strong>Açık (Yeşil):</strong> Gemini prompt'una dahil edilir (öneri niteliğinde)</li>
                <li>• <strong>Kapalı (Gri):</strong> Gemini prompt'unda yer almaz</li>
                <li className="text-amber-600 text-xs mt-1">Not: Template seçildiğinde template slot ayarları önceliklidir</li>
              </ul>
            </div>

            {assetConfigSaving && (
              <div className="flex items-center justify-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-blue border-t-transparent mr-2" />
                Kaydediliyor...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Ayarlar yüklenemedi
          </div>
        )}
      </div>

      {/* Ürün Tipi Slot Varsayılanları */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Ürün Tipi Slot Varsayılanları</h2>
          <p className="text-sm text-gray-500 mt-1">
            Template olmadan üretimde hangi slot'ların otomatik açılacağını belirleyin
          </p>
        </div>

        {slotDefaultsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-blue border-t-transparent" />
            <span className="ml-2 text-gray-500">Yükleniyor...</span>
          </div>
        ) : slotDefaults ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600 min-w-[140px]">
                      Ürün Tipi
                    </th>
                    {Object.keys(slotDefaults._default || {}).map((slotKey) => (
                      <th key={slotKey} className="text-center py-3 px-2 text-sm font-medium text-gray-600 w-20">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{SLOT_LABELS[slotKey]?.icon || "📦"}</span>
                          <span className="text-xs">{SLOT_LABELS[slotKey]?.label || slotKey}</span>
                        </div>
                      </th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(slotDefaults)
                    .sort(([a], [b]) => {
                      if (a === "_default") return 1;
                      if (b === "_default") return -1;
                      return a.localeCompare(b);
                    })
                    .map(([productType, slots]) => (
                    <tr key={productType} className={`border-b border-gray-100 hover:bg-gray-50 ${productType === "_default" ? "bg-blue-50/30" : ""}`}>
                      <td className="py-2 px-2">
                        <span className={`font-medium text-sm ${productType === "_default" ? "text-blue-700" : "text-gray-900"}`}>
                          {PRODUCT_TYPE_LABELS[productType] || productType}
                        </span>
                        {productType === "_default" && (
                          <span className="ml-1 text-xs text-blue-500">(yeni tipler için)</span>
                        )}
                      </td>
                      {Object.keys(slotDefaults._default || {}).map((slotKey) => (
                        <td key={slotKey} className="py-2 px-2">
                          <div className="flex justify-center">
                            <ToggleSwitch
                              enabled={slots[slotKey] ?? false}
                              onChange={(enabled) => handleSlotDefaultToggle(productType, slotKey, enabled)}
                              disabled={slotDefaultsSaving}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="py-2 px-1">
                        {productType !== "_default" && (
                          deleteConfirmProductType === productType ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { handleRemoveProductType(productType); setDeleteConfirmProductType(null); }}
                                className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Evet
                              </button>
                              <button
                                onClick={() => setDeleteConfirmProductType(null)}
                                className="text-xs px-1.5 py-0.5 border border-stone-300 rounded hover:bg-stone-50"
                              >
                                Hayır
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmProductType(productType)}
                              className="text-red-400 hover:text-red-600 text-xs p-1"
                              title="Ürün tipini sil"
                            >
                              ✕
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Yeni ürün tipi ekle */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newProductType}
                onChange={(e) => setNewProductType(e.target.value)}
                placeholder="Yeni ürün tipi slug'ı (ör: doners)"
                className="flex-1 px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                onKeyDown={(e) => e.key === "Enter" && handleAddProductType()}
              />
              <button
                onClick={handleAddProductType}
                disabled={!newProductType.trim() || slotDefaultsSaving}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                + Ekle
              </button>
            </div>

            {/* Açıklama */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <p className="text-xs text-stone-600">
                <strong>Nasıl çalışır:</strong> Template seçilmeden üretim yapıldığında, ürün tipine göre bu tablo kullanılır.
                Örn: Çikolata kutulu ürün olduğu için tabak ve peçete otomatik kapatılır.
                Yeni bir ürün tipi eklerseniz "Varsayılan" satırı kopyalanır.
              </p>
            </div>

            {slotDefaultsSaving && (
              <div className="flex items-center justify-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-blue border-t-transparent mr-2" />
                Kaydediliyor...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Ayarlar yüklenemedi
          </div>
        )}
      </div>

      {/* API Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">API Bilgileri</h2>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Region</span>
            <span className="font-medium font-mono text-sm">europe-west1</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Project ID</span>
            <span className="font-medium font-mono text-sm">instagram-automation-ad77b</span>
          </div>
        </div>
      </div>

      {/* Tanıtım Turları */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Tanıtım Turları</h2>
            <p className="text-sm text-gray-500 mt-1">
              Sayfa tanıtım turlarını yönetin
            </p>
          </div>
          <button
            onClick={handleResetAllTours}
            className="btn-secondary text-sm"
          >
            Tümünü Sıfırla
          </button>
        </div>

        <div className="space-y-3">
          {TOURS.map(tour => {
            const isCompleted = tourStatuses[tour.id];
            return (
              <div
                key={tour.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isCompleted ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{tour.name}</p>
                    <p className="text-xs text-gray-500">{tour.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {isCompleted ? "Tamamlandı" : "Görülmedi"}
                  </span>
                  {isCompleted && (
                    <button
                      onClick={() => handleResetTour(tour.id)}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-gray-600">
            <strong>İpucu:</strong> Bir turu sıfırladığınızda, ilgili sayfaya
            gittiğinizde tanıtım turu tekrar başlayacaktır.
          </p>
        </div>
      </div>

      {/* Çeşitlilik Kuralları */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Çeşitlilik Kuralları</h2>
            <p className="text-sm text-gray-500 mt-1">
              İçerik üretiminde tekrarı önlemek için global kurallar
            </p>
          </div>
          <button
            onClick={handleSaveVariationRules}
            disabled={variationRulesSaving}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 text-sm"
          >
            {variationRulesSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senaryo Aralığı: {variationRules.scenarioGap}
            </label>
            <input
              type="range" min="1" max="10"
              value={variationRules.scenarioGap}
              onChange={(e) => setVariationRules({ ...variationRules, scenarioGap: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı senaryo kaç üretim sonra tekrarlanabilir</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Masa Aralığı: {variationRules.tableGap}
            </label>
            <input
              type="range" min="1" max="10"
              value={variationRules.tableGap}
              onChange={(e) => setVariationRules({ ...variationRules, tableGap: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı masa kaç üretim sonra tekrarlanabilir</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              El Stili Aralığı: {variationRules.handStyleGap}
            </label>
            <input
              type="range" min="1" max="10"
              value={variationRules.handStyleGap}
              onChange={(e) => setVariationRules({ ...variationRules, handStyleGap: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı el stili kaç üretim sonra tekrarlanabilir</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kompozisyon Aralığı: {variationRules.compositionGap}
            </label>
            <input
              type="range" min="1" max="10"
              value={variationRules.compositionGap}
              onChange={(e) => setVariationRules({ ...variationRules, compositionGap: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı kompozisyon kaç üretim sonra tekrarlanabilir</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Köpek Frekansı: Her {variationRules.petFrequency} üretimde 1
            </label>
            <input
              type="range" min="5" max="30"
              value={variationRules.petFrequency}
              onChange={(e) => setVariationRules({ ...variationRules, petFrequency: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-gray-500 mt-1">Köpek ne sıklıkla dahil edilsin (tema izin veriyorsa)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benzerlik Eşiği: %{variationRules.similarityThreshold}
            </label>
            <input
              type="range" min="30" max="80"
              value={variationRules.similarityThreshold}
              onChange={(e) => setVariationRules({ ...variationRules, similarityThreshold: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-gray-500 mt-1">Bu oranın üzerindeki benzerlikler engellenir</p>
          </div>
        </div>
      </div>

      {/* Version */}
      <div className="text-sm text-gray-400">
        Admin Panel v1.0.0 | Storyflow v1.0.0
      </div>
    </div>
  );
}

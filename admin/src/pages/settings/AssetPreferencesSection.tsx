import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";
import ToggleSwitch from "../../components/ToggleSwitch";

type AssetCategory = "plate" | "table" | "cup" | "accessory" | "napkin" | "cutlery";

const ASSET_CATEGORIES: { key: AssetCategory; icon: string; label: string; description: string }[] = [
  { key: "plate", icon: "🍽️", label: "Tabak", description: "Ürünün sunulduğu tabak" },
  { key: "table", icon: "🪑", label: "Masa", description: "Sahne arka planı" },
  { key: "cup", icon: "☕", label: "Fincan", description: "Kahve/içecek fincanı" },
  { key: "accessory", icon: "🌸", label: "Aksesuar", description: "Çiçek, mum, kitap vb." },
  { key: "napkin", icon: "🧻", label: "Peçete", description: "Tekstil detay" },
  { key: "cutlery", icon: "🍴", label: "Çatal-Bıçak", description: "Yemek takımı" },
];

type AssetSelectionConfig = {
  manual: Record<AssetCategory, { enabled: boolean }>;
  scheduled: Record<AssetCategory, { enabled: boolean }>;
  updatedAt: number;
};

export default function AssetPreferencesSection() {
  const [assetConfig, setAssetConfig] = useState<AssetSelectionConfig | null>(null);
  const [assetConfigLoading, setAssetConfigLoading] = useState(false);
  const [assetConfigSaving, setAssetConfigSaving] = useState(false);

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

  useEffect(() => {
    loadAssetSelectionConfig();
  }, [loadAssetSelectionConfig]);

  const handleAssetToggle = async (
    mode: "manual" | "scheduled",
    category: AssetCategory,
    enabled: boolean
  ) => {
    if (!assetConfig) return;

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
      setAssetConfig(prevConfig);
    } finally {
      setAssetConfigSaving(false);
    }
  };

  return (
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
  );
}

import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";
import ToggleSwitch from "../../components/ToggleSwitch";

const SLOT_LABELS: Record<string, { label: string; icon: string }> = {
  surface: { label: "Yüzey", icon: "🪑" },
  dish: { label: "Tabak", icon: "🍽️" },
  drinkware: { label: "Bardak", icon: "☕" },
  textile: { label: "Peçete", icon: "🧻" },
  decor: { label: "Dekor", icon: "🌸" },
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  chocolates: "Çikolatalar",
  coffees: "Kahveler",
  croissants: "Kruvasanlar",
  pastas: "Pastalar",
  _default: "Varsayılan",
};

export default function SlotDefaultsSection() {
  const [slotDefaults, setSlotDefaults] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [slotDefaultsLoading, setSlotDefaultsLoading] = useState(false);
  const [slotDefaultsSaving, setSlotDefaultsSaving] = useState(false);
  const [newProductType, setNewProductType] = useState("");
  const [deleteConfirmProductType, setDeleteConfirmProductType] = useState<string | null>(null);

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

  useEffect(() => {
    loadProductSlotDefaults();
  }, [loadProductSlotDefaults]);

  const handleSlotDefaultToggle = async (productType: string, slotKey: string, enabled: boolean) => {
    if (!slotDefaults) return;

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

  const handleAddProductType = async () => {
    const slug = newProductType.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug || !slotDefaults) return;
    if (slotDefaults[slug]) return;

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

  return (
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
  );
}

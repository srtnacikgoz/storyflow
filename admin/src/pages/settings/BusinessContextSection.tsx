import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";
import ToggleSwitch from "../../components/ToggleSwitch";

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

export default function BusinessContextSection() {
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [businessContextLoading, setBusinessContextLoading] = useState(false);
  const [businessContextSaving, setBusinessContextSaving] = useState(false);

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

  useEffect(() => {
    loadBusinessContext();
  }, [loadBusinessContext]);

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

  return (
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
                className={`text-xs px-2 py-0.5 rounded font-medium ${businessContext.isEnabled
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
  );
}

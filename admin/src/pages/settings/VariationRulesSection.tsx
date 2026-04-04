import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

export default function VariationRulesSection() {
  const [variationRules, setVariationRules] = useState({
    scenarioGap: 3,
    tableGap: 2,
    compositionGap: 2,
    petFrequency: 15,
    similarityThreshold: 50,
  });
  const [variationRulesSaving, setVariationRulesSaving] = useState(false);

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

  useEffect(() => {
    loadVariationRules();
  }, [loadVariationRules]);

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

  return (
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
  );
}

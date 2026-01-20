import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";

// Tip tanımları
interface VariationRules {
  scenarioGap: number;
  tableGap: number;
  handStyleGap: number;
  compositionGap: number;
  petFrequency: number;
  outdoorFrequency?: number;
  wabiSabiFrequency?: number;
  similarityThreshold: number;
}

interface WeeklyTheme {
  mood: string;
  scenarios: string[];
  petAllowed?: boolean;
}

interface ProductionHistoryEntry {
  timestamp: number;
  scenarioId: string;
  compositionId: string;
  tableId?: string;
  handStyleId?: string;
  includesPet: boolean;
  productType: string;
}

// Varsayılan değerler
const DEFAULT_VARIATION_RULES: VariationRules = {
  scenarioGap: 3,
  tableGap: 2,
  handStyleGap: 4,
  compositionGap: 5,
  petFrequency: 15,
  outdoorFrequency: 10,
  wabiSabiFrequency: 5,
  similarityThreshold: 50,
};

// Günler
const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Senaryo listesi
const SCENARIOS = [
  { id: "zarif-tutma", name: "Zarif Tutma", hasHands: true },
  { id: "kahve-ani", name: "Kahve Anı", hasHands: true },
  { id: "hediye-acilisi", name: "Hediye Açılışı", hasHands: true },
  { id: "ilk-dilim", name: "İlk Dilim", hasHands: true },
  { id: "cam-kenari", name: "Cam Kenarı", hasHands: false },
  { id: "mermer-zarafet", name: "Mermer Zarafet", hasHands: false },
  { id: "kahve-kosesi", name: "Kahve Köşesi", hasHands: false },
  { id: "yarim-kaldi", name: "Yarım Kaldı", hasHands: false },
  { id: "paylasim", name: "Paylaşım", hasHands: false },
  { id: "paket-servis", name: "Paket Servis", hasHands: false },
];

export default function OrchestratorRules() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State
  const [rules, setRules] = useState<VariationRules>(DEFAULT_VARIATION_RULES);
  const [weeklyThemes, setWeeklyThemes] = useState<Record<string, WeeklyTheme>>({});
  const [history, setHistory] = useState<ProductionHistoryEntry[]>([]);
  const [petStats, setPetStats] = useState<{ used: number; total: number; shouldInclude: boolean }>({
    used: 0,
    total: 15,
    shouldInclude: false,
  });

  // Veri yükle
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Konfigürasyon ve geçmişi paralel yükle
      const [configData, historyData] = await Promise.all([
        api.getOrchestratorConfig(),
        api.getProductionHistory(15),
      ]);

      if (configData) {
        setRules({ ...DEFAULT_VARIATION_RULES, ...configData.variationRules });
        setWeeklyThemes(configData.weeklyThemes || {});
      }

      if (historyData) {
        setHistory(historyData);
        const petCount = historyData.filter((e: ProductionHistoryEntry) => e.includesPet).length;
        setPetStats({
          used: petCount,
          total: historyData.length,
          shouldInclude: petCount === 0 && historyData.length >= (rules.petFrequency - 1),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [rules.petFrequency]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Kuralları kaydet
  const handleSaveRules = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateOrchestratorConfig({
        variationRules: rules,
        weeklyThemes,
      });
      setSuccess("Kurallar kaydedildi!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  // Slider değişikliği
  const handleRuleChange = (key: keyof VariationRules, value: number) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  // Haftalık tema değişikliği
  const handleThemeChange = (day: string, field: keyof WeeklyTheme, value: string | string[] | boolean) => {
    setWeeklyThemes((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orchestrator Kuralları</h1>
          <p className="text-gray-500 mt-1">Görsel çeşitlilik ve senaryo rotasyonu ayarları</p>
        </div>
        <button onClick={loadData} className="btn-secondary">
          Yenile
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
          {success}
        </div>
      )}

      {/* Pet Status Card */}
      <div className={`card ${petStats.shouldInclude ? "bg-amber-50 border-2 border-amber-300" : "bg-gray-50"}`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{petStats.shouldInclude ? "🐕" : "🐾"}</span>
          <div>
            <h3 className="font-semibold text-lg">
              {petStats.shouldInclude ? "Sonraki üretimde KÖPEK dahil edilecek!" : "Köpek Durumu"}
            </h3>
            <p className="text-gray-600">
              Son {petStats.total} üretimde {petStats.used} kez köpek kullanıldı.
              {petStats.shouldInclude && " Sıradaki üretimde köpek dahil edilecek."}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Köpek frekansı: Her {rules.petFrequency} üretimde bir
            </p>
          </div>
        </div>
      </div>

      {/* Çeşitlilik Kuralları */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Çeşitlilik Kuralları</h2>
        <p className="text-gray-600 text-sm mb-6">
          Bu kurallar, üretilen görsellerin birbirine benzemesini engeller.
          Değerler, bir öğenin tekrar kullanılabilmesi için geçmesi gereken minimum üretim sayısını belirtir.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Senaryo Gap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senaryo Tekrar Aralığı: <span className="text-brand-blue font-bold">{rules.scenarioGap}</span> üretim
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={rules.scenarioGap}
              onChange={(e) => handleRuleChange("scenarioGap", parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı senaryo en az {rules.scenarioGap} üretim sonra tekrar kullanılabilir</p>
          </div>

          {/* Table Gap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Masa Tekrar Aralığı: <span className="text-brand-blue font-bold">{rules.tableGap}</span> üretim
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={rules.tableGap}
              onChange={(e) => handleRuleChange("tableGap", parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı masa en az {rules.tableGap} üretim sonra tekrar kullanılabilir</p>
          </div>

          {/* Hand Style Gap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              El Stili Tekrar Aralığı: <span className="text-brand-blue font-bold">{rules.handStyleGap}</span> üretim
            </label>
            <input
              type="range"
              min="1"
              max="8"
              value={rules.handStyleGap}
              onChange={(e) => handleRuleChange("handStyleGap", parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı el stili en az {rules.handStyleGap} üretim sonra tekrar kullanılabilir</p>
          </div>

          {/* Composition Gap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kompozisyon Tekrar Aralığı: <span className="text-brand-blue font-bold">{rules.compositionGap}</span> üretim
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={rules.compositionGap}
              onChange={(e) => handleRuleChange("compositionGap", parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <p className="text-xs text-gray-500 mt-1">Aynı kompozisyon en az {rules.compositionGap} üretim sonra tekrar kullanılabilir</p>
          </div>

          {/* Pet Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Köpek Frekansı: Her <span className="text-brand-blue font-bold">{rules.petFrequency}</span> üretimde bir
            </label>
            <input
              type="range"
              min="5"
              max="30"
              value={rules.petFrequency}
              onChange={(e) => handleRuleChange("petFrequency", parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <p className="text-xs text-gray-500 mt-1">Köpek her {rules.petFrequency} üretimde bir dahil edilir</p>
          </div>

          {/* Similarity Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benzerlik Eşiği: <span className="text-brand-blue font-bold">%{rules.similarityThreshold}</span>
            </label>
            <input
              type="range"
              min="30"
              max="80"
              value={rules.similarityThreshold}
              onChange={(e) => handleRuleChange("similarityThreshold", parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <p className="text-xs text-gray-500 mt-1">Bu eşiği aşan benzer üretimler reddedilir</p>
          </div>
        </div>
      </div>

      {/* Haftalık Temalar */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Haftalık Temalar</h2>
        <p className="text-gray-600 text-sm mb-6">
          Haftanın her günü için mood ve önerilen senaryoları belirleyin.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gün</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mood</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Önerilen Senaryolar</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Köpek İzni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {DAY_KEYS.map((dayKey, idx) => {
                const theme = weeklyThemes[dayKey] || { mood: "", scenarios: [], petAllowed: false };
                return (
                  <tr key={dayKey} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                      {DAYS[idx]}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={theme.mood}
                        onChange={(e) => handleThemeChange(dayKey, "mood", e.target.value)}
                        placeholder="örn: energetic, relaxed..."
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        multiple
                        value={theme.scenarios}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                          handleThemeChange(dayKey, "scenarios", selected);
                        }}
                        className="w-full px-2 py-1 border rounded text-sm h-20"
                      >
                        {SCENARIOS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.hasHands ? "✋" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={theme.petAllowed}
                        onChange={(e) => handleThemeChange(dayKey, "petAllowed", e.target.checked)}
                        className="w-5 h-5 accent-brand-blue"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Son Üretim Geçmişi */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Son Üretim Geçmişi</h2>
        <p className="text-gray-600 text-sm mb-4">
          Son {history.length} üretimin detayları. Çeşitlilik kuralları bu geçmişe göre uygulanır.
        </p>

        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Henüz üretim geçmişi yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Senaryo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kompozisyon</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">El Stili</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Köpek</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((entry, idx) => (
                  <tr key={entry.timestamp} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(entry.timestamp).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium">{entry.scenarioId}</td>
                    <td className="px-3 py-2 text-gray-600">{entry.compositionId}</td>
                    <td className="px-3 py-2 text-gray-600">{entry.handStyleId || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      {entry.includesPet ? "🐕" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kaydet Butonu */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSaveRules}
          disabled={saving}
          className="btn-primary shadow-lg disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kuralları Kaydet"}
        </button>
      </div>
    </div>
  );
}

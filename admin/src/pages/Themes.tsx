import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Theme } from "../types";

// Çeşitlilik kuralları tipi
interface VariationRules {
  scenarioGap: number;
  tableGap: number;
  handStyleGap: number;
  compositionGap: number;
  petFrequency: number;
  similarityThreshold: number;
}

// Varsayılan değerler
const DEFAULT_VARIATION_RULES: VariationRules = {
  scenarioGap: 3,
  tableGap: 2,
  handStyleGap: 4,
  compositionGap: 2,
  petFrequency: 15,
  similarityThreshold: 50,
};

// Tüm senaryolar
const ALL_SCENARIOS = [
  // Normal senaryolar (AI görsel üretimi yapılır)
  { id: "zarif-tutma", name: "Zarif Tutma", includesHands: true, isInterior: false },
  { id: "kahve-ani", name: "Kahve Anı", includesHands: true, isInterior: false },
  { id: "kahve-kosesi", name: "Kahve Köşesi", includesHands: false, isInterior: false },
  { id: "yarim-kaldi", name: "Yarım Kaldı", includesHands: false, isInterior: false },
  { id: "cam-kenari", name: "Cam Kenarı", includesHands: false, isInterior: false },
  { id: "mermer-zarafet", name: "Mermer Zarafet", includesHands: false, isInterior: false },
  { id: "hediye-acilisi", name: "Hediye Açılışı", includesHands: true, isInterior: false },
  { id: "ilk-dilim", name: "İlk Dilim", includesHands: true, isInterior: false },
  { id: "paylasim", name: "Paylaşım", includesHands: false, isInterior: false },
  { id: "paket-servis", name: "Paket Servis", includesHands: false, isInterior: false },
  // Interior senaryolar (AI görsel üretimi ATLANIR, gerçek fotoğraf kullanılır)
  { id: "vitrin-sergisi", name: "Vitrin Sergisi", includesHands: false, isInterior: true },
  { id: "kruvasan-tezgahi", name: "Kruvasan Tezgahı", includesHands: false, isInterior: true },
  { id: "pastane-ici", name: "Pastane İçi", includesHands: false, isInterior: true },
  { id: "oturma-kosesi", name: "Oturma Köşesi", includesHands: false, isInterior: true },
  { id: "cicek-detay", name: "Çiçek Detay", includesHands: false, isInterior: true },
  { id: "kahve-hazirligi", name: "Kahve Hazırlığı", includesHands: false, isInterior: true },
  { id: "sabah-acilis", name: "Sabah Açılış", includesHands: false, isInterior: true },
  { id: "pencere-isigi", name: "Pencere Işığı", includesHands: false, isInterior: true },
  { id: "raf-zenginligi", name: "Raf Zenginliği", includesHands: false, isInterior: true },
  { id: "detay-cekimi", name: "Detay Çekimi", includesHands: false, isInterior: true },
];

// Mood seçenekleri - her birinin kullanım amacı açıklanmış
const MOOD_OPTIONS = [
  { id: "energetic", name: "Enerjik", hint: "Sabah temaları için ideal" },
  { id: "social", name: "Sosyal", hint: "Brunch ve paylaşım anları" },
  { id: "relaxed", name: "Rahat", hint: "Öğleden sonra molası" },
  { id: "warm", name: "Sıcak", hint: "Altın saat, romantik anlar" },
  { id: "cozy", name: "Samimi", hint: "Gece atmosferi, ev sıcaklığı" },
  { id: "balanced", name: "Dengeli", hint: "Nötr, her zaman uygun" },
];

// Boş tema formu
const emptyTheme = {
  id: "",
  name: "",
  description: "",
  scenarios: [] as string[],
  mood: "balanced",
  petAllowed: false,
  accessoryAllowed: false,
};

export default function Themes() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTheme);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Çeşitlilik kuralları state
  const [variationRules, setVariationRules] = useState<VariationRules>(DEFAULT_VARIATION_RULES);
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    loadThemes();
    loadVariationRules();
  }, []);

  const loadThemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listThemes();
      setThemes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Temalar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Çeşitlilik kurallarını yükle
  const loadVariationRules = async () => {
    try {
      const data = await api.getOrchestratorConfig();
      if (data?.variationRules) {
        setVariationRules({
          ...DEFAULT_VARIATION_RULES,
          ...data.variationRules,
        });
      }
    } catch (err) {
      console.error("Çeşitlilik kuralları yüklenemedi:", err);
    }
  };

  // Çeşitlilik kurallarını kaydet
  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await api.updateOrchestratorConfig({ variationRules });
      alert("Kurallar kaydedildi");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSavingRules(false);
    }
  };

  // Modal aç (yeni veya düzenleme)
  const openModal = (theme?: Theme) => {
    if (theme) {
      setEditingId(theme.id);
      setForm({
        id: theme.id,
        name: theme.name,
        description: theme.description || "",
        scenarios: theme.scenarios,
        mood: theme.mood,
        petAllowed: theme.petAllowed,
        accessoryAllowed: theme.accessoryAllowed ?? false,
      });
    } else {
      setEditingId(null);
      setForm(emptyTheme);
    }
    setShowModal(true);
  };

  // Modal kapat
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyTheme);
  };

  // Form gönder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        // Güncelleme - id hariç diğer alanları gönder
        await api.updateTheme(editingId, {
          name: form.name,
          description: form.description,
          scenarios: form.scenarios,
          mood: form.mood,
          petAllowed: form.petAllowed,
          accessoryAllowed: form.accessoryAllowed,
        });
      } else {
        // Yeni oluşturma
        await api.createTheme({
          id: form.id,
          name: form.name,
          description: form.description,
          scenarios: form.scenarios,
          mood: form.mood,
          petAllowed: form.petAllowed,
          accessoryAllowed: form.accessoryAllowed,
        });
      }
      await loadThemes();
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  // Tema sil
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    try {
      await api.deleteTheme(deleteId);
      await loadThemes();
      setDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme başarısız");
    } finally {
      setDeleting(false);
    }
  };

  // Senaryo toggle
  const toggleScenario = (scenarioId: string) => {
    setForm((prev) => ({
      ...prev,
      scenarios: prev.scenarios.includes(scenarioId)
        ? prev.scenarios.filter((s) => s !== scenarioId)
        : [...prev.scenarios, scenarioId],
    }));
  };

  // ID oluştur (name'den)
  const generateId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-stone-200 rounded" />
          <div className="h-64 bg-stone-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Temalar</h1>
          <p className="text-sm text-stone-500 mt-1">
            Paylaşım zaman dilimlerine atanacak tema grupları
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Tema
        </button>
      </div>

      {/* Tema Listesi */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-stone-900">{theme.name}</h3>
                {theme.description && (
                  <p className="text-sm text-stone-500 mt-1">{theme.description}</p>
                )}
              </div>
              {theme.isDefault && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  Varsayılan
                </span>
              )}
            </div>

            {/* Mood */}
            <div className="flex items-center gap-2 text-sm text-stone-600 mb-3">
              <span className="font-medium">Mood:</span>
              <span className="bg-stone-100 px-2 py-0.5 rounded">
                {MOOD_OPTIONS.find((m) => m.id === theme.mood)?.name || theme.mood}
              </span>
              {theme.petAllowed && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Köpek izinli
                </span>
              )}
              {theme.accessoryAllowed && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Aksesuar izinli
                </span>
              )}
            </div>

            {/* Senaryolar */}
            <div className="mb-4">
              <p className="text-xs text-stone-500 mb-2">Senaryolar:</p>
              <div className="flex flex-wrap gap-1">
                {theme.scenarios.map((scenarioId) => {
                  const scenario = ALL_SCENARIOS.find((s) => s.id === scenarioId);
                  return (
                    <span
                      key={scenarioId}
                      className={`text-xs px-2 py-1 rounded ${
                        scenario?.isInterior
                          ? "bg-green-100 text-green-700"
                          : scenario?.includesHands
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {scenario?.name || scenarioId}
                      {scenario?.isInterior && " 📍"}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => openModal(theme)}
                className="flex-1 text-sm py-2 px-3 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Düzenle
              </button>
              {!theme.isDefault && (
                <button
                  onClick={() => setDeleteId(theme.id)}
                  className="text-sm py-2 px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Sil
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {themes.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          Henüz tema eklenmemiş.
        </div>
      )}

      {/* Çeşitlilik Kuralları Bölümü */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Çeşitlilik Kuralları</h2>
            <p className="text-sm text-stone-500 mt-1">
              İçerik üretiminde tekrarı önlemek için kuralları ayarlayın
            </p>
          </div>
          <button
            onClick={handleSaveRules}
            disabled={savingRules}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {savingRules ? "Kaydediliyor..." : "Kuralları Kaydet"}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Senaryo Aralığı */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Senaryo Aralığı: {variationRules.scenarioGap}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={variationRules.scenarioGap}
              onChange={(e) =>
                setVariationRules({ ...variationRules, scenarioGap: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              Aynı senaryo kaç üretim sonra tekrarlanabilir
            </p>
          </div>

          {/* Masa Aralığı */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Masa Aralığı: {variationRules.tableGap}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={variationRules.tableGap}
              onChange={(e) =>
                setVariationRules({ ...variationRules, tableGap: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              Aynı masa/yüzey kaç üretim sonra tekrarlanabilir
            </p>
          </div>

          {/* El Stili Aralığı */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              El Stili Aralığı: {variationRules.handStyleGap}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={variationRules.handStyleGap}
              onChange={(e) =>
                setVariationRules({ ...variationRules, handStyleGap: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              Aynı el stili kaç üretim sonra tekrarlanabilir
            </p>
          </div>

          {/* Kompozisyon Aralığı */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Kompozisyon Aralığı: {variationRules.compositionGap}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={variationRules.compositionGap}
              onChange={(e) =>
                setVariationRules({ ...variationRules, compositionGap: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              Aynı kompozisyon kaç üretim sonra tekrarlanabilir
            </p>
          </div>

          {/* Köpek Frekansı */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Köpek Frekansı: Her {variationRules.petFrequency} üretimde 1
            </label>
            <input
              type="range"
              min="5"
              max="30"
              value={variationRules.petFrequency}
              onChange={(e) =>
                setVariationRules({ ...variationRules, petFrequency: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              Köpek ne sıklıkla dahil edilsin (teması izin veriyorsa)
            </p>
          </div>

          {/* Benzerlik Eşiği */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Benzerlik Eşiği: %{variationRules.similarityThreshold}
            </label>
            <input
              type="range"
              min="30"
              max="80"
              value={variationRules.similarityThreshold}
              onChange={(e) =>
                setVariationRules({ ...variationRules, similarityThreshold: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              Bu oranın üzerindeki benzerlikler engellenir
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-stone-200">
                <h2 className="text-xl font-semibold">
                  {editingId ? "Tema Düzenle" : "Yeni Tema"}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* ID (sadece yeni tema için) */}
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Tema ID
                    </label>
                    <input
                      type="text"
                      value={form.id}
                      onChange={(e) => setForm({ ...form, id: e.target.value })}
                      placeholder="morning-energy"
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      Benzersiz ID (küçük harf, tire ile)
                    </p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Tema Adı
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm({
                        ...form,
                        name,
                        // Yeni tema için ID'yi otomatik oluştur
                        id: editingId ? form.id : generateId(name),
                      });
                    }}
                    placeholder="Sabah Enerjisi"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Bu temanın kullanım amacı..."
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={2}
                  />
                </div>

                {/* Mood */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Mood
                  </label>
                  <select
                    value={form.mood}
                    onChange={(e) => setForm({ ...form, mood: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {MOOD_OPTIONS.map((mood) => (
                      <option key={mood.id} value={mood.id}>
                        {mood.name} ({mood.hint})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pet Allowed */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.petAllowed}
                      onChange={(e) => setForm({ ...form, petAllowed: e.target.checked })}
                      className="w-5 h-5 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-stone-700">
                      Köpek dahil edilebilir
                    </span>
                  </label>
                </div>

                {/* Accessory Allowed */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.accessoryAllowed}
                      onChange={(e) => setForm({ ...form, accessoryAllowed: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-stone-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-stone-700">
                      Aksesuar dahil edilebilir
                    </span>
                  </label>
                  <p className="text-xs text-stone-500 mt-1 ml-8">
                    Telefon, çanta, anahtar, kitap gibi gerçekçi pastane detayları
                  </p>
                </div>

                {/* Scenarios */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">
                    Senaryolar
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SCENARIOS.map((scenario) => (
                      <label
                        key={scenario.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          form.scenarios.includes(scenario.id)
                            ? "bg-amber-50 border-amber-300"
                            : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.scenarios.includes(scenario.id)}
                          onChange={() => toggleScenario(scenario.id)}
                          className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-stone-800">
                            {scenario.name}
                          </span>
                          {scenario.isInterior && (
                            <span className="ml-2 text-xs text-green-600">📍 Interior</span>
                          )}
                          {scenario.includesHands && (
                            <span className="ml-2 text-xs text-purple-600">El var</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  {form.scenarios.length === 0 && (
                    <p className="text-sm text-red-500 mt-2">
                      En az bir senaryo seçmelisiniz
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-stone-200 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving || form.scenarios.length === 0}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              Temayı Sil
            </h3>
            <p className="text-stone-600 mb-6">
              Bu temayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

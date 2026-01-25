import { useEffect, useState } from "react";
import { api } from "../services/api";

// Senaryo tipi
interface Composition {
  id: string;
  description: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  includesHands: boolean;
  compositions: Composition[];
  isActive: boolean;
  isInterior?: boolean;
  interiorType?: string;
  suggestedProducts?: string[];
  mood?: string;
  lightingPreference?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Mood seçenekleri - senaryo atmosferini tanımlar
const MOOD_OPTIONS = [
  { id: "elegant", name: "Şık", hint: "Sofistike, premium sunum" },
  { id: "social", name: "Sosyal", hint: "Paylaşım, birliktelik anları" },
  { id: "cozy", name: "Samimi", hint: "Ev sıcaklığı, rahat ortam" },
  { id: "fresh", name: "Taze", hint: "Canlı, enerjik başlangıçlar" },
  { id: "luxurious", name: "Lüks", hint: "Premium, özel anlar" },
  { id: "authentic", name: "Otantik", hint: "Doğal, samimi, gerçek" },
  { id: "practical", name: "Pratik", hint: "Günlük kullanım, fonksiyonel" },
  { id: "festive", name: "Şenlikli", hint: "Kutlama, özel gün" },
  { id: "exciting", name: "Heyecanlı", hint: "Dinamik, dikkat çekici" },
  { id: "inviting", name: "Davetkar", hint: "Sıcak karşılama, misafirperver" },
  { id: "casual", name: "Gündelik", hint: "Rahat, informal" },
  { id: "professional", name: "Profesyonel", hint: "Kurumsal, iş odaklı" },
];

// Ürün tipleri
const PRODUCT_TYPES = [
  { id: "croissants", name: "Kruvasanlar" },
  { id: "pastas", name: "Pastalar" },
  { id: "chocolates", name: "Çikolatalar" },
  { id: "coffees", name: "Kahveler" },
];

// Interior tipleri
const INTERIOR_TYPES = [
  { id: "vitrin", name: "Vitrin" },
  { id: "tezgah", name: "Tezgah" },
  { id: "oturma-alani", name: "Oturma Alanı" },
  { id: "dekorasyon", name: "Dekorasyon" },
  { id: "genel-mekan", name: "Genel Mekan" },
];

// Boş form
const emptyForm = {
  id: "",
  name: "",
  description: "",
  includesHands: false,
  compositions: [{ id: "", description: "" }],
  isInterior: false,
  interiorType: "",
  suggestedProducts: [] as string[],
  mood: "",
  lightingPreference: "",
};

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hands" | "noHands" | "interior">("all");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detay modal
  const [detailScenario, setDetailScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        success: boolean;
        data: { all: Scenario[] };
        error?: string;
      }>("listScenarios?includeInactive=true");
      if (response.success) {
        setScenarios(response.data.all || []);
      } else {
        setError(response.error || "Senaryolar yüklenemedi");
      }
    } catch (err) {
      setError("Senaryolar yüklenirken hata oluştu");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrelenmiş senaryolar
  const filteredScenarios = scenarios.filter((s) => {
    if (filter === "all") return true;
    if (filter === "hands") return s.includesHands && !s.isInterior;
    if (filter === "noHands") return !s.includesHands && !s.isInterior;
    if (filter === "interior") return s.isInterior;
    return true;
  });

  // Modal aç (yeni)
  const openNewModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  // Modal aç (düzenle)
  const openEditModal = (scenario: Scenario) => {
    setEditingId(scenario.id);
    setForm({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      includesHands: scenario.includesHands,
      compositions: scenario.compositions.length > 0
        ? scenario.compositions
        : [{ id: "", description: "" }],
      isInterior: scenario.isInterior || false,
      interiorType: scenario.interiorType || "",
      suggestedProducts: scenario.suggestedProducts || [],
      mood: scenario.mood || "",
      lightingPreference: scenario.lightingPreference || "",
    });
    setShowModal(true);
  };

  // Kompozisyon ekle
  const addComposition = () => {
    setForm({
      ...form,
      compositions: [...form.compositions, { id: "", description: "" }],
    });
  };

  // Kompozisyon sil
  const removeComposition = (index: number) => {
    if (form.compositions.length > 1) {
      setForm({
        ...form,
        compositions: form.compositions.filter((_, i) => i !== index),
      });
    }
  };

  // Kompozisyon güncelle
  const updateComposition = (index: number, field: "id" | "description", value: string) => {
    const newComps = [...form.compositions];
    newComps[index] = { ...newComps[index], [field]: value };
    // ID'yi description'dan otomatik oluştur
    if (field === "description" && !newComps[index].id) {
      newComps[index].id = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    setForm({ ...form, compositions: newComps });
  };

  // Kaydet
  const handleSave = async () => {
    // Validasyon
    if (!form.name.trim()) {
      alert("Senaryo adı zorunludur");
      return;
    }
    if (!form.description.trim()) {
      alert("Açıklama zorunludur");
      return;
    }
    if (form.compositions.every((c) => !c.id.trim())) {
      alert("En az bir kompozisyon gereklidir");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        name: form.name.trim(),
        description: form.description.trim(),
        includesHands: form.includesHands,
        compositions: form.compositions.filter((c) => c.id.trim()),
        isInterior: form.isInterior,
        interiorType: form.isInterior ? form.interiorType : undefined,
        suggestedProducts: form.suggestedProducts,
        mood: form.mood || undefined,
        lightingPreference: form.lightingPreference || undefined,
      };

      if (editingId) {
        await api.put<{ success: boolean }>("updateScenarioEndpoint", payload);
      } else {
        await api.post<{ success: boolean }>("createScenario", payload);
      }

      setShowModal(false);
      loadScenarios();
    } catch (err) {
      console.error(err);
      alert("Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  // Sil
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await api.delete<{ success: boolean }>(`deleteScenarioEndpoint?id=${deleteId}`);
      setDeleteId(null);
      loadScenarios();
    } catch (err) {
      console.error(err);
      alert("Silme hatası");
    } finally {
      setDeleting(false);
    }
  };

  // Aktif/Pasif toggle
  const toggleActive = async (scenario: Scenario) => {
    try {
      await api.put<{ success: boolean }>("updateScenarioEndpoint", {
        id: scenario.id,
        isActive: !scenario.isActive,
      });
      loadScenarios();
    } catch (err) {
      console.error(err);
      alert("Güncelleme hatası");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Senaryolar</h1>
          <p className="text-gray-500 mt-1">
            AI görsel üretiminde kullanılan senaryoları yönetin
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2"
        >
          <span>+</span>
          <span>Yeni Senaryo</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* Filtreler */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "all", label: "Tümü", count: scenarios.length },
          { key: "hands", label: "El İçeren", count: scenarios.filter((s) => s.includesHands && !s.isInterior).length },
          { key: "noHands", label: "El İçermeyen", count: scenarios.filter((s) => !s.includesHands && !s.isInterior).length },
          { key: "interior", label: "Interior", count: scenarios.filter((s) => s.isInterior).length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Senaryo Listesi */}
      <div className="grid gap-4">
        {filteredScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`bg-white rounded-lg shadow-sm border p-4 ${
              !scenario.isActive ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{scenario.name}</h3>

                  {/* Badge'ler */}
                  <div className="flex gap-2">
                    {scenario.includesHands && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        El var
                      </span>
                    )}
                    {scenario.isInterior && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Interior
                      </span>
                    )}
                    {!scenario.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        Pasif
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mt-1">{scenario.description}</p>

                {/* Kompozisyonlar */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {scenario.compositions.map((comp) => (
                    <span
                      key={comp.id}
                      className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                    >
                      {comp.id}
                    </span>
                  ))}
                </div>

                {/* Ek bilgiler */}
                {(scenario.mood || scenario.lightingPreference) && (
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {scenario.mood && <span>Mood: {scenario.mood}</span>}
                    {scenario.lightingPreference && <span>Işık: {scenario.lightingPreference}</span>}
                  </div>
                )}
              </div>

              {/* Aksiyonlar */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setDetailScenario(scenario)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Detay"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => openEditModal(scenario)}
                  className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                  title="Düzenle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => toggleActive(scenario)}
                  className={`p-2 rounded ${
                    scenario.isActive
                      ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                      : "text-green-500 hover:text-green-700 hover:bg-green-50"
                  }`}
                  title={scenario.isActive ? "Pasif Yap" : "Aktif Yap"}
                >
                  {scenario.isActive ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setDeleteId(scenario.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Sil"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredScenarios.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Bu kategoride senaryo bulunamadı
        </div>
      )}

      {/* Yeni/Düzenle Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">
                {editingId ? "Senaryo Düzenle" : "Yeni Senaryo"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Temel Bilgiler */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senaryo Adı *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Örn: Zarif Tutma"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mood
                  </label>
                  <select
                    value={form.mood}
                    onChange={(e) => setForm({ ...form, mood: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Seçiniz</option>
                    {MOOD_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.hint})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={2}
                  placeholder="Senaryo açıklaması..."
                />
              </div>

              {/* Özellikler */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.includesHands}
                    onChange={(e) => setForm({ ...form, includesHands: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-sm">El içeriyor</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isInterior}
                    onChange={(e) => setForm({ ...form, isInterior: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-sm">Interior (AI atlanır)</span>
                </label>
              </div>

              {/* Interior ise tip seç */}
              {form.isInterior && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interior Tipi
                  </label>
                  <select
                    value={form.interiorType}
                    onChange={(e) => setForm({ ...form, interiorType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Seçiniz</option>
                    {INTERIOR_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Işık Tercihi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Işık Tercihi
                </label>
                <input
                  type="text"
                  value={form.lightingPreference}
                  onChange={(e) => setForm({ ...form, lightingPreference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Örn: soft natural, warm golden"
                />
              </div>

              {/* Önerilen Ürünler */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Önerilen Ürünler
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_TYPES.map((p) => (
                    <label key={p.id} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.suggestedProducts.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, suggestedProducts: [...form.suggestedProducts, p.id] });
                          } else {
                            setForm({ ...form, suggestedProducts: form.suggestedProducts.filter((x) => x !== p.id) });
                          }
                        }}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Kompozisyonlar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Kompozisyonlar *
                  </label>
                  <button
                    type="button"
                    onClick={addComposition}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    + Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {form.compositions.map((comp, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={comp.id}
                        onChange={(e) => updateComposition(index, "id", e.target.value)}
                        className="w-1/3 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                        placeholder="ID (ör: bottom-right)"
                      />
                      <input
                        type="text"
                        value={comp.description}
                        onChange={(e) => updateComposition(index, "description", e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                        placeholder="Açıklama"
                      />
                      {form.compositions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeComposition(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Senaryoyu Sil</h3>
            <p className="text-gray-600 mb-6">
              Bu senaryoyu silmek istediğinize emin misiniz? Senaryo pasif hale getirilecektir.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detay Modal */}
      {detailScenario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{detailScenario.name}</h3>
                <p className="text-gray-500 text-sm">{detailScenario.id}</p>
              </div>
              <button
                onClick={() => setDetailScenario(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="font-medium">Açıklama:</span>
                <p className="text-gray-600">{detailScenario.description}</p>
              </div>

              <div className="flex gap-4">
                <div>
                  <span className="font-medium">El:</span>{" "}
                  <span className={detailScenario.includesHands ? "text-green-600" : "text-gray-500"}>
                    {detailScenario.includesHands ? "Var" : "Yok"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Interior:</span>{" "}
                  <span className={detailScenario.isInterior ? "text-purple-600" : "text-gray-500"}>
                    {detailScenario.isInterior ? "Evet" : "Hayır"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Durum:</span>{" "}
                  <span className={detailScenario.isActive ? "text-green-600" : "text-red-500"}>
                    {detailScenario.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>

              {detailScenario.mood && (
                <div>
                  <span className="font-medium">Mood:</span> {detailScenario.mood}
                </div>
              )}

              {detailScenario.lightingPreference && (
                <div>
                  <span className="font-medium">Işık:</span> {detailScenario.lightingPreference}
                </div>
              )}

              <div>
                <span className="font-medium">Kompozisyonlar:</span>
                <div className="mt-1 space-y-1">
                  {detailScenario.compositions.map((c) => (
                    <div key={c.id} className="flex gap-2 text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">{c.id}</code>
                      <span>- {c.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {detailScenario.suggestedProducts && detailScenario.suggestedProducts.length > 0 && (
                <div>
                  <span className="font-medium">Önerilen Ürünler:</span>{" "}
                  {detailScenario.suggestedProducts.join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

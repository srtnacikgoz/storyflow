import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type {
  CompositionTemplate,
  SlotDefinition,
  SlotConfig,
  SlotState,
} from "../types";

// Slot state: sadece Kullanma / Rastgele (etiket filtreleme Tema'da)
const SLOT_STATE_OPTIONS: { value: SlotState; label: string; color: string }[] = [
  { value: "disabled", label: "Kullanma", color: "text-stone-400" },
  { value: "random", label: "Rastgele", color: "text-blue-600" },
];

// Boş slot config
function emptySlotConfig(): SlotConfig {
  return { state: "disabled" };
}

export default function CompositionTemplates() {
  // Data state
  const [templates, setTemplates] = useState<CompositionTemplate[]>([]);
  const [slotDefinitions, setSlotDefinitions] = useState<SlotDefinition[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<{
    name: string;
    slots: Record<string, SlotConfig>;
  }>({
    name: "",
    slots: {},
  });

  // Veri yükle
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [templateList, slotDefs] = await Promise.all([
        api.listCompositionTemplates("system"),
        api.getSlotDefinitions(),
      ]);
      setTemplates(templateList);
      const activeSlots = slotDefs.slots.filter((s: SlotDefinition) => s.isActive);
      setSlotDefinitions(activeSlots);
    } catch (err) {
      console.error("Veri yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Form'u sıfırla (slot tanımlarına göre default disabled)
  const resetForm = useCallback(() => {
    const defaultSlots: Record<string, SlotConfig> = {};
    slotDefinitions.forEach((slot) => {
      defaultSlots[slot.key] = emptySlotConfig();
    });
    setForm({
      name: "",
      slots: defaultSlots,
    });
    setEditingId(null);
  }, [slotDefinitions]);

  // Yeni template oluştur
  const handleNew = () => {
    resetForm();
    setShowModal(true);
  };

  // Düzenleme
  const handleEdit = (template: CompositionTemplate) => {
    // Mevcut slot config'leri yükle, eksik slot'ları disabled olarak ekle
    // Eski "manual" + filterTags verileri varsa "random"a dönüştür (geriye uyumluluk)
    const slots: Record<string, SlotConfig> = {};
    slotDefinitions.forEach((def) => {
      const saved = template.slots[def.key];
      if (saved) {
        slots[def.key] = { state: saved.state === "manual" ? "random" : saved.state };
      } else {
        slots[def.key] = emptySlotConfig();
      }
    });

    setForm({
      name: template.name,
      slots,
    });
    setEditingId(template.id);
    setShowModal(true);
  };

  // Kaydet
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Sadece aktif (disabled olmayan) slot'ları gönder
      const activeSlots: Record<string, SlotConfig> = {};
      Object.entries(form.slots).forEach(([key, config]) => {
        if (config.state !== "disabled") {
          activeSlots[key] = { state: config.state };
        }
      });

      const payload: Record<string, unknown> = {
        name: form.name,
        slots: activeSlots,
      };

      if (editingId) {
        await api.updateCompositionTemplate(editingId, "system", payload);
      } else {
        await api.createCompositionTemplate({ ...payload, type: "system" } as any);
      }

      await loadData();
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  // Sil
  const handleDelete = async (id: string) => {
    try {
      await api.deleteCompositionTemplate(id, "system");
      await loadData();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme başarısız");
    }
  };

  // Slot state değişikliği
  const handleSlotStateChange = (slotKey: string, state: SlotState) => {
    // Zorunlu slot devre dışı bırakılamaz
    const def = slotDefinitions.find(d => d.key === slotKey);
    if (def?.isRequired && state === "disabled") return;

    setForm((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [slotKey]: { state },
      },
    }));
  };

  // Aktif slot sayısını hesapla
  const getActiveSlotCount = (slots: Record<string, SlotConfig>) => {
    return Object.values(slots).filter((s) => s.state !== "disabled").length;
  };

  // Slot state badge
  const SlotBadge = ({ state }: { state: SlotState }) => {
    if (state === "disabled") return null;
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Rastgele
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kompozisyon Template'leri</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hazır slot kombinasyonları oluşturun. Üretim sırasında template yükleyerek hızlıca başlayın.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
        >
          + Yeni Template
        </button>
      </div>

      {/* Template Listesi */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz template yok</h3>
          <p className="text-sm text-gray-500 mb-6">
            İlk template'inizi oluşturarak başlayın. Template'ler, sık kullandığınız slot kombinasyonlarını kaydetmenizi sağlar.
          </p>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
          >
            + İlk Template'i Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const activeSlots = getActiveSlotCount(template.slots);

            return (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow"
              >
                {/* Template Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  </div>
                  <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                    {activeSlots} slot
                  </span>
                </div>

                {/* Slot Durumları */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {slotDefinitions.map((def) => {
                    const config = template.slots[def.key];
                    if (!config || config.state === "disabled") return null;
                    return (
                      <div
                        key={def.key}
                        className="flex items-center gap-1 text-xs"
                      >
                        <span className="text-gray-600">{def.label}:</span>
                        <SlotBadge state={config.state} />
                      </div>
                    );
                  })}
                </div>

                {/* Aksiyonlar */}
                <div className="flex gap-2 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    Düzenle
                  </button>
                  {deleteConfirm === template.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Evet
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50"
                      >
                        Hayır
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(template.id)}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Oluştur/Düzenle Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-200 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingId ? "Template Düzenle" : "Yeni Template"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Ad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Adı *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      const capitalized = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase());
                      setForm({ ...form, name: capitalized });
                    }}
                    placeholder="Örn: Minimalist Kahve"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>

                {/* Slot Konfigürasyonu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Slot Konfigürasyonu
                  </label>
                  <div className="space-y-3">
                    {slotDefinitions.map((def) => {
                      const slotConfig = form.slots[def.key] || emptySlotConfig();

                      return (
                        <div
                          key={def.key}
                          className={`border rounded-lg p-4 transition-colors ${
                            slotConfig.state === "disabled"
                              ? "border-stone-200 bg-stone-50"
                              : "border-amber-200 bg-amber-50/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900 text-sm">
                                {def.label}
                              </span>
                              {def.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{def.description}</p>
                              )}
                              {def.isRequired && (
                                <span className="text-xs text-amber-600 font-medium">Zorunlu</span>
                              )}
                            </div>

                            {/* State Toggle */}
                            <div className="flex gap-1">
                              {SLOT_STATE_OPTIONS.map((opt) => {
                                const isDisabledOption = def.isRequired && opt.value === "disabled";
                                return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleSlotStateChange(def.key, opt.value)}
                                  disabled={isDisabledOption}
                                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                    isDisabledOption
                                      ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                                      : slotConfig.state === opt.value
                                      ? opt.value === "disabled"
                                        ? "bg-stone-300 text-stone-700"
                                        : opt.value === "manual"
                                        ? "bg-amber-500 text-white"
                                        : "bg-blue-500 text-white"
                                      : "bg-white border border-stone-300 text-stone-600 hover:bg-stone-50"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-stone-200 flex gap-3 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

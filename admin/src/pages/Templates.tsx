import { useEffect, useState } from "react";
import { api } from "../services/api";
import type {
  CaptionTemplate,
  CaptionTemplateInput,
  TemplateVariable,
  ProductCategory,
} from "../types";

// Kategori label'ları
const categoryLabels: Record<string, string> = {
  all: "Tümü",
  viennoiserie: "Viennoiserie",
  coffee: "Kahve",
  chocolate: "Çikolata",
  "small-desserts": "Küçük Tatlılar",
  "slice-cakes": "Dilim Pastalar",
  "big-cakes": "Büyük Pastalar",
  profiterole: "Profiterol",
  "special-orders": "Özel Siparişler",
};

// Boş şablon formu
const emptyTemplate: CaptionTemplateInput = {
  name: "",
  description: "",
  categories: ["all"],
  tags: [],
  template: "",
  variables: [],
  isActive: true,
  isDefault: false,
  priority: 10,
};

// Boş değişken
const emptyVariable: TemplateVariable = {
  key: "",
  label: "",
  type: "text",
  required: false,
  defaultValue: "",
};

export default function Templates() {
  const [templates, setTemplates] = useState<CaptionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaptionTemplateInput>(emptyTemplate);
  const [saving, setSaving] = useState(false);

  // Preview state
  const [previewText, setPreviewText] = useState<string>("");
  const [previewProductName, setPreviewProductName] = useState("Kestaneli Tart");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Kılavuz modal
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şablonlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Modal aç (yeni veya düzenleme)
  const openModal = (template?: CaptionTemplate) => {
    if (template) {
      setEditingId(template.id);
      setForm({
        name: template.name,
        description: template.description,
        categories: template.categories,
        tags: template.tags,
        template: template.template,
        variables: template.variables,
        isActive: template.isActive,
        isDefault: template.isDefault,
        priority: template.priority,
      });
    } else {
      setEditingId(null);
      setForm(emptyTemplate);
    }
    setPreviewText("");
    setShowModal(true);
  };

  // Modal kapat
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyTemplate);
    setPreviewText("");
  };

  // Form kaydet
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateTemplate(editingId, form);
      } else {
        await api.createTemplate(form);
      }
      await loadTemplates();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  };

  // Şablon sil
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteTemplate(deleteId);
      await loadTemplates();
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız");
    } finally {
      setDeleting(false);
    }
  };

  // Önizleme güncelle
  const updatePreview = async () => {
    if (!editingId && !form.template) return;

    // Basit lokal önizleme
    let preview = form.template;
    for (const variable of form.variables) {
      const placeholder = `{${variable.key}}`;
      let value = "";

      if (variable.type === "auto" && variable.autoSource === "productName") {
        value = previewProductName;
      } else if (variable.defaultValue) {
        value = variable.defaultValue;
      } else if (variable.options && variable.options.length > 0) {
        value = variable.options[0];
      }

      preview = preview.split(placeholder).join(value);
    }

    setPreviewText(preview);
  };

  // Template veya değişkenler değiştiğinde önizleme güncelle
  useEffect(() => {
    updatePreview();
  }, [form.template, form.variables, previewProductName]);

  // Değişken ekle
  const addVariable = () => {
    setForm((prev) => ({
      ...prev,
      variables: [...prev.variables, { ...emptyVariable }],
    }));
  };

  // Değişken sil
  const removeVariable = (index: number) => {
    setForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  };

  // Değişken güncelle
  const updateVariable = (
    index: number,
    field: keyof TemplateVariable,
    value: string | boolean | string[]
  ) => {
    setForm((prev) => ({
      ...prev,
      variables: prev.variables.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  };

  // Kategori toggle
  const toggleCategory = (cat: ProductCategory | "all") => {
    setForm((prev) => {
      const categories = prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories };
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Başlık Şablonları</h1>
          <p className="text-gray-500 mt-1">
            Instagram paylaşımları için hazır başlık şablonları
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Nasıl Kullanılır?
          </button>
          <button onClick={loadTemplates} className="btn-secondary">
            Yenile
          </button>
          <button onClick={() => openModal()} className="btn-primary">
            Yeni Şablon
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Liste */}
      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Henüz şablon yok</p>
          <button onClick={() => openModal()} className="btn-primary mt-4">
            İlk Şablonu Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`card hover:shadow-md transition-shadow ${
                !template.isActive ? "opacity-60" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500">{template.description}</p>
                </div>
                <div className="flex gap-1">
                  {template.isDefault && (
                    <span className="px-2 py-0.5 bg-brand-mustard/20 text-xs rounded-lg">
                      Varsayılan
                    </span>
                  )}
                  {!template.isActive && (
                    <span className="px-2 py-0.5 bg-gray-200 text-xs rounded-lg">
                      Pasif
                    </span>
                  )}
                </div>
              </div>

              {/* Şablon önizleme */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {template.template}
                </pre>
              </div>

              {/* Kategoriler */}
              <div className="flex flex-wrap gap-1 mb-3">
                {template.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 bg-brand-blue/10 text-xs rounded-lg text-gray-700"
                  >
                    {categoryLabels[cat] || cat}
                  </span>
                ))}
              </div>

              {/* İstatistikler */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>{template.variables.length} değişken</span>
                <span>{template.usageCount} kullanım</span>
              </div>

              {/* Butonlar */}
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(template)}
                  className="flex-1 text-sm px-3 py-1.5 bg-brand-blue/20 text-gray-900 rounded-lg hover:bg-brand-blue/30"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => setDeleteId(template.id)}
                  className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Şablon Düzenle" : "Yeni Şablon"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Ad ve Açıklama */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Şablon Adı
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        // Title Case: Her kelimenin ilk harfi büyük
                        const titleCase = e.target.value
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ');
                        setForm((prev) => ({ ...prev, name: titleCase }));
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
                      placeholder="Minimal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Açıklama
                    </label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
                      placeholder="Sadece ürün adı"
                    />
                  </div>
                </div>

                {/* Şablon içeriği */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şablon
                    <span className="text-gray-400 font-normal ml-2">
                      Değişkenler: {"{"}productName{"}"}, {"{"}season{"}"}, vb.
                    </span>
                  </label>
                  <textarea
                    value={form.template}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, template: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue font-mono text-sm"
                    placeholder="Sade'den&#10;{productName}"
                  />
                </div>

                {/* Önizleme */}
                {previewText && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Önizleme
                    </label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                          {previewText}
                        </pre>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={previewProductName}
                          onChange={(e) => setPreviewProductName(e.target.value)}
                          className="w-32 px-2 py-1 text-sm border border-gray-200 rounded"
                          placeholder="Ürün adı"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Kategoriler */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriler
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          toggleCategory(key as ProductCategory | "all")
                        }
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          form.categories.includes(key as ProductCategory | "all")
                            ? "bg-brand-blue text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Değişkenler */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Değişkenler
                    </label>
                    <button
                      type="button"
                      onClick={addVariable}
                      className="text-sm text-brand-blue hover:underline"
                    >
                      + Değişken Ekle
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.variables.map((variable, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Değişken {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeVariable(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={variable.key}
                            onChange={(e) =>
                              updateVariable(index, "key", e.target.value)
                            }
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded"
                            placeholder="key"
                          />
                          <input
                            type="text"
                            value={variable.label}
                            onChange={(e) =>
                              updateVariable(index, "label", e.target.value)
                            }
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded"
                            placeholder="Etiket"
                          />
                          <select
                            value={variable.type}
                            onChange={(e) =>
                              updateVariable(index, "type", e.target.value)
                            }
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded"
                          >
                            <option value="auto">Auto</option>
                            <option value="text">Text</option>
                            <option value="select">Select</option>
                          </select>
                        </div>
                        {variable.type === "auto" && (
                          <input
                            type="text"
                            value={variable.autoSource || ""}
                            onChange={(e) =>
                              updateVariable(index, "autoSource", e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
                            placeholder="Auto kaynak (örn: productName)"
                          />
                        )}
                        {variable.type === "text" && (
                          <input
                            type="text"
                            value={variable.defaultValue || ""}
                            onChange={(e) =>
                              updateVariable(
                                index,
                                "defaultValue",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
                            placeholder="Varsayılan değer"
                          />
                        )}
                        {variable.type === "select" && (
                          <input
                            type="text"
                            value={(variable.options || []).join(", ")}
                            onChange={(e) =>
                              updateVariable(
                                index,
                                "options",
                                e.target.value.split(",").map((s) => s.trim())
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
                            placeholder="Seçenekler (virgülle ayır)"
                          />
                        )}
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={variable.required}
                            onChange={(e) =>
                              updateVariable(index, "required", e.target.checked)
                            }
                            className="rounded"
                          />
                          Zorunlu
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ayarlar */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Öncelik
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          priority: parseInt(e.target.value) || 10,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      min={1}
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      Aktif
                    </label>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.isDefault}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            isDefault: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      Varsayılan
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.template}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Şablonu Sil?
            </h3>
            <p className="text-gray-600 mb-4">
              Bu şablon kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
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

      {/* Kullanım Kılavuzu Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Başlık Şablonları Nasıl Kullanılır?
                </h2>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* İçerik */}
              <div className="space-y-6 text-gray-700">
                {/* Ne işe yarar */}
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-mustard/20 rounded-full flex items-center justify-center text-sm">1</span>
                    Bu sayfa ne işe yarar?
                  </h3>
                  <p className="ml-8">
                    Instagram'a fotoğraf paylaşırken altına yazılan metne <strong>"başlık" (caption)</strong> denir.
                    Bu sayfa, sık kullandığın başlıkları şablon olarak kaydetmeni sağlar.
                    Böylece her seferinde aynı şeyi yazmak zorunda kalmazsın.
                  </p>
                </section>

                {/* Örnek */}
                <section className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-blue/20 rounded-full flex items-center justify-center text-sm">?</span>
                    Örnek
                  </h3>
                  <div className="ml-8 space-y-2">
                    <p><strong>Şablon:</strong> <code className="bg-white px-2 py-0.5 rounded text-sm">Sade'den {"{productName}"}</code></p>
                    <p><strong>Ürün adı:</strong> Kestaneli Tart</p>
                    <p><strong>Sonuç:</strong> <span className="text-brand-mustard font-medium">Sade'den Kestaneli Tart</span></p>
                  </div>
                </section>

                {/* Değişkenler */}
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-mustard/20 rounded-full flex items-center justify-center text-sm">2</span>
                    Değişkenler ne demek?
                  </h3>
                  <div className="ml-8 space-y-2">
                    <p>
                      Süslü parantez içinde yazdığın kelimeler <strong>değişken</strong> olur.
                      Paylaşım yaparken bu alanlar otomatik doldurulur.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                      <p><code className="bg-white px-1.5 py-0.5 rounded">{"{productName}"}</code> → Ürün adı (otomatik gelir)</p>
                      <p><code className="bg-white px-1.5 py-0.5 rounded">{"{season}"}</code> → Mevsim (sen seçersin)</p>
                      <p><code className="bg-white px-1.5 py-0.5 rounded">{"{emoji}"}</code> → Emoji (listeden seçersin)</p>
                    </div>
                  </div>
                </section>

                {/* Değişken tipleri */}
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-mustard/20 rounded-full flex items-center justify-center text-sm">3</span>
                    Değişken tipleri
                  </h3>
                  <div className="ml-8 space-y-3">
                    <div className="flex gap-3">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">Auto</span>
                      <p>Sistem otomatik doldurur. Örn: <code className="text-sm">productName</code> fotoğraf yüklerken girdiğin ürün adını alır.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">Text</span>
                      <p>Serbest metin girersin. Örn: malzeme listesi, özel not.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">Select</span>
                      <p>Hazır listeden seçersin. Örn: mevsimler, emojiler.</p>
                    </div>
                  </div>
                </section>

                {/* Kategoriler */}
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-mustard/20 rounded-full flex items-center justify-center text-sm">4</span>
                    Kategoriler ne işe yarar?
                  </h3>
                  <p className="ml-8">
                    Bir şablonun hangi ürün türlerinde görüneceğini belirler.
                    <strong> "Tümü"</strong> seçersen her üründe kullanılabilir.
                    Sadece <strong>"Çikolata"</strong> seçersen, yalnızca çikolata paylaşımlarında bu şablon önerilir.
                  </p>
                </section>

                {/* Varsayılan */}
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-mustard/20 rounded-full flex items-center justify-center text-sm">5</span>
                    "Varsayılan" ne demek?
                  </h3>
                  <p className="ml-8">
                    Fotoğraf yüklerken şablon seçmezsen, varsayılan şablon otomatik kullanılır.
                    Genellikle en sık kullandığın, en basit şablonu varsayılan yaparsın.
                  </p>
                </section>

                {/* Öncelik */}
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-mustard/20 rounded-full flex items-center justify-center text-sm">6</span>
                    "Öncelik" ne işe yarar?
                  </h3>
                  <p className="ml-8">
                    Şablonların sıralama numarası. Küçük numara üstte görünür.
                    En çok kullandıklarına 1-5, nadir kullandıklarına 50+ ver.
                  </p>
                </section>

                {/* Hızlı başlangıç */}
                <section className="bg-brand-mustard/10 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Hızlı Başlangıç
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li><strong>"Yeni Şablon"</strong> butonuna tıkla</li>
                    <li>İsim ver: "Sade Klasik"</li>
                    <li>Şablon yaz: <code className="bg-white px-1.5 py-0.5 rounded">Sade'den {"{productName}"}</code></li>
                    <li><strong>"+ Değişken Ekle"</strong> tıkla</li>
                    <li>Key: <code className="bg-white px-1 rounded">productName</code>, Tip: <code className="bg-white px-1 rounded">Auto</code>, Kaynak: <code className="bg-white px-1 rounded">productName</code></li>
                    <li><strong>"Oluştur"</strong> tıkla - bu kadar!</li>
                  </ol>
                </section>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t flex justify-end">
                <button
                  onClick={() => setShowGuide(false)}
                  className="btn-primary"
                >
                  Anladım
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

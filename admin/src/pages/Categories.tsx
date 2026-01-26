import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type { CategoriesConfig, CategorySubType, DynamicCategory, DynamicCategoryType, EatingMethod } from "../types";

// Yeme şekli seçenekleri
const EATING_METHOD_OPTIONS: { value: EatingMethod; label: string }[] = [
  { value: "hand", label: "Elle" },
  { value: "fork", label: "Çatalla" },
  { value: "fork-knife", label: "Çatal-Bıçakla" },
  { value: "spoon", label: "Kaşıkla" },
  { value: "none", label: "Yenmez/Servis" },
];

export default function Categories() {
  const { startLoading, stopLoading } = useLoading();
  // State
  const [config, setConfig] = useState<CategoriesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seçili kategori
  const [selectedCategory, setSelectedCategory] = useState<DynamicCategoryType | null>(null);

  // Alt kategori modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubType, setEditingSubType] = useState<CategorySubType | null>(null);

  // Ana kategori modal state
  const [isMainCategoryModalOpen, setIsMainCategoryModalOpen] = useState(false);
  const [editingMainCategory, setEditingMainCategory] = useState<DynamicCategory | null>(null);

  // Alt kategori form state
  const [formData, setFormData] = useState({
    slug: "",
    displayName: "",
    icon: "",
    description: "",
    isActive: true,
    eatingMethodDefault: "hand" as EatingMethod,
    canBeHeldDefault: true,
  });

  // Ana kategori form state
  const [mainCategoryForm, setMainCategoryForm] = useState({
    type: "",
    displayName: "",
    icon: "",
    description: "",
  });

  // Kategorileri yükle
  const loadCategories = async () => {
    try {
      setLoading(true);
      startLoading("categories", "Kategoriler yükleniyor...");
      const data = await api.getCategories();
      setConfig(data);
      setError(null);

      // İlk kategoriyi seç
      if (data.categories.length > 0 && !selectedCategory) {
        setSelectedCategory(data.categories[0].type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategoriler yüklenemedi");
    } finally {
      setLoading(false);
      stopLoading("categories");
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Seçili kategoriyi bul
  const currentCategory = config?.categories.find((c) => c.type === selectedCategory);

  // Modal aç (yeni/düzenle)
  const openModal = (subType?: CategorySubType) => {
    if (subType) {
      setEditingSubType(subType);
      setFormData({
        slug: subType.slug,
        displayName: subType.displayName,
        icon: subType.icon || "",
        description: subType.description || "",
        isActive: subType.isActive,
        eatingMethodDefault: subType.eatingMethodDefault || "hand",
        canBeHeldDefault: subType.canBeHeldDefault ?? true,
      });
    } else {
      setEditingSubType(null);
      setFormData({
        slug: "",
        displayName: "",
        icon: "",
        description: "",
        isActive: true,
        eatingMethodDefault: "hand",
        canBeHeldDefault: true,
      });
    }
    setIsModalOpen(true);
  };

  // Modal kapat
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubType(null);
  };

  // Kaydet
  const handleSave = async () => {
    if (!selectedCategory) return;

    if (!formData.displayName.trim()) {
      alert("Görünen ad zorunludur");
      return;
    }

    try {
      if (editingSubType) {
        // Güncelle (slug değiştirilemez)
        await api.updateSubType(selectedCategory, editingSubType.slug, {
          displayName: formData.displayName,
          icon: formData.icon || undefined,
          description: formData.description || undefined,
          isActive: formData.isActive,
          eatingMethodDefault: selectedCategory === "products" ? formData.eatingMethodDefault : undefined,
          canBeHeldDefault: selectedCategory === "products" ? formData.canBeHeldDefault : undefined,
        });
      } else {
        // Yeni oluştur
        if (!formData.slug.trim()) {
          alert("Slug zorunludur");
          return;
        }

        // Slug format kontrolü
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(formData.slug)) {
          alert("Slug sadece küçük harf, rakam ve tire içerebilir");
          return;
        }

        await api.addSubType(selectedCategory, {
          slug: formData.slug.toLowerCase().trim(),
          displayName: formData.displayName,
          icon: formData.icon || undefined,
          description: formData.description || undefined,
          isActive: formData.isActive,
          eatingMethodDefault: selectedCategory === "products" ? formData.eatingMethodDefault : undefined,
          canBeHeldDefault: selectedCategory === "products" ? formData.canBeHeldDefault : undefined,
        });
      }
      closeModal();
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  };

  // Aktif/Pasif toggle
  const handleToggleActive = async (subType: CategorySubType) => {
    if (!selectedCategory) return;

    try {
      if (subType.isActive) {
        await api.deactivateSubType(selectedCategory, subType.slug);
      } else {
        await api.activateSubType(selectedCategory, subType.slug);
      }
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Güncelleme başarısız");
    }
  };

  // Seed kategorileri
  const handleSeed = async () => {
    if (!confirm("Varsayılan kategorileri yüklemek istediğinize emin misiniz? Mevcut kategoriler üzerine yazılacak.")) {
      return;
    }

    try {
      await api.seedCategories();
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Seed başarısız");
    }
  };

  // Ana kategori modal aç (yeni/düzenle)
  const openMainCategoryModal = (category?: DynamicCategory) => {
    if (category) {
      setEditingMainCategory(category);
      setMainCategoryForm({
        type: category.type,
        displayName: category.displayName,
        icon: category.icon,
        description: category.description || "",
      });
    } else {
      setEditingMainCategory(null);
      setMainCategoryForm({
        type: "",
        displayName: "",
        icon: "",
        description: "",
      });
    }
    setIsMainCategoryModalOpen(true);
  };

  // Ana kategori modal kapat
  const closeMainCategoryModal = () => {
    setIsMainCategoryModalOpen(false);
    setEditingMainCategory(null);
  };

  // Ana kategori kaydet
  const handleSaveMainCategory = async () => {
    if (!mainCategoryForm.displayName.trim()) {
      alert("Görünen ad zorunludur");
      return;
    }

    if (!mainCategoryForm.icon.trim()) {
      alert("Icon zorunludur");
      return;
    }

    try {
      if (editingMainCategory) {
        // Güncelle
        await api.updateMainCategory(editingMainCategory.type as DynamicCategoryType, {
          displayName: mainCategoryForm.displayName,
          icon: mainCategoryForm.icon,
          description: mainCategoryForm.description || undefined,
        });
      } else {
        // Yeni oluştur
        if (!mainCategoryForm.type.trim()) {
          alert("Type ID zorunludur");
          return;
        }

        // Type format kontrolü (kebab-case)
        const typeRegex = /^[a-z][a-z0-9-]*$/;
        if (!typeRegex.test(mainCategoryForm.type)) {
          alert("Type ID sadece küçük harf, rakam ve tire içerebilir ve harfle başlamalıdır");
          return;
        }

        await api.addMainCategory({
          type: mainCategoryForm.type.toLowerCase().trim(),
          displayName: mainCategoryForm.displayName,
          icon: mainCategoryForm.icon,
          description: mainCategoryForm.description || undefined,
        });
      }
      closeMainCategoryModal();
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  };

  // Ana kategori sil
  const handleDeleteMainCategory = async (type: DynamicCategoryType) => {
    const category = config?.categories.find((c) => c.type === type);
    if (!category) return;

    // Sistem kategorisi silinemez
    if (category.isSystem) {
      alert("Sistem kategorileri silinemez");
      return;
    }

    // Alt kategorisi varsa uyar
    if (category.subTypes.length > 0) {
      if (!confirm(`Bu kategorinin ${category.subTypes.length} alt kategorisi var. Silmek istediğinize emin misiniz?`)) {
        return;
      }
    } else {
      if (!confirm(`"${category.displayName}" kategorisini silmek istediğinize emin misiniz?`)) {
        return;
      }
    }

    try {
      await api.deleteMainCategory(type);
      if (selectedCategory === type) {
        setSelectedCategory(null);
      }
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme başarısız");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadCategories}
          className="mt-2 text-red-600 underline hover:no-underline"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
          <p className="text-gray-500">Asset kategorilerini ve alt tiplerini yönetin</p>
        </div>
        <button
          onClick={handleSeed}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Varsayılanları Yükle
        </button>
      </div>

      {/* Ana içerik */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sol panel - Kategori listesi */}
        <div className="col-span-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-medium text-gray-900">Ana Kategoriler</h2>
            <button
              onClick={() => openMainCategoryModal()}
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
              title="Yeni Ana Kategori"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {config?.categories.map((category) => (
              <div
                key={category.type}
                className={`group px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  selectedCategory === category.type ? "bg-amber-50 border-r-2 border-amber-600" : ""
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(category.type)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{category.displayName}</div>
                    <div className="text-xs text-gray-500">
                      {category.type}
                      {category.isSystem && (
                        <span className="ml-1 text-amber-600">(sistem)</span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <div className="text-sm font-medium text-gray-900">
                      {category.subTypes.filter((st) => st.isActive).length}
                    </div>
                    <div className="text-xs text-gray-500">aktif</div>
                  </div>
                  {/* Düzenle butonu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openMainCategoryModal(category);
                    }}
                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Düzenle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {/* Sil butonu (sadece sistem olmayan kategoriler için) */}
                  {!category.isSystem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMainCategory(category.type);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Sil"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ panel - Alt kategoriler */}
        <div className="col-span-8 bg-white rounded-lg shadow-sm border border-gray-200">
          {currentCategory ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="font-medium text-gray-900">
                    {currentCategory.icon} {currentCategory.displayName}
                  </h2>
                  <p className="text-sm text-gray-500">{currentCategory.description}</p>
                </div>
                <button
                  onClick={() => openModal()}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                >
                  + Yeni Alt Kategori
                </button>
              </div>

              {/* Alt kategori listesi */}
              <div className="divide-y divide-gray-100">
                {currentCategory.subTypes
                  .sort((a, b) => a.order - b.order)
                  .map((subType) => (
                    <div
                      key={subType.slug}
                      className={`p-4 flex items-center justify-between hover:bg-gray-50 ${
                        !subType.isActive ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{subType.icon || "📦"}</span>
                        <div>
                          <div className="font-medium text-gray-900">{subType.displayName}</div>
                          <div className="text-xs text-gray-500 font-mono">{subType.slug}</div>
                          {subType.description && (
                            <div className="text-xs text-gray-400 mt-1">{subType.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Ürün kategorisi için ek bilgiler */}
                        {selectedCategory === "products" && (
                          <div className="text-xs text-gray-400 mr-4">
                            {subType.eatingMethodDefault && (
                              <span className="mr-2">
                                Yeme: {EATING_METHOD_OPTIONS.find((o) => o.value === subType.eatingMethodDefault)?.label}
                              </span>
                            )}
                            {subType.canBeHeldDefault !== undefined && (
                              <span>{subType.canBeHeldDefault ? "Tutulabilir" : "Tutulamaz"}</span>
                            )}
                          </div>
                        )}

                        {/* Aktif/Pasif toggle */}
                        <button
                          onClick={() => handleToggleActive(subType)}
                          className={`px-3 py-1 text-xs rounded-full ${
                            subType.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {subType.isActive ? "Aktif" : "Pasif"}
                        </button>

                        {/* Düzenle butonu */}
                        <button
                          onClick={() => openModal(subType)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                {currentCategory.subTypes.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <p>Henüz alt kategori yok</p>
                    <button
                      onClick={() => openModal()}
                      className="mt-2 text-amber-600 hover:underline"
                    >
                      İlk alt kategoriyi ekle
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>Bir kategori seçin</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingSubType ? "Alt Kategori Düzenle" : "Yeni Alt Kategori"}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Slug (sadece yeni eklerken) */}
              {!editingSubType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    placeholder="ornek-slug"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Küçük harf, rakam ve tire kullanın. Değiştirilemez.
                  </p>
                </div>
              )}

              {/* DisplayName */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Görünen Ad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Kruvasanlar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🥐"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kategori açıklaması..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Ürün kategorisi için ek alanlar */}
              {selectedCategory === "products" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Varsayılan Yeme Şekli
                    </label>
                    <select
                      value={formData.eatingMethodDefault}
                      onChange={(e) => setFormData({ ...formData, eatingMethodDefault: e.target.value as EatingMethod })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    >
                      {EATING_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="canBeHeld"
                      checked={formData.canBeHeldDefault}
                      onChange={(e) => setFormData({ ...formData, canBeHeldDefault: e.target.checked })}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="canBeHeld" className="text-sm text-gray-700">
                      Elle tutulabilir (el senaryoları için)
                    </label>
                  </div>
                </>
              )}

              {/* isActive */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Aktif
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ana Kategori Modal */}
      {isMainCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingMainCategory ? "Ana Kategori Düzenle" : "Yeni Ana Kategori"}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Type ID (sadece yeni eklerken) */}
              {!editingMainCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={mainCategoryForm.type}
                    onChange={(e) => setMainCategoryForm({ ...mainCategoryForm, type: e.target.value.toLowerCase() })}
                    placeholder="custom-products"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Küçük harf, rakam ve tire kullanın. Değiştirilemez.
                  </p>
                </div>
              )}

              {/* DisplayName */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Görünen Ad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={mainCategoryForm.displayName}
                  onChange={(e) => setMainCategoryForm({ ...mainCategoryForm, displayName: e.target.value })}
                  placeholder="Özel Ürünler"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (emoji) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={mainCategoryForm.icon}
                  onChange={(e) => setMainCategoryForm({ ...mainCategoryForm, icon: e.target.value })}
                  placeholder="🎁"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tek bir emoji girin (örn: 🎁, 🍰, ☕)
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={mainCategoryForm.description}
                  onChange={(e) => setMainCategoryForm({ ...mainCategoryForm, description: e.target.value })}
                  placeholder="Kategori açıklaması..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Sistem kategorisi uyarısı */}
              {editingMainCategory?.isSystem && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    ⚠️ Bu bir sistem kategorisidir. Sadece görünen ad, icon ve açıklama değiştirilebilir.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={closeMainCategoryModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleSaveMainCategory}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useLoading } from "../contexts/LoadingContext";
import type { AIRule, AIRuleCategoryId } from "../types";
import { AI_RULE_CATEGORIES } from "../types";

// Kategori seçenekleri
const CATEGORY_OPTIONS: { value: AIRuleCategoryId; label: string; icon: string }[] = [
  { value: "beverage", label: "İçecek", icon: "☕" },
  { value: "composition", label: "Kompozisyon", icon: "🎨" },
  { value: "lighting", label: "Işık", icon: "💡" },
  { value: "product", label: "Ürün", icon: "🥐" },
  { value: "background", label: "Arka Plan", icon: "🖼️" },
  { value: "hand", label: "El", icon: "✋" },
  { value: "general", label: "Genel", icon: "📋" },
];

export default function AIRules() {
  const { startLoading, stopLoading } = useLoading();
  // State
  const [rules, setRules] = useState<AIRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AIRule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "dont" as "do" | "dont",
    category: "general" as AIRuleCategoryId,
    title: "",
    description: "",
    exampleImageUrl: "",
    isActive: true,
  });

  // Filter state
  const [filterType, setFilterType] = useState<"all" | "do" | "dont">("all");
  const [filterCategory, setFilterCategory] = useState<"all" | AIRuleCategoryId>("all");

  // Kuralları yükle
  const loadRules = async () => {
    try {
      setLoading(true);
      startLoading("airules", "AI Kuralları yükleniyor...");
      const data = await api.listAIRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kurallar yüklenemedi");
    } finally {
      setLoading(false);
      stopLoading("airules");
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // Modal aç (yeni/düzenle)
  const openModal = (rule?: AIRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        type: rule.type,
        category: rule.category,
        title: rule.title,
        description: rule.description,
        exampleImageUrl: rule.exampleImageUrl || "",
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setFormData({
        type: "dont",
        category: "general",
        title: "",
        description: "",
        exampleImageUrl: "",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  // Modal kapat
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  // Kaydet
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Başlık zorunludur");
      return;
    }

    try {
      if (editingRule) {
        // Güncelle
        await api.updateAIRule(editingRule.id, {
          type: formData.type,
          category: formData.category,
          title: formData.title,
          description: formData.description,
          exampleImageUrl: formData.exampleImageUrl || undefined,
          isActive: formData.isActive,
        });
      } else {
        // Yeni oluştur
        await api.createAIRule({
          type: formData.type,
          category: formData.category,
          title: formData.title,
          description: formData.description,
          exampleImageUrl: formData.exampleImageUrl || undefined,
          isActive: formData.isActive,
        });
      }
      closeModal();
      loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  };

  // Sil
  const handleDelete = async (rule: AIRule) => {
    if (!confirm(`"${rule.title}" kuralını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await api.deleteAIRule(rule.id);
      loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme başarısız");
    }
  };

  // Aktif/Pasif toggle
  const handleToggleActive = async (rule: AIRule) => {
    try {
      await api.updateAIRule(rule.id, { isActive: !rule.isActive });
      loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Güncelleme başarısız");
    }
  };

  // Filtrelenmiş kurallar
  const filteredRules = rules.filter((rule) => {
    if (filterType !== "all" && rule.type !== filterType) return false;
    if (filterCategory !== "all" && rule.category !== filterCategory) return false;
    return true;
  });

  // Yapılacak ve yapılmayacak ayır
  const dontRules = filteredRules.filter((r) => r.type === "dont");
  const doRules = filteredRules.filter((r) => r.type === "do");

  // İstatistikler
  const stats = {
    total: rules.length,
    active: rules.filter((r) => r.isActive).length,
    dont: rules.filter((r) => r.type === "dont").length,
    do: rules.filter((r) => r.type === "do").length,
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Kuralları</h1>
          <p className="text-gray-500 mt-1">
            Claude'a öğrettiğin yapılacak ve yapılmayacak kurallar
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <span>+</span>
          <span>Yeni Kural</span>
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500">Toplam Kural</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-500">Aktif</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">{stats.dont}</div>
          <div className="text-sm text-gray-500">Yapılmayacak</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.do}</div>
          <div className="text-sm text-gray-500">Yapılacak</div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "all" | "do" | "dont")}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="all">Tüm Tipler</option>
          <option value="dont">🚫 Yapılmayacak</option>
          <option value="do">✅ Yapılacak</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as "all" | AIRuleCategoryId)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="all">Tüm Kategoriler</option>
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Kurallar - İki Sütun */}
      <div className="grid grid-cols-2 gap-6">
        {/* Yapılmayacaklar */}
        <div>
          <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
            🚫 Yapılmayacaklar
            <span className="text-sm font-normal text-gray-500">({dontRules.length})</span>
          </h2>
          <div className="space-y-3">
            {dontRules.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-gray-50 rounded-lg">
                Henüz kural yok
              </div>
            ) : (
              dontRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => openModal(rule)}
                  onDelete={() => handleDelete(rule)}
                  onToggleActive={() => handleToggleActive(rule)}
                />
              ))
            )}
          </div>
        </div>

        {/* Yapılacaklar */}
        <div>
          <h2 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
            ✅ Yapılacaklar
            <span className="text-sm font-normal text-gray-500">({doRules.length})</span>
          </h2>
          <div className="space-y-3">
            {doRules.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-gray-50 rounded-lg">
                Henüz kural yok
              </div>
            ) : (
              doRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => openModal(rule)}
                  onDelete={() => handleDelete(rule)}
                  onToggleActive={() => handleToggleActive(rule)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingRule ? "Kural Düzenle" : "Yeni Kural"}
            </h3>

            {/* Tip Seçimi */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kural Tipi
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="dont"
                    checked={formData.type === "dont"}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "do" | "dont" })}
                    className="text-red-500"
                  />
                  <span className="text-red-600">🚫 Yapılmayacak</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="do"
                    checked={formData.type === "do"}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "do" | "dont" })}
                    className="text-green-500"
                  />
                  <span className="text-green-600">✅ Yapılacak</span>
                </label>
              </div>
            </div>

            {/* Kategori */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as AIRuleCategoryId })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Başlık */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlık *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Örn: Bardak boş olmamalı"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            {/* Açıklama */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detaylı Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Claude'un anlayacağı şekilde detaylı açıklama..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            {/* Örnek Görsel URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Örnek Görsel URL (opsiyonel)
              </label>
              <input
                type="url"
                value={formData.exampleImageUrl}
                onChange={(e) => setFormData({ ...formData, exampleImageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            {/* Aktif */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Aktif (Claude bu kuralı uygulasın)</span>
              </label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                {editingRule ? "Güncelle" : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Kural Kartı Bileşeni
function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  rule: AIRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const categoryInfo = AI_RULE_CATEGORIES[rule.category];

  return (
    <div
      className={`bg-white rounded-lg border p-4 ${
        rule.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryInfo.icon}</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {categoryInfo.label}
          </span>
          {!rule.isActive && (
            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
              Pasif
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggleActive}
            className={`p-1.5 rounded hover:bg-gray-100 ${
              rule.isActive ? "text-green-600" : "text-gray-400"
            }`}
            title={rule.isActive ? "Pasif yap" : "Aktif yap"}
          >
            {rule.isActive ? "✓" : "○"}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            title="Düzenle"
          >
            ✎
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-red-500"
            title="Sil"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Başlık */}
      <h4 className="font-medium text-gray-800 mb-1">{rule.title}</h4>

      {/* Açıklama */}
      {rule.description && (
        <p className="text-sm text-gray-500">{rule.description}</p>
      )}

      {/* Örnek Görsel */}
      {rule.exampleImageUrl && (
        <div className="mt-2">
          <img
            src={rule.exampleImageUrl}
            alt="Örnek"
            className="w-full h-24 object-cover rounded"
          />
        </div>
      )}
    </div>
  );
}

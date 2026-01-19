import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { TimeSlotRule, OrchestratorProductType } from "../types";

// Gün isimleri
const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

// Ürün tipi etiketleri
const PRODUCT_LABELS: Record<OrchestratorProductType, string> = {
  croissants: "Kruvasan",
  pastas: "Pasta",
  chocolates: "Çikolata",
  macarons: "Makaron",
  coffees: "Kahve",
};


export default function TimeSlots() {
  const [rules, setRules] = useState<TimeSlotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeSlotRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTimeSlotRules();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kuralı silmek istediğinizden emin misiniz?")) return;
    try {
      await api.deleteTimeSlotRule(id);
      loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme hatası");
    }
  };

  const handleToggleActive = async (rule: TimeSlotRule) => {
    try {
      await api.updateTimeSlotRule(rule.id, { isActive: !rule.isActive });
      loadRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Güncelleme hatası");
    }
  };

  const handleTrigger = async (ruleId: string) => {
    try {
      const slotId = await api.triggerOrchestratorPipeline(ruleId);
      alert(`Pipeline başlatıldı! Slot ID: ${slotId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Hata oluştu");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zaman Kuralları</h1>
          <p className="text-gray-500 mt-1">Otomatik içerik üretim zamanlaması</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + Yeni Kural
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
          <button onClick={loadRules} className="btn-secondary mt-4">
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Kurallar Listesi */}
      {!loading && !error && (
        <>
          {rules.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">Henüz kural yok</p>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                İlk Kuralı Ekle
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => setEditingRule(rule)}
                  onDelete={() => handleDelete(rule.id)}
                  onToggle={() => handleToggleActive(rule)}
                  onTrigger={() => handleTrigger(rule.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingRule) && (
        <RuleModal
          rule={editingRule}
          onClose={() => {
            setShowAddModal(false);
            setEditingRule(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingRule(null);
            loadRules();
          }}
        />
      )}
    </div>
  );
}

// Kural kartı
function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onTrigger,
}: {
  rule: TimeSlotRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTrigger: () => void;
}) {
  const formatTime = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

  return (
    <div className={`card ${!rule.isActive ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Zaman Aralığı */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatTime(rule.startHour)} - {formatTime(rule.endHour)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {rule.isActive ? "Aktif" : "Pasif"}
            </span>
            <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-xs rounded-full">
              Öncelik: {rule.priority}
            </span>
          </div>

          {/* Günler */}
          <div className="flex gap-1 mb-3">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <span
                key={day}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                  rule.daysOfWeek.includes(day)
                    ? "bg-brand-blue text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
                title={DAY_NAMES[day]}
              >
                {DAY_NAMES[day].charAt(0)}
              </span>
            ))}
          </div>

          {/* Ürün Tipleri */}
          <div className="flex flex-wrap gap-2 mb-2">
            {rule.productTypes.map((pt) => (
              <span
                key={pt}
                className="px-3 py-1 bg-brand-mustard/20 text-amber-800 text-sm rounded-full"
              >
                {PRODUCT_LABELS[pt]}
              </span>
            ))}
          </div>

          {/* Eşleştirme */}
          {rule.allowPairing && rule.pairingWith && (
            <p className="text-sm text-gray-500">
              + Eşleştirme: {rule.pairingWith.map((p) => PRODUCT_LABELS[p]).join(", ")}
            </p>
          )}
        </div>

        {/* Aksiyonlar */}
        <div className="flex flex-col gap-2 min-w-[100px]">
          <div className="relative group">
            <button
              onClick={onTrigger}
              className="btn-primary text-sm py-1.5 w-full"
            >
              Şimdi Üret
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Bu kuralla hemen içerik üretir
            </div>
          </div>
          <button
            onClick={onToggle}
            className="btn-secondary text-sm py-1.5"
            title={rule.isActive ? "Kuralı devre dışı bırak" : "Kuralı etkinleştir"}
          >
            {rule.isActive ? "Durdur" : "Başlat"}
          </button>
          <button
            onClick={onEdit}
            className="text-gray-500 hover:text-gray-700 text-sm"
            title="Kuralı düzenle"
          >
            Düzenle
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-sm"
            title="Kuralı kalıcı olarak sil"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

// Kural Modal
function RuleModal({
  rule,
  onClose,
  onSuccess,
}: {
  rule: TimeSlotRule | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [startHour, setStartHour] = useState(rule?.startHour || 7);
  const [endHour, setEndHour] = useState(rule?.endHour || 11);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(rule?.daysOfWeek || [1, 2, 3, 4, 5]);
  const [productTypes, setProductTypes] = useState<OrchestratorProductType[]>(
    rule?.productTypes || ["croissants"]
  );
  const [priority, setPriority] = useState(rule?.priority || 10);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const toggleProductType = (pt: OrchestratorProductType) => {
    setProductTypes((prev) =>
      prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productTypes.length === 0) {
      alert("En az bir ürün tipi seçmelisiniz");
      return;
    }
    if (daysOfWeek.length === 0) {
      alert("En az bir gün seçmelisiniz");
      return;
    }

    setSaving(true);
    try {
      const data = {
        startHour,
        endHour,
        daysOfWeek,
        productTypes,
        priority,
      };

      if (rule) {
        await api.updateTimeSlotRule(rule.id, data);
      } else {
        await api.createTimeSlotRule(data);
      }
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {rule ? "Kuralı Düzenle" : "Yeni Kural Ekle"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Zaman Aralığı */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Saati
              </label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="input w-full"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Saati
              </label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="input w-full"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
          </div>

          {/* Günler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Günler
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors ${
                    daysOfWeek.includes(day)
                      ? "bg-brand-blue text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {DAY_NAMES[day].charAt(0)}
                </button>
              ))}
            </div>
          </div>

          {/* Ürün Tipleri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ürün Tipleri
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRODUCT_LABELS) as OrchestratorProductType[]).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => toggleProductType(pt)}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                    productTypes.includes(pt)
                      ? "bg-brand-mustard text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {PRODUCT_LABELS[pt]}
                </button>
              ))}
            </div>
          </div>

          {/* Öncelik */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Öncelik (düşük = yüksek öncelik)
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={1}
              max={100}
              className="input w-full"
            />
          </div>

          {/* Butonlar */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

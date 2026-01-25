import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";
import type { TimeSlotRule, Theme, CategorySubType } from "../types";
import { Tooltip } from "../components/Tooltip";
import { SetupStepper } from "../components/SetupStepper";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageTour } from "../components/PageTour";
import type { TourStep } from "../components/PageTour";

// Ürün konfigürasyonu tipi (dinamik kategorilerden oluşturulur)
interface ProductConfig {
  label: string;
  emoji: string;
}

// TimeSlots sayfası tour adımları
const TIMESLOTS_TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='timeslots-header']",
    title: "Otomatik Paylaşım",
    content: "Bu sayfa, içeriklerin hangi saatlerde otomatik üretileceğini belirler. Her zaman dilimi bir üretim tetikler.",
    position: "bottom",
  },
  {
    target: "[data-tour='timeslots-add']",
    title: "Yeni Zaman Dilimi",
    content: "Buradan yeni bir otomatik paylaşım zamanı ekleyebilirsiniz. Sistem, belirlediğiniz aralıkta en optimal saati seçer.",
    position: "left",
  },
  {
    target: "[data-tour='timeslots-list']",
    title: "Aktif Kurallar",
    content: "Mevcut zaman dilimleriniz burada listelenir. Her biri için tema, ürün tipi ve aktiflik durumu görünür.",
    position: "top",
  },
];

// Gün isimleri
const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DAY_NAMES_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

// Varsayılan ürün konfigürasyonu (API yüklenene kadar fallback)
const DEFAULT_PRODUCT_CONFIG: Record<string, ProductConfig> = {
  croissants: { label: "Kruvasan", emoji: "🥐" },
  pastas: { label: "Pasta", emoji: "🍰" },
  chocolates: { label: "Çikolata", emoji: "🍫" },
  coffees: { label: "Kahve", emoji: "☕" },
};

// Zaman dilimi isimleri
const getTimeSlotName = (startHour: number): string => {
  if (startHour >= 6 && startHour < 11) return "Sabah";
  if (startHour >= 11 && startHour < 14) return "Öğle";
  if (startHour >= 14 && startHour < 17) return "Öğleden Sonra";
  if (startHour >= 17 && startHour < 21) return "Akşam";
  return "Gece";
};

// TimeScore verileri (backend ile senkron - araştırma verilerine dayalı)
const DAY_HOUR_SCORES: Record<number, Record<number, number>> = {
  0: { 7: 35, 8: 40, 9: 45, 10: 50, 11: 55, 12: 55, 13: 55, 14: 65, 15: 70, 16: 80, 17: 75, 18: 65 },
  1: { 7: 45, 8: 55, 9: 60, 10: 65, 11: 70, 12: 72, 13: 82, 14: 80, 15: 88, 16: 90, 17: 90, 18: 85 },
  2: { 7: 70, 8: 65, 9: 70, 10: 75, 11: 88, 12: 90, 13: 88, 14: 90, 15: 95, 16: 95, 17: 92, 18: 85 },
  3: { 7: 50, 8: 60, 9: 65, 10: 72, 11: 85, 12: 88, 13: 85, 14: 90, 15: 92, 16: 88, 17: 85, 18: 80 },
  4: { 7: 50, 8: 58, 9: 65, 10: 72, 11: 85, 12: 85, 13: 82, 14: 88, 15: 90, 16: 88, 17: 95, 18: 92 },
  5: { 7: 45, 8: 55, 9: 62, 10: 75, 11: 80, 12: 82, 13: 80, 14: 85, 15: 88, 16: 85, 17: 78, 18: 65 },
  6: { 7: 35, 8: 42, 9: 48, 10: 58, 11: 62, 12: 65, 13: 62, 14: 68, 15: 70, 16: 68, 17: 65, 18: 72 },
};

// En iyi saati hesapla
const findBestHourInRange = (startHour: number, endHour: number, dayOfWeek: number): { hour: number; score: number } => {
  let bestHour = startHour;
  let bestScore = 0;

  const dayScores = DAY_HOUR_SCORES[dayOfWeek] || {};

  for (let hour = startHour; hour < endHour; hour++) {
    const score = dayScores[hour] || 50;
    if (score > bestScore) {
      bestScore = score;
      bestHour = hour;
    }
  }

  return { hour: bestHour, score: bestScore };
};

// Skor rengini belirle
const getScoreColor = (score: number): string => {
  if (score >= 85) return "text-green-600 bg-green-50";
  if (score >= 70) return "text-blue-600 bg-blue-50";
  if (score >= 50) return "text-amber-600 bg-amber-50";
  return "text-gray-600 bg-gray-50";
};

// Scheduled slots tipi
interface ScheduledSlot {
  id: string;
  timeSlotRuleId: string;
  scheduledTime: number;
  status: string;
  createdAt: number;
}

export default function TimeSlots() {
  const [rules, setRules] = useState<TimeSlotRule[]>([]);
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [productCategories, setProductCategories] = useState<CategorySubType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<TimeSlotRule | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date().getDay();

  // Dinamik kategorilerden PRODUCT_CONFIG oluştur
  const PRODUCT_CONFIG = useMemo(() => {
    if (productCategories.length === 0) {
      return DEFAULT_PRODUCT_CONFIG;
    }

    const config: Record<string, ProductConfig> = {};
    productCategories.forEach((cat) => {
      config[cat.slug] = {
        label: cat.displayName,
        emoji: cat.icon || "📦",
      };
    });

    // Bilinen kategorileri de ekle (fallback için)
    Object.entries(DEFAULT_PRODUCT_CONFIG).forEach(([slug, data]) => {
      if (!config[slug]) {
        config[slug] = data;
      }
    });

    return config;
  }, [productCategories]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesData, slotsData, themesData, categoriesData] = await Promise.all([
        api.listTimeSlotRules(),
        api.listScheduledSlots({ limit: 50 }).catch(() => []),
        api.listThemes().catch(() => []),
        // Ürün kategorilerini çek
        api.getCategoryByType("products")
          .then((cat) => cat?.subTypes.filter((st) => st.isActive) || [])
          .catch(() => []),
      ]);
      setRules(rulesData);
      setSlots(slotsData);
      setThemes(themesData);
      setProductCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Silme onay modalını aç
  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  // Gerçek silme işlemi
  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await api.deleteTimeSlotRule(confirmDeleteId);
      loadData();
      setConfirmDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silme hatası");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (rule: TimeSlotRule) => {
    try {
      await api.updateTimeSlotRule(rule.id, { isActive: !rule.isActive });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Güncelleme hatası");
    }
  };

  const handleTrigger = async (ruleId: string) => {
    if (!confirm("Bu kural için şimdi içerik üretilsin mi?")) return;
    try {
      await api.triggerOrchestratorPipeline(ruleId);
      alert(`İçerik üretimi başlatıldı!\n\nTelegram'dan onay bildirimi bekleyin.`);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Hata oluştu");
    }
  };

  // Kural için son slot'u bul
  const getLastSlotForRule = (ruleId: string): ScheduledSlot | undefined => {
    return slots
      .filter(s => s.timeSlotRuleId === ruleId)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
  };

  return (
    <div className="space-y-6">
      {/* Setup Stepper */}
      <SetupStepper />

      {/* Page Tour */}
      <PageTour tourId="timeslots-page" steps={TIMESLOTS_TOUR_STEPS} />

      {/* Header */}
      <div className="flex justify-between items-start" data-tour="timeslots-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Otomatik Paylaşım Zamanları</h1>
          <p className="text-gray-500 mt-1">
            Her zaman dilimi için en uygun saatte otomatik içerik üretilir
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary" data-tour="timeslots-add">
          + Yeni Zaman Dilimi
        </button>
      </div>

      {/* Bilgi Kartı */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-medium text-gray-800">Nasıl Çalışır?</p>
            <p className="text-sm text-gray-600 mt-1">
              Belirlediğiniz saat aralığında, Instagram etkileşim verilerine göre <strong>en optimal saatte</strong> otomatik içerik üretilir ve Telegram'dan onayınıza sunulur.
            </p>
          </div>
        </div>
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
          <button onClick={loadData} className="btn-secondary mt-4">
            Tekrar Dene
          </button>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700"}`}
            title="Grid Görünüm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700"}`}
            title="Liste Görünüm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Kurallar Listesi */}
      {!loading && !error && (
        <div data-tour="timeslots-list">
          {rules.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <span className="text-4xl">📅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Henüz Otomatik Paylaşım Zamanı Yok
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Zaman dilimleri, Instagram içeriklerinizin hangi gün ve saatlerde
                otomatik üretileceğini belirler.
              </p>

              {/* Nasıl Çalışır */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 max-w-lg mx-auto text-left">
                <p className="font-medium text-gray-800 mb-3">Nasıl Çalışır?</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Bir saat aralığı belirlersiniz (örn: 08:00 - 11:00)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Sistem, Instagram verilerine göre en optimal saati seçer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>O saatte AI görsel üretir ve Telegram'dan onayınızı bekler</span>
                  </li>
                </ul>
              </div>

              {/* Örnek Kullanımlar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 max-w-2xl mx-auto text-left">
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="font-medium text-amber-800 text-sm">☀️ Sabah</p>
                  <p className="text-xs text-amber-600 mt-1">07:00-10:00 arası</p>
                  <p className="text-xs text-gray-500 mt-1">Kahvaltı, kruvasan</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl">
                  <p className="font-medium text-orange-800 text-sm">🌤️ Öğle</p>
                  <p className="text-xs text-orange-600 mt-1">11:00-14:00 arası</p>
                  <p className="text-xs text-gray-500 mt-1">Pasta, tatlılar</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <p className="font-medium text-purple-800 text-sm">🌙 Akşam</p>
                  <p className="text-xs text-purple-600 mt-1">17:00-20:00 arası</p>
                  <p className="text-xs text-gray-500 mt-1">Çikolata, hediyeler</p>
                </div>
              </div>

              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                İlk Zaman Dilimini Ekle
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-4">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  today={today}
                  lastSlot={getLastSlotForRule(rule.id)}
                  productConfig={PRODUCT_CONFIG}
                  onEdit={() => setEditingRule(rule)}
                  onDelete={() => handleDelete(rule.id)}
                  onToggle={() => handleToggleActive(rule)}
                  onTrigger={() => handleTrigger(rule.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zaman Dilimi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saat Aralığı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Günler</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Tipleri</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {getTimeSlotName(rule.startHour)} Paylaşımı
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {String(rule.startHour).padStart(2, '0')}:00 - {String(rule.endHour).padStart(2, '0')}:00
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {rule.daysOfWeek.map((day) => (
                              <span key={day} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600" title={DAY_NAMES[day]}>
                                {DAY_NAMES_SHORT[day][0]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {rule.productTypes.map(pt => (
                              <span key={pt} className="text-xl" title={PRODUCT_CONFIG[pt]?.label || pt}>{PRODUCT_CONFIG[pt]?.emoji || "📦"}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {rule.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleTrigger(rule.id)} className="text-blue-600 hover:text-blue-900 mr-3" title="Şimdi Çalıştır">▶</button>
                          <button onClick={() => setEditingRule(rule)} className="text-indigo-600 hover:text-indigo-900 mr-3">Düzenle</button>
                          <button onClick={() => handleDelete(rule.id)} className="text-red-600 hover:text-red-900">Sil</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingRule) && (
        <RuleModal
          rule={editingRule}
          themes={themes}
          productConfig={PRODUCT_CONFIG}
          productCategories={productCategories}
          onClose={() => {
            setShowAddModal(false);
            setEditingRule(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingRule(null);
            loadData();
          }}
        />
      )}

      {/* Silme Onay Modal */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Zaman Dilimi Silinecek"
        description={(() => {
          const rule = rules.find(r => r.id === confirmDeleteId);
          if (!rule) return "Bu zaman dilimini silmek istediğinize emin misiniz?";
          return `${rule.startHour}:00 - ${rule.endHour}:00 arası zaman dilimini silmek istediğinize emin misiniz?`;
        })()}
        consequences={[
          "Bu zaman dilimi için otomatik üretim duracaktır",
          "Bekleyen üretimler iptal edilecektir",
          "Bu işlem geri alınamaz",
        ]}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}

// Kural kartı - İyileştirilmiş versiyon
function RuleCard({
  rule,
  today,
  lastSlot,
  productConfig,
  onEdit,
  onDelete,
  onToggle,
  onTrigger,
}: {
  rule: TimeSlotRule;
  today: number;
  lastSlot?: ScheduledSlot;
  productConfig: Record<string, ProductConfig>;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTrigger: () => void;
}) {
  const formatTime = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
  const timeSlotName = getTimeSlotName(rule.startHour);
  const mainProduct = rule.productTypes[0];
  const mainProductConfig = productConfig[mainProduct];

  // Bugün için en iyi saati hesapla
  const bestTime = findBestHourInRange(rule.startHour, rule.endHour, today);
  const scoreColorClass = getScoreColor(bestTime.score);

  // Sonraki çalışma günü
  const getNextActiveDay = (): { dayIndex: number; dayName: string } => {
    for (let i = 0; i <= 7; i++) {
      const checkDay = (today + i) % 7;
      if (rule.daysOfWeek.includes(checkDay)) {
        return {
          dayIndex: checkDay,
          dayName: i === 0 ? "Bugün" : i === 1 ? "Yarın" : DAY_NAMES[checkDay],
        };
      }
    }
    return { dayIndex: today, dayName: "Bugün" };
  };

  const nextActive = getNextActiveDay();
  const nextBestTime = findBestHourInRange(rule.startHour, rule.endHour, nextActive.dayIndex);

  // Son paylaşım zamanı
  const formatLastSlot = (): string => {
    if (!lastSlot) return "Henüz çalışmadı";
    const date = new Date(lastSlot.scheduledTime);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `Bugün ${formatTime(date.getHours())}`;
    if (diffDays === 1) return `Dün ${formatTime(date.getHours())}`;
    return `${diffDays} gün önce`;
  };

  return (
    <div className={`card overflow-hidden ${!rule.isActive ? "opacity-60 bg-gray-50" : ""}`}>
      {/* Üst Bölüm - Başlık ve Durum */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mainProductConfig?.emoji || "📦"}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-900">
              {timeSlotName} Paylaşımı
            </h3>
            <p className="text-sm text-gray-500">
              {formatTime(rule.startHour)} - {formatTime(rule.endHour)} arası
            </p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${rule.isActive
          ? "bg-green-100 text-green-700"
          : "bg-gray-200 text-gray-600"
          }`}>
          {rule.isActive ? "✓ Otomatik Aktif" : "Duraklatıldı"}
        </div>
      </div>

      {/* Orta Bölüm - Detaylar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* En İyi Saat */}
        <div className={`rounded-xl p-3 ${scoreColorClass}`}>
          <div className="text-xs font-medium opacity-70 mb-1">🎯 En İyi Saat (Bugün)</div>
          <div className="text-xl font-bold">{formatTime(bestTime.hour)}</div>
          <div className="text-xs mt-1">Skor: {bestTime.score}/100</div>
        </div>

        {/* Sonraki Paylaşım */}
        <div className="rounded-xl p-3 bg-purple-50 text-purple-700">
          <div className="text-xs font-medium opacity-70 mb-1">📅 Sonraki Paylaşım</div>
          <div className="text-xl font-bold">{nextActive.dayName}</div>
          <div className="text-xs mt-1">~{formatTime(nextBestTime.hour)} civarı</div>
        </div>

        {/* Son Çalışma */}
        <div className="rounded-xl p-3 bg-gray-100 text-gray-700">
          <div className="text-xs font-medium opacity-70 mb-1">⏱️ Son Çalışma</div>
          <div className="text-lg font-bold">{formatLastSlot()}</div>
          {lastSlot && (
            <div className="text-xs mt-1">
              {lastSlot.status === "completed" ? "✓ Başarılı" :
                lastSlot.status === "failed" ? "✗ Başarısız" :
                  lastSlot.status === "awaiting_approval" ? "⏳ Onay bekliyor" :
                    lastSlot.status}
            </div>
          )}
        </div>
      </div>

      {/* Alt Bölüm - Günler ve Ürünler */}
      <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-gray-100">
        {/* Günler */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">Günler:</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <span
                key={day}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${rule.daysOfWeek.includes(day)
                  ? day === today
                    ? "bg-brand-blue text-white ring-2 ring-brand-blue/30"
                    : "bg-brand-blue/80 text-white"
                  : "bg-gray-100 text-gray-400"
                  }`}
                title={DAY_NAMES[day]}
              >
                {DAY_NAMES_SHORT[day].charAt(0)}
              </span>
            ))}
          </div>
        </div>

        {/* Ürün Tipleri */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">Ürünler:</span>
          <div className="flex flex-wrap gap-1">
            {rule.productTypes.map((pt) => (
              <span
                key={pt}
                className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium"
              >
                {productConfig[pt]?.emoji || "📦"} {productConfig[pt]?.label || pt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onTrigger}
          disabled={!rule.isActive}
          className="px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-medium hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>▶</span> Şimdi Üret
        </button>
        <button
          onClick={onToggle}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${rule.isActive
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
            : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
        >
          {rule.isActive ? "⏸ Duraklat" : "▶ Başlat"}
        </button>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          ✏️ Düzenle
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
        >
          🗑️ Sil
        </button>
      </div>
    </div>
  );
}

// Kural Modal - İyileştirilmiş versiyon
function RuleModal({
  rule,
  themes,
  productConfig,
  productCategories,
  onClose,
  onSuccess,
}: {
  rule: TimeSlotRule | null;
  themes: Theme[];
  productConfig: Record<string, ProductConfig>;
  productCategories: CategorySubType[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [startHour, setStartHour] = useState(rule?.startHour || 7);
  const [endHour, setEndHour] = useState(rule?.endHour || 11);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(rule?.daysOfWeek || [1, 2, 3, 4, 5]);
  const [productTypes, setProductTypes] = useState<string[]>(
    rule?.productTypes || ["croissants"]
  );
  // Tema kullanım state'leri
  const [useTheme, setUseTheme] = useState<boolean>(!!rule?.themeId);
  const [themeId, setThemeId] = useState<string>(rule?.themeId || "");
  const [saving, setSaving] = useState(false);
  // Tema uyarısı için state
  const [showThemeWarning, setShowThemeWarning] = useState(false);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const toggleProductType = (pt: string) => {
    setProductTypes((prev) =>
      prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt]
    );
  };

  // Görüntülenecek ürün kategorileri: dinamik kategoriler veya fallback
  const availableProducts = useMemo(() => {
    if (productCategories.length > 0) {
      return productCategories.map((cat) => ({
        slug: cat.slug,
        label: cat.displayName,
        emoji: cat.icon || "📦",
      }));
    }
    // Fallback - varsayılan kategoriler
    return Object.entries(productConfig).map(([slug, cfg]) => ({
      slug,
      label: cfg.label,
      emoji: cfg.emoji,
    }));
  }, [productCategories, productConfig]);

  // Tema seçilmediğinde uyarı gösterip kullanıcıya karar aldıran fonksiyon
  const handleSubmit = async (e: React.FormEvent, skipThemeWarning = false) => {
    e.preventDefault();
    if (productTypes.length === 0) {
      alert("En az bir ürün tipi seçmelisiniz");
      return;
    }
    if (daysOfWeek.length === 0) {
      alert("En az bir gün seçmelisiniz");
      return;
    }
    if (endHour <= startHour) {
      alert("Bitiş saati başlangıç saatinden büyük olmalıdır");
      return;
    }

    // Tema seçilmemiş ve henüz uyarı gösterilmediyse uyarı göster
    const hasNoTheme = !useTheme || (useTheme && !themeId);
    if (hasNoTheme && !skipThemeWarning) {
      setShowThemeWarning(true);
      return;
    }

    await doSave();
  };

  // Gerçek kaydetme işlemi
  const doSave = async () => {
    setSaving(true);
    try {
      const data: Partial<TimeSlotRule> = {
        startHour,
        endHour,
        daysOfWeek,
        productTypes,
        priority: 10,
      };

      // Tema kullan seçildiyse ve tema seçildiyse ekle
      if (useTheme && themeId) {
        data.themeId = themeId;
      } else {
        // Tema kullanılmıyorsa themeId'yi temizle
        data.themeId = undefined;
      }

      if (rule) {
        await api.updateTimeSlotRule(rule.id, data);
      } else {
        await api.createTimeSlotRule(data as Omit<TimeSlotRule, "id" | "isActive">);
      }
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  };

  // Seçili saat aralığı için önizleme
  const today = new Date().getDay();
  const previewBestTime = findBestHourInRange(startHour, endHour, today);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">
          {rule ? "Zaman Dilimini Düzenle" : "Yeni Zaman Dilimi Ekle"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Belirlediğiniz aralıkta en optimal saatte otomatik içerik üretilir
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Zaman Aralığı */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              ⏰ Saat Aralığı
              <Tooltip
                content="Sistem bu aralıkta Instagram verilerine göre en optimal saati seçer. Geniş aralık = daha iyi optimizasyon."
                position="right"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
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
                <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
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
            {/* Önizleme */}
            {endHour > startHour && (
              <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm">
                <span className="text-blue-700">
                  💡 Bu aralıkta bugün için en iyi saat: <strong>{String(previewBestTime.hour).padStart(2, "0")}:00</strong> (skor: {previewBestTime.score})
                </span>
              </div>
            )}
          </div>

          {/* Günler */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              📅 Hangi Günler Çalışsın?
              <Tooltip
                content="Seçili günlerde otomatik içerik üretimi yapılır. Hafta içi ve hafta sonu için farklı etkileşim oranları vardır."
                position="right"
              />
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${daysOfWeek.includes(day)
                    ? "bg-brand-blue text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  <div className="text-xs opacity-70">{DAY_NAMES_SHORT[day]}</div>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}
                className="text-xs text-brand-blue hover:underline"
              >
                Hafta içi
              </button>
              <button
                type="button"
                onClick={() => setDaysOfWeek([0, 6])}
                className="text-xs text-brand-blue hover:underline"
              >
                Hafta sonu
              </button>
              <button
                type="button"
                onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}
                className="text-xs text-brand-blue hover:underline"
              >
                Her gün
              </button>
            </div>
          </div>

          {/* Ürün Tipleri */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              📦 Hangi Ürünler İçin?
              <Tooltip
                content="Bu zaman diliminde hangi ürün kategorilerinden seçim yapılsın? Birden fazla seçerseniz sistem rastgele birini seçer."
                position="right"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableProducts.map((product) => (
                <button
                  key={product.slug}
                  type="button"
                  onClick={() => toggleProductType(product.slug)}
                  className={`p-3 rounded-xl text-sm transition-all flex items-center gap-2 ${productTypes.includes(product.slug)
                    ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  <span className="text-xl">{product.emoji}</span>
                  <span className="font-medium">{product.label}</span>
                </button>
              ))}
            </div>
            {availableProducts.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Ürün kategorileri yükleniyor...
              </p>
            )}
          </div>

          {/* Tema Kullanımı */}
          {themes.length > 0 && (
            <div className="space-y-3">
              {/* Tema Kullan Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTheme}
                  onChange={(e) => {
                    setUseTheme(e.target.checked);
                    if (!e.target.checked) {
                      setThemeId("");
                    }
                  }}
                  className="w-5 h-5 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                />
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  🎨 Tema Kullan
                  <Tooltip
                    content="Tema, belirli senaryolar ve asset'leri gruplar. Tutarlı görsel kimlik için önerilir."
                    position="right"
                  />
                </span>
              </label>

              {/* Tema Dropdown - Sadece checkbox işaretliyse göster */}
              {useTheme && (
                <div className="ml-8">
                  <select
                    value={themeId}
                    onChange={(e) => setThemeId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Tema seçin...</option>
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name} ({theme.scenarios.length} senaryo)
                      </option>
                    ))}
                  </select>
                  {themeId && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-xl text-sm">
                      <p className="text-purple-700 font-medium mb-1">
                        Seçili Tema: {themes.find(t => t.id === themeId)?.name}
                      </p>
                      <p className="text-purple-600 text-xs">
                        Senaryolar: {themes.find(t => t.id === themeId)?.scenarios.join(", ")}
                      </p>
                    </div>
                  )}
                  {!themeId && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Tema seçilmedi - lütfen bir tema seçin veya "Tema Kullan"ı kapatın
                    </p>
                  )}
                </div>
              )}

              {/* Tema kullanılmadığında açıklama */}
              {!useTheme && (
                <p className="text-xs text-gray-500 ml-8">
                  Tema kullanılmadığında tüm senaryolar arasından seçim yapılır
                </p>
              )}
            </div>
          )}

          {/* Butonlar */}
          <div className="flex gap-3 pt-4 border-t">
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

        {/* Tema Uyarı Modal'ı */}
        {showThemeWarning && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Tema Seçilmedi
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Bu zaman dilimi için tema seçmediniz.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  Tema seçilmediğinde ne olur?
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Tüm senaryolar arasından rastgele seçim yapılır</li>
                  <li>• Asset'ler (masa, sandalye vb.) rastgele kombinasyonlar olabilir</li>
                  <li>• Mağazanızın görsel tutarlılığı bozulabilir</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowThemeWarning(false);
                    // Tema seçim alanına scroll yap
                    setUseTheme(true);
                  }}
                  className="flex-1 px-4 py-3 bg-brand-blue text-white rounded-xl font-medium hover:bg-brand-blue/90 transition-colors"
                >
                  Tema Seç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowThemeWarning(false);
                    doSave();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Temasız Devam Et
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

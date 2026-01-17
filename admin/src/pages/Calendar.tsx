import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import type { CalendarItem, CalendarHeatmap, CalendarView } from "../types";

// Gün isimleri
const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const DAY_NAMES_FULL = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

// Çalışma saatleri (08:00 - 22:00)
const WORKING_HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

// Heatmap renk skalası (skor bazlı)
const getHeatmapColor = (score: number): string => {
  if (score >= 80) return "bg-green-100";
  if (score >= 60) return "bg-green-50";
  if (score >= 40) return "bg-yellow-50";
  return "bg-gray-50";
};

// Heatmap border (en iyi saatler için)
const getHeatmapBorder = (score: number): string => {
  if (score >= 85) return "ring-2 ring-green-400 ring-inset";
  if (score >= 70) return "ring-1 ring-green-300 ring-inset";
  return "";
};

export default function Calendar() {
  const [view, setView] = useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [pendingItems, setPendingItems] = useState<CalendarItem[]>([]);
  const [heatmap, setHeatmap] = useState<CalendarHeatmap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Schedule Modal state
  const [showQuickSchedule, setShowQuickSchedule] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  // Drag state
  const [draggedItem, setDraggedItem] = useState<CalendarItem | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // Hafta başlangıç ve bitiş tarihleri
  const getWeekRange = useCallback((date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Pazar
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, []);

  // Hafta günlerini oluştur
  const getWeekDays = useCallback((date: Date) => {
    const { start } = getWeekRange(date);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [getWeekRange]);

  // Veri yükle
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getWeekRange(currentDate);
      const data = await api.getCalendarData(start.getTime(), end.getTime());
      setItems(data.items || []);
      setPendingItems(data.pendingItems || []);
      setHeatmap(data.heatmap || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [currentDate, getWeekRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigation
  const goToToday = () => setCurrentDate(new Date());
  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Item'ı belirli bir güne ve saate yerleştir
  const getItemsForSlot = (date: Date, hour: number): CalendarItem[] => {
    return items.filter((item) => {
      if (!item.scheduledFor) return false;
      const itemDate = new Date(item.scheduledFor);
      return (
        itemDate.getFullYear() === date.getFullYear() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getDate() === date.getDate() &&
        itemDate.getHours() === hour
      );
    });
  };

  // Heatmap skoru al
  const getHeatmapScore = (dayIndex: number, hour: number): number => {
    return heatmap[dayIndex]?.[hour] || 0;
  };

  // Slot ID oluştur
  const getSlotId = (date: Date, hour: number): string => {
    return `${date.toISOString().split("T")[0]}-${hour}`;
  };

  // Drag handlers
  const handleDragStart = (item: CalendarItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(slotId);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedItem) return;

    // Yeni zamanı hesapla
    const newDate = new Date(date);
    newDate.setHours(hour, 0, 0, 0);

    try {
      await api.rescheduleItem(draggedItem.id, newDate.getTime());

      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === draggedItem.id
            ? { ...item, scheduledFor: newDate.getTime() }
            : item
        )
      );
    } catch (err) {
      setError("Zamanlama güncellenemedi");
    }

    setDraggedItem(null);
  };

  // Quick Schedule handlers
  const handleSlotClick = (date: Date, hour: number) => {
    // Slot boşsa quick schedule modal aç
    const slotItems = getItemsForSlot(date, hour);
    if (slotItems.length === 0) {
      setSelectedSlot({ date, hour });
      setShowQuickSchedule(true);
    }
  };

  const handleQuickSchedule = async (item: CalendarItem) => {
    if (!selectedSlot) return;

    const newDate = new Date(selectedSlot.date);
    newDate.setHours(selectedSlot.hour, 0, 0, 0);

    try {
      await api.rescheduleItem(item.id, newDate.getTime());

      // UI güncelle
      setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
      setItems((prev) => [...prev, { ...item, scheduledFor: newDate.getTime() }]);

      setShowQuickSchedule(false);
      setSelectedSlot(null);
    } catch (err) {
      setError("Zamanlama başarısız");
    }
  };

  // Tarih formatla
  const formatDateHeader = () => {
    const { start, end } = getWeekRange(currentDate);
    const startStr = start.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    const endStr = end.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600">{error}</p>
        <button onClick={loadData} className="btn-secondary mt-4">
          Tekrar Dene
        </button>
      </div>
    );
  }

  const weekDays = getWeekDays(currentDate);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-gray-500 mt-1">Paylaşımları zamanla ve yönet</p>
        </div>

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                view === "week"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Hafta
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                view === "month"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Ay
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Bugün
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <span className="text-sm font-medium text-gray-700">{formatDateHeader()}</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-brand-mustard"></div>
          <span className="text-gray-600">{items.length} Zamanlanmış</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-gray-600">{pendingItems.length} Bekleyen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
          <span className="text-gray-600">En İyi Zaman</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card p-0 overflow-hidden">
        {/* Header - Gün İsimleri */}
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="p-2 bg-gray-50 border-r border-gray-200"></div>
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${
                isToday(day) ? "bg-brand-blue/10" : "bg-gray-50"
              }`}
            >
              <div className="text-xs text-gray-500">{DAY_NAMES[day.getDay()]}</div>
              <div className={`text-lg font-semibold ${isToday(day) ? "text-brand-blue" : "text-gray-900"}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Saat Satırları */}
        <div className="max-h-[600px] overflow-y-auto">
          {WORKING_HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0">
              {/* Saat */}
              <div className="p-2 text-xs text-gray-500 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
                {hour.toString().padStart(2, "0")}:00
              </div>

              {/* Gün Hücreleri */}
              {weekDays.map((day, dayIdx) => {
                const dayIndex = day.getDay();
                const score = getHeatmapScore(dayIndex, hour);
                const slotItems = getItemsForSlot(day, hour);
                const slotId = getSlotId(day, hour);
                const isDragOver = dragOverSlot === slotId;

                return (
                  <div
                    key={dayIdx}
                    className={`
                      min-h-[60px] p-1 border-r border-gray-100 last:border-r-0
                      ${getHeatmapColor(score)} ${getHeatmapBorder(score)}
                      ${isDragOver ? "bg-brand-blue/20" : ""}
                      ${slotItems.length === 0 ? "cursor-pointer hover:bg-gray-100/50" : ""}
                      transition-colors
                    `}
                    onClick={() => handleSlotClick(day, hour)}
                    onDragOver={(e) => handleDragOver(e, slotId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day, hour)}
                  >
                    {slotItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(item)}
                        className={`
                          flex items-center gap-1 p-1 rounded text-xs
                          bg-brand-mustard/90 text-white cursor-move
                          hover:bg-brand-mustard shadow-sm
                          ${draggedItem?.id === item.id ? "opacity-50" : ""}
                        `}
                        title={`${item.productName || item.productCategory}\n${item.caption}`}
                      >
                        <img
                          src={item.originalUrl}
                          alt=""
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                        <span className="truncate flex-1">
                          {item.productName || item.productCategory}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Schedule Modal */}
      {showQuickSchedule && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Hızlı Zamanlama</h3>
                <button
                  onClick={() => setShowQuickSchedule(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {DAY_NAMES_FULL[selectedSlot.date.getDay()]}, {selectedSlot.date.getDate()}{" "}
                {selectedSlot.date.toLocaleDateString("tr-TR", { month: "long" })} -{" "}
                {selectedSlot.hour.toString().padStart(2, "0")}:00
              </p>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {pendingItems.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Bekleyen paylaşım yok
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleQuickSchedule(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-mustard hover:bg-brand-mustard/5 transition-colors text-left"
                    >
                      <img
                        src={item.originalUrl}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {item.productName || item.productCategory}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {item.caption}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { hasSeenTour, resetTour } from "../../components/PageTour";

const TOURS = [
  { id: "assets-page", name: "Görseller Sayfası", description: "Ürün görselleri yönetimi" },
  { id: "scenarios-page", name: "Senaryolar Sayfası", description: "Senaryo seçimi ve yönetimi" },
  { id: "themes-page", name: "Temalar Sayfası", description: "Tema oluşturma ve düzenleme" },
  { id: "timeslots-page", name: "Zaman Dilimleri Sayfası", description: "Paylaşım zamanlaması" },
];

export default function ToursSection() {
  const [tourStatuses, setTourStatuses] = useState<Record<string, boolean>>({});

  const checkTourStatuses = useCallback(() => {
    const statuses: Record<string, boolean> = {};
    TOURS.forEach(tour => {
      statuses[tour.id] = hasSeenTour(tour.id);
    });
    setTourStatuses(statuses);
  }, []);

  useEffect(() => {
    checkTourStatuses();
  }, [checkTourStatuses]);

  const handleResetTour = (tourId: string) => {
    resetTour(tourId);
    checkTourStatuses();
  };

  const handleResetAllTours = () => {
    TOURS.forEach(tour => {
      resetTour(tour.id);
    });
    checkTourStatuses();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Tanıtım Turları</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sayfa tanıtım turlarını yönetin
          </p>
        </div>
        <button
          onClick={handleResetAllTours}
          className="btn-secondary text-sm"
        >
          Tümünü Sıfırla
        </button>
      </div>

      <div className="space-y-3">
        {TOURS.map(tour => {
          const isCompleted = tourStatuses[tour.id];
          return (
            <div
              key={tour.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${isCompleted ? "bg-green-500" : "bg-gray-300"}`}
                />
                <div>
                  <p className="font-medium text-gray-900">{tour.name}</p>
                  <p className="text-xs text-gray-500">{tour.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${isCompleted
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isCompleted ? "Tamamlandı" : "Görülmedi"}
                </span>
                {isCompleted && (
                  <button
                    onClick={() => handleResetTour(tour.id)}
                    className="text-xs text-brand-blue hover:underline"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-gray-600">
          <strong>İpucu:</strong> Bir turu sıfırladığınızda, ilgili sayfaya
          gittiğinizde tanıtım turu tekrar başlayacaktır.
        </p>
      </div>
    </div>
  );
}

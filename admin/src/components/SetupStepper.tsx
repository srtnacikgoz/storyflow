import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api";

// Kurulum adımları - mantıksal sıralama
const SETUP_STEPS = [
  {
    id: "assets",
    path: "/assets",
    name: "Görseller",
    shortName: "1",
    description: "Ürün ve aksesuar fotoğrafları",
    icon: "📷",
  },
  {
    id: "scenarios",
    path: "/scenarios",
    name: "Senaryolar",
    shortName: "2",
    description: "Kompozisyon ve çekim tarzları",
    icon: "🎬",
  },
  {
    id: "themes",
    path: "/themes",
    name: "Temalar",
    shortName: "3",
    description: "Senaryo ve atmosfer grupları",
    icon: "🎨",
  },
  {
    id: "timeslots",
    path: "/timeslots",
    name: "Zamanlar",
    shortName: "4",
    description: "Otomatik paylaşım saatleri",
    icon: "📅",
  },
];

interface StepStatus {
  assets: boolean;
  scenarios: boolean;
  themes: boolean;
  timeslots: boolean;
}

export function SetupStepper() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    assets: false,
    scenarios: false,
    themes: false,
    timeslots: false,
  });
  const [loading, setLoading] = useState(true);

  // Mevcut adımı belirle
  const currentPath = location.pathname;
  const currentStepIndex = SETUP_STEPS.findIndex((s) => s.path === currentPath);

  useEffect(() => {
    checkStepStatus();
  }, []);

  // Her adımın tamamlanma durumunu kontrol et
  const checkStepStatus = async () => {
    try {
      // Paralel olarak tüm verileri çek
      const [assets, scenarios, themes, timeslots] = await Promise.all([
        api.listAssets({ isActive: true }).catch(() => []),
        api.listScenarios().catch(() => ({ all: [] })),
        api.listThemes().catch(() => []),
        api.listTimeSlotRules().catch(() => []),
      ]);

      setStepStatus({
        assets: assets.length > 0,
        scenarios: scenarios.all?.length > 0,
        themes: themes.length > 0,
        timeslots: timeslots.length > 0,
      });
    } catch (err) {
      console.error("Step status check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Adım durumunu al
  const getStepState = (stepId: string, index: number) => {
    const isCompleted = stepStatus[stepId as keyof StepStatus];
    const isCurrent = index === currentStepIndex;
    const isPast = index < currentStepIndex;
    const isFuture = index > currentStepIndex;

    return { isCompleted, isCurrent, isPast, isFuture };
  };

  if (loading) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          Yükleniyor...
        </div>
      </div>
    );
  }

  // Tamamlanan adım sayısı
  const completedCount = Object.values(stepStatus).filter(Boolean).length;
  const allCompleted = completedCount === SETUP_STEPS.length;

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Başlık ve İlerleme */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Kurulum Adımları</span>
            {allCompleted && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Tamamlandı
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {completedCount}/{SETUP_STEPS.length} adım tamamlandı
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center">
          {SETUP_STEPS.map((step, index) => {
            const { isCompleted, isCurrent, isPast } = getStepState(step.id, index);
            const isLast = index === SETUP_STEPS.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle & Content */}
                <button
                  onClick={() => navigate(step.path)}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all w-full ${
                    isCurrent
                      ? "bg-brand-blue/10 border-2 border-brand-blue"
                      : isCompleted
                      ? "hover:bg-green-50"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isCurrent
                        ? "bg-brand-blue text-white shadow-md"
                        : isCompleted
                        ? "bg-green-500 text-white"
                        : isPast
                        ? "bg-gray-300 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-lg">{step.icon}</span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="text-left min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isCurrent ? "text-brand-blue" : isCompleted ? "text-green-700" : "text-gray-600"
                      }`}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate hidden sm:block">{step.description}</p>
                  </div>
                </button>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`h-0.5 w-4 mx-1 flex-shrink-0 ${
                      isCompleted && stepStatus[SETUP_STEPS[index + 1].id as keyof StepStatus]
                        ? "bg-green-400"
                        : isCompleted || isPast
                        ? "bg-gray-300"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* İpucu - sadece eksik adım varsa */}
        {!allCompleted && currentStepIndex >= 0 && (
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
            <span>💡</span>
            {currentStepIndex === 0 && !stepStatus.assets && (
              <span>İlk adım: Ürün fotoğraflarınızı yükleyin</span>
            )}
            {currentStepIndex === 1 && !stepStatus.scenarios && stepStatus.assets && (
              <span>Görselleriniz var. Şimdi nasıl kompoze edileceklerini belirleyin.</span>
            )}
            {currentStepIndex === 2 && !stepStatus.themes && stepStatus.scenarios && (
              <span>Senaryolarınız hazır. Bunları temalara gruplayın.</span>
            )}
            {currentStepIndex === 3 && !stepStatus.timeslots && stepStatus.themes && (
              <span>Son adım: Otomatik paylaşım zamanlarını ayarlayın.</span>
            )}
            {currentStepIndex > 0 && !stepStatus[SETUP_STEPS[currentStepIndex - 1].id as keyof StepStatus] && (
              <span className="text-amber-600">
                Önce önceki adımları tamamlamanız önerilir.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupStepper;

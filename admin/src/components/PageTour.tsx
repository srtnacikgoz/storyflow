import { useState, useEffect, useCallback } from "react";

// Tour adımı tipi
export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface PageTourProps {
  tourId: string; // Benzersiz tour ID (localStorage key)
  steps: TourStep[];
  onComplete?: () => void;
}

// localStorage helper
const TOUR_KEY_PREFIX = "tour_completed_";

export function hasSeenTour(tourId: string): boolean {
  return localStorage.getItem(TOUR_KEY_PREFIX + tourId) === "true";
}

export function markTourComplete(tourId: string): void {
  localStorage.setItem(TOUR_KEY_PREFIX + tourId, "true");
}

export function resetTour(tourId: string): void {
  localStorage.removeItem(TOUR_KEY_PREFIX + tourId);
}

export function PageTour({ tourId, steps, onComplete }: PageTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // İlk yüklemede tour'u gösterip göstermeyeceğine karar ver
  useEffect(() => {
    if (!hasSeenTour(tourId) && steps.length > 0) {
      // Kısa bir gecikme ile göster (sayfa yüklenmesini bekle)
      const timer = setTimeout(() => {
        setIsVisible(true);
        updateTargetPosition();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tourId, steps.length]);

  // Target elementinin pozisyonunu güncelle
  const updateTargetPosition = useCallback(() => {
    if (steps[currentStep]) {
      const element = document.querySelector(steps[currentStep].target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    }
  }, [currentStep, steps]);

  // Adım değiştiğinde pozisyonu güncelle
  useEffect(() => {
    if (isVisible) {
      updateTargetPosition();
    }
  }, [currentStep, isVisible, updateTargetPosition]);

  // Resize'da pozisyonu güncelle
  useEffect(() => {
    if (isVisible) {
      window.addEventListener("resize", updateTargetPosition);
      window.addEventListener("scroll", updateTargetPosition);
      return () => {
        window.removeEventListener("resize", updateTargetPosition);
        window.removeEventListener("scroll", updateTargetPosition);
      };
    }
  }, [isVisible, updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    markTourComplete(tourId);
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Tooltip pozisyonu hesapla
  const getTooltipPosition = () => {
    if (!targetRect) {
      // Merkeze yerleştir
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const position = step.position || "bottom";

    switch (position) {
      case "top":
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const tooltipStyle = getTooltipPosition();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[200]">
        {/* Karartma katmanı - target hariç */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Target highlight border */}
        {targetRect && (
          <div
            className="absolute border-2 border-brand-blue rounded-xl pointer-events-none animate-pulse"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}

        {/* Tooltip */}
        <div
          className="absolute bg-white rounded-2xl shadow-2xl p-5 w-80 z-[201]"
          style={{
            ...tooltipStyle,
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          {/* Progress */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? "bg-brand-blue"
                      : index < currentStep
                      ? "bg-brand-blue/50"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {/* Content */}
          <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
          <p className="text-sm text-gray-600 mb-4">{step.content}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Turu Atla
            </button>
            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Geri
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 text-sm bg-brand-blue text-white rounded-lg hover:bg-blue-600"
              >
                {isLastStep ? "Tamamla" : "İleri"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PageTour;

import { useLoading } from "../contexts/LoadingContext";

/**
 * Global Loading Overlay
 * Ekranin alt kisminda veya modal olarak aktif islemleri gosterir
 */
export function LoadingOverlay() {
  const { operations, isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {operations.map((op) => (
        <div
          key={op.id}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 animate-slide-up"
        >
          <div className="flex items-center gap-3">
            {/* Spinner */}
            <div className="flex-shrink-0">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-blue border-t-transparent"></div>
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {op.message}
              </p>

              {/* Progress bar (if progress is defined) */}
              {op.progress !== undefined && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-brand-blue h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${op.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full Screen Loading Overlay
 * Tum ekrani kaplayan loading modal - kritik islemler icin
 */
export function FullScreenLoading() {
  const { operations, isLoading } = useLoading();

  if (!isLoading) return null;

  // En son eklenen islemi goster
  const currentOp = operations[operations.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-scale-up">
        {/* Spinner */}
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-blue border-t-transparent"></div>
        </div>

        {/* Message */}
        <p className="text-center text-gray-900 font-medium text-lg">
          {currentOp?.message || "Yukleniyor..."}
        </p>

        {/* Progress */}
        {currentOp?.progress !== undefined && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentOp.progress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              %{Math.round(currentOp.progress)}
            </p>
          </div>
        )}

        {/* Multiple operations indicator */}
        {operations.length > 1 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            +{operations.length - 1} islem daha bekliyor
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline Loading Spinner
 * Buton icinde veya kucuk alanlarda kullanilabilir
 */
export function InlineSpinner({ size = "sm" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  const sizeClasses = {
    xs: "h-3 w-3 border",
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-2",
  };

  return (
    <div
      className={`animate-spin rounded-full border-brand-blue border-t-transparent ${sizeClasses[size]}`}
    ></div>
  );
}

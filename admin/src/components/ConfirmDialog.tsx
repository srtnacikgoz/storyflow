import { useState } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  consequences?: string[];
  affectedItems?: string[];
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  consequences = [],
  affectedItems = [],
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Variant stilleri
  const variantStyles = {
    danger: {
      icon: "🗑️",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      confirmBg: "bg-red-600 hover:bg-red-700",
      border: "border-red-200",
      listBg: "bg-red-50",
      listText: "text-red-700",
    },
    warning: {
      icon: "⚠️",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      confirmBg: "bg-amber-600 hover:bg-amber-700",
      border: "border-amber-200",
      listBg: "bg-amber-50",
      listText: "text-amber-700",
    },
    info: {
      icon: "ℹ️",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      confirmBg: "bg-blue-600 hover:bg-blue-700",
      border: "border-blue-200",
      listBg: "bg-blue-50",
      listText: "text-blue-700",
    },
  };

  const style = variantStyles[variant];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = loading || isLoading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
              <span className="text-2xl">{style.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-gray-600 mt-1 text-sm">{description}</p>
            </div>
          </div>
        </div>

        {/* Consequences */}
        {consequences.length > 0 && (
          <div className={`mx-6 mb-4 p-4 rounded-xl ${style.listBg} border ${style.border}`}>
            <p className={`text-sm font-medium ${style.listText} mb-2`}>
              Bu işlem sonucunda:
            </p>
            <ul className="space-y-1">
              {consequences.map((item, index) => (
                <li key={index} className={`text-sm ${style.listText} flex items-start gap-2`}>
                  <span className="mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Affected Items */}
        {affectedItems.length > 0 && (
          <div className="mx-6 mb-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Etkilenen öğeler ({affectedItems.length}):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {affectedItems.map((item, index) => (
                <span
                  key={index}
                  className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl transition-colors font-medium disabled:opacity-50 ${style.confirmBg}`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                İşleniyor...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

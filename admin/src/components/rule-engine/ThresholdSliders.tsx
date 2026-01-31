import React from "react";

export interface Thresholds {
    default: number;
    products: number;
    tables: number;
    plates: number;
    cups: number;
    accessories: number;
    napkins: number;
    cutlery: number;
}

interface ThresholdSlidersProps {
    thresholds: Thresholds;
    onChange: (key: keyof Thresholds, value: number) => void;
}

const CATEGORY_LABELS: Record<keyof Thresholds, string> = {
    default: "Varsayılan (Diğerleri)",
    products: "Ürünler",
    tables: "Masalar",
    plates: "Tabaklar",
    cups: "Fincanlar",
    accessories: "Aksesuarlar",
    napkins: "Peçeteler",
    cutlery: "Çatal-Bıçak",
};

export const ThresholdSliders: React.FC<ThresholdSlidersProps> = ({
    thresholds,
    onChange,
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-blue-800 mb-1">
                    Eşik Değeri Nedir?
                </h4>
                <p className="text-sm text-blue-600">
                    Bu değerin (0-100) altında puan alan varlıklar, otomatik seçim
                    sırasında <strong>filtrelenir</strong> ve Gemini'ye sunulmaz. Yüksek
                    değer = Daha katı kalite kontrolü.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {Object.entries(thresholds).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <label className="text-sm font-medium text-gray-700">
                                {CATEGORY_LABELS[key as keyof Thresholds] || key}
                            </label>
                            <span
                                className={`text-xs font-bold px-2 py-1 rounded-full ${value >= 80
                                        ? "bg-green-100 text-green-700"
                                        : value >= 50
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {value}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={value}
                            onChange={(e) =>
                                onChange(key as keyof Thresholds, parseInt(e.target.value))
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-colors"
                        />
                        <div className="flex justify-between text-xs text-gray-400 px-1">
                            <span>Gevşek (0)</span>
                            <span>Katı (100)</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

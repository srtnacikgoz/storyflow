import React from "react";

interface Weights {
    tags: number;
    usage: number;
    mood: number;
    productMatch: number;
    patronRules: number;
}

interface WeightSettingsProps {
    weights: Weights;
    onChange: (key: keyof Weights, value: number) => void;
}

const WEIGHT_LABELS: Record<keyof Weights, string> = {
    tags: "Etiket Uyum Skoru (Tag Match)",
    usage: "Kullanım Sıklığı (Usage Penalty)",
    mood: "Mood/Atmosfer Uyumu",
    productMatch: "Ürün Tipi Uyumu",
    patronRules: "Patron Kuralları (Bonus/Malus)",
};

const WEIGHT_DESCRIPTIONS: Record<keyof Weights, string> = {
    tags: "Asset etiketlerinin prompt ile ne kadar örtüştüğü.",
    usage: "Çok kullanılan assetlerin puanını düşürerek çeşitliliği artırır.",
    mood: "Mevcut mood (aydınlık, karanlık, mevsim) ile uyum.",
    productMatch: "Seçilen ürün ile asset'in (tabak, bardak) uyumu.",
    patronRules: "Sizin belirlediğiniz özel kuralların (Tercih Et/Kaçın) etkisi.",
};

export const WeightSettings: React.FC<WeightSettingsProps> = ({
    weights,
    onChange,
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-purple-800 mb-1">
                    Puanlama Ağırlıkları
                </h4>
                <p className="text-sm text-purple-600">
                    Aşağıdaki kriterlerin seçim puanına ne kadar etki edeceğini belirleyin.
                    Toplamın 100 olması zorunlu değildir, sistem normalize eder.
                </p>
            </div>

            <div className="space-y-6">
                {Object.entries(weights).map(([key, value]) => (
                    <div key={key} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block">
                                    {WEIGHT_LABELS[key as keyof Weights] || key}
                                </label>
                                <p className="text-xs text-gray-500">
                                    {WEIGHT_DESCRIPTIONS[key as keyof Weights]}
                                </p>
                            </div>
                            <span className="text-lg font-bold text-gray-800 bg-gray-50 px-3 py-1 rounded">
                                x{value}
                            </span>
                        </div>

                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={value}
                            onChange={(e) =>
                                onChange(key as keyof Weights, parseFloat(e.target.value))
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                            <span>Etkisiz (0)</span>
                            <span>Normal (1)</span>
                            <span>Çok Yüksek (5)</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

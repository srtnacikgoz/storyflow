import React, { useState } from "react";
import type { PatronRule, AssetCategory, RuleType, RuleTargetType } from "../../types";
import { Save, X } from "lucide-react";

interface PatronRuleBuilderProps {
    onSave: (rule: PatronRule) => void;
    onCancel: () => void;
    initialRule?: PatronRule;
}

const CATEGORIES: AssetCategory[] = [
    "products",
    "tables",
    "plates",
    "cups",
    "napkins",
    "cutlery",
    "accessories",
    "decor",
    "pets",
];

export const PatronRuleBuilder: React.FC<PatronRuleBuilderProps> = ({
    onSave,
    onCancel,
    initialRule,
}) => {
    const [name, setName] = useState(initialRule?.name || "");
    const [type, setType] = useState<RuleType>(initialRule?.type || "exclude");
    const [targetType, setTargetType] = useState<RuleTargetType>(
        initialRule?.target.type || "tag"
    );
    const [targetValue, setTargetValue] = useState<string>(
        initialRule?.target.tag || initialRule?.target.category || ""
    );
    const [priority, setPriority] = useState(initialRule?.priority || 50);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newRule: PatronRule = {
            id: initialRule?.id || `rule_${Date.now()}`,
            name,
            type,
            target: {
                type: targetType,
                ...(targetType === "tag" ? { tag: targetValue } : {}),
                ...(targetType === "category" ? { category: targetValue as AssetCategory } : {}),
            },
            conditions: initialRule?.conditions || [], // Conditions UI for V2
            priority,
            isActive: true,
            createdAt: initialRule?.createdAt || Date.now(),
            updatedAt: Date.now(),
        };

        onSave(newRule);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                    {initialRule ? "Kural Düzenle" : "Yeni Kural Oluştur"}
                </h3>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Rule Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kural Adı
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Örn: Plastik Tabakları Engelle"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Rule Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kural Tipi
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: "exclude", label: "Engelle (Exclude)", color: "red" },
                            { id: "prefer", label: "Tercih Et (Bonus)", color: "green" },
                            { id: "avoid", label: "Kaçın (Ceza)", color: "yellow" },
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setType(opt.id as RuleType)}
                                className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${type === opt.id
                                    ? `bg-${opt.color}-50 border-${opt.color}-500 text-${opt.color}-700 ring-1 ring-${opt.color}-500`
                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        {type === "exclude" && "Bu kurala uyan varlıklar ASLA seçilmez."}
                        {type === "prefer" && "Bu kurala uyan varlıklara ek puan verilir."}
                        {type === "avoid" && "Bu kurala uyan varlıklardan puan kırılır."}
                    </p>
                </div>

                {/* Target */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hedef Tipi
                        </label>
                        <select
                            value={targetType}
                            onChange={(e) => setTargetType(e.target.value as RuleTargetType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="tag">Tag (Etiket)</option>
                            <option value="category">Kategori</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hedef Değer
                        </label>
                        {targetType === "category" ? (
                            <select
                                value={targetValue}
                                onChange={(e) => setTargetValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Seçiniz...</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={targetValue}
                                onChange={(e) => setTargetValue(e.target.value)}
                                placeholder="Örn: rustic, plastic, summer"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        )}
                    </div>
                </div>

                {/* Priority (only for Prefer/Avoid) */}
                {type !== "exclude" && (
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700">Güç / Öncelik</label>
                            <span className="text-sm text-gray-500">{priority}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={priority}
                            onChange={(e) => setPriority(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                        <Save className="w-4 h-4" />
                        Kaydet
                    </button>
                </div>
            </div>
        </form>
    );
};

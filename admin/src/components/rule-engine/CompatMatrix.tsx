import React, { useState } from "react";
import { Plus, X, Save } from "lucide-react";

interface CompatMatrixProps {
    matrix: Record<string, any>; // ProductType -> Config
    onChange: (matrix: Record<string, any>) => void;
}

const PRODUCT_TYPES = ["croissants", "pastas", "chocolates", "coffees"];
const ASSET_CATEGORIES = ["plates", "cups", "cutlery", "napkins", "accessories"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const CompatMatrix: React.FC<CompatMatrixProps> = ({ matrix, onChange }) => {
    const [expandedProduct, setExpandedProduct] = useState<string | null>(PRODUCT_TYPES[0]);

    const handleTagChange = (
        productType: string,
        category: string,
        type: "preferred" | "avoid",
        tags: string[]
    ) => {
        const newMatrix = { ...matrix };
        if (!newMatrix[productType]) newMatrix[productType] = {};

        const key = `${type}${capitalize(category)}`; // e.g., preferredPlates
        newMatrix[productType][key] = tags;

        onChange(newMatrix);
    };

    const addTag = (productType: string, category: string, type: "preferred" | "avoid", tag: string) => {
        if (!tag.trim()) return;
        const currentTags = matrix[productType]?.[`${type}${capitalize(category)}`] || [];
        if (!currentTags.includes(tag.trim())) {
            handleTagChange(productType, category, type, [...currentTags, tag.trim()]);
        }
    };

    const removeTag = (productType: string, category: string, type: "preferred" | "avoid", tag: string) => {
        const currentTags = matrix[productType]?.[`${type}${capitalize(category)}`] || [];
        handleTagChange(productType, category, type, currentTags.filter((t: string) => t !== tag));
    };

    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-indigo-800 mb-1">
                    Ürün Uyumluluk Matrisi
                </h4>
                <p className="text-sm text-indigo-600">
                    Her ürün tipi için hangi asset özelliklerinin (tag) tercih edileceğini veya kaçınılacağını belirleyin.
                    Örneğin: "Croissant" için "ceramic" tabaklar tercih edilir (bonus puan), "plastic" kaçınılır (ceza puanı).
                </p>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    {PRODUCT_TYPES.map(pt => (
                        <button
                            key={pt}
                            onClick={() => setExpandedProduct(pt)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${expandedProduct === pt
                                    ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            {capitalize(pt)}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {expandedProduct && (
                        <div className="space-y-8">
                            {ASSET_CATEGORIES.map(category => (
                                <div key={category} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                                    <h5 className="text-md font-bold text-gray-800 mb-4 flex items-center">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                        {capitalize(category)}
                                    </h5>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Preferred */}
                                        <TagList
                                            title="Tercih Edilenler (Bonus +10)"
                                            tags={matrix[expandedProduct]?.[`preferred${capitalize(category)}`] || []}
                                            color="green"
                                            onAdd={(tag) => addTag(expandedProduct, category, "preferred", tag)}
                                            onRemove={(tag) => removeTag(expandedProduct, category, "preferred", tag)}
                                        />

                                        {/* Avoid */}
                                        <TagList
                                            title="Kaçınılacaklar (Ceza -10)"
                                            tags={matrix[expandedProduct]?.[`avoid${capitalize(category)}`] || []}
                                            color="red"
                                            onAdd={(tag) => addTag(expandedProduct, category, "avoid", tag)}
                                            onRemove={(tag) => removeTag(expandedProduct, category, "avoid", tag)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface TagListProps {
    title: string;
    tags: string[];
    color: "green" | "red";
    onAdd: (tag: string) => void;
    onRemove: (tag: string) => void;
}

const TagList: React.FC<TagListProps> = ({ title, tags, color, onAdd, onRemove }) => {
    const [input, setInput] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (input.trim()) {
                onAdd(input.trim());
                setInput("");
            }
        }
    };

    return (
        <div className={`bg-${color}-50 p-4 rounded-lg border border-${color}-100`}>
            <label className={`block text-xs font-bold text-${color}-800 uppercase mb-2`}>
                {title}
            </label>

            <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                {tags.length === 0 && (
                    <span className={`text-xs text-${color}-400 italic`}>Tanım yok</span>
                )}
                {tags.map(tag => (
                    <span
                        key={tag}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white text-${color}-700 border border-${color}-200 shadow-sm`}
                    >
                        {tag}
                        <button
                            onClick={() => onRemove(tag)}
                            className={`ml-1 hover:text-${color}-900 focus:outline-none`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tag ekle ve Enter'a bas..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                    onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(""); } }}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-indigo-600"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

import { useState, useEffect } from "react";
import { ThresholdSliders } from "../components/rule-engine/ThresholdSliders";
import { PatronRuleBuilder } from "../components/rule-engine/PatronRuleBuilder";
import { WeightSettings } from "../components/rule-engine/WeightSettings";
import { CompatMatrix } from "../components/rule-engine/CompatMatrix";
import type { PatronRule, CategoryThresholds, FirestoreRuleEngineConfig } from "../types";
import { Trash2, Edit2, Plus, RefreshCw, Save } from "lucide-react";
import api from "../services/api";

export default function RuleEnginePage() {
    const [activeTab, setActiveTab] = useState<"thresholds" | "weights" | "rules" | "compatibility">("thresholds");

    // Config State
    const [thresholds, setThresholds] = useState<CategoryThresholds>({
        default: 50,
        products: 50,
        tables: 50,
        plates: 50,
        cups: 50,
        accessories: 50,
        napkins: 50,
        cutlery: 50,
    });
    const [weights, setWeights] = useState<any>({
        tags: 30,
        usage: 10,
        mood: 20,
        productMatch: 20,
        patronRules: 20,
    });
    const [compatMatrix, setCompatMatrix] = useState<Record<string, any>>({});

    // Rules State
    const [rules, setRules] = useState<PatronRule[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Rule Builder State
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PatronRule | undefined>(undefined);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [config, rulesData] = await Promise.all([
                api.getRuleEngineConfig(),
                api.listPatronRules(true) // include inactive
            ]);

            if (config) {
                if (config.thresholds) setThresholds(config.thresholds);
                if (config.weights) {
                    setWeights(config.weights.scoring || weights);
                    setCompatMatrix(config.weights.productCompat?.matrix || {});
                }
            }
            setRules(rulesData || []);
        } catch (error) {
            console.error("Failed to load rule engine data", error);
            alert("Veri yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            // Construct full config object
            const updates: Partial<FirestoreRuleEngineConfig> = {
                thresholds,
                weights: {
                    scoring: weights,
                    productCompat: {
                        weight: 20, // Default weight
                        matrix: compatMatrix
                    },
                    // Preserve other defaults if needed, or backend handles merge
                },
                updatedAt: Date.now(),
            };

            await api.updateRuleEngineConfig(updates);
            alert("Ayarlar başarıyla kaydedildi!");
        } catch (error) {
            console.error("Save failed", error);
            alert("Kaydetme başarısız oldu.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRule = async (rule: PatronRule) => {
        try {
            if (editingRule) {
                await api.updatePatronRule(rule.id, rule);
                setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
            } else {
                const newRule = await api.createPatronRule(rule);
                setRules(prev => [...prev, newRule]);
            }
            setIsBuilderOpen(false);
            setEditingRule(undefined);
        } catch (error) {
            console.error("Rule save failed", error);
            alert("Kural kaydedilemedi.");
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm("Bu kuralı silmek istediğinize emin misiniz?")) return;

        try {
            await api.deletePatronRule(id);
            setRules(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Rule delete failed", error);
            alert("Silme işlemi başarısız.");
        }
    };

    const toggleRuleActive = async (rule: PatronRule) => {
        try {
            await api.updatePatronRule(rule.id, { isActive: !rule.isActive });
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
        } catch (error) {
            alert("Durum güncellenemedi.");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Yükleniyor...
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Rule Engine Yönetimi</h1>
                    <p className="text-gray-500">Otomatik seçim kurallarını, eşikleri ve uyumluluk matrisini yönetin.</p>
                </div>
                <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-t-lg border-b border-gray-200 px-4">
                <div className="flex gap-6">
                    {[
                        { id: "thresholds", label: "Eşik Değerleri" },
                        { id: "weights", label: "Puan Ağırlıkları" },
                        { id: "compatibility", label: "Uyumluluk Matrisi" },
                        { id: "rules", label: `Patron Kuralları (${rules.length})` },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 border-t-0 p-6 min-h-[500px]">

                {activeTab === "thresholds" && (
                    <ThresholdSliders
                        thresholds={thresholds}
                        onChange={(key, val) => setThresholds(prev => ({ ...prev, [key]: val }))}
                    />
                )}

                {activeTab === "weights" && (
                    <WeightSettings
                        weights={weights}
                        onChange={(key, val) => setWeights((prev: any) => ({ ...prev, [key]: val }))}
                    />
                )}

                {activeTab === "compatibility" && (
                    <CompatMatrix
                        matrix={compatMatrix}
                        onChange={setCompatMatrix}
                    />
                )}

                {activeTab === "rules" && (
                    <div>
                        {!isBuilderOpen ? (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => { setEditingRule(undefined); setIsBuilderOpen(true); }}
                                        className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
                                    >
                                        <Plus className="w-4 h-4" /> Yeni Kural Ekle
                                    </button>
                                </div>

                                {rules.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                                        <p className="text-gray-400">Henüz tanımlanmış kural yok.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {rules.map(rule => (
                                            <div key={rule.id} className={`flex justify-between items-center p-4 border rounded-lg transition-all ${!rule.isActive ? 'bg-gray-50 opacity-75' : 'bg-white hover:shadow-md'}`}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={`px-2 py-0.5 text-xs rounded uppercase font-bold tracking-wider ${rule.type === 'exclude' ? 'bg-red-100 text-red-700' :
                                                            rule.type === 'prefer' ? 'bg-green-100 text-green-700' :
                                                                rule.type === 'avoid' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {rule.type}
                                                        </span>
                                                        <h4 className="font-semibold text-gray-800">{rule.name}</h4>
                                                        {!rule.isActive && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Pasif</span>}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Hedef: <strong className="text-gray-700">{rule.target.type === "tag" ? `#${rule.target.tag}` : rule.target.category}</strong>
                                                        {rule.priority && rule.type !== 'exclude' && <span className="ml-3">• Öncelik: {rule.priority}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => toggleRuleActive(rule)}
                                                        className={`p-2 rounded hover:bg-gray-100 ${rule.isActive ? 'text-green-600' : 'text-gray-400'}`}
                                                        title={rule.isActive ? "Pasife al" : "Aktifleştir"}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingRule(rule); setIsBuilderOpen(true); }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Düzenle"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                                        title="Sil"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <PatronRuleBuilder
                                onSave={handleSaveRule}
                                onCancel={() => { setIsBuilderOpen(false); setEditingRule(undefined); }}
                                initialRule={editingRule}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

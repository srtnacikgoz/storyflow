import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { VisualCriticResponse } from "../types";

interface VisualCriticModalProps {
    isOpen: boolean;
    onClose: () => void;
    imagePath: string; // storageUrl
    prompt: string;
    mood?: string;
    product?: string;
    pipelineId?: string;
}

export default function VisualCriticModal({
    isOpen,
    onClose,
    imagePath,
    prompt,
    mood,
    product,
    pipelineId,
}: VisualCriticModalProps) {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<VisualCriticResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            analyze();
        }
    }, [isOpen]);

    const analyze = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await api.analyzeImage({
                imagePath,
                prompt,
                mood,
                product,
                pipelineId,
            });
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Analiz başarısız oldu.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-brand-dark text-white px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">👁️</span>
                        <h2 className="text-lg font-bold">Visual Critic</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
                            <p className="text-gray-500 animate-pulse">Görsel inceleniyor...</p>
                            <p className="text-xs text-gray-400">Gemini Vision modeli detayları analiz ediyor (Bu işlem 10-15s sürebilir)</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                            <div className="text-red-500 text-4xl mb-3">⚠️</div>
                            <h3 className="text-lg font-semibold text-red-800 mb-2">Analiz Hatası</h3>
                            <p className="text-red-600 mb-4">{error}</p>
                            <button onClick={analyze} className="btn-secondary">
                                Tekrar Dene
                            </button>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            {/* Score & Summary */}
                            <div className="flex items-start gap-6">
                                <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 ${result.score >= 8 ? "border-green-500 text-green-700 bg-green-50" :
                                        result.score >= 6 ? "border-yellow-500 text-yellow-700 bg-yellow-50" :
                                            "border-red-500 text-red-700 bg-red-50"
                                    }`}>
                                    <span className="text-3xl font-bold">{result.score}</span>
                                    <span className="text-xs font-medium uppercase">Puan</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-2">Genel Değerlendirme</h3>
                                    <p className="text-gray-700 leading-relaxed text-sm">{result.critique}</p>
                                </div>
                            </div>

                            {/* Issues */}
                            {result.issues.length > 0 && (
                                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                    <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                                        <span>🚫</span> Tespit Edilen Sorunlar
                                    </h4>
                                    <ul className="space-y-1">
                                        {result.issues.map((issue, idx) => (
                                            <li key={idx} className="text-sm text-red-700 flex gap-2">
                                                <span className="mt-0.5">•</span>
                                                <span>{issue}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Suggestions */}
                            {result.suggestions.length > 0 && (
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                        <span>💡</span> İyileştirme Önerileri
                                    </h4>
                                    <ul className="space-y-1">
                                        {result.suggestions.map((sugg, idx) => (
                                            <li key={idx} className="text-sm text-blue-700 flex gap-2">
                                                <span className="mt-0.5">✓</span>
                                                <span>{sugg}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Refined Prompt */}
                            {result.refined_prompt && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <h4 className="font-semibold text-gray-800 mb-2">✨ Önerilen Prompt</h4>
                                    <div className="text-xs font-mono bg-white p-3 rounded border border-gray-200 text-gray-600 break-words">
                                        {result.refined_prompt}
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(result.refined_prompt!)}
                                        className="mt-2 text-xs text-brand-blue hover:underline flex items-center gap-1"
                                    >
                                        📋 Kopyala
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                    <button onClick={onClose} className="btn-secondary">
                        Kapat
                    </button>
                    {result && (
                        <button
                            onClick={() => {
                                // TODO: Implement "Apply Fix"
                                alert("Fix özelliği henüz aktif değil.");
                            }}
                            className="btn-primary"
                        >
                            🔄 Bu Önerilerle Yeniden Üret
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

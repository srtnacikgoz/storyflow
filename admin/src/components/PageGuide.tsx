import { useState } from "react";

export interface GuideItem {
    icon: string;
    title: string;
    text: string;
}

export interface PageGuideProps {
    title: string;
    storyContent: React.ReactNode;
    aiContent: React.ReactNode;
    proTipsContent: React.ReactNode;
}

export function PageGuide({ title, storyContent, aiContent, proTipsContent }: PageGuideProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<"story" | "ai" | "tips">("story");

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors w-full sm:w-auto"
            >
                <span>💡</span>
                <span>Rehberi Göster: {title}</span>
            </button>
        );
    }

    return (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm mb-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                    <span>💡</span> {title}
                </h2>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 transition-colors"
                    title="Gizle"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-100">
                <button
                    onClick={() => setActiveTab("story")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === "story"
                            ? "border-amber-500 text-amber-700 bg-amber-50/30"
                            : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                        }`}
                >
                    <span>📖</span> Hikaye & Mantık
                </button>
                <button
                    onClick={() => setActiveTab("ai")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === "ai"
                            ? "border-purple-500 text-purple-700 bg-purple-50/30"
                            : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                        }`}
                >
                    <span>🤖</span> AI Mutfağı
                </button>
                <button
                    onClick={() => setActiveTab("tips")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === "tips"
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50/30"
                            : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                        }`}
                >
                    <span>⚡</span> Hızlı Araçlar
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === "story" && (
                    <div className="prose prose-sm prose-stone max-w-none animate-fadeIn">
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4 text-amber-900 leading-relaxed">
                            {storyContent}
                        </div>
                    </div>
                )}

                {activeTab === "ai" && (
                    <div className="prose prose-sm max-w-none animate-fadeIn">
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-purple-900 leading-relaxed">
                            {aiContent}
                        </div>
                    </div>
                )}

                {activeTab === "tips" && (
                    <div className="prose prose-sm max-w-none animate-fadeIn">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-emerald-900 leading-relaxed">
                            {proTipsContent}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

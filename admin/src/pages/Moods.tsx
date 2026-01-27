
import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { Mood } from "../types";
import { useLoadingOperation } from "../contexts/LoadingContext";
import { Tooltip } from "../components/Tooltip";
import { PageGuide } from "../components/PageGuide"; // New Import

// ---------------------------------------------------------------------------
// PRESETS (Sabit Değerler)
// ---------------------------------------------------------------------------

const LIGHTING_PRESETS = [
    { label: "Doğal Sabah Işığı (Soft)", value: "Natural morning light through window, soft diffused shadows, 5500K daylight" },
    { label: "Kapalı/Bulutlu Hava (Overcast)", value: "Soft diffused cold light, overcast sky, flat lighting, no harsh shadows, 6500K cool white" },
    { label: "Sıcak Akşam Güneşi (Golden Hour)", value: "Golden hour directional sunlight, warm side-lighting, 3200K golden" },
    { label: "Dramatik Yan Işık (Hard)", value: "Dramatic side-lighting at 45 degrees, deep defined shadows, 3500K amber" },
    { label: "Yumuşak Yapay Işık (Tungsten)", value: "Warm tungsten accent lighting, soft diffused ambient, 3000K warm" },
    { label: "Stüdyo Işığı (Neutral)", value: "Soft diffused daylight, minimal shadows, even illumination, 5000K neutral" },
    { label: "Karanlık/Moody (Low Key)", value: "Low key lighting, heavy shadows, focused rim light on product" }
];

const COLOR_PRESETS = [
    { label: "Aydınlık & Ferah (Bright/Airy)", value: "white, cream, light wood, pastel tones" },
    { label: "Sıcak & Samimi (Cozy)", value: "warm brown, cream, burnt orange, gold accents" },
    { label: "Soğuk & Kış (Cool Tones)", value: "cool blue tones, slate grey, desaturated, winter atmosphere, clean and crisp" },
    { label: "Rustik & Doğal (Earth Tones)", value: "natural wood, linen, terracotta, olive green" },
    { label: "Lüks & Karanlık (Dark Elegance)", value: "dark wood, burgundy, gold, deep black" },
    { label: "Melankolik/Pastel (Muted)", value: "muted colors, low saturation, soft contrast, calm matte look" },
    { label: "Canlı & Enerjik (Vibrant)", value: "bright colors, high saturation, sharp contrast" },
    { label: "Sinematik (Teal & Orange)", value: "cinematic color grading, teal shadows, orange highlights" },
    { label: "Siyah & Beyaz (Monochrome)", value: "black and white, high contrast, artistic monochrome" }
];

export default function Moods() {
    const [moods, setMoods] = useState<Mood[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingMood, setEditingMood] = useState<Mood | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State (Varsayılan değerlerle)
    const [formData, setFormData] = useState<Partial<Mood>>({
        name: "",
        description: "",
        timeOfDay: "any",
        season: "any",
        weather: "any",
        lightingPrompt: LIGHTING_PRESETS[0].value, // Varsayılan seçili
        colorGradePrompt: COLOR_PRESETS[0].value, // Varsayılan seçili
        isActive: true
    });

    const { execute: executeDelete } = useLoadingOperation("mood-delete");
    const { execute: executeSeed } = useLoadingOperation("mood-seed");

    useEffect(() => {
        loadMoods();
    }, []);

    useEffect(() => {
        if (editingMood) {
            setFormData({ ...editingMood });
        } else {
            resetForm();
        }
    }, [editingMood]);

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            timeOfDay: "any",
            season: "any",
            weather: "any",
            lightingPrompt: LIGHTING_PRESETS[0].value,
            colorGradePrompt: COLOR_PRESETS[0].value,
            isActive: true
        });
    };

    const loadMoods = async () => {
        setLoading(true);
        try {
            const data = await api.getMoods();
            setMoods(data);
            setError(null);
        } catch (err) {
            setError("Moodlar yüklenirken hata oluştu");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        try {
            await executeSeed(async () => {
                const result = await api.seedMoods();
                await loadMoods();
                alert(`İşlem tamamlandı: ${result.added} yeni mood eklendi.`);
            }, "Varsayılan moodlar yükleniyor...");
        } catch (err) {
            alert("Yükleme başarısız oldu.");
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingMood) {
                await api.updateMood(editingMood.id, formData);
            } else {
                await api.createMood(formData as Omit<Mood, "id" | "createdAt" | "updatedAt">);
            }
            setShowModal(false);
            resetForm();
            loadMoods();
        } catch (err) {
            alert("Kaydetme işlemi başarısız oldu.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Bu mood'u silmek istediğinize emin misiniz?")) return;

        try {
            await executeDelete(async () => {
                await api.deleteMood(id);
                await loadMoods();
            }, "Mood siliniyor...");
        } catch (err) {
            alert("Silme işlemi başarısız");
        }
    };



    const openEditModal = (mood: Mood) => {
        setEditingMood(mood);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingMood(null);
        setShowModal(true);
    };

    const timeLabels = {
        morning: "Sabah",
        afternoon: "Öğle",
        evening: "Akşam",
        night: "Gece",
        any: "Her Zaman"
    };

    const seasonLabels = {
        winter: "Kış",
        spring: "İlkbahar",
        summer: "Yaz",
        autumn: "Sonbahar",
        any: "Her Mevsim"
    };

    const weatherLabels = {
        sunny: "Güneşli",
        cloudy: "Bulutlu",
        rainy: "Yağmurlu",
        snowy: "Karlı",
        any: "Her Hava"
    };

    // Helper: Değerin preset içinde olup olmadığını kontrol et (Custom check)
    const isCustomLighting = !LIGHTING_PRESETS.some(p => p.value === formData.lightingPrompt);
    const isCustomColor = !COLOR_PRESETS.some(p => p.value === formData.colorGradePrompt);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Mood Yönetimi</h1>
                    <p className="text-gray-500">
                        AI'ın görsel üretirken kullanacağı atmosfer ve ışık ayarlarını yönetin.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="btn-primary flex items-center gap-2"
                >
                    <span>➕</span> Yeni Mood Ekle
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
                    {error} <br />
                    <span className="text-xs text-red-500 mt-1 block">Deploy edilmemiş fonksiyonlar veya CORS hatası olabilir. 'firebase deploy' komutunu çalıştırın.</span>
                </div>
            )}

            <PageGuide
                title="Yönetmen Koltuğu: Işık ve Atmosfer (Moods)"
                storyContent={
                    <div className="space-y-4">
                        <p>
                            <strong>Işık, Kamera, Motor!</strong> Bir film setinde olduğunuzu hayal edin.
                            'Mood', o sahnenin ışık şefi ve yönetmenidir. Fotoğrafın çekildiği anı ve duyguyu buradan belirlersiniz.
                        </p>
                        <p>Müşterinize ne hissettirmek istiyorsunuz?</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Sabah Neşesi:</strong> Pırıl pırıl güneş ışığı, taze ve canlı renkler. (Kahvaltı ürünleri için)</li>
                            <li><strong>Akşam Keyfi:</strong> Loş ışıklar, mumlar, sıcak ve samimi bir ortam. (Tatlı kaçamakları veya kahve için)</li>
                        </ul>
                        <p className="italic">Sadece 'Güneşli' seçip geçmeyin, hikayenize uygun duyguyu film çeker gibi düşünün.</p>
                    </div>
                }
                aiContent={
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold mb-1">🤖 Işık ve Renk Promptları</h4>
                            <p className="text-sm">
                                Kameramanın (Gemini) kulağına fısıldadığım teknik talimatlar. "Mavileri kıs, gölgeleri uzat, sıcaklığı artır" gibi emirleri buradan alırım.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-1">🤖 Hava Durumu (Weather)</h4>
                            <p className="text-sm">
                                <strong>Benim sigortamdır.</strong> Eğer "Yağmurlu" seçtiyseniz, lighting prompt ne derse desin güneş açtırmam. Mantıksız sahneleri engellerim.
                            </p>
                        </div>
                    </div>
                }
                proTipsContent={
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm">💡 3 Altın İpucu</h4>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li>
                                <strong>Basitlik İyidir:</strong> Çok karmaşık, renkli ışıklar bazen ürünü gölgede bırakır. "Soft Natural Lighting" (Yumuşak Doğal Işık) her zaman en güvenli ve şık limandır.
                            </li>
                            <li>
                                <strong>Marka Renkleri:</strong> Color prompt içine markanızın kurumsal renklerini (Örn: "Pastel Pink tones", "Emerald Green accents") eklerseniz, yapay zeka görseli o renklere göre tonlar.
                            </li>
                            <li>
                                <strong>Sinematik Terimler:</strong> Aşağıdaki terimleri kullanarak görsellerinizi amatörlükten profesyonel stüdyo seviyesine taşıyın.
                            </li>
                        </ul>

                        <div className="mt-4 pt-4 border-t border-stone-100">
                            <p className="font-medium text-xs mb-2">Sinematik Sözlük (Tıkla & Kopyala):</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: "Golden Hour (Altın Saat)", text: "Golden hour lighting, warm sun, long shadows" },
                                    { label: "Rembrandt Lighting", text: "Rembrandt lighting, dramatic shadows, artistic portrait style" },
                                    { label: "Cinematic Teal/Orange", text: "Cinematic color grading, teal shadows, orange highlights" },
                                    { label: "Soft Focus (Rüya Gibi)", text: "Soft focus, dreamy atmosphere, glowing highlights" },
                                    { label: "Moody Dark (Karanlık)", text: "Low key lighting, deep blacks, mystery atmosphere" }
                                ].map((term) => (
                                    <button
                                        key={term.label}
                                        onClick={() => {
                                            navigator.clipboard.writeText(term.text);
                                            alert(`"${term.text}" kopyalandı!`);
                                        }}
                                        className="bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full hover:bg-emerald-50 text-xs shadow-sm transition-all"
                                    >
                                        {term.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                }
            />

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {moods.length === 0 && !error && (
                        <div className="col-span-full text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-500 mb-4">Henüz hiç mood tanımlanmamış.</p>
                            <button onClick={handleSeed} className="text-amber-600 font-medium hover:underline">
                                Varsayılan Moodları Yükle
                            </button>
                        </div>
                    )}

                    {moods.map(mood => (
                        <div key={mood.id} className="card hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(mood)}
                                    className="p-2 bg-white rounded-full shadow-sm border hover:bg-gray-50"
                                    title="Düzenle"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(mood.id)}
                                    className="p-2 bg-white rounded-full shadow-sm border hover:bg-red-50 text-red-500"
                                    title="Sil"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{mood.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{mood.description}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${mood.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {mood.isActive ? 'Aktif' : 'Pasif'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                        🕒 {timeLabels[mood.timeOfDay]}
                                    </span>
                                    <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100">
                                        🍂 {seasonLabels[mood.season]}
                                    </span>
                                    <span className="px-2 py-1 bg-sky-50 text-sky-700 rounded border border-sky-100">
                                        🌤️ {weatherLabels[mood.weather]}
                                    </span>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                                    <div>
                                        <span className="font-semibold text-gray-700 block mb-1">💡 Işık:</span>
                                        <span className="text-gray-600 font-mono text-[10px] line-clamp-2" title={mood.lightingPrompt}>
                                            {mood.lightingPrompt}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-700 block mb-1">🎨 Renk:</span>
                                        <span className="text-gray-600 font-mono text-[10px] line-clamp-2" title={mood.colorGradePrompt}>
                                            {mood.colorGradePrompt}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingMood ? "Mood Düzenle" : "Yeni Mood Ekle"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Temel Bilgiler */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mood Adı</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="Örn: Yağmurlu Sabah"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Durum</label>
                                    <select
                                        value={formData.isActive ? "true" : "false"}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.value === "true" })}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="true">Aktif</option>
                                        <option value="false">Pasif</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Açıklama</label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none h-20"
                                    placeholder="Bu mood ne zaman kullanılmalı?"
                                />
                            </div>

                            {/* Koşullar */}
                            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Zaman</label>
                                    <select
                                        value={formData.timeOfDay}
                                        onChange={e => setFormData({ ...formData, timeOfDay: e.target.value as any })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    >
                                        {Object.entries(timeLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Mevsim</label>
                                    <select
                                        value={formData.season}
                                        onChange={e => setFormData({ ...formData, season: e.target.value as any })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    >
                                        {Object.entries(seasonLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Hava</label>
                                    <select
                                        value={formData.weather}
                                        onChange={e => setFormData({ ...formData, weather: e.target.value as any })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    >
                                        {Object.entries(weatherLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Promptlar (Select) */}
                            <div className="space-y-4">
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-4">
                                    <h3 className="font-medium text-amber-900 flex items-center gap-2">
                                        ✨ Atmosfer Ayarları
                                        <Tooltip content="Bu seçimler görselin stilini ve ışığını doğrudan etkiler." />
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            💡 Işıklandırma Stili
                                        </label>
                                        <select
                                            value={isCustomLighting ? "" : formData.lightingPrompt} // Custom değer ise boş göster (veya custom desteği varsa onu)
                                            onChange={e => setFormData({ ...formData, lightingPrompt: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            {LIGHTING_PRESETS.map((preset, index) => (
                                                <option key={index} value={preset.value}>
                                                    {preset.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Seçilen Prompt: <span className="font-mono">{formData.lightingPrompt}</span>
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            🎨 Renk & Ton
                                        </label>
                                        <select
                                            value={isCustomColor ? "" : formData.colorGradePrompt}
                                            onChange={e => setFormData({ ...formData, colorGradePrompt: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            {COLOR_PRESETS.map((preset, index) => (
                                                <option key={index} value={preset.value}>
                                                    {preset.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Seçilen Prompt: <span className="font-mono">{formData.colorGradePrompt}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium shadow-lg shadow-amber-200 disabled:opacity-70 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        "Kaydet"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

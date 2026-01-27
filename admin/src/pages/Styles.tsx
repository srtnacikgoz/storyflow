import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { Style } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageGuide } from "../components/PageGuide";
import { useLoading, useLoadingOperation } from "../contexts/LoadingContext";

export default function Styles() {
    const [styles, setStyles] = useState<Style[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingStyle, setEditingStyle] = useState<Style | null>(null);

    // Delete confirm state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { startLoading, stopLoading } = useLoading();
    const { execute: executeDelete } = useLoadingOperation("style-delete");
    const [seeding, setSeeding] = useState(false); // Seed loading state

    useEffect(() => {
        loadStyles();
    }, []);

    const loadStyles = async () => {
        setLoading(true);
        startLoading("styles", "Stiller yükleniyor...");
        try {
            const data = await api.getStyles();
            setStyles(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Stiller yüklenirken hata oluştu");
        } finally {
            setLoading(false);
            stopLoading("styles");
        }
    };

    const handleCreate = () => {
        setEditingStyle(null);
        setShowModal(true);
    };

    const handleEdit = (style: Style) => {
        setEditingStyle(style);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        setDeletingId(deleteId);
        try {
            await executeDelete(async () => {
                await api.deleteStyle(deleteId);
                await loadStyles();
            }, "Stil siliniyor...");
            setDeleteId(null);
        } catch (err) {
            alert("Silme hatası: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setDeletingId(null);
        }
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        loadStyles();
    };

    const handleSeed = async () => {
        if (!confirm("Modern, Rustik, Minimal gibi 5 temel stili otomatik yüklemek istiyor musunuz?")) return;

        setSeeding(true);
        try {
            const res = await api.seedStyles();
            alert(`${res.added} yeni stil eklendi. (${res.skipped} tanesi zaten vardı)`);
            loadStyles();
        } catch (err) {
            alert("Hata: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stil Yönetimi</h1>
                    <p className="text-gray-500 mt-1">Asset'ler için kullanılan stil tanımları (Modern, Rustic vb.)</p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    + Yeni Stil
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                </div>
            ) : error ? (
                <div className="card bg-red-50 text-red-700 p-4">{error}</div>
            ) : (
                <>
                    <PageGuide
                        title="Markanızın Görsel Kimliği (Style)"
                        storyContent={
                            <div className="space-y-4">
                                <p>
                                    <strong>Stil Nedir?</strong> Markanızın DNA'sıdır. Bir insanın giyim tarzı gibidir;
                                    ruh hali (Mood) değişse bile tarzı (Stil) hep aynı kalır.
                                </p>
                                <p>
                                    <strong>Neden Önemli?</strong> Instagram profilinize giren biri, fotoğraflar arasında bir bütünlük görmelidir.
                                    Bir gün 'Köy Evi', ertesi gün 'Uzay İstasyonu' gibi duran görseller marka güvenini sarsar.
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Stil (Buradan Ayarlanır):</strong> Malzeme kalitesi, dokular, kamera lensi seçimi, genel sanat yönetimi. (Örn: Minimalist, Vintage, Lüks).</li>
                                    <li><strong>Mood (Diğer Sayfa):</strong> O anki ışık, hava durumu, duygu. (Örn: Yağmurlu, Güneşli, Hüzünlü).</li>
                                </ul>
                                <p className="italic font-medium">
                                    Özetle: Aynı 'Vintage' stiliyle hem 'Neşeli' hem 'Hüzünlü' fotoğraflar çekebilirsiniz. Stil sabit kalır, Mood değişir.
                                </p>
                            </div>
                        }
                        aiContent={
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold mb-1">🤖 Slug (ID)</h4>
                                    <p>Değişirse hafızam silinir! Kodun içinde bu ID'ye bakarak "Hımm, kullanıcı modern istemiş" diyorum.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-1">🤖 Açıklama (Description)</h4>
                                    <p>İşte sihir burada! Burası benim <strong>"Prompt Mühendisliği"</strong> alanımdır.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        <div className="bg-red-100 p-3 rounded text-red-800 text-xs">
                                            <strong>❌ Kötü Açıklama:</strong><br />
                                            "Modern fotoğraf."<br />
                                            (Çok belirsiz, her şeyi yapabilirim.)
                                        </div>
                                        <div className="bg-green-100 p-3 rounded text-green-800 text-xs">
                                            <strong>✅ İyi Açıklama:</strong><br />
                                            "High-key photography, sharp focus, minimal composition, marble surfaces, cool color temperature, Vogue editorial style."<br />
                                            (Net talimatlar, harika sonuç.)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                        proTipsContent={
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm">💡 3 Altın İpucu</h4>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li>
                                        <strong>Tarif Edin, İsim Vermeyin:</strong> Stilin adı "Modern" olabilir ama açıklamaya "Modern" yazmak yetmez. "Low key lighting, concrete textures, minimal composition" gibi teknik tarifler yazın.
                                    </li>
                                    <li>
                                        <strong>Azlık İlkesi:</strong> Çok fazla stil oluşturmayın. Markanız için 3-4 tane ana stil (Ana, Kampanya, Özel) yeterlidir. Fazlası kimliği bozar.
                                    </li>
                                    <li>
                                        <strong>Tutarlılık Sırrı:</strong> Stili sabit tutup Mood'u değiştirerek çeşitlilik yaratın. Aynı "Vintage" stiliyle hem neşeli hem hüzünlü fotoğraflar çekebilirsiniz.
                                    </li>
                                </ul>

                                <div className="mt-4 pt-4 border-t border-stone-100">
                                    <p className="font-medium text-xs mb-2">Hızlı Araçlar:</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => {
                                                const prompt = "Act as a professional photographer. Write a detailed description for a product photography style named '[STİL_ADINIZI_YAZIN]'. Focus on lighting, textures, camera angles and mood. The description will be used as a prompt for AI image generation. Keep it under 100 words in English.";
                                                navigator.clipboard.writeText(prompt);
                                                alert("Prompt kopyalandı! ChatGPT'ye yapıştırarak stiliniz için profesyonel bir açıklama yazdırabilirsiniz.");
                                            }}
                                            className="bg-white border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50 text-xs font-medium flex items-center gap-1 shadow-sm transition-all"
                                        >
                                            <span>📋</span> "Stil Tarifi İste" Promptunu Kopyala
                                        </button>

                                        <button
                                            onClick={() => {
                                                const minimal = "Minimalist aesthetic, clean lines, plenty of negative space, soft natural lighting, high-end magazine quality, sharp focus, neutral color palette.";
                                                navigator.clipboard.writeText(minimal);
                                                alert("Minimalist stil tanımı kopyalandı!");
                                            }}
                                            className="bg-white border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50 text-xs font-medium flex items-center gap-1 shadow-sm transition-all"
                                        >
                                            <span>✨</span> Örnek: Minimalist Stil (Kopyala)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        }
                    />
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sıra</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID (Slug)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görünen Ad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {styles.map((style) => (
                                    <tr key={style.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {style.order}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                            {style.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {style.displayName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {style.description || "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${style.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                                }`}>
                                                {style.isActive ? "Aktif" : "Pasif"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(style)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Düzenle
                                            </button>
                                            <button
                                                onClick={() => handleDelete(style.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {styles.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="text-center">
                                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz stil yok</h3>
                                                <p className="mt-1 text-sm text-gray-500">Kendi stilinizi oluşturun veya hazır stilleri yükleyin.</p>
                                                <div className="mt-6 flex justify-center gap-3">
                                                    <button
                                                        onClick={handleCreate}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    >
                                                        + Yeni Stil Oluştur
                                                    </button>
                                                    <button
                                                        onClick={handleSeed}
                                                        disabled={seeding}
                                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                                    >
                                                        {seeding ? "Yükleniyor..." : "📦 Varsayılanları Yükle"}
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <StyleModal
                    style={editingStyle}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Stili Sil"
                description="Bu stili silmek istediğinize emin misiniz? Bu stili kullanan varlıklar bu adı kullanmaya devam eder ancak yeni seçimlerde görünmez."
                confirmText="Sil"
                variant="danger"
                isLoading={!!deletingId}
            />
        </div>
    );
}

function StyleModal({ style, onClose, onSuccess }: { style: Style | null, onClose: () => void, onSuccess: () => void }) {
    const isEdit = !!style;
    const [formData, setFormData] = useState({
        id: style?.id || "",
        displayName: style?.displayName || "",
        description: style?.description || "",
        order: style?.order || 1,
        isActive: style ? style.isActive : true
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEdit) {
                await api.updateStyle(style.id, formData);
            } else {
                await api.createStyle(formData);
            }
            onSuccess();
        } catch (err) {
            alert("Kaydetme hatası: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                {isEdit ? "Stili Düzenle" : "Yeni Stil"}
                            </h3>
                            <div className="mt-4 space-y-4">
                                {!isEdit && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ID (Slug)</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.id}
                                            onChange={e => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                            className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            placeholder="modern-chic (English, no spaces)"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Unique identifier (URL friendly)</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Görünen Ad</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.displayName}
                                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                        className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700">Sıralama</label>
                                        <input
                                            type="number"
                                            value={formData.order}
                                            onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                            className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        />
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.isActive}
                                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                        />
                                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Aktif</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-blue text-base font-medium text-white hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            >
                                {saving ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                İptal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../services/api";

interface HandStyleItem {
  id: string;
  label: string;
  geminiPrompt: string;
  category: string;
  tags: string[];
  isActive: boolean;
  order: number;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  neutral: { label: "Nötr", color: "bg-gray-100 text-gray-600" },
  male: { label: "Erkek", color: "bg-blue-50 text-blue-600" },
  child: { label: "Çocuk", color: "bg-pink-50 text-pink-600" },
  glam: { label: "Glamour", color: "bg-purple-50 text-purple-600" },
};

export default function HandStylesSection() {
  const [handStyles, setHandStyles] = useState<HandStyleItem[]>([]);
  const [handStylesLoading, setHandStylesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingHandStyle, setEditingHandStyle] = useState<HandStyleItem | null>(null);
  const [showHandStyleForm, setShowHandStyleForm] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const savingRef = useRef(false);

  const loadHandStyles = useCallback(async () => {
    setHandStylesLoading(true);
    try {
      const config = await api.getHandStyles();
      setHandStyles(config.styles || []);
    } catch (err) {
      console.error("El stilleri yüklenemedi:", err);
      setError("El stilleri yüklenemedi");
    } finally {
      setHandStylesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHandStyles();
  }, [loadHandStyles]);

  // API'ye kaydet — state zaten güncellenmiş olmalı
  const persistToApi = useCallback(async (styles: HandStyleItem[]) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await api.updateHandStyles(styles);
    } catch (err: any) {
      const msg = err?.message || "Bilinmeyen hata";
      console.error("El stilleri kaydedilemedi:", msg);
      setError(`Kayıt hatası: ${msg}`);
      // Hata durumunda API'den tekrar yükle
      try {
        const config = await api.getHandStyles();
        setHandStyles(config.styles || []);
      } catch {
        // yüklenemezse mevcut state kalsın
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  const toggleStyle = useCallback((id: string) => {
    setHandStyles(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, isActive: !s.isActive } : s
      );
      // setState callback içinden async kaydetme tetikle
      setTimeout(() => persistToApi(updated), 0);
      return updated;
    });
  }, [persistToApi]);

  const deleteStyle = useCallback((id: string) => {
    setHandStyles(prev => {
      const updated = prev.filter(s => s.id !== id);
      setTimeout(() => persistToApi(updated), 0);
      return updated;
    });
  }, [persistToApi]);

  const activeCount = handStyles.filter(s => s.isActive).length;

  // Kategorilere göre grupla
  const sorted = [...handStyles].sort((a, b) => a.order - b.order);
  const grouped = sorted.reduce((acc, style) => {
    const cat = style.category || "neutral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(style);
    return acc;
  }, {} as Record<string, HandStyleItem[]>);

  const categoryOrder = ["neutral", "male", "child", "glam"];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">El Stilleri</h2>
          <p className="text-sm text-gray-500 mt-1">
            Senaryolarda kullanılacak el stillerini seçin
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
              {activeCount} aktif
            </span>
          )}
          <button
            onClick={() => {
              setEditingHandStyle(null);
              setShowHandStyleForm(true);
            }}
            className="btn-primary text-sm"
          >
            + Yeni Stil
          </button>
        </div>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">x</button>
        </div>
      )}

      {handStylesLoading ? (
        <div className="text-center py-4 text-gray-400">Yükleniyor...</div>
      ) : handStyles.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>Henüz el stili tanımlanmamış</p>
          <p className="text-xs mt-1">Seed endpoint'ini çalıştırın veya yukarıdan ekleyin</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedCategories.map(cat => {
            const catInfo = CATEGORY_LABELS[cat] || { label: cat, color: "bg-gray-100 text-gray-600" };
            const styles = grouped[cat];

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catInfo.color}`}>
                    {catInfo.label}
                  </span>
                  <span className="text-[10px] text-gray-300">
                    {styles.filter(s => s.isActive).length}/{styles.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {styles.map(style => (
                    <div
                      key={style.id}
                      onMouseEnter={() => setHoveredId(style.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`
                        relative rounded-lg border px-3 py-2.5 cursor-pointer transition-all select-none
                        ${style.isActive
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                        }
                      `}
                      onClick={() => toggleStyle(style.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`
                          mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all
                          ${style.isActive
                            ? "bg-gray-900 border-gray-900 text-white"
                            : "border-gray-300 bg-white"
                          }
                        `}>
                          {style.isActive && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-sm font-medium leading-tight block ${style.isActive ? "text-gray-900" : "text-gray-500"}`}>
                            {style.label}
                          </span>
                          <p className="text-[11px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
                            {style.geminiPrompt}
                          </p>
                        </div>
                      </div>

                      {/* Hover aksiyon butonları */}
                      {hoveredId === style.id && (
                        <div className="absolute top-1 right-1 flex gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHandStyle(style);
                              setShowHandStyleForm(true);
                            }}
                            className="text-gray-400 hover:text-gray-700 p-0.5"
                            title="Düzenle"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`"${style.label}" stilini silmek istediğinize emin misiniz?`)) {
                                deleteStyle(style.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                            title="Sil"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {saving && (
        <div className="text-center py-2 text-sm text-gray-500">Kaydediliyor...</div>
      )}

      {/* El Stili Ekleme/Düzenleme Formu */}
      {showHandStyleForm && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium text-sm mb-3">
            {editingHandStyle ? "El Stili Düzenle" : "Yeni El Stili"}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const newStyle: HandStyleItem = {
                id: editingHandStyle?.id || formData.get("id") as string,
                label: formData.get("label") as string,
                geminiPrompt: formData.get("geminiPrompt") as string,
                category: formData.get("category") as string || "neutral",
                tags: (formData.get("tags") as string || "").split(",").map(t => t.trim()).filter(Boolean),
                isActive: true,
                order: editingHandStyle?.order || handStyles.length + 1,
              };

              if (!newStyle.id || !newStyle.label || !newStyle.geminiPrompt) {
                alert("ID, Label ve Gemini Prompt zorunlu");
                return;
              }

              if (editingHandStyle) {
                setHandStyles(prev => {
                  const updated = prev.map(s => s.id === editingHandStyle.id ? newStyle : s);
                  setTimeout(() => persistToApi(updated), 0);
                  return updated;
                });
              } else {
                if (handStyles.some(s => s.id === newStyle.id)) {
                  alert("Bu ID zaten mevcut");
                  return;
                }
                setHandStyles(prev => {
                  const updated = [...prev, newStyle];
                  setTimeout(() => persistToApi(updated), 0);
                  return updated;
                });
              }
              setShowHandStyleForm(false);
              setEditingHandStyle(null);
            }}
            className="space-y-3"
          >
            {!editingHandStyle && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">ID (slug)</label>
                <input name="id" type="text" required placeholder="elegant-manicured" className="input text-sm w-full" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label</label>
              <input name="label" type="text" required defaultValue={editingHandStyle?.label} placeholder="Bakımlı & Zarif" className="input text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Gemini Prompt</label>
              <textarea name="geminiPrompt" required defaultValue={editingHandStyle?.geminiPrompt} placeholder="An elegant hand with..." rows={3} className="input text-sm w-full" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Kategori</label>
                <select name="category" defaultValue={editingHandStyle?.category || "neutral"} className="input text-sm w-full">
                  <option value="neutral">Nötr</option>
                  <option value="male">Erkek</option>
                  <option value="child">Çocuk</option>
                  <option value="glam">Glamour</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Etiketler (virgülle)</label>
                <input name="tags" type="text" defaultValue={editingHandStyle?.tags?.join(", ")} placeholder="zarif, bakımlı" className="input text-sm w-full" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowHandStyleForm(false); setEditingHandStyle(null); }}
                className="btn-secondary text-sm"
              >
                İptal
              </button>
              <button type="submit" className="btn-primary text-sm">
                {editingHandStyle ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

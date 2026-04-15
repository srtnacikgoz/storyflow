import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

// --- Tipler ---

interface StyleProfile {
  id: string;
  name: string;
  cameraAngle: string;
  lighting: string;
  surface: string;
  colorPalette: string;
  atmosphere: string;
  framing: string;
  referenceImageUrl?: string;
  isActive: boolean;
}

interface IngredientItem {
  id: string;
  name: string;
  description: string;
  message: string;
  usedInProducts: string[];
  isActive: boolean;
  sortOrder: number;
}

interface PromptHistoryItem {
  id: string;
  ingredientName: string;
  styleProfileName: string;
  generatedPrompt: string;
  sceneDetail: string;
  cost: number;
  model: string;
  createdAt: number;
}

// --- Bileşen ---

export default function IngredientPrompt() {
  // Veri state'leri
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [items, setItems] = useState<IngredientItem[]>([]);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  // Seçim state'leri
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  // UI state'leri
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [sceneDetail, setSceneDetail] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);

  // Aktif tab: profiller | malzemeler | üret | geçmiş
  const [activeTab, setActiveTab] = useState<"generate" | "profiles" | "items" | "history">("generate");

  // Profil form
  const [editingProfile, setEditingProfile] = useState<Partial<StyleProfile> | null>(null);

  // Malzeme form
  const [editingItem, setEditingItem] = useState<Partial<IngredientItem & { usedInProductsText: string }> | null>(null);

  // Veri yükleme
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, i, h] = await Promise.all([
        api.listIngredientProfiles().catch(() => []),
        api.listIngredientItems().catch(() => []),
        api.listIngredientPromptHistory().catch(() => []),
      ]);
      setProfiles(p);
      setItems(i);
      setHistory(h);
      if (p.length > 0 && !selectedProfileId) setSelectedProfileId(p[0].id);
      if (i.length > 0 && !selectedItemId) setSelectedItemId(i[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, selectedItemId]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed
  const handleSeed = useCallback(async () => {
    setSeeding(true);
    setError("");
    try {
      await api.seedIngredientData();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Seed başarısız.");
    } finally {
      setSeeding(false);
    }
  }, [loadData]);

  // Prompt üret
  const handleGenerate = useCallback(async () => {
    if (!selectedProfileId || !selectedItemId) {
      setError("Stil profili ve malzeme seçimi zorunlu.");
      return;
    }
    setGenerating(true);
    setError("");
    setGeneratedPrompt('');
    setSceneDetail('');
    try {
      const result = await api.generateIngredientPrompt({
        ingredientId: selectedItemId,
        styleProfileId: selectedProfileId,
      });
      setGeneratedPrompt(result.prompt);
      setSceneDetail(result.sceneDetail);
      // Geçmişi güncelle
      const h = await api.listIngredientPromptHistory();
      setHistory(h);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Prompt üretimi başarısız.");
    } finally {
      setGenerating(false);
    }
  }, [selectedProfileId, selectedItemId]);

  // Kopyala
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedPrompt]);

  // Profil kaydet
  const handleSaveProfile = useCallback(async () => {
    if (!editingProfile?.name) return;
    setError("");
    try {
      if (editingProfile.id) {
        const { id, ...updates } = editingProfile;
        await api.updateIngredientProfile(id, updates);
      } else {
        await api.createIngredientProfile(editingProfile);
      }
      setEditingProfile(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Profil kaydedilemedi.");
    }
  }, [editingProfile, loadData]);

  // Profil sil
  const handleDeleteProfile = useCallback(async (id: string) => {
    if (!confirm("Bu profili silmek istediğinize emin misiniz?")) return;
    try {
      await api.deleteIngredientProfile(id);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Profil silinemedi.");
    }
  }, [loadData]);

  // Malzeme kaydet
  const handleSaveItem = useCallback(async () => {
    if (!editingItem?.name) return;
    setError("");
    try {
      const { usedInProductsText, ...rest } = editingItem;
      const data = {
        ...rest,
        usedInProducts: (usedInProductsText || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      };
      if (editingItem.id) {
        const { id, ...updates } = data;
        await api.updateIngredientItem(id!, updates);
      } else {
        await api.createIngredientItem(data);
      }
      setEditingItem(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Malzeme kaydedilemedi.");
    }
  }, [editingItem, loadData]);

  // Malzeme sil
  const handleDeleteItem = useCallback(async (id: string) => {
    if (!confirm("Bu malzemeyi silmek istediğinize emin misiniz?")) return;
    try {
      await api.deleteIngredientItem(id);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Malzeme silinemedi.");
    }
  }, [loadData]);

  // Veri yoksa seed butonu göster
  const noData = profiles.length === 0 && items.length === 0 && !loading;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Malzeme Görsel Prompt Üretici</h1>
        <p className="text-gray-500 text-sm mt-1">
          Hammadde ve üretim süreçlerini vurgulayan tutarlı DALL-E prompt'ları üretin
        </p>
      </div>

      {/* Hata */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Seed butonu — veri yoksa */}
      {noData && (
        <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <p className="text-amber-800 mb-3">Henüz veri yok. Varsayılan malzemeler ve stil profilini yüklemek ister misiniz?</p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {seeding ? "Yükleniyor..." : "Varsayılan Verileri Yükle"}
          </button>
        </div>
      )}

      {/* Tab navigasyon */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {([
          { key: "generate", label: "Prompt Üret" },
          { key: "profiles", label: "Stil Profilleri" },
          { key: "items", label: "Malzemeler" },
          { key: "history", label: "Geçmiş" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: Prompt Üret ─── */}
      {activeTab === "generate" && (
        <div className="space-y-6">
          {/* Seçimler */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stil Profili</label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seçin...</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Malzeme</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seçin...</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Seçilen malzeme detayı */}
          {selectedItemId && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              {(() => {
                const item = items.find((i) => i.id === selectedItemId);
                if (!item) return null;
                return (
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium text-gray-700">Malzeme:</span> {item.name}</p>
                    <p><span className="font-medium text-gray-700">Açıklama:</span> {item.description}</p>
                    <p><span className="font-medium text-gray-700">Mesaj:</span> {item.message}</p>
                    <p><span className="font-medium text-gray-700">Ürünlerde:</span> {item.usedInProducts.join(", ")}</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Üret butonu */}
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedProfileId || !selectedItemId}
            className="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? "Prompt Üretiliyor..." : "DALL-E Prompt'u Üret"}
          </button>

          {/* Sonuç */}
          {generatedPrompt && (
            <div className="space-y-4">
              {/* Sahne detayı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sahne Detayı (Gemini)</label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  {sceneDetail}
                </div>
              </div>

              {/* Tam prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">DALL-E Prompt'u</label>
                  <button
                    onClick={handleCopy}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
                  >
                    {copied ? "Kopyalandı!" : "Kopyala"}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generatedPrompt}
                  rows={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono bg-gray-50"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Stil Profilleri ─── */}
      {activeTab === "profiles" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Stil Profilleri</h2>
            <button
              onClick={() => setEditingProfile({ name: "", cameraAngle: "", lighting: "", surface: "", colorPalette: "", atmosphere: "", framing: "" })}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
            >
              Yeni Profil
            </button>
          </div>

          {/* Profil listesi */}
          {profiles.map((p) => (
            <div key={p.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{p.name}</h3>
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <p>Kamera: {p.cameraAngle}</p>
                    <p>Işık: {p.lighting}</p>
                    <p>Zemin: {p.surface}</p>
                    <p>Renk: {p.colorPalette}</p>
                    <p>Atmosfer: {p.atmosphere}</p>
                    <p>Çerçeve: {p.framing}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProfile({ ...p })}
                    className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 border border-gray-200 rounded"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(p.id)}
                    className="text-xs px-2 py-1 text-red-600 hover:text-red-800 border border-red-200 rounded"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Profil edit formu */}
          {editingProfile && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  {editingProfile.id ? "Profil Düzenle" : "Yeni Profil"}
                </h3>
                <div className="space-y-3">
                  {([
                    { key: "name", label: "Profil Adı", placeholder: "Sade Minimal" },
                    { key: "cameraAngle", label: "Kamera Açısı", placeholder: "45-degree overhead angle" },
                    { key: "lighting", label: "Işık Tipi", placeholder: "Soft natural daylight from left window" },
                    { key: "surface", label: "Zemin / Arka Plan", placeholder: "Clean white marble surface" },
                    { key: "colorPalette", label: "Renk Paleti", placeholder: "Warm pastels, cream, soft gold" },
                    { key: "atmosphere", label: "Atmosfer", placeholder: "Minimal, clean, professional" },
                    { key: "framing", label: "Çerçeveleme", placeholder: "Close-up with breathing space" },
                  ] as const).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type="text"
                        value={(editingProfile as any)[key] || ""}
                        onChange={(e) => setEditingProfile((prev) => prev ? { ...prev, [key]: e.target.value } : null)}
                        placeholder={placeholder}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingProfile(null)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Malzemeler ─── */}
      {activeTab === "items" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Malzemeler</h2>
            <button
              onClick={() => setEditingItem({ name: "", description: "", message: "", usedInProductsText: "" })}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
            >
              Yeni Malzeme
            </button>
          </div>

          {/* Malzeme listesi */}
          {items.map((item) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  <p className="text-xs text-amber-600 mt-1 italic">&ldquo;{item.message}&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-1">Ürünler: {item.usedInProducts.join(", ")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem({
                      ...item,
                      usedInProductsText: item.usedInProducts.join(", "),
                    })}
                    className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 border border-gray-200 rounded"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-xs px-2 py-1 text-red-600 hover:text-red-800 border border-red-200 rounded"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Malzeme edit formu */}
          {editingItem && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                <h3 className="text-lg font-semibold mb-4">
                  {editingItem.id ? "Malzeme Düzenle" : "Yeni Malzeme"}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Malzeme Adı</label>
                    <input
                      type="text"
                      value={editingItem.name || ""}
                      onChange={(e) => setEditingItem((prev) => prev ? { ...prev, name: e.target.value } : null)}
                      placeholder="Mascarpone"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                    <input
                      type="text"
                      value={editingItem.description || ""}
                      onChange={(e) => setEditingItem((prev) => prev ? { ...prev, description: e.target.value } : null)}
                      placeholder="Günlük taze üretim"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vurgu Mesajı</label>
                    <input
                      type="text"
                      value={editingItem.message || ""}
                      onChange={(e) => setEditingItem((prev) => prev ? { ...prev, message: e.target.value } : null)}
                      placeholder="Tiramisumuzun sırrı"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıldığı Ürünler (virgülle ayır)</label>
                    <input
                      type="text"
                      value={editingItem.usedInProductsText || ""}
                      onChange={(e) => setEditingItem((prev) => prev ? { ...prev, usedInProductsText: e.target.value } : null)}
                      placeholder="Tiramisu, Cheesecake, Mascarpone Krema"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveItem}
                    className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Geçmiş ─── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Prompt Geçmişi</h2>
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">Henüz prompt üretilmemiş.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{h.ingredientName}</span>
                    <span className="text-gray-400 mx-2">/</span>
                    <span className="text-gray-500 text-sm">{h.styleProfileName}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(h.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Model: {h.model} | Maliyet: ${h.cost.toFixed(4)}</p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-amber-600 hover:text-amber-700">Prompt'u göster</summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs whitespace-pre-wrap font-mono">
                    {h.generatedPrompt}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(h.generatedPrompt);
                    }}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Kopyala
                  </button>
                </details>
              </div>
            ))
          )}
        </div>
      )}

      {/* Yükleniyor */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      )}
    </div>
  );
}

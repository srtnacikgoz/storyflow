import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import ImageUpload from "../components/ImageUpload";
import type {
  ProductCategory,
  AIModel,
  StyleVariant,
  SchedulingMode,
  CaptionTemplate,
  TimeSlotRecommendation,
  QueueItem,
} from "../types";

// Kategori seçenekleri
const categories: { value: ProductCategory; label: string }[] = [
  { value: "chocolate", label: "Çikolata" },
  { value: "viennoiserie", label: "Viennoiserie" },
  { value: "coffee", label: "Kahve" },
  { value: "small-desserts", label: "Küçük Tatlılar" },
  { value: "slice-cakes", label: "Dilim Pastalar" },
  { value: "big-cakes", label: "Büyük Pastalar" },
  { value: "profiterole", label: "Profiterol" },
  { value: "special-orders", label: "Özel Siparişler" },
];

// Stil seçenekleri
const styleOptions: { value: StyleVariant; label: string; desc: string }[] = [
  { value: "pure-minimal", label: "Pure Minimal", desc: "Maksimum negatif alan" },
  { value: "lifestyle-moments", label: "Lifestyle", desc: "Sıcak, insan dokunuşu" },
  { value: "rustic-warmth", label: "Rustic", desc: "Ahşap, doğal dokular" },
  { value: "french-elegance", label: "French", desc: "Şık, zarif sunum" },
];

export default function AddPhoto() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Edit mode için orijinal item
  const [editItem, setEditItem] = useState<QueueItem | null>(null);

  // Form state
  const [imageUrl, setImageUrl] = useState("");
  const [productCategory, setProductCategory] = useState<ProductCategory>("chocolate");
  const [productName, setProductName] = useState("");
  const [caption, setCaption] = useState("");

  // AI Enhancement state
  const [aiModel, setAiModel] = useState<AIModel>("gemini-flash");
  const [styleVariant, setStyleVariant] = useState<StyleVariant>("lifestyle-moments");
  const [faithfulness, setFaithfulness] = useState(0.7);

  // Caption Template state
  const [templates, setTemplates] = useState<CaptionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [captionPreview, setCaptionPreview] = useState("");

  // Scheduling state
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("immediate");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [bestTimeToday, setBestTimeToday] = useState<TimeSlotRecommendation | null>(null);

  // Edit mode: Item'ı yükle
  useEffect(() => {
    if (editId) {
      const loadEditItem = async () => {
        try {
          const item = await api.getQueueItem(editId);
          setEditItem(item);

          // Formu doldur
          setImageUrl(item.originalUrl);
          setProductCategory(item.productCategory);
          setProductName(item.productName || "");
          setCaption(item.caption || "");
          setAiModel(item.aiModel || "gemini-flash");
          setStyleVariant(item.styleVariant || "lifestyle-moments");
          setFaithfulness(item.faithfulness ?? 0.7);
          setSchedulingMode(item.schedulingMode || "immediate");

          // Şablon bilgileri
          if (item.captionTemplateId) {
            setSelectedTemplateId(item.captionTemplateId);
          }
          if (item.captionVariables) {
            setTemplateVariables(item.captionVariables);
          }

          // Zamanlanmış tarih
          if (item.scheduledFor) {
            const date = new Date(item.scheduledFor);
            setScheduledDateTime(date.toISOString().slice(0, 16));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Öğe yüklenemedi");
        } finally {
          setLoadingEdit(false);
        }
      };
      loadEditItem();
    }
  }, [editId]);

  // Şablonları ve en iyi zamanı yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        // Şablonları yükle
        const templatesData = await api.getTemplates();
        const activeTemplates = templatesData.filter((t) => t.isActive);
        setTemplates(activeTemplates);

        // Edit modunda şablon seçili değilse, varsayılanı seç
        if (!editId) {
          const defaultTemplate = activeTemplates.find((t) => t.isDefault);
          if (defaultTemplate) {
            setSelectedTemplateId(defaultTemplate.id);
          }
        }

        // Bugün için en iyi zamanı yükle
        const bestTime = await api.getBestTimeToday();
        setBestTimeToday(bestTime);
      } catch (err) {
        console.error("Veri yüklenemedi:", err);
      }
    };
    loadData();
  }, [editId]);

  // Seçili şablon değiştiğinde değişkenleri sıfırla (sadece yeni ekleme modunda)
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    // Edit modunda ve şablon değişkenleri zaten varsa atla
    if (editItem?.captionTemplateId === selectedTemplateId && Object.keys(templateVariables).length > 0) {
      return;
    }

    if (selectedTemplate) {
      // Text ve select değişkenler için varsayılan değerleri ayarla
      const defaults: Record<string, string> = {};
      for (const v of selectedTemplate.variables) {
        if (v.type !== "auto") {
          defaults[v.key] = v.defaultValue || (v.options?.[0] || "");
        }
      }
      setTemplateVariables(defaults);
    }
  }, [selectedTemplateId, selectedTemplate]);

  // Caption önizlemesini güncelle
  useEffect(() => {
    if (selectedTemplate) {
      let preview = selectedTemplate.template;
      for (const v of selectedTemplate.variables) {
        const placeholder = `{${v.key}}`;
        let value = "";
        if (v.type === "auto" && v.autoSource === "productName") {
          value = productName || "(ürün adı)";
        } else {
          value = templateVariables[v.key] || "";
        }
        preview = preview.split(placeholder).join(value);
      }
      setCaptionPreview(preview);
    } else {
      setCaptionPreview("");
    }
  }, [selectedTemplate, templateVariables, productName]);

  const handleUploadComplete = (url: string) => {
    setImageUrl(url);
    setError(null);
  };

  const handleUploadError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageUrl) {
      setError("Lütfen bir fotoğraf yükleyin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Şablondan caption oluştur veya manuel caption kullan
      const finalCaption = selectedTemplate ? captionPreview : caption;

      // Zamanlama hesapla
      let scheduledFor: number | undefined;
      if (schedulingMode === "scheduled" && scheduledDateTime) {
        scheduledFor = new Date(scheduledDateTime).getTime();
      }

      if (editId) {
        // Update modu
        await api.updateQueueItem(editId, {
          productCategory,
          productName: productName || undefined,
          caption: finalCaption || undefined,
          aiModel,
          styleVariant,
          faithfulness,
          captionTemplateId: selectedTemplateId || undefined,
          captionTemplateName: selectedTemplate?.name,
          captionVariables: Object.keys(templateVariables).length > 0
            ? templateVariables
            : undefined,
          schedulingMode,
          scheduledFor,
        });
      } else {
        // Yeni ekleme modu
        await api.addToQueue({
          originalUrl: imageUrl,
          productCategory,
          productName: productName || undefined,
          caption: finalCaption || undefined,
          aiModel,
          styleVariant,
          faithfulness,
          captionTemplateId: selectedTemplateId || undefined,
          captionTemplateName: selectedTemplate?.name,
          captionVariables: Object.keys(templateVariables).length > 0
            ? templateVariables
            : undefined,
          schedulingMode,
          scheduledFor,
        });
      }

      setSuccess(true);

      // 2 saniye sonra kuyruğa yönlendir
      setTimeout(() => {
        navigate("/queue");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setLoading(false);
    }
  };

  // Edit modu yüklenirken loading göster
  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {editId ? "Değişiklikler Kaydedildi!" : "Fotoğraf Eklendi!"}
        </h2>
        <p className="text-gray-500 mt-2">Kuyruğa yönlendiriliyorsunuz...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {editId ? "Fotoğrafı Düzenle" : "Fotoğraf Ekle"}
        </h1>
        <p className="text-gray-500 mt-1">
          {editId ? "Kuyruk öğesini düzenleyin" : "Kuyruğa yeni fotoğraf ekleyin"}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Image Upload / Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotoğraf <span className="text-red-500">*</span>
          </label>
          {editId ? (
            // Edit modunda mevcut fotoğrafı göster
            <div className="relative">
              <img
                src={imageUrl}
                alt="Mevcut fotoğraf"
                className="w-full h-48 object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-lg">
                  Fotoğraf değiştirilemez
                </span>
              </div>
            </div>
          ) : (
            // Yeni ekleme modunda upload
            <>
              <ImageUpload
                onUploadComplete={handleUploadComplete}
                onError={handleUploadError}
              />
              {imageUrl && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Fotoğraf yüklendi
                </p>
              )}
            </>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700 mb-2">
            Kategori <span className="text-red-500">*</span>
          </label>
          <select
            id="productCategory"
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value as ProductCategory)}
            className="input"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ürün Adı */}
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
            Ürün Adı
          </label>
          <input
            type="text"
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Bitter Çikolata"
            className="input"
          />
        </div>

        {/* Başlık Şablonu */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlık Şablonu
            </label>
            {templates.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedTemplateId === template.id
                        ? "border-brand-mustard bg-brand-mustard/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {template.name}
                      {template.isDefault && (
                        <span className="ml-1 text-xs text-brand-mustard">(varsayılan)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId("")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedTemplateId === ""
                      ? "border-gray-500 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">Manuel</div>
                  <div className="text-xs text-gray-500 mt-0.5">Kendin yaz</div>
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Şablonlar yükleniyor...</p>
            )}
          </div>

          {/* Şablon değişkenleri (auto hariç) */}
          {selectedTemplate && selectedTemplate.variables.filter((v) => v.type !== "auto").length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Şablon Değişkenleri
              </label>
              {selectedTemplate.variables
                .filter((v) => v.type !== "auto")
                .map((variable) => (
                  <div key={variable.key}>
                    <label className="block text-xs text-gray-600 mb-1">
                      {variable.label}
                      {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {variable.type === "select" ? (
                      <select
                        value={templateVariables[variable.key] || ""}
                        onChange={(e) =>
                          setTemplateVariables((prev) => ({
                            ...prev,
                            [variable.key]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        {variable.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={templateVariables[variable.key] || ""}
                        onChange={(e) =>
                          setTemplateVariables((prev) => ({
                            ...prev,
                            [variable.key]: e.target.value,
                          }))
                        }
                        placeholder={variable.defaultValue || ""}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Önizleme */}
          {selectedTemplate && captionPreview && (
            <div className="bg-brand-mustard/10 rounded-xl p-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Başlık Önizleme
              </label>
              <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                {captionPreview}
              </pre>
            </div>
          )}

          {/* Manuel caption (şablon seçilmemişse) */}
          {!selectedTemplateId && (
            <div>
              <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                Manuel Başlık
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Story için açıklama..."
                rows={3}
                className="input resize-none"
              />
            </div>
          )}
        </div>

        {/* AI Enhancement Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">AI Görsel İyileştirme</span>
          </div>
        </div>

        {/* AI Model Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            AI Model
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAiModel("gemini-flash")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiModel === "gemini-flash"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">Gemini Flash</div>
              <div className="text-sm text-gray-500">Hızlı • $0.01</div>
              <div className="text-xs text-gray-400 mt-1">Test/günlük için</div>
            </button>

            <button
              type="button"
              onClick={() => setAiModel("gemini-pro")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiModel === "gemini-pro"
                  ? "border-amber-500 bg-amber-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">Gemini Pro</div>
              <div className="text-sm text-gray-500">Kalite • $0.04</div>
              <div className="text-xs text-gray-400 mt-1">Final paylaşımlar</div>
            </button>

            <button
              type="button"
              onClick={() => setAiModel("none")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiModel === "none"
                  ? "border-gray-500 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">AI Kapalı</div>
              <div className="text-sm text-gray-500">Orijinal</div>
              <div className="text-xs text-gray-400 mt-1">İşleme yok</div>
            </button>
          </div>
        </div>

        {/* Stil Seçimi - Sadece AI açıksa göster */}
        {aiModel !== "none" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Görsel Stili
              </label>
              <div className="grid grid-cols-2 gap-3">
                {styleOptions.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setStyleVariant(style.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      styleVariant === style.value
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">{style.label}</div>
                    <div className="text-xs text-gray-500">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Faithfulness Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orijinale Sadakat: <span className="text-blue-600">{Math.round(faithfulness * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.1"
                value={faithfulness}
                onChange={(e) => setFaithfulness(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Yaratıcı</span>
                <span>Orijinale Sadık</span>
              </div>
            </div>
          </>
        )}

        {/* Scheduling Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">Paylaşım Zamanı</span>
          </div>
        </div>

        {/* Scheduling Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Ne Zaman Paylaşılsın?
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSchedulingMode("immediate")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                schedulingMode === "immediate"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">Hemen</div>
              <div className="text-xs text-gray-500 mt-1">Onay sonrası direkt</div>
            </button>

            <button
              type="button"
              onClick={() => setSchedulingMode("optimal")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                schedulingMode === "optimal"
                  ? "border-brand-mustard bg-brand-mustard/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">En İyi Zaman</div>
              <div className="text-xs text-gray-500 mt-1">
                {bestTimeToday
                  ? `${bestTimeToday.hourFormatted} (${bestTimeToday.score})`
                  : "Hesaplanıyor..."}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSchedulingMode("scheduled")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                schedulingMode === "scheduled"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">Manuel</div>
              <div className="text-xs text-gray-500 mt-1">Tarih/saat seç</div>
            </button>
          </div>
        </div>

        {/* Date/Time Picker - Sadece scheduled modda */}
        {schedulingMode === "scheduled" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paylaşım Tarihi ve Saati
            </label>
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="input"
            />
          </div>
        )}

        {/* Optimal mode info */}
        {schedulingMode === "optimal" && bestTimeToday && (
          <div className="bg-brand-mustard/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-mustard/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-brand-mustard" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Bugün {bestTimeToday.hourFormatted} öneriliyor
                </p>
                <p className="text-sm text-gray-500">
                  Skor: {bestTimeToday.score} • {bestTimeToday.basedOnPosts > 0
                    ? `${bestTimeToday.basedOnPosts} paylaşım verisi`
                    : "Araştırma verisi"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !imageUrl || (schedulingMode === "scheduled" && !scheduledDateTime)}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading
              ? (editId ? "Kaydediliyor..." : "Ekleniyor...")
              : editId
                ? "Değişiklikleri Kaydet"
                : (schedulingMode === "immediate" ? "Kuyruğa Ekle" : "Zamanla")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/queue")}
            className="btn-secondary"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}

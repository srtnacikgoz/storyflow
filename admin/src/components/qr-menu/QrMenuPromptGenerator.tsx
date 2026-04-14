import { useState } from "react";
import InputWithRecent from "../InputWithRecent";

// Sabit arka plan rengi — tüm QrMenu görselleri aynı tonu kullanır
const BG_COLOR = "#F0E6D8";

// Zemin dokusu seçenekleri
const TEXTURES = [
  { id: "sandy-matte", label: "Kumlu Matte", prompt: "sandy matte" },
  { id: "smooth-concrete", label: "Pürüzsüz Beton", prompt: "smooth concrete" },
  { id: "fine-linen", label: "İnce Keten", prompt: "fine linen fabric" },
] as const;

/** Sabit şablondan prompt oluştur — API çağrısı yok */
function buildPrompt(
  productName: string,
  texturePrompt: string,
  scattered: string,
  onPlate: boolean,
): string {
  const lines = [
    `Professional product photo of "${productName}" on a warm cream (${BG_COLOR}) ${texturePrompt} surface.`,
    scattered.trim()
      ? `Scattered around the base in minimal quantity (2-3 pieces for solid items like fruit or candy, light dusting for powders/crumbs): ${scattered.trim()}.`
      : "",
    onPlate
      ? "Served on an appropriate ceramic plate or dish that suits the product's form and size. The plate's color and material must harmonize with the warm cream background tone."
      : "Product placed directly on surface, no plate, no dish.",
    `Overhead soft diffused lighting, 5000K neutral daylight, 2:1 key-to-fill ratio, minimal soft shadow beneath product.`,
    `Clean, minimal, catalog-quality food photography. No text, no watermark, no branding.`,
  ];
  return lines.filter(Boolean).join("\n");
}

export default function QrMenuPromptGenerator() {
  const [productName, setProductName] = useState("");
  const [selectedTexture, setSelectedTexture] = useState(TEXTURES[0].id);
  const [scattered, setScattered] = useState("");
  const [onPlate, setOnPlate] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const handleBuild = () => {
    if (!productName.trim()) return;
    const tex = TEXTURES.find(t => t.id === selectedTexture) || TEXTURES[0];
    setPrompt(buildPrompt(productName.trim(), tex.prompt, scattered, onPlate));
    setPromptCopied(false);
  };

  const handleCopy = async () => {
    if (!prompt.trim()) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch { /* kullanıcı textarea'dan kopyalayabilir */ }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">Ürün Görseli Prompt</h2>
        <p className="text-xs text-gray-400 mt-0.5">ChatGPT / DALL-E için ürün fotoğrafı promptu oluştur</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Ürün Adı */}
        <InputWithRecent
          storageKey="qrmenu_product"
          value={productName}
          onChange={setProductName}
          placeholder="ör: Klasik Dilim Çikolatalı Pasta (~8cm)"
          label="Ürün Adı *"
        />

        {/* Zemin Dokusu */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Zemin Dokusu</label>
          <select
            value={selectedTexture}
            onChange={e => setSelectedTexture(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
          >
            {TEXTURES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Zemin Detayları */}
        <InputWithRecent
          storageKey="qrmenu_scattered"
          value={scattered}
          onChange={setScattered}
          placeholder="ör: antepfıstığı kırıntıları, birkaç ahududu tanesi, pudra şekeri tozu"
          label="Zemin Detayları (opsiyonel)"
        />

        {/* Tabakta Sun */}
        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-teal-50/30 hover:border-teal-200 transition">
          <input
            type="checkbox"
            checked={onPlate}
            onChange={e => setOnPlate(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-800">Tabakta sun</span>
            <p className="text-[11px] text-gray-500 mt-0.5">Ürün formuna uygun tabak/kase/tahtada sunulur</p>
          </div>
        </label>

        {/* Promptu Oluştur */}
        <button
          onClick={handleBuild}
          disabled={!productName.trim()}
          className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Promptu Oluştur
        </button>

        {/* Prompt Gösterimi */}
        {prompt && (
          <div className="relative">
            <div className="bg-gray-900 rounded-xl p-4 max-h-60 overflow-y-auto">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">{prompt}</pre>
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition backdrop-blur-sm"
            >
              {promptCopied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

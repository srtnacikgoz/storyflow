import { useState } from "react";
import type { SceneAnalysisResult, ProductAnalysisResult } from "../../types";

// --- Tip Tanımlamaları ---

type AnalysisResultPanelProps =
  | { type: "scene"; result: SceneAnalysisResult }
  | { type: "product"; result: ProductAnalysisResult };

interface PropCardProps {
  dot: string;
  label: string;
  value: string;
  detail?: string;
}

interface CopyButtonProps {
  text: string;
}

// --- Dot renk haritası ---

const DOT_COLORS: Record<string, string> = {
  amber: "bg-amber-400",
  yellow: "bg-yellow-400",
  stone: "bg-stone-400",
  violet: "bg-violet-400",
  blue: "bg-blue-400",
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
  cyan: "bg-cyan-400",
};

// --- Yardımcı Bileşenler ---

function PropCard({ dot, label, value, detail }: PropCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[dot] ?? "bg-gray-400"}`} />
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-xs text-gray-800 font-semibold leading-tight">{value}</span>
      {detail && (
        <span className="text-[10px] text-gray-500 leading-tight">{detail}</span>
      )}
    </div>
  );
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Kopyalama başarısız
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
    >
      {copied ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}

// --- Sahne Görünümü ---

function SceneView({ result }: { result: SceneAnalysisResult }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Renk paleti */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Renk Paleti</span>
        <div className="flex flex-wrap gap-1">
          {result.colorPalette.map((hex, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className="w-7 h-7 rounded border border-gray-200"
                style={{ backgroundColor: hex }}
                title={hex}
              />
              <span className="text-[9px] font-mono text-gray-500">{hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2x2 kart gridi */}
      <div className="grid grid-cols-2 gap-2">
        <PropCard
          dot="amber"
          label="Arkaplan"
          value={result.background.type}
          detail={result.background.description}
        />
        <PropCard
          dot="yellow"
          label="Işık"
          value={`${result.lighting.direction} · ${result.lighting.quality}`}
          detail={result.lighting.description}
        />
        <PropCard
          dot="stone"
          label="Yüzey"
          value={`${result.surface.material} · ${result.surface.texture}`}
          detail={result.surface.description}
        />
        <PropCard
          dot="violet"
          label="Ambians"
          value={result.ambiance.mood}
          detail={result.ambiance.adjectives.join(", ")}
        />
        <PropCard
          dot="blue"
          label="Kamera"
          value={result.cameraAngle}
          detail={`Ürün çerçevesi %${Math.round(result.productFrameRatio * 100)}`}
        />
        <PropCard
          dot="emerald"
          label="Altlık"
          value={result.servingBase.type}
          detail={result.servingBase.description}
        />
        <PropCard
          dot="rose"
          label="Prop"
          value={result.propRules.allowed ? "İzinli" : "Yasak"}
          detail={result.propRules.description}
        />
        <PropCard
          dot="cyan"
          label="Derinlik"
          value={result.depthOfField.foreground}
          detail={result.depthOfField.background}
        />
      </div>

      {/* Sahne prompt */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Sahne Prompt</span>
          <CopyButton text={result.scenePrompt} />
        </div>
        <pre className="bg-gray-900 rounded-xl p-3 text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
          {result.scenePrompt}
        </pre>
      </div>
    </div>
  );
}

// --- Ürün Görünümü ---

function ProductView({ result }: { result: ProductAnalysisResult }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Ürün başlığı */}
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-bold text-gray-800">{result.name}</span>
        <span className="text-[10px] text-gray-500 font-mono">
          {result.type} · {result.shape} · {result.sizeCm}
        </span>
      </div>

      {/* Renk satırı */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Renkler</span>
        <div className="flex flex-wrap gap-1">
          {result.colors.map((hex, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className="w-6 h-6 rounded border border-gray-200"
                style={{ backgroundColor: hex }}
                title={hex}
              />
              <span className="text-[9px] font-mono text-gray-500">{hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2x2 özellik kartları */}
      <div className="grid grid-cols-2 gap-2">
        <PropCard
          dot="stone"
          label="Yüzey Dokusu"
          value={result.surfaceTexture}
        />
        <PropCard
          dot="amber"
          label="Katmanlar"
          value={result.layers}
        />
        <PropCard
          dot="rose"
          label="Toppings"
          value={result.toppings.join(", ") || "—"}
        />
        <PropCard
          dot="emerald"
          label="Garnitür"
          value={result.garnish || "—"}
        />
      </div>

      {/* Ayırt edici özellikler */}
      {result.distinguishingFeatures && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
          <span className="text-[10px] text-amber-700 font-medium uppercase tracking-wide block mb-1">
            Ayırt Edici Özellikler
          </span>
          <span className="text-xs text-amber-900 leading-snug">{result.distinguishingFeatures}</span>
        </div>
      )}

      {/* Ürün prompt */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Ürün Prompt</span>
          <CopyButton text={result.productPrompt} />
        </div>
        <pre className="bg-gray-900 rounded-xl p-3 text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
          {result.productPrompt}
        </pre>
      </div>
    </div>
  );
}

// --- Ana Bileşen ---

export default function AnalysisResultPanel(props: AnalysisResultPanelProps) {
  if (props.type === "scene") {
    return <SceneView result={props.result} />;
  }
  return <ProductView result={props.result} />;
}

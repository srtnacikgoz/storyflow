import { useState } from "react";

type OS = "mac" | "windows";

export default function ImageUpscale() {
  const [filePath, setFilePath] = useState("");
  const [os, setOs] = useState<OS>("mac");
  const [scale, setScale] = useState<2 | 3 | 4>(4);
  const [copied, setCopied] = useState(false);

  // Yapıştırılan yoldan gereksiz tırnakları temizle
  const cleanPath = (p: string) => p.replace(/^['"]|['"]$/g, "").trim();

  // Çıktı dosya yolunu oluştur
  const getOutputPath = (input: string) => {
    const lastDot = input.lastIndexOf(".");
    if (lastDot === -1) return input + `_${scale}x`;
    return input.substring(0, lastDot) + `_${scale}x` + input.substring(lastDot);
  };

  const cleanedPath = cleanPath(filePath);

  const command = os === "mac"
    ? `cd ~/Desktop/realesrgan/realesrgan-ncnn-vulkan-v0.2.0-macos && ./realesrgan-ncnn-vulkan -i "${cleanedPath}" -o "${getOutputPath(cleanedPath)}" -s ${scale} -n realesrgan-x4plus`
    : `cd %USERPROFILE%\\Desktop\\realesrgan && realesrgan-ncnn-vulkan.exe -i "${cleanedPath}" -o "${getOutputPath(cleanedPath)}" -s ${scale} -n realesrgan-x4plus`;

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Başlık */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Görsel Büyüt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-ESRGAN ile görselleri baskı kalitesine yükselt. Komutu kopyala, Terminal'e yapıştır.
        </p>
      </div>

      <div className="space-y-5">
        {/* Dosya Yolu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Dosya Yolu</label>
          <input
            type="text"
            value={filePath}
            onChange={e => setFilePath(e.target.value)}
            placeholder={os === "mac"
              ? "/Users/sertan/Desktop/poster.png"
              : "C:\\Users\\sertan\\Desktop\\poster.png"
            }
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
          />
          <p className="text-[11px] text-gray-400 mt-1.5">
            Dosyayı Terminal'e sürükleyerek yolunu kopyalayabilirsin.
          </p>
        </div>

        {/* OS + Scale — yan yana */}
        <div className="grid grid-cols-2 gap-4">
          {/* İşletim Sistemi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">İşletim Sistemi</label>
            <div className="flex gap-2">
              {([
                { value: "mac" as OS, label: "Mac", icon: "🍎" },
                { value: "windows" as OS, label: "Windows", icon: "🪟" },
              ]).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setOs(value)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition ${
                    os === value
                      ? "border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Büyütme Oranı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Büyütme</label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                    scale === s
                      ? "border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Komut Çıktısı */}
        {filePath.trim() && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Terminal Komutu</label>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 text-xs rounded-xl px-4 py-4 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                {command}
              </pre>
              <button
                onClick={handleCopy}
                className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {copied ? "Kopyalandı!" : "Kopyala"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Çıktı: <span className="font-mono">{getOutputPath(filePath.split("/").pop() || filePath.split("\\").pop() || "")}</span>
            </p>
          </div>
        )}

        {/* Bilgi kutusu */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-800 font-medium mb-1">Kurulum gerekli</p>
          <p className="text-[11px] text-amber-700">
            Real-ESRGAN'ı henüz indirmediysen:{" "}
            <a
              href="https://github.com/xinntao/Real-ESRGAN"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              github.com/xinntao/Real-ESRGAN
            </a>
            {" "}— masaüstüne <span className="font-mono">realesrgan</span> klasörü olarak çıkar.
          </p>
        </div>
      </div>
    </div>
  );
}

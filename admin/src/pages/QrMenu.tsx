import QrMenuPromptGenerator from "../components/qr-menu/QrMenuPromptGenerator";

export default function QrMenu() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Menü</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ürün fotoğrafı promptu oluştur — ChatGPT / DALL-E'ye yapıştır
        </p>
      </div>

      <QrMenuPromptGenerator />
    </div>
  );
}

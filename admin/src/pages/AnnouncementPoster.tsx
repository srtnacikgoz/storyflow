import { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import AnnouncementPreview from '../components/announcement/AnnouncementPreview';
import type { TemplateId } from '../components/announcement/AnnouncementPreview';

// --- Sabitler ---

type AnnouncementType = 'new-product' | 'campaign' | 'special-day' | 'seasonal' | 'general';

const ANNOUNCEMENT_TYPES = [
  { id: 'new-product' as const, label: 'Yeni Ürün', badge: 'YENİ', accent: '#D4A945', bg: '#FFFFFF', text: '#1a1a1a' },
  { id: 'campaign' as const, label: 'Kampanya', badge: 'KAMPANYA', accent: '#C0392B', bg: '#FFFFFF', text: '#1a1a1a' },
  { id: 'special-day' as const, label: 'Özel Gün', badge: 'ÖZEL', accent: '#8E6B3E', bg: '#FDF8F0', text: '#1a1a1a' },
  { id: 'seasonal' as const, label: 'Sezonluk', badge: 'SEZON', accent: '#5B8C5A', bg: '#FFFFFF', text: '#1a1a1a' },
  { id: 'general' as const, label: 'Genel Duyuru', badge: '', accent: '#D4A945', bg: '#FFFFFF', text: '#1a1a1a' },
];

const TEMPLATES: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'classic', label: 'Klasik', desc: 'Görsel üstte, metin altta' },
  { id: 'showcase', label: 'Vitrin', desc: 'Tam sayfa görsel + metin' },
  { id: 'band', label: 'Bant', desc: 'Görsel + renkli bant' },
  { id: 'minimal', label: 'Minimal', desc: 'Sade ve ferah' },
];

const POSTER_SIZES = [
  { key: 'ig-post', label: 'Instagram Post', desc: '1080×1350', width: 1080, height: 1350, ratio: '4 / 5' },
  { key: 'ig-story', label: 'Instagram Story', desc: '1080×1920', width: 1080, height: 1920, ratio: '9 / 16' },
  { key: 'a3', label: 'A3 Baskı', desc: '29.7×42cm', width: 3508, height: 4961, ratio: '3 / 4' },
  { key: '40x60', label: '40×60 Baskı', desc: '40×60cm', width: 4724, height: 7087, ratio: '2 / 3' },
];

// --- Mini şablon önizleme SVG'leri ---

function TemplateThumbnail({ id }: { id: TemplateId }) {
  const cls = 'w-full aspect-[3/4] rounded bg-gray-50 mb-1.5 flex flex-col overflow-hidden';
  if (id === 'classic') return (
    <div className={cls}>
      <div className="mx-auto mt-1.5 w-3 h-1 rounded-full bg-amber-400" />
      <div className="mx-1.5 mt-1 flex-1 rounded-sm bg-gray-300" />
      <div className="mx-2 my-1.5 space-y-0.5">
        <div className="h-1 bg-gray-400 rounded" />
        <div className="h-0.5 bg-gray-200 rounded w-3/4 mx-auto" />
      </div>
    </div>
  );
  if (id === 'showcase') return (
    <div className={cls}>
      <div className="flex-1 bg-gray-300 relative">
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-gray-100 to-transparent" />
        <div className="absolute bottom-1 left-1 space-y-0.5">
          <div className="h-1 w-4 bg-gray-500 rounded" />
          <div className="h-0.5 w-3 bg-gray-400 rounded" />
        </div>
      </div>
    </div>
  );
  if (id === 'band') return (
    <div className={cls}>
      <div className="flex-1 bg-gray-300" />
      <div className="h-2/5 bg-amber-400 px-1 pt-0.5">
        <div className="h-0.5 w-3 bg-white/60 rounded" />
        <div className="h-1 w-5 bg-white rounded mt-0.5" />
      </div>
      <div className="h-1.5 bg-gray-100" />
    </div>
  );
  return (
    <div className={cls}>
      <div className="mt-1.5 mx-auto h-0.5 w-4 bg-gray-400 rounded" />
      <div className="mx-auto mt-0.5 w-1 h-1 rounded-full bg-amber-400" />
      <div className="mx-3 mt-0.5 h-0.5 bg-gray-400 rounded" />
      <div className="mx-2 mt-1 flex-1 max-h-4 rounded-sm bg-gray-200" />
      <div className="mx-3 my-1.5 h-0.5 bg-gray-200 rounded" />
    </div>
  );
}

// --- Ana Sayfa ---

export default function AnnouncementPoster() {
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('new-product');
  const [templateId, setTemplateId] = useState<TemplateId>('classic');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [badge, setBadge] = useState('YENİ');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateOrPrice, setDateOrPrice] = useState('');
  const [accentColor, setAccentColor] = useState('#D4A945');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#1a1a1a');
  const [sizeKey, setSizeKey] = useState('ig-post');
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSize = POSTER_SIZES.find(s => s.key === sizeKey)!;

  // Duyuru tipi değişince varsayılanları güncelle
  const handleTypeChange = (typeId: AnnouncementType) => {
    const type = ANNOUNCEMENT_TYPES.find(t => t.id === typeId)!;
    setAnnouncementType(typeId);
    setBadge(type.badge);
    setAccentColor(type.accent);
    setBgColor(type.bg);
    setTextColor(type.text);
  };

  // Görsel yükleme
  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  };

  // Clipboard paste desteği
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { e.preventDefault(); loadImage(file); break; }
        }
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [loadImage]);

  // PNG export
  const handleDownload = useCallback(async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const scale = selectedSize.width / posterRef.current.offsetWidth;
      const dataUrl = await toPng(posterRef.current, {
        width: selectedSize.width,
        height: selectedSize.height,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${posterRef.current.offsetWidth}px`,
          height: `${posterRef.current.offsetHeight}px`,
        },
        backgroundColor: bgColor,
      });
      const link = document.createElement('a');
      link.download = `sade-duyuru-${sizeKey}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('İndirme başarısız: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setDownloading(false);
    }
  }, [selectedSize, sizeKey, bgColor]);

  // --- Render ---

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Duyuru Posteri</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ürün fotoğrafı + duyuru bilgisiyle poster oluştur, Instagram veya baskı için indir.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SOL — Form */}
        <div className="space-y-4">

          {/* Duyuru Tipi */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Duyuru Tipi</p>
            <div className="flex flex-wrap gap-2">
              {ANNOUNCEMENT_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    announcementType === t.id
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={announcementType === t.id ? { backgroundColor: t.accent } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Şablon Seçimi */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Şablon</p>
            <div className="grid grid-cols-4 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`p-2 rounded-xl border-2 transition text-center ${
                    templateId === t.id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                  title={t.desc}
                >
                  <TemplateThumbnail id={t.id} />
                  <span className="text-[11px] font-medium text-gray-700">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Görsel Yükleme */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Ürün Görseli</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
            {imageDataUrl ? (
              <div className="relative group">
                <img src={imageDataUrl} alt="Ürün" className="w-full max-h-48 object-contain rounded-xl bg-gray-50" />
                <button
                  onClick={() => { setImageDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition ${
                  dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-400">Sürükle, tıkla veya Ctrl+V ile yapıştır</span>
              </div>
            )}
            {(sizeKey === 'a3' || sizeKey === '40x60') && (
              <p className="text-[11px] text-amber-600 mt-2">Baskı için yüksek çözünürlüklü görsel önerilir.</p>
            )}
          </div>

          {/* Metin Girişleri */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700 mb-1">İçerik</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Etiket (badge)</label>
              <input type="text" value={badge} onChange={e => setBadge(e.target.value)}
                placeholder="ör: YENİ, KAMPANYA, %20 İNDİRİM"
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Başlık</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="ör: Fıstıklı Baklava Cheesecake"
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm font-semibold" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Alt Başlık</label>
              <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)}
                placeholder="ör: Sınırlı süre"
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Açıklama</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="ör: Taze fıstık, özel cheesecake kreması ve baklava katmanlarıyla..."
                rows={2}
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tarih / Fiyat / Bilgi</label>
              <input type="text" value={dateOrPrice} onChange={e => setDateOrPrice(e.target.value)}
                placeholder="ör: ₺180 · 12-14 Nisan"
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm" />
            </div>
          </div>

          {/* Renkler */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Renkler</p>
            <div className="flex gap-4">
              {[
                { label: 'Vurgu', value: accentColor, set: setAccentColor },
                { label: 'Arka Plan', value: bgColor, set: setBgColor },
                { label: 'Metin', value: textColor, set: setTextColor },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2">
                  <input type="color" value={c.value} onChange={e => c.set(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer" />
                  <span className="text-xs text-gray-500">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Poster Boyutu */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Poster Boyutu</p>
            <div className="grid grid-cols-2 gap-2">
              {POSTER_SIZES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSizeKey(s.key)}
                  className={`rounded-xl py-2 px-3 text-sm font-medium transition ${
                    sizeKey === s.key
                      ? 'bg-amber-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div>{s.label}</div>
                  <div className={`text-xs mt-0.5 ${sizeKey === s.key ? 'text-amber-200' : 'text-gray-400'}`}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* İndir Butonu */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-sm transition shadow-sm"
          >
            {downloading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Hazırlanıyor...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PNG İndir ({selectedSize.label})
              </>
            )}
          </button>
        </div>

        {/* SAĞ — Canlı Önizleme */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Önizleme</p>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <AnnouncementPreview
                ref={posterRef}
                templateId={templateId}
                imageDataUrl={imageDataUrl}
                badge={badge}
                title={title}
                subtitle={subtitle}
                description={description}
                dateOrPrice={dateOrPrice}
                accentColor={accentColor}
                bgColor={bgColor}
                textColor={textColor}
                aspectRatio={selectedSize.ratio}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

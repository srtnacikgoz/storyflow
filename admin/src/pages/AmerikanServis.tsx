import { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// --- Tipler ---

interface ServisItem {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

interface ServisConfig {
  id: string;
  name: string;
  items: ServisItem[];
  title: string;
  subtitle: string;
  footerText: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// --- Sabitler ---

const COLLECTION_NAME = 'amerikanServisConfigs';
const nextId = () => crypto.randomUUID();

const OUTPUT_FORMATS = [
  { key: 'a3', label: 'A3 Tepsi Kağıdı', desc: '29.7×42cm', width: 3508, height: 4961 },
  { key: 'a4', label: 'A4 Tepsi Kağıdı', desc: '21×29.7cm', width: 2480, height: 3508 },
  { key: 'insta-post', label: 'Instagram Post', desc: '1080×1080', width: 1080, height: 1080 },
  { key: 'insta-story', label: 'Instagram Story', desc: '1080×1920', width: 1080, height: 1920 },
] as const;

type OutputFormatKey = (typeof OUTPUT_FORMATS)[number]['key'];

const DEFAULT_ITEMS: Omit<ServisItem, 'id'>[] = [
  { name: 'Mascarpone', description: 'Her gün Sade imalathanesinde taze üretilir', sortOrder: 0, isActive: true },
  { name: 'Meyve Confitleri', description: 'Mevsim meyvelerinden, Sade mutfağında pişirilir', sortOrder: 1, isActive: true },
  { name: 'Ganaj Çeşitleri', description: 'Günlük taze çikolata ile her sabah hazırlanır', sortOrder: 2, isActive: true },
  { name: 'Tart Hamurları', description: 'Tereyağı ile Sade fırınında günlük üretim', sortOrder: 3, isActive: true },
  { name: 'Fındık Praline', description: '%100 fındık ile Sade üretimidir', sortOrder: 4, isActive: true },
  { name: 'Tiramisu Keki', description: 'İtalyan tarifle Sade imalathanesinde pişirilir', sortOrder: 5, isActive: true },
  { name: 'Pesto Sosu', description: 'Taze fesleğen ile Sade mutfağında hazırlanır', sortOrder: 6, isActive: true },
  { name: 'Lutenitza Sosu', description: 'Közlenmiş sebzelerden Sade üretimi', sortOrder: 7, isActive: true },
  { name: 'Pasta Kreması', description: 'Tüm kremalar Sade imalathanesinde günlük üretilir', sortOrder: 8, isActive: true },
  { name: 'Tereyağlı Karamel', description: 'Gerçek tereyağı ile küçük kazanlarda pişirilir', sortOrder: 9, isActive: true },
];

// --- Küçük ikonlar ---

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconChevronUp = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const IconChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const IconDownload = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// --- Önizleme Bileşeni ---

function ServisPreview({
  items,
  title,
  subtitle,
  footerText,
  format,
  previewRef,
}: {
  items: ServisItem[];
  title: string;
  subtitle: string;
  footerText: string;
  format: (typeof OUTPUT_FORMATS)[number];
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  const activeItems = items.filter((i) => i.isActive);
  const isDigital = format.key === 'insta-post' || format.key === 'insta-story';
  const aspectRatio = format.width / format.height;

  // Preview konteyner boyutu
  const previewWidth = isDigital ? 360 : 480;
  const previewHeight = previewWidth / aspectRatio;

  // Font ölçekleme
  const scale = previewWidth / format.width;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={previewRef}
        style={{
          width: previewWidth,
          height: previewHeight,
          backgroundColor: '#FDFBF7',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}
        className="border border-gray-200 shadow-lg"
      >
        {/* İç padding */}
        <div
          style={{
            padding: `${Math.round(format.height * scale * 0.06)}px ${Math.round(format.width * scale * 0.08)}px`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Üst dekoratif çizgi */}
          <div
            style={{
              width: '100%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #C8A96E, transparent)',
              marginBottom: Math.round(format.height * scale * 0.03),
            }}
          />

          {/* Başlık */}
          <div style={{ textAlign: 'center', marginBottom: Math.round(format.height * scale * 0.02) }}>
            <h2
              style={{
                fontSize: Math.max(14, Math.round(format.width * scale * 0.04)),
                fontWeight: 300,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#2C2C2C',
                margin: 0,
              }}
            >
              {title || 'SADE PATİSSERİE'}
            </h2>
            <p
              style={{
                fontSize: Math.max(9, Math.round(format.width * scale * 0.02)),
                color: '#8B7D6B',
                marginTop: 4,
                fontStyle: 'italic',
                letterSpacing: '0.05em',
              }}
            >
              {subtitle || 'Her şey burada, sevgiyle üretilir.'}
            </p>
          </div>

          {/* Ayırıcı */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: `${Math.round(format.height * scale * 0.015)}px 0` }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E0D5C4' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#C8A96E' }} />
            <div style={{ flex: 1, height: 1, backgroundColor: '#E0D5C4' }} />
          </div>

          {/* Malzeme listesi */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: Math.round(format.height * scale * 0.018) }}>
            {activeItems.map((item) => (
              <div key={item.id} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: Math.max(11, Math.round(format.width * scale * 0.028)),
                    fontWeight: 600,
                    color: '#2C2C2C',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: Math.max(8, Math.round(format.width * scale * 0.018)),
                    color: '#8B7D6B',
                    fontStyle: 'italic',
                    marginTop: 2,
                  }}
                >
                  {item.description}
                </div>
              </div>
            ))}
          </div>

          {/* Alt ayırıcı */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: `${Math.round(format.height * scale * 0.015)}px 0` }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E0D5C4' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#C8A96E' }} />
            <div style={{ flex: 1, height: 1, backgroundColor: '#E0D5C4' }} />
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: Math.max(7, Math.round(format.width * scale * 0.015)),
                color: '#A09080',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {footerText || 'Sade Patisserie — Artisan Üretim'}
            </p>
          </div>

          {/* Alt dekoratif çizgi */}
          <div
            style={{
              width: '100%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #C8A96E, transparent)',
              marginTop: Math.round(format.height * scale * 0.02),
            }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {format.label} — {format.desc}
      </p>
    </div>
  );
}

// --- Ana Sayfa ---

export default function AmerikanServis() {
  const [items, setItems] = useState<ServisItem[]>(
    DEFAULT_ITEMS.map((it) => ({ ...it, id: nextId() }))
  );
  const [title, setTitle] = useState('SADE PATİSSERİE');
  const [subtitle, setSubtitle] = useState('Her şey burada, sevgiyle üretilir.');
  const [footerText, setFooterText] = useState('Sade Patisserie — Artisan Üretim');
  const [outputFormat, setOutputFormat] = useState<OutputFormatKey>('a3');
  const [downloading, setDownloading] = useState(false);

  // Firestore kayıtlı konfigürasyonlar
  const [savedConfigs, setSavedConfigs] = useState<ServisConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [configName, setConfigName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const selectedFormat = OUTPUT_FORMATS.find((f) => f.key === outputFormat) ?? OUTPUT_FORMATS[0];

  // --- Firestore CRUD ---

  useEffect(() => {
    setLoadingConfigs(true);
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    getDocs(q)
      .then((snap) => {
        const configs: ServisConfig[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ServisConfig[];
        setSavedConfigs(configs);
        if (configs.length > 0) {
          loadConfig(configs[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfigs(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConfig = (cfg: ServisConfig) => {
    setItems(cfg.items);
    setTitle(cfg.title);
    setSubtitle(cfg.subtitle);
    setFooterText(cfg.footerText);
    setActiveConfigId(cfg.id);
    setConfigName(cfg.name);
  };

  const handleSave = useCallback(async () => {
    const name = configName.trim() || 'İsimsiz Konfigürasyon';
    setSaving(true);
    try {
      const data = { name, items, title, subtitle, footerText, updatedAt: serverTimestamp() };
      if (activeConfigId) {
        await updateDoc(doc(db, COLLECTION_NAME, activeConfigId), data);
        setSavedConfigs((prev) =>
          prev.map((c) => (c.id === activeConfigId ? { ...c, ...data, name } : c))
        );
      } else {
        const ref = await addDoc(collection(db, COLLECTION_NAME), {
          ...data,
          createdAt: serverTimestamp(),
        });
        const newConfig: ServisConfig = { id: ref.id, name, items, title, subtitle, footerText };
        setSavedConfigs((prev) => [newConfig, ...prev]);
        setActiveConfigId(ref.id);
      }
      setConfigName(name);
    } catch {
      alert('Kaydetme başarısız oldu');
    } finally {
      setSaving(false);
    }
  }, [activeConfigId, configName, items, title, subtitle, footerText]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Bu konfigürasyonu silmek istediğinize emin misiniz?')) return;
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        setSavedConfigs((prev) => prev.filter((c) => c.id !== id));
        if (activeConfigId === id) {
          setActiveConfigId(null);
          setConfigName('');
        }
      } catch {
        alert('Silme başarısız oldu');
      }
    },
    [activeConfigId]
  );

  const handleNew = useCallback(() => {
    setItems(DEFAULT_ITEMS.map((it) => ({ ...it, id: nextId() })));
    setTitle('SADE PATİSSERİE');
    setSubtitle('Her şey burada, sevgiyle üretilir.');
    setFooterText('Sade Patisserie — Artisan Üretim');
    setActiveConfigId(null);
    setConfigName('');
  }, []);

  // --- Malzeme CRUD ---

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: nextId(), name: '', description: '', sortOrder: prev.length, isActive: true },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback((id: string, field: keyof ServisItem, value: string | boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }, []);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }, []);

  // --- Export ---

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        width: selectedFormat.width,
        height: selectedFormat.height,
        pixelRatio: 1,
        style: {
          width: `${selectedFormat.width}px`,
          height: `${selectedFormat.height}px`,
          transform: 'scale(1)',
        },
      });
      const link = document.createElement('a');
      link.download = `amerikan-servis-${selectedFormat.key}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export hatası:', err);
      alert('Dışa aktarma başarısız oldu');
    } finally {
      setDownloading(false);
    }
  }, [selectedFormat]);

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Üst bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Amerikan Servis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Malzeme kalitesini vurgulayan tepsi kağıdı & dijital görsel üretici
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Yeni
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Kaydediliyor...' : activeConfigId ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Ana içerik — sol panel + sağ önizleme */}
      <div className="flex gap-6">
        {/* Sol Panel — Düzenleme */}
        <div className="w-[420px] shrink-0 space-y-4">
          {/* Kayıtlı konfigürasyonlar */}
          {savedConfigs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Kayıtlı Şablonlar</h3>
              {loadingConfigs ? (
                <p className="text-xs text-gray-400">Yükleniyor...</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {savedConfigs.map((cfg) => (
                    <div
                      key={cfg.id}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                        activeConfigId === cfg.id
                          ? 'bg-amber-50 text-amber-800 font-medium'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span onClick={() => loadConfig(cfg)} className="flex-1 truncate">
                        {cfg.name}
                      </span>
                      <button
                        onClick={() => handleDelete(cfg.id)}
                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Sil"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Konfigürasyon adı */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Şablon adı"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Başlık (örn: SADE PATİSSERİE)"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Alt başlık"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
            <input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Alt yazı (footer)"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
          </div>

          {/* Malzeme listesi */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Malzemeler ({items.filter((i) => i.isActive).length}/{items.length})
              </h3>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-medium"
              >
                <IconPlus /> Ekle
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-3 space-y-2 transition-colors ${
                    item.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  {/* Üst satır — isim + kontroller */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) => updateItem(item.id, 'isActive', e.target.checked)}
                      className="accent-amber-600"
                    />
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      placeholder="Malzeme adı"
                      className="flex-1 text-sm font-medium border-0 border-b border-transparent hover:border-gray-200 focus:border-amber-400 outline-none bg-transparent px-1 py-0.5"
                    />
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <IconChevronUp />
                      </button>
                      <button
                        onClick={() => moveItem(idx, 'down')}
                        disabled={idx === items.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <IconChevronDown />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                  {/* Açıklama */}
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Gurur cümlesi (örn: Her gün Sade imalathanesinde üretilir)"
                    className="w-full text-xs text-gray-500 border-0 border-b border-transparent hover:border-gray-200 focus:border-amber-400 outline-none bg-transparent px-1 py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ Panel — Önizleme */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Format seçimi */}
          <div className="flex gap-2 flex-wrap justify-center">
            {OUTPUT_FORMATS.map((fmt) => (
              <button
                key={fmt.key}
                onClick={() => setOutputFormat(fmt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  outputFormat === fmt.key
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          {/* Önizleme */}
          <ServisPreview
            items={items}
            title={title}
            subtitle={subtitle}
            footerText={footerText}
            format={selectedFormat}
            previewRef={previewRef}
          />

          {/* Export butonu */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <IconDownload />
            {downloading ? 'İndiriliyor...' : `PNG İndir (${selectedFormat.label})`}
          </button>
        </div>
      </div>
    </div>
  );
}

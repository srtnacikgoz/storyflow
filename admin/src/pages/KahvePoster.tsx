import { useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import CoffeePosterPreview from '../components/coffee-poster/CoffeePosterPreview';
import type { Category, CoffeeItem } from '../components/coffee-poster/CoffeePosterPreview';
import { api } from '../services/api';
import type { CoffeeMenuSaved } from '../services/api';

// --- Sabitler ---

const nextId = () => crypto.randomUUID();

const POSTER_SIZES = [
  { key: 'a4', label: 'A4', desc: '21×29.7cm', width: 2480, height: 3508 },
  { key: 'a3', label: 'A3', desc: '29.7×42cm', width: 3508, height: 4961 },
  { key: '40x60', label: '40×60', desc: '40×60cm', width: 4724, height: 7087 },
] as const;

type PosterSizeKey = (typeof POSTER_SIZES)[number]['key'];

// --- Başlangıç verisi ---

const initialCategories: Category[] = [
  {
    id: nextId(),
    name: 'Sıcak Kahveler',
    items: [
      { id: nextId(), name: 'Espresso', description: 'Yoğun ve saf espresso' },
      { id: nextId(), name: 'Americano', description: 'Espresso + sıcak su' },
      { id: nextId(), name: 'Latte', description: 'Espresso + buharlanmış süt' },
      { id: nextId(), name: 'Cappuccino', description: 'Espresso + süt köpüğü' },
    ],
  },
  {
    id: nextId(),
    name: 'Soğuk Kahveler',
    items: [
      { id: nextId(), name: 'Cold Brew', description: 'Soğuk demlenmiş, yumuşak tat' },
      { id: nextId(), name: 'Iced Latte', description: 'Buz + espresso + süt' },
      { id: nextId(), name: 'Frappé', description: 'Blended soğuk kahve' },
    ],
  },
];

// --- Yardımcı — küçük ikonlar ---

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

// --- Ana Sayfa ---

export default function KahvePoster() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [posterSize, setPosterSize] = useState<PosterSizeKey>('a3');
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // --- Kayıtlı Menüler ---
  const [savedMenus, setSavedMenus] = useState<CoffeeMenuSaved[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuName, setMenuName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);

  // Menüleri yükle
  useEffect(() => {
    setLoadingMenus(true);
    api.getCoffeeMenus()
      .then(setSavedMenus)
      .catch(() => {})
      .finally(() => setLoadingMenus(false));
  }, []);

  // Kaydet (yeni veya güncelle)
  const handleSave = useCallback(async () => {
    const name = menuName.trim() || 'İsimsiz Menü';
    setSaving(true);
    try {
      if (activeMenuId) {
        await api.updateCoffeeMenu(activeMenuId, { name, categories });
        setSavedMenus((prev) =>
          prev.map((m) => m.id === activeMenuId ? { ...m, name, categories, updatedAt: Date.now() } : m)
        );
      } else {
        const created = await api.createCoffeeMenu({ name, categories });
        setSavedMenus((prev) => [created, ...prev]);
        setActiveMenuId(created.id);
      }
      setMenuName(name);
    } catch {
      alert('Kaydetme başarısız oldu');
    } finally {
      setSaving(false);
    }
  }, [activeMenuId, menuName, categories]);

  // Yükle
  const handleLoad = useCallback((menu: CoffeeMenuSaved) => {
    setCategories(menu.categories);
    setActiveMenuId(menu.id);
    setMenuName(menu.name);
  }, []);

  // Sil
  const handleDeleteMenu = useCallback(async (id: string) => {
    try {
      await api.deleteCoffeeMenu(id);
      setSavedMenus((prev) => prev.filter((m) => m.id !== id));
      if (activeMenuId === id) {
        setActiveMenuId(null);
        setMenuName('');
      }
    } catch {
      alert('Silme başarısız oldu');
    }
  }, [activeMenuId]);

  // Yeni menü başlat
  const handleNewMenu = useCallback(() => {
    setCategories([{ id: nextId(), name: 'Yeni Kategori', items: [{ id: nextId(), name: '', description: '' }] }]);
    setActiveMenuId(null);
    setMenuName('');
  }, []);

  // --- Kategori CRUD ---

  const addCategory = useCallback(() => {
    const newCat: Category = {
      id: nextId(),
      name: 'Yeni Kategori',
      items: [{ id: nextId(), name: '', description: '' }],
    };
    setCategories((prev) => [...prev, newCat]);
  }, []);

  const removeCategory = useCallback((catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }, []);

  const updateCategoryName = useCallback((catId: string, name: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name } : c))
    );
  }, []);

  const moveCategory = useCallback((index: number, direction: 'up' | 'down') => {
    setCategories((prev) => {
      const arr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= arr.length) return arr;
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr;
    });
  }, []);

  // --- Ürün CRUD ---

  const addItem = useCallback((catId: string) => {
    const newItem: CoffeeItem = { id: nextId(), name: '', description: '' };
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, items: [...c.items, newItem] } : c
      )
    );
  }, []);

  const removeItem = useCallback((catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c
      )
    );
  }, []);

  const updateItem = useCallback(
    (catId: string, itemId: string, field: 'name' | 'description', value: string) => {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === itemId ? { ...i, [field]: value } : i
                ),
              }
            : c
        )
      );
    },
    []
  );

  // --- PNG Export ---

  const handleDownload = useCallback(async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const size = POSTER_SIZES.find((s) => s.key === posterSize)!;
      const canvas = await html2canvas(posterRef.current, {
        scale: size.width / (posterRef.current.offsetWidth * window.devicePixelRatio),
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });
      const link = document.createElement('a');
      link.download = `sade-kahve-poster-${posterSize}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  }, [posterSize]);

  // --- Render ---

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kahve Poster</h1>
        <p className="text-gray-500 text-sm mt-1">
          Kahve menüsü kategorilerini düzenle, canlı önizle ve PNG olarak indir.
        </p>
      </div>

      {/* Kaydet / Yükle Bölümü */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Menü adı */}
          <input
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="Menü adı (ör: Ana Kahve Menüsü)"
            className="flex-1 min-w-[200px] text-sm bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:bg-white outline-none transition-colors"
          />
          {/* Kaydet */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            {activeMenuId ? 'Güncelle' : 'Kaydet'}
          </button>
          {/* Yeni */}
          <button
            onClick={handleNewMenu}
            className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
          >
            Yeni Menü
          </button>
        </div>

        {/* Kayıtlı menüler */}
        {loadingMenus ? (
          <div className="mt-3 text-xs text-gray-400">Menüler yükleniyor...</div>
        ) : savedMenus.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {savedMenus.map((menu) => (
              <div
                key={menu.id}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeMenuId === menu.id
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-amber-200 hover:bg-amber-50'
                }`}
              >
                <button onClick={() => handleLoad(menu)} className="truncate max-w-[150px]">
                  {menu.name}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteMenu(menu.id); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                  title="Sil"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* İki Kolon Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SOL — Form */}
        <div className="space-y-4">
          {/* Kategori Kartları */}
          {categories.map((cat, catIndex) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
            >
              {/* Kategori Başlık Satırı */}
              <div className="flex items-center gap-2">
                {/* Yukarı/Aşağı */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveCategory(catIndex, 'up')}
                    disabled={catIndex === 0}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Yukarı taşı"
                  >
                    <IconChevronUp />
                  </button>
                  <button
                    onClick={() => moveCategory(catIndex, 'down')}
                    disabled={catIndex === categories.length - 1}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Aşağı taşı"
                  >
                    <IconChevronDown />
                  </button>
                </div>

                {/* Kategori Adı */}
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                  placeholder="Kategori adı"
                  className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm font-semibold text-gray-800"
                />

                {/* Sil */}
                <button
                  onClick={() => removeCategory(cat.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Kategoriyi sil"
                >
                  <IconTrash />
                </button>
              </div>

              {/* Ürünler */}
              <div className="space-y-2 pl-10">
                {cat.items.map((item) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(cat.id, item.id, 'name', e.target.value)}
                        placeholder="Ürün adı"
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm text-gray-800"
                      />
                      <input
                        type="text"
                        value={item.description ?? ''}
                        onChange={(e) => updateItem(cat.id, item.id, 'description', e.target.value)}
                        placeholder="Açıklama (opsiyonel)"
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 focus:border-amber-300 focus:outline-none text-sm text-gray-500 italic"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(cat.id, item.id)}
                      className="mt-2 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="Ürünü sil"
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}

                {/* Ürün Ekle */}
                <button
                  onClick={() => addItem(cat.id)}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-amber-400 hover:text-amber-600 transition"
                >
                  <IconPlus />
                  Ürün ekle
                </button>
              </div>
            </div>
          ))}

          {/* Kategori Ekle */}
          <button
            onClick={addCategory}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 hover:border-amber-400 hover:text-amber-700 transition font-medium"
          >
            <IconPlus />
            Kategori Ekle
          </button>

          {/* Poster Boyutu Seçici */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Poster Boyutu</p>
            <div className="flex gap-2">
              {POSTER_SIZES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setPosterSize(s.key)}
                  className={`flex-1 rounded-xl py-2 px-3 text-sm font-medium transition ${
                    posterSize === s.key
                      ? 'bg-amber-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div>{s.label}</div>
                  <div className={`text-xs mt-0.5 ${posterSize === s.key ? 'text-amber-200' : 'text-gray-400'}`}>
                    {s.desc}
                  </div>
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
                <IconDownload />
                PNG İndir
              </>
            )}
          </button>
        </div>

        {/* SAĞ — Canlı Önizleme */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Önizleme
            </p>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <CoffeePosterPreview ref={posterRef} categories={categories} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

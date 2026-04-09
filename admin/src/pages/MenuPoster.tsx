export default function MenuPoster() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Combo Menu</h1>
        <p className="text-gray-500 text-sm mt-1">Ürün + içecek kombinasyonlarıyla kampanya posterleri oluştur</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
          {/* İkili combo ikonu: pasta + fincan */}
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m-7-9H4m16 0h-1m-2.636-5.364l-.707.707M7.343 16.657l-.707.707m12.728 0l-.707-.707M7.343 7.343l-.707-.707" />
            <circle cx="9" cy="12" r="3" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9h2a2 2 0 012 2v0a2 2 0 01-2 2h-2m0-4v4m-1 2h4" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Yakında</h2>
        <p className="text-sm text-gray-500 max-w-md">
          Bir pastane ürünü + bir içecek seçerek ikili combo kampanya posterleri oluşturabileceksin.
          Örneğin: "Brownie + Filtre Kahve — 120₺" gibi set menü görselleri.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <div className="flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            1 Ürün
          </div>
          <span className="text-gray-300 text-lg">+</span>
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h12a2 2 0 012 2v2a2 2 0 01-2 2h-1v2a4 4 0 01-4 4H7a4 4 0 01-4-4V4zm14 4h1a2 2 0 010 4h-1V8z" />
            </svg>
            1 İçecek
          </div>
          <span className="text-gray-300 text-lg">=</span>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Combo Poster
          </div>
        </div>
      </div>
    </div>
  );
}

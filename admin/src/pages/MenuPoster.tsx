export default function MenuPoster() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Menü Poster</h1>
        <p className="text-gray-500 text-sm mt-1">Menü ürünlerini içeren posterler oluştur</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Yakında</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Menü kategorilerinden ürün seçerek şık poster tasarımları oluşturabileceksin.
        </p>
      </div>
    </div>
  );
}

export default function CikolataPoster() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Çikolata Poster</h1>
        <p className="text-gray-500 text-sm mt-1">Çikolata ürünleri için özel posterler oluştur</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Yakında</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Çikolata ve pralin ürünleri için lüks poster tasarımları oluşturabileceksin.
        </p>
      </div>
    </div>
  );
}

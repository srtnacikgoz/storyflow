const showcaseItems = [
  {
    before: "Düz pasta fotoğrafı",
    after: "Rustik ahşap masa, doğal ışık",
    category: "Pastane",
  },
  {
    before: "Düz kahve bardağı",
    after: "Kafe ortamı, buhar efekti",
    category: "Kafe",
  },
  {
    before: "Düz takı fotoğrafı",
    after: "Mermer zemin, altın aksesuarlar",
    category: "Butik",
  },
];

export default function ShowcaseSection() {
  return (
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Başlık */}
        <div className="text-center mb-16 landing-reveal">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Dönüşüm Örnekleri
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Düz ürün fotoğraflarının AI ile nasıl dönüştüğünü görün.
          </p>
        </div>

        {/* Vitrin kartları */}
        <div className="grid md:grid-cols-3 gap-8">
          {showcaseItems.map((item, i) => (
            <div key={i} className="landing-reveal">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                {/* Before */}
                <div className="relative">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    {item.before}
                  </div>
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-gray-900/70 text-white text-xs rounded-md">
                    Önce
                  </span>
                </div>
                {/* Ayraç */}
                <div className="flex items-center justify-center py-2 bg-gradient-to-r from-brand-blue/10 via-brand-mustard/10 to-brand-peach/10">
                  <svg className="w-5 h-5 text-brand-mustard" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                {/* After */}
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-brand-blue/10 to-brand-peach/10 flex items-center justify-center text-gray-500 text-sm">
                    {item.after}
                  </div>
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-brand-mustard text-white text-xs rounded-md">
                    Sonra
                  </span>
                </div>
                {/* Kategori */}
                <div className="p-4 text-center">
                  <span className="text-xs font-semibold text-brand-mustard uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

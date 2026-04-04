const steps = [
  {
    step: "01",
    title: "Ürün Fotoğrafını Yükle",
    description: "Düz bir ürün fotoğrafı yükleyin. Telefon kamerası bile yeterli — AI gerisini halleder.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Senaryo ve Tema Seç",
    description: "Hazır senaryolardan birini seçin veya kendi sahnenizi tanımlayın. Tema ile atmosferi belirleyin.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "AI Üretsin, Sen Paylaş",
    description: "Gemini AI ürününüzü sahneye yerleştirir. Beğendiğiniz görseli Instagram'a gönderin.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="nasil-calisir" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Başlık */}
        <div className="text-center mb-16 landing-reveal">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nasıl Çalışır?
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            3 adımda düz ürün fotoğrafınızı profesyonel Instagram içeriğine dönüştürün.
          </p>
        </div>

        {/* Adımlar */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((item, i) => (
            <div key={i} className="relative landing-reveal">
              {/* Bağlantı çizgisi */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-gray-200 to-transparent -translate-x-8 z-0" />
              )}
              <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                {/* Adım numarası */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-brand-mustard/15 text-brand-mustard flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                    Adım {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

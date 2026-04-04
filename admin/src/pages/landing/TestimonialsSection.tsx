const testimonials = [
  {
    quote: "Haftalık 20 saat harcadığımız içerik üretimini artık Storyflow hallediyor. Biz sadece onaylıyoruz.",
    name: "Ayşe K.",
    title: "Butik Pastane Sahibi",
    initials: "AK",
  },
  {
    quote: "Profesyonel fotoğraf çekimi bütçemiz sıfıra indi. Ürünlerimiz çok daha etkileyici görünüyor.",
    name: "Mehmet D.",
    title: "Kafe İşletmecisi",
    initials: "MD",
  },
  {
    quote: "Senaryo sistemi harika — her ürün için farklı sahneler oluşturabiliyorum. Instagram hesabımız %40 büyüdü.",
    name: "Zeynep T.",
    title: "El Yapımı Takı Tasarımcısı",
    initials: "ZT",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Başlık */}
        <div className="text-center mb-16 landing-reveal">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Kullanıcılarımız Ne Diyor?
          </h2>
        </div>

        {/* Testimonial kartları */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((item, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100 landing-reveal"
            >
              {/* Tırnak ikonu */}
              <svg className="w-8 h-8 text-brand-mustard/40 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
              </svg>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                "{item.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center text-sm font-bold text-brand-blue">
                  {item.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

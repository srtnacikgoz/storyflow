const stats = [
  { value: "%90", label: "Maliyet Düşüşü", description: "Profesyonel fotoğraf çekimine kıyasla" },
  { value: "10x", label: "Daha Hızlı", description: "Manuel tasarım sürecine göre" },
  { value: "<1dk", label: "Üretim Süresi", description: "Görsel başına ortalama süre" },
  { value: "7/24", label: "Otomasyon", description: "Zamanlayıcı ile otomatik paylaşım" },
];

export default function StatsSection() {
  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center landing-reveal">
              <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm font-semibold text-brand-mustard mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-gray-500">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

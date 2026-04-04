import { Link } from "react-router-dom";

export default function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-gray-900 relative overflow-hidden">
      {/* Dekoratif arka plan */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-mustard/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 landing-reveal">
          İçerik Üretiminizi
          <br />
          <span className="text-brand-mustard">Otomatikleştirin</span>
        </h2>
        <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto landing-reveal">
          Storyflow ile ürün fotoğraflarınızı profesyonel Instagram içeriğine
          dönüştürmeye hemen başlayın.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 landing-reveal">
          <Link
            to="/admin"
            className="px-8 py-3.5 bg-white text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg shadow-white/10 hover:-translate-y-0.5"
          >
            Hemen Başla
          </Link>
          <a
            href="mailto:info@storyflow.app"
            className="px-8 py-3.5 bg-transparent text-white rounded-xl font-semibold text-lg border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-200"
          >
            Bize Ulaşın
          </a>
        </div>
      </div>
    </section>
  );
}

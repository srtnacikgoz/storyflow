import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../../services/api";

interface SlotData {
  imageUrl: string;
  label?: string;
}

const SLOT_KEYS = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7"] as const;

/**
 * Kolaj gorseli veya numarali placeholder
 */
function CollageCell({ index, data }: { index: number; data?: SlotData }) {
  if (data?.imageUrl) {
    return (
      <div className="rounded-lg overflow-hidden bg-gray-100 shadow-sm">
        <img
          src={data.imageUrl}
          alt={data.label || `Gorsel ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-200/60 flex items-center justify-center text-gray-400 text-xs font-medium">
      {index + 1}
    </div>
  );
}

export default function HeroSection() {
  const [collageSlots, setCollageSlots] = useState<Record<string, SlotData>>({});
  const [resultImage, setResultImage] = useState<SlotData | null>(null);

  useEffect(() => {
    api.getLandingHeroConfig()
      .then((config) => {
        setCollageSlots(config.collageSlots || {});
        setResultImage(config.resultImage || null);
      })
      .catch(() => {
        // API fail ederse mevcut placeholder kalir
      });
  }, []);

  const hasAnyImage = Object.keys(collageSlots).length > 0 || resultImage?.imageUrl;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue/10 via-white to-brand-peach/10 pt-32 pb-20 md:pt-40 md:pb-32">
      {/* Dekoratif arka plan desenleri */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-peach/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-mustard/15 text-brand-mustard text-sm font-medium mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-brand-mustard animate-pulse" />
          KOBİ'ler için AI destekli içerik otomasyonu
        </div>

        {/* Başlık */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6 animate-fade-in-up animation-delay-100">
          Gerçek Ürünleriniz,
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-mustard to-brand-orange">
            AI'ın Tasarladığı Sahneler
          </span>
        </h1>

        {/* Alt başlık */}
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-4 animate-fade-in-up animation-delay-200">
          Kendi ürün ve aksesuar fotoğraflarınızı yükleyin.*
          <br className="hidden md:block" />
          Storyflow, gerçek malzemelerinizle profesyonel Instagram görselleri oluştursun.
        </p>
        <p className="text-sm text-gray-600 mb-4 animate-fade-in-up animation-delay-200">
          İstediğiniz saatte, istediğiniz sıklıkta — otomatik paylaşım.
        </p>
        <p className="text-xs text-gray-400 mb-10 animate-fade-in-up animation-delay-200">
          * 10 adede kadar ürün ve aksesuar fotoğrafı
        </p>

        {/* CTA butonları */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
          <Link
            to="/admin"
            className="px-8 py-3.5 bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all duration-200 shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 hover:-translate-y-0.5"
          >
            Ücretsiz Dene
          </Link>
          <a
            href="#nasil-calisir"
            className="px-8 py-3.5 bg-white text-gray-700 rounded-xl font-semibold text-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            Nasıl Çalışır?
          </a>
        </div>

        {/* Hero gorsel: Kolaj + Ok + Sonuc */}
        <div className="mt-16 animate-fade-in-up animation-delay-400">
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-100 p-3 md:p-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 md:p-8">
                <div className="flex items-center justify-center gap-4 md:gap-6">

                  {/* Sol: 7'li asimetrik kolaj grid */}
                  <div className="flex-1 max-w-[280px] md:max-w-[320px]">
                    <div className="grid grid-cols-3 grid-rows-3 gap-1.5 md:gap-2 aspect-square">
                      {/* Ust sira: 3 kare */}
                      <CollageCell index={0} data={collageSlots[SLOT_KEYS[0]]} />
                      <CollageCell index={1} data={collageSlots[SLOT_KEYS[1]]} />
                      <CollageCell index={2} data={collageSlots[SLOT_KEYS[2]]} />
                      {/* Orta sira: 2 kare (sol buyuk) */}
                      <div className="col-span-2 row-span-1">
                        <div className="rounded-lg overflow-hidden bg-gray-200/60 h-full flex items-center justify-center text-gray-400 text-xs font-medium">
                          {collageSlots[SLOT_KEYS[3]]?.imageUrl ? (
                            <img
                              src={collageSlots[SLOT_KEYS[3]].imageUrl}
                              alt={collageSlots[SLOT_KEYS[3]].label || "4"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "4"
                          )}
                        </div>
                      </div>
                      <CollageCell index={4} data={collageSlots[SLOT_KEYS[4]]} />
                      {/* Alt sira: 2 kare */}
                      <CollageCell index={5} data={collageSlots[SLOT_KEYS[5]]} />
                      <div className="col-span-2 row-span-1">
                        <div className="rounded-lg overflow-hidden bg-gray-200/60 h-full flex items-center justify-center text-gray-400 text-xs font-medium">
                          {collageSlots[SLOT_KEYS[6]]?.imageUrl ? (
                            <img
                              src={collageSlots[SLOT_KEYS[6]].imageUrl}
                              alt={collageSlots[SLOT_KEYS[6]].label || "7"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "7"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ok ikonu */}
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-brand-mustard" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>

                  {/* Sag: Buyuk AI sonuc gorseli */}
                  <div className="flex-1 max-w-[280px] md:max-w-[320px]">
                    <div className="aspect-square rounded-xl overflow-hidden border border-brand-blue/20 shadow-sm">
                      {resultImage?.imageUrl ? (
                        <img
                          src={resultImage.imageUrl}
                          alt={resultImage.label || "AI Sonuc"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-blue/20 to-brand-peach/20 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-blue/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-brand-blue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                              </svg>
                            </div>
                            <p className="text-gray-500 text-xs font-medium">AI Uretimi</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Alt etiket */}
                <p className="text-gray-400 text-sm mt-4">
                  {hasAnyImage ? "Storyflow ile uretildi" : "Storyflow Dashboard"}
                </p>
              </div>
            </div>
            {/* Dekoratif glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-blue/5 via-brand-mustard/5 to-brand-peach/5 rounded-3xl blur-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import HeroSection from "./landing/HeroSection";
import StatsSection from "./landing/StatsSection";
import HowItWorks from "./landing/HowItWorks";
import FeaturesGrid from "./landing/FeaturesGrid";
import ShowcaseSection from "./landing/ShowcaseSection";
import TestimonialsSection from "./landing/TestimonialsSection";
import CTASection from "./landing/CTASection";
import FooterSection from "./landing/FooterSection";

export default function LandingPage() {
  // Scroll reveal animasyonu
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".landing-reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-gray-900">
            Sade <span className="text-brand-mustard">Storyflow</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#nasil-calisir" className="hover:text-gray-900 transition-colors">
              Nasıl Çalışır
            </a>
            <a href="#ozellikler" className="hover:text-gray-900 transition-colors">
              Özellikler
            </a>
          </div>
          <Link
            to="/admin"
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      {/* Bölümler */}
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <FeaturesGrid />
      <ShowcaseSection />
      <TestimonialsSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}

import { useState } from "react";
import APISettingsSection from "./settings/APISettingsSection";
import InstagramSection from "./settings/InstagramSection";
import SchedulerSection from "./settings/SchedulerSection";
import BusinessContextSection from "./settings/BusinessContextSection";
import HandStylesSection from "./settings/HandStylesSection";
import AssetPreferencesSection from "./settings/AssetPreferencesSection";
import SlotDefaultsSection from "./settings/SlotDefaultsSection";
import VariationRulesSection from "./settings/VariationRulesSection";
import APIInfoSection from "./settings/APIInfoSection";
import ToursSection from "./settings/ToursSection";
import HeroImagesSection from "./settings/HeroImagesSection";
import CostGuideSection from "./settings/CostGuideSection";
import AIModelSection from "./settings/AIModelSection";

const sections = [
  { id: "api-settings", label: "API Ayarları", icon: "⚡" },
  { id: "ai-models", label: "AI Model Seçimi", icon: "🤖" },
  { id: "instagram", label: "Instagram Bağlantısı", icon: "📸" },
  { id: "scheduler", label: "Zamanlanmış Paylaşım", icon: "⏰" },
  { id: "business-context", label: "İşletme Bağlamı", icon: "🏪" },
  { id: "hand-styles", label: "El Stilleri", icon: "🤲" },
  { id: "asset-preferences", label: "Asset Tercihleri", icon: "🎨" },
  { id: "slot-defaults", label: "Slot Varsayılanları", icon: "📦" },
  { id: "variation-rules", label: "Çeşitlilik Kuralları", icon: "🎲" },
  { id: "api-info", label: "API Bilgileri", icon: "🔗" },
  { id: "hero-images", label: "Hero Görselleri", icon: "🖼️" },
  { id: "tours", label: "Tanıtım Turları", icon: "🎯" },
  { id: "cost-guide", label: "Maliyet Kılavuzu", icon: "💰" },
];

const sectionComponents: Record<string, React.ComponentType> = {
  "api-settings": APISettingsSection,
  "ai-models": AIModelSection,
  "instagram": InstagramSection,
  "scheduler": SchedulerSection,
  "business-context": BusinessContextSection,
  "hand-styles": HandStylesSection,
  "asset-preferences": AssetPreferencesSection,
  "slot-defaults": SlotDefaultsSection,
  "variation-rules": VariationRulesSection,
  "api-info": APIInfoSection,
  "hero-images": HeroImagesSection,
  "tours": ToursSection,
  "cost-guide": CostGuideSection,
};

export default function Settings() {
  const [activeSection, setActiveSection] = useState("api-settings");
  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="flex gap-6 max-w-5xl">
      {/* Sol sidebar */}
      <nav className="w-56 shrink-0">
        <div className="sticky top-6">
          <h1 className="text-lg font-bold text-gray-900 mb-1 px-3">Ayarlar</h1>
          <p className="text-xs text-gray-400 mb-4 px-3">Sistem yapılandırması</p>

          <div className="space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2
                  ${activeSection === s.id
                    ? "bg-amber-50 text-amber-800 font-medium border border-amber-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <span className="text-base">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Version */}
          <div className="mt-6 px-3 text-xs text-gray-400">
            Admin Panel v1.0.0
          </div>
        </div>
      </nav>

      {/* Sağ content */}
      <div className="flex-1 min-w-0">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

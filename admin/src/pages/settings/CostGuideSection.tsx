/**
 * CostGuideSection — Ücretli API aktiviteleri kılavuzu
 * Tüm ücretli servisleri, maliyetleri ve durumları gösterir
 */

const activeServices: {
  name: string;
  provider: string;
  model: string;
  action: string;
  inputOutput: string;
  cost: string;
  trigger: string;
}[] = [
  {
    name: "Görsel Üretim (Pipeline)",
    provider: "Google Gemini",
    model: "gemini-3-pro-image-preview",
    action: "Ürün fotoğrafını senaryo/tema ile yeniden üretir",
    inputOutput: "Görsel + Metin → Görsel",
    cost: "~$0.134 / görsel",
    trigger: "Dashboard > Üret butonu",
  },
  {
    name: "Fotoğraf Analizi",
    provider: "Google Gemini",
    model: "gemini-2.0-flash",
    action: "Yüklenen fotoğrafı analiz eder (ürün tipi, ışık, arka plan)",
    inputOutput: "Görsel + Metin → Metin (JSON)",
    cost: "~$0.001 / analiz",
    trigger: "İyileştir > Fotoğraf yükle",
  },
  {
    name: "Fotoğraf İyileştirme",
    provider: "Google Gemini",
    model: "gemini-3.1-flash-image-preview",
    action: "Arka plan değiştirme, ışık/renk düzeltme, stil uygulama",
    inputOutput: "Görsel + Metin → Görsel",
    cost: "~$0.10 / görsel",
    trigger: "İyileştir > İyileştir butonu",
  },
  {
    name: "Poster Prompt Üretimi",
    provider: "Anthropic Claude",
    model: "claude-haiku-4.5",
    action: "Poster için Gemini prompt'u yazar",
    inputOutput: "Görsel + Metin → Metin",
    cost: "~$0.002 / çağrı",
    trigger: "Poster > Oluştur",
  },
  {
    name: "Poster Görsel Üretimi",
    provider: "Google Gemini",
    model: "gemini-2.5-flash-image",
    action: "Ürün fotoğrafından 2:3 poster üretir",
    inputOutput: "Görsel + Metin → Görsel",
    cost: "~$0.05 / poster",
    trigger: "Poster > Oluştur",
  },
  {
    name: "Metin Üretimi (Admin)",
    provider: "Google Gemini",
    model: "gemini-3-pro-image-preview",
    action: "Tema/senaryo/mood açıklaması üretir",
    inputOutput: "Metin → Metin",
    cost: "~$0.04 / çağrı",
    trigger: "Tema/Senaryo oluşturma ekranları",
  },
  {
    name: "Görsel Eleştirmen",
    provider: "Google Gemini",
    model: "gemini-3-pro-image-preview",
    action: "Üretilen görseli kalite açısından değerlendirir",
    inputOutput: "Görsel + Metin → Metin (JSON)",
    cost: "~$0.04 / çağrı",
    trigger: "İsteğe bağlı (on-demand analiz)",
  },
];

const freeServices = [
  {
    name: "Telegram Bildirimler",
    provider: "Telegram Bot API",
    action: "Onay isteği, bildirim, hata mesajı gönderir",
    cost: "Ücretsiz",
  },
  {
    name: "Instagram Paylaşım",
    provider: "Instagram Graph API",
    action: "Story olarak paylaşım yapar",
    cost: "Ücretsiz",
  },
  {
    name: "Firebase Storage",
    provider: "Google Cloud",
    action: "Görsel depolama (5 GB/ay ücretsiz)",
    cost: "Ücretsiz katman",
  },
  {
    name: "Firebase Firestore",
    provider: "Google Cloud",
    action: "Veri depolama ve sorgulama",
    cost: "Ücretsiz katman",
  },
];

const costExamples = [
  {
    scenario: "1 görsel üretimi (pipeline)",
    breakdown: "1× Gemini img2img",
    total: "~$0.134",
  },
  {
    scenario: "1 fotoğraf iyileştirme (tam mod)",
    breakdown: "1× Analiz + 1× Enhancement",
    total: "~$0.101",
  },
  {
    scenario: "1 fotoğraf iyileştirme (sadece iyileştir)",
    breakdown: "1× Analiz + 1× Enhancement",
    total: "~$0.101",
  },
  {
    scenario: "1 poster üretimi",
    breakdown: "1× Claude prompt + 1× Gemini img",
    total: "~$0.052",
  },
  {
    scenario: "Günlük 10 görsel üretimi",
    breakdown: "10× Pipeline",
    total: "~$1.34",
  },
  {
    scenario: "Aylık 300 görsel (günde 10)",
    breakdown: "300× Pipeline",
    total: "~$40",
  },
];

export default function CostGuideSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Maliyet Kılavuzu</h2>
        <p className="text-sm text-gray-500 mt-1">
          Uygulamadaki tüm ücretli ve ücretsiz API aktiviteleri
        </p>
      </div>

      {/* Ücretli Servisler */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
          <h3 className="font-semibold text-amber-900 text-sm">Ücretli Servisler</h3>
          <p className="text-xs text-amber-700 mt-0.5">Her çağrı API kredisi harcar</p>
        </div>
        <div className="divide-y divide-gray-100">
          {activeServices.map((s, i) => (
            <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                      {s.model}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{s.action}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-400">
                      {s.provider}
                    </span>
                    <span className="text-[10px] text-gray-300">|</span>
                    <span className="text-[10px] text-gray-400">
                      {s.inputOutput}
                    </span>
                    <span className="text-[10px] text-gray-300">|</span>
                    <span className="text-[10px] text-gray-400">
                      Tetikleyen: {s.trigger}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-amber-700 whitespace-nowrap">
                  {s.cost}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Maliyet Örnekleri */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <h3 className="font-semibold text-blue-900 text-sm">Maliyet Hesaplayıcı</h3>
          <p className="text-xs text-blue-700 mt-0.5">Yaygın senaryolar için tahmini maliyet</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Senaryo</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Detay</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Tahmini</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {costExamples.map((e, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700">{e.scenario}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{e.breakdown}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{e.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ücretsiz Servisler */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-green-50 border-b border-green-100">
          <h3 className="font-semibold text-green-900 text-sm">Ücretsiz Servisler</h3>
          <p className="text-xs text-green-700 mt-0.5">Ek maliyet gerektirmeyen entegrasyonlar</p>
        </div>
        <div className="divide-y divide-gray-100">
          {freeServices.map((s, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm text-gray-900">{s.name}</span>
                <span className="text-xs text-gray-400 ml-2">({s.provider})</span>
                <p className="text-xs text-gray-500 mt-0.5">{s.action}</p>
              </div>
              <span className="text-sm font-semibold text-green-700">{s.cost}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bilgi Notu */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p>
          <strong className="text-gray-700">Not:</strong> Maliyetler tahminidir ve token kullanımına göre değişir.
          Gerçek maliyetler Google Cloud / Anthropic konsolundan takip edilebilir.
        </p>
        <p>
          AI log kayıtları <strong className="text-gray-700">AI Monitor</strong> sayfasından görüntülenebilir.
        </p>
      </div>
    </div>
  );
}

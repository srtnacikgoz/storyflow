/**
 * Carousel Framework Controller
 * 7-slide carousel tipi ve şablonlarını Firestore'da yönetir — config-driven mimari
 */

import { functions, getCors, REGION, errorResponse } from "./orchestrator/shared";
import { getDb } from "../services/config/configCache";

const COLLECTION = "carouselFrameworks";

// ── Tip tanımları ─────────────────────────────────────────────────────────────

export interface SlideTemplate {
  number: number;
  role: string;
  energy: "HIGH" | "MEDIUM" | "LOW";
  purpose: string;
  visualDirection: string;
}

export interface CarouselFramework {
  id: string;
  label: string;
  description: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  slides: SlideTemplate[];
  createdAt: number;
  updatedAt: number;
}

// ── List ───────────────────────────────────────────────────────────────────────

export const listCarouselFrameworks = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      try {
        const db = getDb();
        const snap = await db.collection(COLLECTION).get();

        const data: CarouselFramework[] = snap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CarouselFramework, "id">) }))
          .filter((fw) => fw.isActive)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        response.json({ success: true, data });
      } catch (error) {
        errorResponse(response, error, "listCarouselFrameworks");
      }
    });
  });

// ── Create ─────────────────────────────────────────────────────────────────────

export const createCarouselFramework = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).json({ success: false, error: "Method not allowed" });
        return;
      }
      try {
        const db = getDb();
        const body = request.body as Omit<CarouselFramework, "id" | "createdAt" | "updatedAt">;
        const now = Date.now();
        const ref = await db.collection(COLLECTION).add({
          ...body,
          isActive: body.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        });
        response.json({ success: true, id: ref.id });
      } catch (error) {
        errorResponse(response, error, "createCarouselFramework");
      }
    });
  });

// ── Update ─────────────────────────────────────────────────────────────────────

export const updateCarouselFramework = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).json({ success: false, error: "Method not allowed" });
        return;
      }
      try {
        const db = getDb();
        const { id, ...updates } = request.body as Partial<CarouselFramework> & { id: string };
        if (!id) {
          response.status(400).json({ success: false, error: "id zorunlu" });
          return;
        }
        await db.collection(COLLECTION).doc(id).update({
          ...updates,
          updatedAt: Date.now(),
        });
        response.json({ success: true });
      } catch (error) {
        errorResponse(response, error, "updateCarouselFramework");
      }
    });
  });

// ── Delete ─────────────────────────────────────────────────────────────────────

export const deleteCarouselFramework = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).json({ success: false, error: "Method not allowed" });
        return;
      }
      try {
        const db = getDb();
        const { id } = request.body as { id: string };
        if (!id) {
          response.status(400).json({ success: false, error: "id zorunlu" });
          return;
        }
        await db.collection(COLLECTION).doc(id).delete();
        response.json({ success: true });
      } catch (error) {
        errorResponse(response, error, "deleteCarouselFramework");
      }
    });
  });

// ── Seed ───────────────────────────────────────────────────────────────────────

export const seedCarouselFrameworks = functions
  .region(REGION)
  .https.onRequest(async (request, response) => {
    const corsHandler = await getCors();
    corsHandler(request, response, async () => {
      if (request.method !== "POST") {
        response.status(405).json({ success: false, error: "Method not allowed" });
        return;
      }
      try {
        const db = getDb();
        const now = Date.now();

        const frameworks: Omit<CarouselFramework, "id">[] = [
          {
            label: "Product Story",
            description: "Urun neden farkli — malzemeler, katmanlar, zanaat",
            icon: "01",
            isActive: true,
            sortOrder: 1,
            createdAt: now,
            updatedAt: now,
            slides: [
              { number: 1, role: "HOOK", energy: "HIGH", purpose: "Scroll'u durduracak tek kare. Baslik max 6 kelime — urun adini ver, klise sifat ekleme.", visualDirection: "Urun kadrajin %70'ini doldursun. Siyah veya saf beyaz arkaplan. Guclu isik kontrasti — urunun katmanlari ve dokusu belli olsun. 45 derece aci veya tam karsi. Yatay degil dikey cerceve." },
              { number: 2, role: "CONTEXT", energy: "LOW", purpose: "Urunun hikayesini tek cumleyle ac. Neden ozel? Ne zaman basladi? Kimin icin? Sonucu verme — sadece merak uyandır.", visualDirection: "GORSEL YOK. Beyaz arkaplan, siyah yazi. Santana Regular baslik, Cormorant Garamond govde. Bosluk bolca birak." },
              { number: 3, role: "BUILD", energy: "MEDIUM", purpose: "TEK bir kalite detayi sec: malzeme, koken, veya ozellik. Tek fikir — ikinci cumle gerekiyorsa fazla karmasik.", visualDirection: "Malzemenin veya katmanin yakin cekim doku fotografi. Sicak isik (3000-3500K). Urunun ici gorunsun — kesit, katman, malzeme detayi." },
              { number: 4, role: "BUILD2", energy: "MEDIUM", purpose: "FARKLI bir kalite detayi: Slide 3'te malzeme verdiysen burada teknik ver. Ayni sey tekrar etme — her slide yeni bir bilgi.", visualDirection: "Slide 3 sicak tonluysa bunu soguk tonlu yap. Farkli aci, farkli isik. Uretim surecinden bir an — eller, hamur, isi." },
              { number: 5, role: "TENSION", energy: "HIGH", purpose: "MEYDAN OKU: Cogu kisinin bilmedigi sey nedir? Neyi farkli yapiyorsunuz?", visualDirection: "Gorsel surpriz — onceki slide'lardan tamamen farkli his. Makro detay, soyut kirpma, beklenmedik aci." },
              { number: 6, role: "PAYOFF", energy: "MEDIUM", purpose: "Sonuc: Tum bu detaylar birlesince ne oluyor? Satis yapma — memnuniyet hissettir.", visualDirection: "Urun tamami, huzurlu ve temiz bir cercevede. Sakin isik, acik kompozisyon. Slide 5'in geriliminden sonra rahatlama hissi." },
              { number: 7, role: "CTA", energy: "LOW", purpose: "TEK bir aksiyon iste. Birden fazla istek YASAK. Somut ol — 'bekliyoruz' belirsiz.", visualDirection: "URUN GORSELI YOK. Beyaz veya siyah duz arkaplan. Baslik: Mustard. Alt yazi: @sade.patisserie." },
            ],
          },
          {
            label: "Sales",
            description: "Belirli urun, sezonluk veya sinirli sureli teklif",
            icon: "02",
            isActive: true,
            sortOrder: 2,
            createdAt: now,
            updatedAt: now,
            slides: [
              { number: 1, role: "HOOK", energy: "HIGH", purpose: "Urun en cezbedici halinde. Baslik: urun adı + en carpici ozelligi. Fiyat buraya KOYMA.", visualDirection: "Urun kadrajin %70'ini doldursun. En cezbedici aci — isin gormek, katmanları fark etmek. Koyu veya beyaz arkaplan." },
              { number: 2, role: "CONTEXT", energy: "LOW", purpose: "Bu urun ne ve ne zaman mevcut? 'Her Cuma, sinirli sayida'. Netlik, zeka degil.", visualDirection: "GORSEL YOK. Beyaz arkaplan, siyah yazi. Temiz tipografi." },
              { number: 3, role: "BUILD", energy: "MEDIUM", purpose: "NEDEN istenmeli? Bir tat, bir doku, bir vesile. Tek neden — karmasiklastirma.", visualDirection: "Malzeme veya doku yakin cekim. Sicak isik, samimi his. Malzeme gercek gorsun." },
              { number: 4, role: "BUILD2", energy: "MEDIUM", purpose: "IKINCI neden — veya aciliyet: 'Her partide 24 adet'. Aciliyet hissettir ama KORKUTMA.", visualDirection: "Farkli bir yakin cekim. Uretim anından bir kare — taze cikmis, paketlenmis, sunulmus." },
              { number: 5, role: "TENSION", energy: "HIGH", purpose: "KACIRILACAK SEY: 'Gelecek hafta uretim yok'. Korkutma — gercegi soyle.", visualDirection: "Gorsel surpriz — onceki slide'lardan farkli mood. Bos tabak, bitis, son dilim gibi 'kacirilma' hissi." },
              { number: 6, role: "PAYOFF", energy: "MEDIUM", purpose: "Teklif NET: Fiyat, musaitlik, nasil alinir. Belirsizlik birakma.", visualDirection: "Temiz kompozisyon. Urun + fiyat bilgisi bir arada. Huzur veren isik." },
              { number: 7, role: "CTA", energy: "LOW", purpose: "TEK aksiyon: 'Siparis ver' veya 'DM ile rezerve et'. Iki sey isteme.", visualDirection: "URUN YOK. Beyaz/siyah arkaplan. Mustard baslik. @sade.patisserie." },
            ],
          },
          {
            label: "Archive",
            description: "Gecmis uretimler. 2016'dan bu yana Sade'nin derinligi",
            icon: "03",
            isActive: true,
            sortOrder: 3,
            createdAt: now,
            updatedAt: now,
            slides: [
              { number: 1, role: "HOOK", energy: "HIGH", purpose: "Arsivden gorsel olarak en carpici urun. Baslik: urun adı + yil. Nostalji degil, iz birakan bir an.", visualDirection: "Arsiv fotografinin en guclu karesi. Yuksek kontrast. Vintage filtre KULLANMA." },
              { number: 2, role: "CONTEXT", energy: "LOW", purpose: "Bu urun ne zaman, neden yapildi? 'Ilk magazamizi actigimiz ay'. Kisa hikaye — max 3 satir.", visualDirection: "GORSEL YOK. Beyaz arkaplan, siyah yazi. Tarih veya donem bilgisi one ciksın." },
              { number: 3, role: "BUILD", energy: "MEDIUM", purpose: "Bu urunu unutulmaz yapan TEK detay. 'Ilk kez denedigimiz Valrhona cikolata' gibi somut bilgi.", visualDirection: "Yakin cekim — urunun detayi, dokusu, katmani. Sicak isik, samimi." },
              { number: 4, role: "BUILD2", energy: "MEDIUM", purpose: "IKINCI arsiv urunu veya ayni urunun farkli bir ani. Sade'nin urun cesitliligini kanitla.", visualDirection: "Farkli bir urun veya farkli bir aci. Slide 3'ten farkli mood." },
              { number: 5, role: "TENSION", energy: "HIGH", purpose: "DEGISMEYENLER: 10 yildir ayni kalan deger veya standart ne?", visualDirection: "En farkli kare — onceki slide'larin hicbirine benzemesin. Soyut, yaratici kirpma." },
              { number: 6, role: "PAYOFF", energy: "MEDIUM", purpose: "Arsiv = tutarlilik kaniti. Nostalji yapma — 'On yildir ayni ozen, ayni malzeme. Ve devam edecegiz.'", visualDirection: "Temiz, acik, huzurlu kompozisyon. Sonuc hissi — hikaye tamamlandi." },
              { number: 7, role: "CTA", energy: "LOW", purpose: "TEK aksiyon: 'Takip edin, bir sonraki urunu kacirmayin'. @sade.patisserie mutlaka ekle.", visualDirection: "URUN YOK. Beyaz/siyah arkaplan. Mustard baslik." },
            ],
          },
          {
            label: "Recipe",
            description: "Adim adim. Zanaati acikcca ogret. Comertlik guven insa eder",
            icon: "04",
            isActive: true,
            sortOrder: 4,
            createdAt: now,
            updatedAt: now,
            slides: [
              { number: 1, role: "HOOK", energy: "HIGH", purpose: "Bitmis sonucu goster — 'bunu sen de yapabilirsin' hissi ver. Ulasilabilir ama etkileyici gorsun.", visualDirection: "Bitmiş urunun en iyi karesi. Profesyonel ama samimi isik — stüdyo degil mutfak hissi." },
              { number: 2, role: "CONTEXT", energy: "LOW", purpose: "Bu recete kimin icin? Zorluk seviyesi ne? Sure ne kadar? Yanlis beklenti = hayal kirikligi.", visualDirection: "GORSEL YOK. Beyaz arkaplan, siyah yazi. Malzeme listesi veya ozet bilgi." },
              { number: 3, role: "BUILD", energy: "MEDIUM", purpose: "EN ONEMLI ADIM: Recetenin kilit noktasi. 'Tereyagini -4 derecede katlayin'. Spesifik ol.", visualDirection: "Yakin cekim proses fotografi — eller, hamur, malzeme. Adimin kendisi gorselde gorulsun." },
              { number: 4, role: "BUILD2", energy: "MEDIUM", purpose: "IKINCI KILIT ADIM: Cogu recetenin atladigi teknik detay. 'Maya 28 derecede, 25 degil'.", visualDirection: "Farkli bir proses ani. Isik/mood alternans — gorsel ritim devam etsin." },
              { number: 5, role: "TENSION", energy: "HIGH", purpose: "EN YAYGIN HATA: Herkesin yaptigi yanlis ne? Somut hata + somut cozum.", visualDirection: "Gorsel surpriz — hatanin kendisini goster. 'Bunu YAPMA' hissi veren yaratici bir kare." },
              { number: 6, role: "PAYOFF", energy: "MEDIUM", purpose: "Bitmis sonuc TEKRAR. 'Kaliteli malzeme + dogru teknik = her seferinde ayni sonuc'.", visualDirection: "Bitmis urun, temiz ve sakin cercevede. Slide 1'e benzer ama daha sakin." },
              { number: 7, role: "CTA", energy: "LOW", purpose: "TEK aksiyon: 'Kaydet ve dene' veya 'Yaptiginizi etiketleyin: @sade.patisserie'.", visualDirection: "URUN YOK. Beyaz/siyah arkaplan. Mustard baslik. @sade.patisserie." },
            ],
          },
        ];

        const batch = db.batch();
        for (const fw of frameworks) {
          const ref = db.collection(COLLECTION).doc();
          batch.set(ref, fw);
        }
        await batch.commit();

        response.json({
          success: true,
          message: `${frameworks.length} carousel framework Firestore'a yazıldı (${COLLECTION})`,
        });
      } catch (error) {
        errorResponse(response, error, "seedCarouselFrameworks");
      }
    });
  });

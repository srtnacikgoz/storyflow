# Reinforcement Learning from Human Feedback (RLHF) ve Vektör Veritabanı Destekli Öz-Düzeltici Geri Bildirim Döngüleri: Telegram Arayüzü Üzerinden Niteliksel Geri Bildirim Alımı ve İstem Optimizasyonu

Generatif yapay zeka sistemlerinin, özellikle metinden görsele (Text-to-Image) üretim modellerinin gelişim süreci, basit bir üretim döngüsünden karmaşık ve çok bileşenli bir mimari yapıya evrilmiştir.^^ Bu evrimin temelinde, modellerin sadece büyük veri setlerinden öğrenmesi değil, aynı zamanda son kullanıcıdan gelen nüanslı tercihleri anlaması ve bu tercihler doğrultusunda kendi üretim stratejilerini revize edebilmesi yatmaktadır.^^ Geleneksel olarak kullanılan "Evet/Hayır" veya "Beğen/Beğenme" gibi ikili (binary) onay mekanizmaları, bir görselin neden reddedildiğine dair yeterli semantik bilgi sağlamamaktadır.^^ Bu durum, sistemin aynı hataları tekrar etmesine ve kullanıcı niyetinden sapmasına yol açmaktadır.^^ Bu rapor, Telegram üzerinden alınan "çok yapay" veya "ürün rengi yanlış" gibi niteliksel ret kararlarının, vektör veritabanları (Vector Database) aracılığıyla nasıl birer öğrenme sinyaline dönüştürülebileceğini ve bu verilerin bir öz-düzeltici boru hattı (Self-correcting pipeline) içerisinde sonraki istemleri (prompt) nasıl optimize edebileceğini teknik derinlikte incelemektedir.^^

## İnsan Geri Bildiriminden Takviyeli Öğrenme (RLHF) ve Tercih Hizalamasının Kuramsal Temelleri

Reinforcement Learning from Human Feedback (RLHF), makine öğrenimi modellerini insan değerleri, hedefleri ve estetik algılarıyla uyumlu hale getirmek için kullanılan bir tekniktir.^^ Bu teknik, geleneksel denetimli öğrenmenin (supervised learning) aksine, bir ödül fonksiyonu aracılığıyla modelin hangi çıktılarının daha arzu edilebilir olduğunu öğrenmesini sağlar.^^ Süreç genellikle dört ana aşamadan oluşur: ön eğitim (pre-training), denetimli ince ayar (supervised fine-tuning - SFT), ödül modelinin (reward model) eğitilmesi ve takviyeli öğrenme (RL) yoluyla politikanın optimize edilmesi.^^

Görsel üretim bağlamında RLHF, modelin ürettiği çeşitli görsellerin insanlar tarafından sıralanması (ranking) ile başlar.^^ Ancak bu yaklaşım, özellikle "çok yapay" gibi öznel ve niteliksel değerlendirmelerin sayısal bir skora indirgenmesinde zorluklar yaşar.^^ Bu noktada, Direct Preference Optimization (DPO) gibi yöntemler, ayrı bir ödül modeline ihtiyaç duymadan, doğrudan tercih edilen (winning) ve edilmeyen (losing) çiftleri üzerinden modelin olasılık dağılımını güncelleyerek daha stabil bir eğitim süreci sunmaktadır.^^

### Karşılaştırmalı Optimizasyon Algoritmaları Analizi

Aşağıdaki tablo, generatif modellerin insan tercihlerine göre hizalanmasında kullanılan temel metodolojileri ve teknik gereksinimlerini özetlemektedir.

| **Metodoloji**                                  | **Optimizasyon Türü** | **Ödül Modeli İhtiyacı** | **Hesaplama Maliyeti** | **Geri Bildirim Granülaritesi** |
| ----------------------------------------------------- | ----------------------------- | ---------------------------------- | ---------------------------- | -------------------------------------- |
| **Geleneksel RLHF**                             | Politika Gradyanı (PPO)      | Evet (Ayrı Model)                 | Yüksek                      | Skaler / Global ^^                     |
| **DPO (Direct Preference Optimization)**        | Olasılık Temelli            | Hayır (Doğrudan)                 | Orta                         | Çift Yönlü (Pairwise) ^^            |
| **DSPO (Direct Score Preference Optimization)** | Skor Eşleme                  | Hayır (Doğrudan)                 | Düşük                     | Gradyan Temelli ^^                     |
| **RLHF-V / DDPO**                               | Yoğun DPO                    | Hayır (Doğrudan)                 | Orta                         | Segment Seviyesinde ^^                 |
| **APOHF**                                       | Düello Banditleri            | Hayır                             | Düşük                     | Yinelemeli Çift Yönlü ^^            |

Bu algoritmalar, tercih sinyallerini matematiksel bir çerçeveye oturtmak için Bradley–Terry–Luce (BTL) modelini kullanır.^^ BTL modeline göre, bir** **$y_w$** **görselinin** **$y_l$** **görseline tercih edilme olasılığı, sistemin bu iki çıktı arasındaki "yararlılık" (utility) farkını bir sigmoid fonksiyonu üzerinden hesaplamasıyla belirlenir.^^

## Telegram Tabanlı Niteliksel Geri Bildirim Arayüzü Tasarımı

Telegram, gelişmiş Bot API desteği, satır içi klavyeler (inline keyboards) ve durum yönetimi (state management) yetenekleri sayesinde insan-yapay zeka etkileşimi için ideal bir katman sunar.^^ Bir öz-düzeltici boru hattında Telegram botu, sadece bir onay mekanizması değil, aynı zamanda zengin veri toplama aracı olarak işlev görür.^^ Kullanıcının bir görseli reddettiği "Red" kararı, sistem için bir "Öz-yansıtma" (Self-reflection) döngüsünü tetiklemelidir.^^

Teknik mimari açısından bot, bir Sonlu Durum Makinesi (Finite State Machine - FSM) tarafından yönetilir.^^Kullanıcı bir görseli reddettiğinde, sistem** **`AWAITING_APPROVAL` durumundan** **`COLLECTING_CRITIQUE`durumuna geçer.^^ Bu aşamada kullanıcıdan gelen "görsel çok yapay" (too artificial) veya "ürün rengi yanlış" (wrong color) gibi serbest metin geri bildirimleri, sistemin semantik analiz katmanına iletilir.^^

### Telegram Geri Bildirim Akışı ve Durum Yönetimi

Geri bildirim döngüsünün operasyonel aşamaları şu şekilde kurgulanmaktadır:

1. **Üretim ve Sunum** : Bot, kullanıcı istemini alır, difüzyon modeline gönderir ve sonucu onay/ret butonları ile sunar.^^
2. **Ret Sinyali** : Kullanıcı "Ret" butonuna bastığında,** **`CallbackQueryHandler` bu sinyali yakalar ve kullanıcıdan açıklama ister.^^
3. **Niteliksel Veri Girişi** : Kullanıcı, hatayı tanımlayan metni gönderir (Örneğin: "Cilt dokusu plastik gibi görünüyor, daha gözenekli olmalı").
4. **Semantik İşleme** : Bir Büyük Dil Modeli (LLM), bu eleştiriyi orijinal istemle birlikte analiz ederek "hedeflenmiş negatifleri" (nelerden kaçınılmalı) ve "revize edilmiş pozitifleri" (nasıl düzeltilmeli) çıkarır.^^
5. **Vektör Veritabanı Kaydı** : Üretilen görsel, orijinal istem, kullanıcı eleştirisi ve türetilen negatif anahtar kelimeler vektör veritabanına birer "öğrenilmiş ders" (lesson learned) olarak kaydedilir.^^

## Vektör Veritabanları ve Generatif Bellek Mimarisi

Generatif modellerin en büyük kısıtlamalarından biri, her üretim isteğinin birbirinden bağımsız (stateless) olmasıdır.^^ Vektör veritabanları (VecDB), bu sorunu sistem için "uzun süreli hafıza" (long-term memory) sağlayarak çözer.^^ Qdrant, Pinecone veya Milvus gibi sistemler, metinsel eleştirileri yüksek boyutlu sayısal vektörlere dönüştürerek saklar.^^

Bir sonraki istem geldiğinde, sistem yeni istemi vektör uzayında sorgular ve geçmişteki benzer "Ret" kararlarını geri çağırır (Retrieval).^^ Eğer kullanıcı daha önce "kırmızı araba" isteminde "renk çok turuncuya kaçıyor" eleştirisini yapmışsa, vektör araması bu geçmiş tecrübeyi bulur ve yeni "kırmızı araba" üretiminde istemi otomatik olarak şu şekilde revize eder: "Canlı kırmızı renk, turuncu tonlardan kaçınılmış, HEX #FF0000 odaklı".^^

### Vektör Arama ve Erişim Optimizasyonu Teknikleri

Öz-düzeltici sistemlerde doğru bilginin geri çağrılması, boru hattının başarısı için kritiktir.^^

| **Bileşen**            | **Görev**                                           | **Uygulama Örneği**   |
| ----------------------------- | ---------------------------------------------------------- | ----------------------------- |
| **Embedding Modeli**    | Eleştirileri anlamsal vektörlere dönüştürür         | `text-embedding-3-small`^^  |
| **Vektör İndeksi**    | Milisaniye seviyesinde benzerlik araması yapar            | Qdrant HNSW ^^                |
| **Erişim Stratejisi**  | Alakalı geçmiş hataları getirir                        | Agentic RAG ^^                |
| **Metadata Filtreleme** | Aramayı belirli bir kullanıcı veya proje ile sınırlar | UserID tabanlı filtreleme ^^ |

Sistem, sadece benzerlik skoruna güvenmek yerine, geri çağrılan geçmiş verileri bir "Cross-Encoder" modeli ile yeniden sıralayarak (re-ranking), güncel istemle en yüksek semantik örtüşmeye sahip olan hatayı seçer.^^

## Öz-Düzeltici Boru Hattı (Self-Correcting Pipeline) Mekanizmaları

Öz-düzeltici bir boru hattı, pasif bir veri erişiminden ziyade, aktif bir akıl yürütme motoru gibi çalışır.^^ Bu sistemler, çıktının kalitesini sürekli değerlendiren bir geri bildirim döngüsü ve katmanlı doğrulama süreçleri içerir.^^

### Görsel Düzeltme için Negatif İstemleme (NPC)

Negatif İstemleme (Negative Prompting for Image Correction - NPC), üretim sırasında istenmeyen içerikleri bastırmak için otomatikleştirilmiş bir boru hattıdır.^^ NPC mimarisi, doğrulayıcı-altyazılayıcı-önerici (verifier-captioner-proposer) çerçevesini kullanır** **^^:

* **Doğrulayıcı (Verifier)** : Üretilen görseli orijinal istemle karşılaştırır ve "hatalı el çizimi" veya "yanlış renk" gibi spesifik başarısızlık nedenlerini tespit eder. Bunlar "hedeflenmiş negatifler" olarak adlandırılır.^^
* **Altyazılayıcı (Captioner)** : Görseli doğal dille betimleyerek, istemde bulunmayan ancak görselde ortaya çıkan "hedeflenmemiş negatifleri" (örneğin görseldeki gereksiz bir masa veya logo) belirler.^^
* **Önerici (Proposer)** : Bu hataları difüzyon modelinin anlayacağı negatif anahtar kelime adaylarına dönüştürür.^^

NPC sistemi, her aday kelimeyi bir "belirginlik skoru" (salient score) ile puanlar.^^ Bu skor, negatif yönlendirmenin istemdeki önemli (salient) jetonlara ayrılan dikkati ne kadar artıracağını hesaplar.^^

### Örnek-Spesifik İstem Optimizasyonu (SSPO)

RAPO++ çerçevesinde sunulan SSPO mekanizması, üretim zamanında (inference-time) çalışan kapalı döngü bir sistemdir.^^ Bu yapı, üretilen görseli analiz eden bir multimodal modelin (Qwen2.5-VL gibi) verdiği düşük hizalama skoruna yanıt olarak, istemi otomatik olarak yeniden yazar.^^ Eğer bir düzeltme adımı görsel kalitesini bozarsa, sistem "tarihsel istem geri takibi" (historical-prompt backtracking) yaparak bir önceki daha başarılı versiyona dönebilir.^^

## Niteliksel Eleştirilerin Negatif İstem Sentaksına Eşlenmesi

Kullanıcının Telegram üzerinden verdiği soyut eleştirilerin, difüzyon modelinin latent (gizli) uzayına etki edebilmesi için teknik bir sentaks eşlemesine ihtiyaç vardır.^^ Stable Diffusion ve benzeri modellerde negatif istemler, çapraz dikkat (cross-attention) katmanlarının belirtilen ankorlardan uzaklaşmasını sağlayan bir çıkarma mekanizması gibi çalışır.^^

### Eleştiri-Anahtar Kelime Eşleme Stratejileri

Aşağıdaki tablo, sık karşılaşılan niteliksel kullanıcı eleştirilerinin sistem tarafından nasıl teknik direktiflere dönüştürüleceğini göstermektedir.

| **Kullanıcı Eleştirisi** | **Semantik Yorumlama**                   | **Önerilen Negatif Kelimeler ve Ağırlıklar**      |
| --------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| "Çok yapay görünüyor"         | Plastik doku, gerçek dışı ışıklandırma | `(plastic:1.3), (cgi:1.4), (render:1.2), flat lighting`^^ |
| "Ürün rengi yanlış"           | Spektral kayma, doygunluk hatası              | `(orange:1.5), (yellow:1.3), oversaturated, washed-out`^^ |
| "Detaylar yetersiz"               | Düşük frekanslı özellik baskınlığı    | `blurry, pixelated, lowres, (grainy:1.2)`^^               |
| "Anatomi bozuk"                   | Yapısal artefaktlar                           | `extra limbs, (poorly drawn hands:1.4), bad anatomy`^^    |
| "Arka plan çok kalabalık"       | Semantik gürültü                            | `(cluttered:1.3), (busy:1.2), text, watermark, logo`^^    |

Stable Diffusion bu kelimeleri kesin komutlar olarak değil, "yumuşak kısıtlamalar" (soft constraints) olarak algılar.^^ Model, negatif listedeki özelliklerle ilişkili jetonlara olan içsel dikkatini (attention) azaltır.^^ Daha hassas kontrol için "anahtar kelime değiştirme" (keyword switching) tekniği kullanılabilir; örneğin ilk 10 adımda anlamsız bir "dud" kelime kullanılırken, geri kalan adımlarda** **`(ear:1.9)` gibi güçlü bir negatif kelimeye geçilerek genel kompozisyon bozulmadan ince detaylar düzeltilebilir.^^

### Gecikmeli Etki ve Ters Aktivasyon Riskleri

Negatif istemlerin işleyiş mekanizması üzerine yapılan deneysel çalışmalar, "Gecikmeli Etki" (Delayed Effect) ve "Ters Aktivasyon" (Reverse Activation) fenomenlerini ortaya koymuştur.^^ Gecikmeli Etki, negatif istemlerin etkisinin ancak pozitif istem karşılık gelen içeriği oluşturduktan sonra gözlemlendiğini belirtir.^^ Daha kritik olan Ters Aktivasyon ise, negatif istemin difüzyonun çok erken aşamalarında (yüksek gürültülü faz) eklenmesi durumunda, paradoksal bir şekilde istenmeyen nesnenin üretilmesine neden olmasıdır.^^ Bu nedenle, öz-düzeltici boru hattı, negatif eleştirileri difüzyon sürecinin orta adımlarında enjekte etmelidir.^^

## Dinamik Hiperparametre Ayarı ve Çıkarım Zamanı Yönlendirmesi

Kullanıcıdan gelen niteliksel geri bildirimler, sadece istemi değiştirmekle kalmamalı, aynı zamanda modelin hiperparametrelerini de dinamik olarak ayarlamalıdır.^^ Bu süreçte kullanılan en güçlü araçlar Yönlendirme Ölçeği (Guidance Scale - CFG) ve LoRA (Low-Rank Adaptation) ağırlıklarıdır.^^

### Dinamik Ölçekleme için Geri Bildirimli Yönlendirme (FBG)

Sınıflandırıcıdan bağımsız yönlendirme (CFG), genellikle tüm üretim süreci boyunca sabit bir değerde tutulur.^^Ancak sabit yönlendirme, çeşitliliği azaltabilir ve modelin eğitim verilerini ezberlemesine (memorization) yol açabilir.^^ FeedBack Guidance (FBG), yönlendirme ölçeğini çıkarım sırasında ihtiyaca göre dinamik olarak değiştirir.^^ FBG, modelin kendi tahminlerinin "koşullu sinyal bilgilendiriciliği" (conditional signal informativeness) hakkındaki geri bildirimine dayanır.^^ Eğer üretim süreci kullanıcı isteminden saptıysa, sistem hatayı düzeltmek için CFG ölçeğini anlık olarak artırır.^^

### Yapısal Uyarlama: LoRA ve UnGuide

LoRA, difüzyon modelinin çapraz dikkat katmanlarına eklenen küçük ağırlık matrisleridir ve modele yeni kavramlar veya stiller eklemek için kullanılır.^^ Bir öz-düzeltici sistemde, kullanıcı bir stil veya kavramı "çok yapay" diyerek sürekli reddediyorsa, sistem bu kavramı "unutmak" veya etkisini azaltmak için LoRA adaptörlerini kullanabilir.^^ `UnGuide` mekanizması, LoRA adaptörünün etkisini difüzyonun ilk birkaç adımındaki stabiliteye göre modüle eder.^^

Ayrıca,** **`LoRAGen` gibi çerçeveler, doğal dildeki eleştirilerden doğrudan LoRA parametreleri sentezleyebilmektedir.^^ Bu, sistemin kullanıcıdan gelen niteliksel bir şikayeti doğrudan modelin ağırlık uzayına (weight space) yansıtabilmesini sağlar.^^ Böylece yapay zeka ajanı, kullanıcının estetik tercihlerine göre kendini gerçek zamanlı olarak "yeniden uzmanlaştırır".^^

## Uçtan Uca Öz-Düzeltici Sistem Boru Hattı Entegrasyonu

Üretim kalitesinde bir öz-düzeltici boru hattı, kullanıcı arayüzünü (Telegram), hafıza birimini (Vektör Veritabanı) ve üretim motorunu (Difüzyon Modeli) birbirine bağlayan bir orkestrasyon katmanı gerektirir.^^ LangGraph gibi durum yönetimi araçları ve Redis/Qdrant gibi hızlı vektör depoları bu yapı için sağlam bir temel oluşturur.^^

### End-to-End Yürütme Mantığı ve Algoritması

1. **Giriş ve Hafıza Taraması** : Telegram'dan yeni bir istem geldiğinde, sistem bu istemi gömer ve Vektör DB'de geçmişteki benzer "Ret" kararlarını arar.^^
2. **İstem Takviyesi (Ön Üretim)** : Eğer benzer bir başarısızlık (örneğin "çok yapay plastik doku") bulunduysa, bir "Eleştirmen LLM" bu dersi alır ve güncel isteme negatif anahtar kelimeler olarak ekler.^^
3. **Dinamik Üretim** : Revize edilen istem difüzyon modeline gönderilir. Sistem, FBG kullanarak CFG ölçeğini istemin karmaşıklığına göre ayarlar.^^
4. **Otomatik Doğrulama (Self-Refine)** : Görsel kullanıcıya sunulmadan önce, dahili bir Vision-Language Modeli (VLM) "artefakt dedektörü" olarak çalışır.^^ Eğer görselde hala "yapaylık" veya "renk uyumsuzluğu" yüksekse, sistem kullanıcıya göstermeden istemi yeniden yazar ve üretimi tekrarlar.^^
5. **İnsan Döngüde (Human-in-the-Loop)** : Görsel Telegram'a gönderilir. Kullanıcı tekrar "Ret" verirse, yeni eleştiri metni alınır ve vektör veritabanına eklenerek bir sonraki üretim için "negatif bilgi" haline getirilir.^^

### Verimlilik ve Ölçeklendirme Analizi

Bu boru hatlarında karşılaşılan en büyük zorluk "Doğruluk Paradoksu"dur (Accuracy Paradox): Daha iyi ödül modelleri her zaman daha iyi generatif sonuçlar vermez; modeller bazen ödül sinyalini "hacklemeyi" öğrenerek yüzeysel estetiği artırıp semantik içeriği ihmal edebilir.^^ Bunu önlemek için, vektör tabanlı hafıza erişimi agresif bir şekilde filtrelenmeli ve sadece güncel bağlamla (cosine similarity > 0.3) gerçekten örtüşen geçmiş hatalar işleme alınmalıdır.^^

## İleri Düzey Hizalama ve Gelecek Projeksiyonları

RLHF, vektör hafızası ve ajan tabanlı öz-düzeltme sistemlerinin birleşimi, yapay zekayı "tek geçişli bir tahminci" olmaktan çıkarıp "yinelemeli bir akıl yürütme motoruna" dönüştürmektedir.^^ Bu alandaki akademik çalışmaların sayısı 2024-2025 döneminde dramatik bir artış göstermiştir.^^

### Yükselen Hizalama Temaları

* **Segment Seviyesinde Öğrenme** : Genel görsel sıralamasından vazgeçilerek, görselin spesifik bölgelerine (örneğin sadece yüze veya sadece bir nesneye) yönelik "Yoğun DPO" yaklaşımları gelişmektedir.^^ Bu yöntemler, nesne bazlı halüsinasyonları %75'ten fazla azaltabilmektedir.^^
* **Müfredat Öğrenimi (Curriculum Learning)** : DPO sürecinin kolaydan zora (belirgin hatalardan nüanslı estetik farklara) doğru kademeli olarak yapılması, modelin anatomik realizmini artırmaktadır.^^
* **Kendi Kendine Yarışan Difüzyon (SPIN)** : Difüzyon modelinin kendi önceki versiyonlarıyla rekabet ederek, dışarıdan veri gerektirmeden otonom bir hizalama döngüsü oluşturması üzerine çalışmalar yoğunlaşmaktadır.^^

Sonuç olarak, Telegram üzerinden alınan niteliksel "Red" kararlarının vektör veritabanlarında saklanması ve bir öz-düzeltici boru hattı içerisinde kullanılması, generatif sistemleri adaptif asistanlara dönüştürür.^^ Bu mimari, insan dilinin muğlaklığı ile difüzyon modellerinin hassas latent gereksinimleri arasındaki semantik boşluğu başarıyla kapatmaktadır.^^ Vektör veritabanı performansı arttıkça ve RL algoritmaları daha stabil hale geldikçe, "kendi hatalarından ders çıkaran" bu altyapılar kurumsal yapay zeka çözümlerinin standart mimarisi haline gelecektir.^^

## Matematiksel Modelleme ve Formülasyonlar

Öz-düzeltici sistemin kararlılık analizi, takviyeli öğrenme parametrelerinin hassas dengesine dayanır. Bir istem revizyonu süreci, bir Markov Karar Süreci (MDP) olarak modellenebilir.^^

### İstem Optimizasyonu için Politika Gradyanı

Sistemin** **$t$** **zamanındaki durumunu** **$s_t$** **(mevcut istem ve geri bildirimler), aksiyonunu** **$a_t$** **(istemdeki bir kelime değişikliği) ve ödülünü** **$R$** **olarak tanımlarsak, sistemin maksimize etmeye çalıştığı objektif fonksiyon şu şekildedir:

$$
J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta(\tau)} \left
$$

^^

Burada** **$\pi_\theta$** **ajan politikasını temsil eder. Öz-düzeltici boru hattında ödül** **$R$, multimodal bir doğrulayıcı modelden veya doğrudan Telegram üzerindeki onay/ret sinyalinden türetilen bir skalerdir.^^

### DPO Tercih Kaybı (Loss Function)

DPO algoritması, politikanın insan tercihlerine uyumunu sağlamak için şu log-olasılık farkını minimize eder:

$$
\mathcal{L}_{DPO}(\pi_\theta; \pi_{ref}) = -\mathbb{E}_{(x, y_w, y_l) \sim D} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)} \right) \right]
$$

^^

Burada** **$y_w$** **kullanıcı tarafından onaylanan,** **$y_l$** **ise Telegram üzerinden reddedilen görseli temsil eder.** **$\pi_{ref}$** **ise modelin ince ayar öncesindeki dondurulmuş (frozen) referans versiyonudur.^^ Bu formül, sistemin reddedilen çıktıların olasılığını azaltırken, onaylananların olasılığını artırmasını sağlar.^^

## Vektör Veritabanı ve RAG Mimarisi Detayları

Vektör veritabanı, sadece metni değil, aynı zamanda görselin özellik haritalarını (feature maps) da saklayarak daha zengin bir geri çağırma sunabilir.^^ "Çok yapay" eleştirisi, genellikle görseldeki belirli doku frekanslarıyla (düşük frekanslı yüzeylerin aşırı pürüzsüzlüğü) ilişkilidir.^^

### Geri Bildirimlerin Vektör Uzayındaki Dağılımı

Vektör uzayında "yapaylık" ve "renk hatası" eleştirileri farklı kümeler (cluster) oluşturur.^^ Embedding modeli, bu eleştirileri şu boyutlarda kodlar:

1. **Semantik Eksen** : "Ürün", "Araba", "Portre" gibi nesne kategorileri.
2. **Hata Ekseni** : "Plastik doku", "Eksik parmak", "Doygunluk".
3. **İstem Stili** : "Fotorealistik", "Anime", "Yağlı Boya".

Sistem, yeni bir istem geldiğinde bu üç boyutta bir benzerlik taraması yapar.^^ Eğer yeni istem "fotorealistik portre" ise, sistem geçmişteki "portre" ve "fotorealistik" etiketli tüm ret kararlarını filtreleyerek en alakalı 5-10 negatif tecrübeyi RAG bağlamına ekler.^^

## Teknik Uygulama: n8n, LangGraph ve Qdrant Orkestrasyonu

Bir üretim ortamında bu sistemi kurmak için düşük kodlu (low-code) otomasyon araçları ile yüksek performanslı durum makineleri birleştirilmektedir.^^

### n8n ve Telegram Botu Entegrasyonu

n8n, Telegram webhook tetikleyicileri ile gelen mesajları asenkron olarak işleyebilir.^^

* **Tetikleyici Node** : Telegram'dan gelen mesajı veya buton tıklamasını (Callback Query) yakalar.^^
* **İşleme Node (LLM Chain)** : Gelen metni analiz eder ve Vektör DB sorgusu için anahtar kelimeler oluşturur.^^
* **Vektör DB Node (Qdrant)** : Benzerlik araması yaparak geçmişteki ilgili ret kararlarını döndürür.^^
* **Üretim Node (Stable Diffusion API)** : Revize edilmiş istem ve negatif parametrelerle görseli üretir.^^

### LangGraph ile Döngüsel Kontrol

Geleneksel RAG sistemlerinin aksine, LangGraph döngüsel (cyclical) bir grafik yapısına izin verir.^^ Bu, sistemin kendi çıktısını kontrol etmesine ve hata bulduğunda başa dönmesine olanak tanır.^^

| **LangGraph Düğümü (Node)** | **Görevi**                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Planlayıcı`                      | Kullanıcı niyetini analiz eder ve geçmiş hataları sorgular.^^                        |
| `Üretici`                          | İstemi difüzyon modeline iletir ve görseli oluşturur.^^                               |
| `Puanlayıcı`                      | Görseli VLM (Vision LLM) ile kontrol eder. Artefakt varsa `Yazıcı`ya yönlendirir.^^ |
| `Yazıcı`                          | Hata raporuna göre istemi revize eder ve döngüyü başa sarar.^^                       |

## Negatif İstemleme ve Katmanlı Difüzyon Kontrolü

Telegram üzerinden alınan "yapaylık" geri bildirimi, Stable Diffusion mimarisinde sadece bir metin kutusuna kelime yazmaktan daha derin teknik müdahalelere kapı açar.^^

### Katman Başına Negatif Ağırlıklandırma

Modern difüzyon modellerinde, belirli katmanların (özellikle orta katmanlar) nesne yapısı ve kompozisyonundan sorumlu olduğu, uç katmanların ise renk ve dokudan sorumlu olduğu bilinmektedir.^^Kullanıcı "renk yanlış" diyorsa, sistem negatif yönlendirmeyi sadece doku ve renk katmanlarına uygulayabilir, böylece genel kompozisyon korunur.^^

### Dinamik Negatif Yönlendirme (DNG)

DNG, yönlendirme ölçeğinin zaman ve durum bağımlı bir modülasyonudur.^^ Geleneksel negatif istemlerin aksine, DNG modelin kendi iç tahminlerini kullanarak negatif kavramın görselde o anda ne kadar "mevcut" olduğunu ölçer ve baskılamayı buna göre ayarlar.^^ Kullanıcının "çok yapay" dediği plastikleşme etkisi difüzyonun 20. adımında belirginleşiyorsa, sistem bu adımda negatif baskıyı maksimuma çıkarır.^^

## Sistem Güvenliği ve Yanlı Görevlendirme Riskleri

Bir öz-düzeltici sistemin kullanıcı tarafından manipüle edilmesi veya "geri bildirim zehirlenmesi" (feedback poisoning) yaşaması riski mevcuttur.^^

### Geri Bildirim Filtreleme ve Güvenlik Katmanı

Vektör veritabanına kaydedilecek her eleştiri metni, kaydedilmeden önce bir güvenlik filtresinden geçirilmelidir.^^

* **Zehirlenme Kontrolü** : Kullanıcı kasıtlı olarak modele zarar verecek anahtar kelimeler (NSFW veya politik olarak hassas) içeren eleştiriler veriyor mu?** **^^
* **Tutarlılık Kontrolü** : Geri bildirim, üretilen görselle semantik olarak alakalı mı? Görsel mavi iken kullanıcı "kırmızı renk çok parlak" diyorsa bu veri Vektör DB'ye kaydedilmemelidir.^^
* **Aşırı Optimizasyon Kontrolü** : Modelin sadece belirli bir kullanıcı stilini ezberlemesi ve genel yeteneğini kaybetmesi (Catastrophic Forgetting) önlenmelidir.^^

## Vektör Veritabanı Destekli İstem Revizyonu için LLM İstemleri

Sistemin "öğrenme" kabiliyeti, LLM'e verilen sistem talimatlarının (System Prompt) kalitesine bağlıdır.^^

### Örnek Bir LLM Revizyon Talimatı

LLM'e şu yapıdaki bir sistem istemi verilebilir:

"Sen bir uzman görsel istem mühendisisin. Aşağıdaki verileri analiz et:

1. Mevcut Kullanıcı İstemi: {prompt}
2. Geçmişteki Benzer Reddedilen Görseller ve Eleştiriler: {vector_db_results}
3. Güncel Kullanıcı Eleştirisi: {user_critique}

Görevin: Geçmişteki hataları tekrar etmeyecek ve güncel eleştiriyi düzeltecek yeni bir pozitif istem ve ağırlıklı bir negatif istem seti oluştur. 'Çok yapay' eleştirisi için CGI ve plastik efektlerini baskıla. 'Yanlış renk' eleştirisi için tam renk uzayı koordinatlarını belirt."** **^^

## Çıktı Kalitesi ve Hizalama Metrikleri

Sistemin başarısı hem otomatik metrikler hem de insan değerlendirmeleriyle ölçülmelidir.^^

| **Metrik**            | **Ölçtüğü Özellik**                           | **Başarı Eşiği** |
| --------------------------- | --------------------------------------------------------- | -------------------------- |
| **CLIP Skoru**        | Metin-Görsel hizalaması                                 | > 0.28 ^^                  |
| **PickScore**         | İnsan tercihi tahmini                                    | > 20.0 ^^                  |
| **ImageReward**       | Estetik ve artefakt kontrolü                             | > 0.5 ^^                   |
| **Win Rate (İnsan)** | Sistemin önceki versiyonuna karşı tercih edilme oranı | > %70 ^^                   |

RLHF ile eğitilen modellerin, denetimli ince ayar (SFT) ile eğitilenlere göre hem görsel sadakat hem de isteme uyum açısından %34.8'e kadar daha başarılı olduğu kanıtlanmıştır.^^

## Niteliksel Geri Bildirimin Semantik Derinliği ve İstem Evrimi

Kullanıcı "çok yapay" dediğinde, sistem bu şikayeti sadece bir kelime olarak değil, bir kavramsal eksiklik olarak ele almalıdır.^^ Vektör veritabanındaki "yapaylık" kümesi, zamanla alt dallara ayrılacaktır: "yapay ışık", "yapay doku", "yapay kompozisyon".^^ Öz-düzeltici boru hattı, her reddedilişle birlikte bu kavramlar arasındaki ilişkileri daha iyi anlar.^^

### Bellek Ölçekleme ve Deneyim Birikimi

MemAlign gibi çerçeveler, yapay zekanın "Bellek Ölçekleme" (Memory Scaling) özelliğine sahip olduğunu göstermektedir.^^ Bu, geri bildirim miktarı arttıkça, modelin ağırlıklarını değiştirmeden (inference-only) bile sistem kalitesinin logaritmik olarak artması anlamına gelir.^^ Vektör veritabanında saklanan her "Red" kararı, sistemin gelecekteki benzer tuzaklara düşmesini engelleyen birer "navigasyon işareti" görevi görür.^^

## Sonuç ve Öneriler

Telegram üzerinden niteliksel geri bildirim toplayan ve bu verileri vektör veritabanı destekli bir öz-düzeltici boru hattında işleyen sistemler, generatif yapay zekanın en ileri uygulama alanını temsil etmektedir.^^ Bu mimari, sadece hataları düzeltmekle kalmaz, aynı zamanda kullanıcıyla birlikte evrilen, kişiselleştirilmiş bir estetik anlayışı geliştirir.^^

Uygulama aşamasında şu stratejik adımlar izlenmelidir:

1. **Niteliksel Veri Toplama** : Telegram'daki onay mekanizması, kullanıcının serbest metin girmesine olanak tanıyacak şekilde genişletilmeli ve bu veriler yapılandırılmış JSON formatında saklanmalıdır.^^
2. **Akıllı Geri Çağırma (RAG)** : Vektör veritabanı aramalarında sadece benzerlik skoruna değil, aynı zamanda hatanın türüne ve güncelliğine de (recency filtering) önem verilmelidir.^^
3. **Dinamik İstemleme** : LLM tabanlı istem refinerları, kullanıcı eleştirilerini Stable Diffusion'ın negatif istem sentaksına ve ağırlık mekanizmalarına (weighted prompting) kusursuz şekilde eşlemelidir.^^
4. **Otonom Doğrulama** : Kullanıcıya her zaman en iyi sonucun gitmesi için, boru hattı içerisine görselleri ön-değerlendirmeden geçiren "hallucination grader" ajanlar eklenmelidir.^^

Bu yaklaşım, yapay zekayı bir "araç" olmaktan çıkarıp, kullanıcının estetik vizyonunu zamanla öğrenen ve ona uyum sağlayan bir "yaratıcı partner" seviyesine yükseltmektedir.^^ Vektör veritabanlarının sağladığı süreklilik ve RLHF'in sağladığı hizalama gücü, generatif boru hatlarının gelecekteki en kritik bileşenleri olmaya devam edecektir.^^

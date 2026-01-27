
import { db } from "../config/firebase";
import { Mood } from "../orchestrator/types";

const COLLECTION_NAME = "moods";

export class MoodService {
    private collection = db.collection(COLLECTION_NAME);

    /**
     * Tüm moodları getir
     */
    async getAllMoods(activeOnly: boolean = false): Promise<Mood[]> {
        let query: FirebaseFirestore.Query = this.collection.orderBy("createdAt", "desc");

        if (activeOnly) {
            query = query.where("isActive", "==", true);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mood));
    }

    /**
     * ID ile mood getir
     */
    async getMoodById(id: string): Promise<Mood | null> {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Mood;
    }

    /**
     * Yeni mood oluştur
     */
    async createMood(data: Omit<Mood, "id" | "createdAt" | "updatedAt">): Promise<Mood> {
        const now = Date.now();
        const mood: Omit<Mood, "id"> = {
            ...data,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await this.collection.add(mood);
        return { id: docRef.id, ...mood };
    }

    /**
     * Mood güncelle
     */
    async updateMood(id: string, data: Partial<Omit<Mood, "id" | "createdAt" | "updatedAt">>): Promise<void> {
        await this.collection.doc(id).update({
            ...data,
            updatedAt: Date.now(),
        });
    }

    /**
     * Mood sil (soft delete yerine hard delete - opsiyonel)
     */
    async deleteMood(id: string): Promise<void> {
        await this.collection.doc(id).delete();
    }

    /**
     * Verilen zamana ve (ileride) hava durumuna uygun moodları bul
     * @param hourOfDay - Saat (0-23)
     * @param season - Mevsim (şimdilik opsiyonel)
     */
    async getMatchingMoods(hourOfDay: number, season?: Mood["season"]): Promise<Mood[]> {
        const allActive = await this.getAllMoods(true);

        // Zaman dilimi belirle
        let timeOfDay: Mood["timeOfDay"] = "night";
        if (hourOfDay >= 5 && hourOfDay < 12) timeOfDay = "morning";
        else if (hourOfDay >= 12 && hourOfDay < 17) timeOfDay = "afternoon";
        else if (hourOfDay >= 17 && hourOfDay < 21) timeOfDay = "evening";

        return allActive.filter(mood => {
            // 1. Zaman kontrolü
            const timeMatch = mood.timeOfDay === "any" || mood.timeOfDay === timeOfDay;

            // 2. Mevsim kontrolü (eğer parametre verilmişse)
            const seasonMatch = !season || mood.season === "any" || mood.season === season;

            return timeMatch && seasonMatch;
        });
    }
    /**
     * Varsayılan moodları veritabanına yükle (Seed)
     */
    async seedDefaults(): Promise<{ added: number; skipped: number }> {
        const defaultMoods: any[] = [
            {
                name: "Morning Ritual",
                description: "Bright and airy, fresh morning energy, clean minimal aesthetic",
                lightingPrompt: "Natural morning light through window, soft diffused shadows, 5500K daylight",
                colorGradePrompt: "white, cream, light wood, pastel tones",
                isActive: true,
                timeOfDay: ["morning"],
                season: ["any"],
                weather: ["any"]
            },
            {
                name: "Cozy Intimate",
                description: "Warm and inviting, intimate gathering, comfortable homey feeling",
                lightingPrompt: "Warm tungsten accent lighting, soft diffused ambient, 3000K warm",
                colorGradePrompt: "warm brown, cream, burnt orange, gold accents",
                isActive: true,
                timeOfDay: ["evening", "night"],
                season: ["autumn", "winter"],
                weather: ["any"]
            },
            {
                name: "Rustic Heritage",
                description: "Rustic artisanal charm, traditional craftsmanship, authentic heritage",
                lightingPrompt: "Golden hour directional sunlight, warm side-lighting, 3200K golden",
                colorGradePrompt: "natural wood, linen, terracotta, olive green",
                isActive: true,
                timeOfDay: ["afternoon"],
                season: ["autumn"],
                weather: ["any"]
            },
            {
                name: "Gourmet Midnight",
                description: "Sophisticated midnight indulgence, messy dramatic luxury",
                lightingPrompt: "Dramatic side-lighting at 45 degrees, deep defined shadows, 3500K amber",
                colorGradePrompt: "dark wood, burgundy, gold, deep black",
                isActive: true,
                timeOfDay: ["night"],
                season: ["winter"],
                weather: ["any"]
            },
            {
                name: "Bright Airy",
                description: "Clean contemporary aesthetic, bright editorial style, minimalist elegance",
                lightingPrompt: "Soft diffused daylight, minimal shadows, even illumination, 5000K neutral",
                colorGradePrompt: "white, marble, light grey, sage green",
                isActive: true,
                timeOfDay: ["morning", "noon"],
                season: ["spring", "summer"],
                weather: ["sunny"]
            },
            {
                name: "Festive Celebration",
                description: "Joyful celebration, special occasion warmth, festive abundance",
                lightingPrompt: "Warm ambient with specular highlights, celebratory glow, 3200K festive",
                colorGradePrompt: "gold, cream, burgundy, forest green",
                isActive: true,
                timeOfDay: ["evening"],
                season: ["winter"],
                weather: ["any"]
            }
        ];

        let added = 0;
        let skipped = 0;

        // Mevcut moodları al (kontrol için)
        const existingMoods = await this.getAllMoods();
        const existingNames = new Set(existingMoods.map(m => m.name));

        for (const mood of defaultMoods) {
            if (!existingNames.has(mood.name)) {
                await this.createMood(mood);
                added++;
            } else {
                skipped++;
            }
        }

        return { added, skipped };
    }
}

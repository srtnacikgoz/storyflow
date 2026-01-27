import { db } from "../config/firebase";
import { Style } from "../orchestrator/types";

const COLLECTION_NAME = "styles";

export class StyleService {
    private collection = db.collection(COLLECTION_NAME);

    /**
     * Tüm stilleri getir
     */
    async getAllStyles(activeOnly: boolean = false): Promise<Style[]> {
        let query: FirebaseFirestore.Query = this.collection.orderBy("order", "asc");

        if (activeOnly) {
            query = query.where("isActive", "==", true);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Style));
    }

    /**
     * ID ile stil getir
     */
    async getStyleById(id: string): Promise<Style | null> {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Style;
    }

    /**
     * Yeni stil oluştur
     * ID (slug) manual verilir
     */
    async createStyle(data: Omit<Style, "createdAt" | "updatedAt">): Promise<Style> {
        // ID kontrolü
        const existing = await this.getStyleById(data.id);
        if (existing) {
            throw new Error(`Style with ID '${data.id}' already exists.`);
        }

        const now = Date.now();
        const style: Style = {
            ...data,
            createdAt: now,
            updatedAt: now,
        };

        await this.collection.doc(data.id).set(style);
        return style;
    }

    /**
     * Stil güncelle
     */
    async updateStyle(id: string, data: Partial<Omit<Style, "id" | "createdAt" | "updatedAt">>): Promise<void> {
        await this.collection.doc(id).update({
            ...data,
            updatedAt: Date.now(),
        });
    }

    /**
     * Stil sil
     */
    async deleteStyle(id: string): Promise<void> {
        await this.collection.doc(id).delete();
    }

    /**
     * Varsayılan stilleri yükle (Seed)
     */
    async seedDefaults(): Promise<{ added: number; skipped: number }> {
        const defaultStyles: Omit<Style, "createdAt" | "updatedAt">[] = [
            {
                id: "modern",
                displayName: "Modern",
                description: "Clean lines, geometric shapes, minimal clutter",
                isActive: true,
                order: 1
            },
            {
                id: "rustic",
                displayName: "Rustik",
                description: "Natural materials, wood textures, warm tones",
                isActive: true,
                order: 2
            },
            {
                id: "minimal",
                displayName: "Minimal",
                description: "Less is more, simple composition, negative space",
                isActive: true,
                order: 3
            },
            {
                id: "elegant",
                displayName: "Zarif (Elegant)",
                description: "Sophisticated, luxury feel, premium materials",
                isActive: true,
                order: 4
            },
            {
                id: "bohemian",
                displayName: "Bohem",
                description: "Artistic, unconventional, vibrant patterns",
                isActive: true,
                order: 5
            }
        ];

        let added = 0;
        let skipped = 0;

        for (const style of defaultStyles) {
            const existing = await this.getStyleById(style.id);
            if (!existing) {
                await this.createStyle(style);
                added++;
            } else {
                skipped++;
            }
        }

        return { added, skipped };
    }
}

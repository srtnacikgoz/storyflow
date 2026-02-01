/**
 * Caption Template Service
 * Instagram Automation - Sade Patisserie
 *
 * Şablon CRUD işlemleri ve caption render
 */

import {db} from "../config/firebase";
import {
  CaptionTemplate,
  CaptionTemplateInput,
  ProductCategory,
  RenderedCaption,
  Photo,
} from "../types";

const COLLECTION = "caption-templates";

/**
 * Caption Template Service
 * Firestore CRUD + template rendering
 */
export class CaptionTemplateService {
  private collection = db.collection(COLLECTION);

  // ==========================================
  // CRUD Operations
  // ==========================================

  /**
   * Tüm aktif şablonları getir
   * @param {ProductCategory} category - Opsiyonel kategori filtresi
   * @return {Promise<CaptionTemplate[]>} Şablon listesi
   */
  async getAll(category?: ProductCategory): Promise<CaptionTemplate[]> {
    const query = this.collection
      .where("isActive", "==", true)
      .orderBy("priority", "asc");

    const snapshot = await query.get();
    let templates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CaptionTemplate[];

    // Kategori filtresi (Firestore array-contains "all" veya specific)
    if (category) {
      templates = templates.filter(
        (t) => t.categories.includes("all") || t.categories.includes(category)
      );
    }

    return templates;
  }

  /**
   * Tüm şablonları getir (admin için - inactive dahil)
   * @return {Promise<CaptionTemplate[]>} Tüm şablonlar
   */
  async getAllAdmin(): Promise<CaptionTemplate[]> {
    const snapshot = await this.collection.orderBy("priority", "asc").get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CaptionTemplate[];
  }

  /**
   * ID ile şablon getir
   * @param {string} id - Şablon ID
   * @return {Promise<CaptionTemplate | null>} Şablon veya null
   */
  async getById(id: string): Promise<CaptionTemplate | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as CaptionTemplate;
  }

  /**
   * Kategori için varsayılan şablonu getir
   * @param {ProductCategory} category - Kategori
   * @return {Promise<CaptionTemplate | null>} Varsayılan şablon
   */
  async getDefault(category: ProductCategory): Promise<CaptionTemplate | null> {
    // Önce kategoriye özel default ara
    const categoryQuery = await this.collection
      .where("isActive", "==", true)
      .where("isDefault", "==", true)
      .where("categories", "array-contains", category)
      .limit(1)
      .get();

    if (!categoryQuery.empty) {
      const doc = categoryQuery.docs[0];
      return {id: doc.id, ...doc.data()} as CaptionTemplate;
    }

    // Yoksa "all" kategorisindeki default'u al
    const allQuery = await this.collection
      .where("isActive", "==", true)
      .where("isDefault", "==", true)
      .where("categories", "array-contains", "all")
      .limit(1)
      .get();

    if (!allQuery.empty) {
      const doc = allQuery.docs[0];
      return {id: doc.id, ...doc.data()} as CaptionTemplate;
    }

    return null;
  }

  /**
   * Yeni şablon oluştur
   * @param {CaptionTemplateInput} input - Şablon verisi
   * @return {Promise<CaptionTemplate>} Oluşturulan şablon
   */
  async create(input: CaptionTemplateInput): Promise<CaptionTemplate> {
    const now = Date.now();

    const data = {
      ...input,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    const docRef = await this.collection.add(data);

    console.log("[CaptionTemplateService] Created template:", docRef.id);

    return {
      id: docRef.id,
      ...data,
    };
  }

  /**
   * Şablon güncelle
   * @param {string} id - Şablon ID
   * @param {Partial<CaptionTemplateInput>} updates - Güncellenecek alanlar
   * @return {Promise<CaptionTemplate | null>} Güncellenmiş şablon
   */
  async update(
    id: string,
    updates: Partial<CaptionTemplateInput>
  ): Promise<CaptionTemplate | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = {
      ...updates,
      updatedAt: Date.now(),
    };

    await this.collection.doc(id).update(data);

    console.log("[CaptionTemplateService] Updated template:", id);

    return this.getById(id);
  }

  /**
   * Şablon sil
   * @param {string} id - Şablon ID
   * @return {Promise<boolean>} Başarılı mı?
   */
  async delete(id: string): Promise<boolean> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return false;
    }

    await this.collection.doc(id).delete();

    console.log("[CaptionTemplateService] Deleted template:", id);

    return true;
  }

  /**
   * Kullanım sayısını artır
   * @param {string} id - Şablon ID
   * @return {Promise<void>}
   */
  async incrementUsage(id: string): Promise<void> {
    const doc = await this.collection.doc(id).get();

    if (doc.exists) {
      const currentCount = (doc.data() as CaptionTemplate).usageCount || 0;
      await this.collection.doc(id).update({
        usageCount: currentCount + 1,
      });
    }
  }

  // ==========================================
  // Template Rendering
  // ==========================================

  /**
   * Şablonu render et (değişkenleri doldur)
   * @param {CaptionTemplate} template - Şablon
   * @param {Record<string, string>} values - Değişken değerleri
   * @param {Partial<Photo>} photoContext - Auto değişkenler için Photo context
   * @return {RenderedCaption} Render edilmiş caption
   */
  renderTemplate(
    template: CaptionTemplate,
    values: Record<string, string> = {},
    photoContext: Partial<Photo> = {}
  ): RenderedCaption {
    let caption = template.template;
    const usedVariables: Record<string, string> = {};

    // Her değişkeni işle
    for (const variable of template.variables) {
      let value = "";

      switch (variable.type) {
      case "auto":
        // Photo context'ten otomatik al
        if (variable.autoSource && photoContext) {
          value = (photoContext as Record<string, unknown>)[
            variable.autoSource
          ] as string || "";
        }
        break;

      case "text":
      case "select":
        // Kullanıcıdan gelen değer veya default
        value = values[variable.key] || variable.defaultValue || "";
        break;
      }

      // Placeholder'ı değiştir
      const placeholder = `{${variable.key}}`;
      caption = caption.split(placeholder).join(value);
      usedVariables[variable.key] = value;
    }

    // Boş satırları temizle (ardışık \n\n\n → \n\n)
    caption = caption.replace(/\n{3,}/g, "\n\n").trim();

    return {
      templateId: template.id,
      templateName: template.name,
      caption,
      variables: usedVariables,
    };
  }

  /**
   * Caption önizleme (ID ile)
   * @param {string} templateId - Şablon ID
   * @param {Record<string, string>} values - Değişken değerleri
   * @param {Partial<Photo>} photoContext - Photo context
   * @return {Promise<RenderedCaption | null>} Önizleme
   */
  async previewCaption(
    templateId: string,
    values: Record<string, string> = {},
    photoContext: Partial<Photo> = {}
  ): Promise<RenderedCaption | null> {
    const template = await this.getById(templateId);

    if (!template) {
      return null;
    }

    return this.renderTemplate(template, values, photoContext);
  }

  // ==========================================
  // Validation
  // ==========================================

  /**
   * Şablon input validasyonu
   * @param {CaptionTemplateInput} input - Şablon verisi
   * @return {string[]} Hata mesajları (boş array = valid)
   */
  validateInput(input: CaptionTemplateInput): string[] {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push("Şablon adı gerekli");
    }

    if (!input.template || input.template.trim().length === 0) {
      errors.push("Şablon içeriği gerekli");
    }

    if (!input.categories || input.categories.length === 0) {
      errors.push("En az bir kategori seçilmeli");
    }

    // Template'deki değişkenleri kontrol et
    const placeholders = input.template.match(/\{(\w+)\}/g) || [];
    const variableKeys = input.variables.map((v) => v.key);

    for (const placeholder of placeholders) {
      const key = placeholder.slice(1, -1); // {key} → key
      if (!variableKeys.includes(key)) {
        errors.push(`Tanımsız değişken: ${placeholder}`);
      }
    }

    // Required değişkenleri kontrol et
    for (const variable of input.variables) {
      if (variable.type === "select" && (!variable.options || variable.options.length === 0)) {
        errors.push(`"${variable.key}" için seçenekler gerekli`);
      }
      if (variable.type === "auto" && !variable.autoSource) {
        errors.push(`"${variable.key}" için autoSource gerekli`);
      }
    }

    return errors;
  }

  // ==========================================
  // Seed Data
  // ==========================================

  /**
   * Varsayılan şablonları oluştur (ilk kurulum için)
   * @return {Promise<number>} Oluşturulan şablon sayısı
   */
  async seedDefaultTemplates(): Promise<number> {
    // Mevcut şablonları kontrol et
    const existing = await this.collection.limit(1).get();
    if (!existing.empty) {
      console.log("[CaptionTemplateService] Templates already exist, skipping seed");
      return 0;
    }

    const defaultTemplates: CaptionTemplateInput[] = [
      {
        name: "Minimal",
        description: "Sadece ürün adı",
        categories: ["all"],
        tags: ["classic", "minimal"],
        template: "{productName}",
        variables: [
          {
            key: "productName",
            label: "Ürün Adı",
            type: "auto",
            required: true,
            autoSource: "productName",
          },
        ],
        isActive: true,
        isDefault: true,
        priority: 1,
      },
      {
        name: "Sade Klasik",
        description: "Sade'den + ürün adı",
        categories: ["all"],
        tags: ["classic", "brand"],
        template: "Sade'den\n{productName}",
        variables: [
          {
            key: "productName",
            label: "Ürün Adı",
            type: "auto",
            required: true,
            autoSource: "productName",
          },
        ],
        isActive: true,
        isDefault: false,
        priority: 2,
      },
      {
        name: "Sade Özel Ürünlerinden",
        description: "Sade özel ürünlerinden formatı",
        categories: ["all"],
        tags: ["classic", "brand"],
        template: "Sade özel ürünlerinden\n{productName}",
        variables: [
          {
            key: "productName",
            label: "Ürün Adı",
            type: "auto",
            required: true,
            autoSource: "productName",
          },
        ],
        isActive: true,
        isDefault: false,
        priority: 3,
      },
      {
        name: "Mevsimsel",
        description: "Mevsim + ürün adı",
        categories: ["all"],
        tags: ["seasonal"],
        template: "{seasonEmoji} {season} lezzetleri\n{productName}",
        variables: [
          {
            key: "productName",
            label: "Ürün Adı",
            type: "auto",
            required: true,
            autoSource: "productName",
          },
          {
            key: "season",
            label: "Mevsim",
            type: "select",
            required: true,
            options: ["İlkbahar", "Yaz", "Sonbahar", "Kış"],
          },
          {
            key: "seasonEmoji",
            label: "Mevsim Emoji",
            type: "select",
            required: true,
            options: ["🌸", "☀️", "🍂", "❄️"],
          },
        ],
        isActive: true,
        isDefault: false,
        priority: 10,
      },
      {
        name: "Yeni Ürün",
        description: "Yeni ürün lansmanı",
        categories: ["all"],
        tags: ["launch", "new"],
        template: "Yeni!\n{productName}\n\nSade'de",
        variables: [
          {
            key: "productName",
            label: "Ürün Adı",
            type: "auto",
            required: true,
            autoSource: "productName",
          },
        ],
        isActive: true,
        isDefault: false,
        priority: 5,
      },
      {
        name: "Malzeme Vurgusu",
        description: "Ürün + ana malzemeler",
        categories: ["chocolate", "small-desserts", "big-cakes", "slice-cakes"],
        tags: ["ingredients"],
        template: "{productName}\n\n{ingredients}",
        variables: [
          {
            key: "productName",
            label: "Ürün Adı",
            type: "auto",
            required: true,
            autoSource: "productName",
          },
          {
            key: "ingredients",
            label: "Ana Malzemeler",
            type: "text",
            required: false,
            defaultValue: "",
          },
        ],
        isActive: true,
        isDefault: false,
        priority: 15,
      },
      {
        name: "Özel Gün",
        description: "Özel siparişler için",
        categories: ["special-orders", "big-cakes"],
        tags: ["special", "celebration"],
        template: "{productName}\n\n{occasion}",
        variables: [
          {
            key: "productName",
            label: "Ürün Adı",
            type: "auto",
            required: true,
            autoSource: "productName",
          },
          {
            key: "occasion",
            label: "Özel Gün",
            type: "text",
            required: false,
            defaultValue: "",
          },
        ],
        isActive: true,
        isDefault: false,
        priority: 20,
      },
      {
        name: "Emoji Only",
        description: "Sadece emoji",
        categories: ["all"],
        tags: ["minimal", "emoji"],
        template: "{emoji}",
        variables: [
          {
            key: "emoji",
            label: "Emoji",
            type: "select",
            required: true,
            options: ["🍫", "🥐", "☕", "🍰", "🎂", "✨", "🧁", "🍩"],
          },
        ],
        isActive: true,
        isDefault: false,
        priority: 50,
      },
    ];

    let count = 0;
    for (const template of defaultTemplates) {
      await this.create(template);
      count++;
    }

    console.log(`[CaptionTemplateService] Seeded ${count} default templates`);

    return count;
  }
}

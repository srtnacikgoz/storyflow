import { db } from "../config/firebase";

const COLLECTION = "coffee-menus";

export interface CoffeeMenuItem {
  id: string;
  name: string;
  description?: string;
}

export interface CoffeeMenuCategory {
  id: string;
  name: string;
  items: CoffeeMenuItem[];
}

export interface CoffeeMenu {
  id: string;
  name: string;
  categories: CoffeeMenuCategory[];
  createdAt: number;
  updatedAt: number;
}

export class CoffeeMenuService {
  private collection = db.collection(COLLECTION);

  async getAll(): Promise<CoffeeMenu[]> {
    const snapshot = await this.collection.orderBy("updatedAt", "desc").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CoffeeMenu));
  }

  async getById(id: string): Promise<CoffeeMenu | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as CoffeeMenu;
  }

  async create(data: { name: string; categories: CoffeeMenuCategory[] }): Promise<CoffeeMenu> {
    const now = Date.now();
    const ref = await this.collection.add({
      name: data.name,
      categories: data.categories,
      createdAt: now,
      updatedAt: now,
    });
    return { id: ref.id, name: data.name, categories: data.categories, createdAt: now, updatedAt: now };
  }

  async update(id: string, data: { name?: string; categories?: CoffeeMenuCategory[] }): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}

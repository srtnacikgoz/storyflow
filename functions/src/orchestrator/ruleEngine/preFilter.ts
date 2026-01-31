// ============================================================
// PRE-FILTER: Blocked ve uyumsuz asset'leri çıkar
// ============================================================

import {
    PreFilterResult,
    FilteredAssets,
    RemovedAsset,
    FilterStats,
    AssetCategory,
    RemovalReason,
    SelectionContext,
    ScoredAsset,
    PatronRule,
    RuleCondition,
} from "./types";

export class PreFilter {
    private context: SelectionContext;
    private removed: RemovedAsset[] = [];
    private stats: FilterStats;

    constructor(context: SelectionContext) {
        this.context = context;
        this.stats = this.initStats();
    }

    /**
     * Ana filtreleme fonksiyonu
     * Tüm asset kategorilerini filtreler
     */
    async filter(allAssets: any): Promise<PreFilterResult> {
        const candidates: FilteredAssets = {
            products: [],
            tables: [],
            plates: [],
            cups: [],
            napkins: [],
            cutlery: [],
            accessories: [],
            decor: [],
            pets: [],
        };

        // Her kategori için filtreleme
        candidates.products = this.filterCategory(
            allAssets.products || [],
            "products",
            this.context.effectiveRules.blockedProducts || []
        );

        candidates.tables = this.filterCategory(
            allAssets.tables || [],
            "tables",
            this.context.effectiveRules.blockedTables || []
        );

        candidates.plates = this.filterCategory(
            allAssets.plates || [],
            "plates",
            this.context.effectiveRules.blockedPlates || []
        );

        candidates.cups = this.filterCategory(
            allAssets.cups || [],
            "cups",
            this.context.effectiveRules.blockedCups || []
        );

        candidates.napkins = this.filterCategory(
            allAssets.napkins || [],
            "napkins",
            []
        );

        candidates.cutlery = this.filterCategory(
            allAssets.cutlery || [],
            "cutlery",
            []
        );

        candidates.accessories = this.filterCategory(
            allAssets.accessories || [],
            "accessories",
            []
        );

        candidates.decor = this.filterCategory(
            allAssets.decor || [],
            "decor",
            []
        );

        candidates.pets = this.filterCategory(
            allAssets.pets || [],
            "pets",
            []
        );

        // İstatistikleri hesapla
        this.calculateStats(allAssets, candidates);

        return {
            candidates,
            removed: this.removed,
            stats: this.stats,
        };
    }

    /**
     * Tek bir kategoriyi filtrele
     */
    private filterCategory(
        assets: any[],
        category: AssetCategory,
        blockedIds: string[]
    ): ScoredAsset[] {
        const filtered: ScoredAsset[] = [];

        for (const asset of assets) {
            // 1. Blocked kontrolü (Diversity Rules)
            if (blockedIds.includes(asset.id)) {
                this.addRemoved(asset, category, "blocked_by_diversity");
                continue;
            }

            // 2. Inactive kontrolü
            if (asset.isActive === false) {
                this.addRemoved(asset, category, "inactive");
                continue;
            }

            // 3. PATRON exclude kuralları
            const excludeRule = this.checkPatronExcludeRules(asset, category);
            if (excludeRule) {
                this.addRemoved(
                    asset,
                    category,
                    "blocked_by_patron_rule",
                    excludeRule.id,
                    excludeRule.name
                );
                continue;
            }

            // 4. Ürün uyumluluk kontrolü (sadece table/plate/cup için)
            if (["tables", "plates", "cups"].includes(category)) {
                if (!this.checkProductCompatibility(asset, category)) {
                    this.addRemoved(asset, category, "incompatible_product");
                    continue;
                }
            }

            // Filtreyi geçti, listeye ekle
            filtered.push(this.toScoredAsset(asset, category));
        }

        return filtered;
    }

    /**
     * PATRON exclude kurallarını kontrol et
     */
    private checkPatronExcludeRules(
        asset: any,
        category: AssetCategory
    ): PatronRule | null {
        const excludeRules = this.context.effectiveRules.patronRules.filter(
            (rule) => rule.type === "exclude" && rule.isActive
        );

        for (const rule of excludeRules) {
            // Koşullar bu context'e uyuyor mu?
            if (!this.evaluateConditions(rule.conditions)) {
                continue;
            }

            // Target bu asset'e uyuyor mu?
            if (this.matchesTarget(asset, category, rule.target)) {
                return rule;
            }
        }

        return null;
    }

    /**
     * Kural koşullarını değerlendir
     */
    private evaluateConditions(conditions: RuleCondition[]): boolean {
        for (const cond of conditions) {
            const contextValue = this.getContextValue(cond.field);

            switch (cond.operator) {
                case "eq":
                    if (contextValue !== cond.value) return false;
                    break;
                case "neq":
                    if (contextValue === cond.value) return false;
                    break;
                case "in":
                    if (!Array.isArray(cond.value) || !cond.value.includes(contextValue))
                        return false;
                    break;
                case "notIn":
                    if (Array.isArray(cond.value) && cond.value.includes(contextValue))
                        return false;
                    break;
                case "contains":
                    if (
                        typeof contextValue !== "string" ||
                        !contextValue.includes(String(cond.value))
                    )
                        return false;
                    break;
            }
        }
        return true;
    }

    /**
     * Context'ten değer al
     */
    private getContextValue(field: string): string {
        switch (field) {
            case "productType":
                return this.context.productType;
            case "mood":
                return this.context.mood;
            case "timeOfDay":
                return this.context.timeOfDay;
            case "scenario":
                return this.context.scenario?.id || "";
            case "season":
                return this.context.season || "";
            default:
                return "";
        }
    }

    /**
     * Asset'in target'a uyup uymadığını kontrol et
     */
    private matchesTarget(
        asset: any,
        category: AssetCategory,
        target: any
    ): boolean {
        switch (target.type) {
            case "asset":
                return asset.id === target.assetId;

            case "category":
                return category === target.category;

            case "tag":
                return (asset.tags || []).includes(target.tag);

            case "tags":
                const assetTags = asset.tags || [];
                if (target.matchMode === "all") {
                    return target.tags.every((t: string) => assetTags.includes(t));
                } else {
                    return target.tags.some((t: string) => assetTags.includes(t));
                }

            default:
                return false;
        }
    }

    /**
     * Ürün uyumluluğunu kontrol et
     */
    private checkProductCompatibility(
        asset: any,
        category: AssetCategory
    ): boolean {
        const matrix = this.context.effectiveRules.patronRules
            .find((r) => r.type === "avoid" && r.isActive);

        // Uyumluluk matrisi yoksa geç
        // NOT: Gerçek matris kontrolü Scorer içindedir, burada sadece 
        // kesinlikle uyumsuz olanları (patron "avoid" kuralları) kontrol ediyoruz.
        // Ancak planda "incompatible_product" logic'i var.
        // Şimdilik basit tutuyoruz, Scorer daha detaylı puan kıracak.

        // Eğer PATRON avoid kuralı varsa ve "exclude" gibi davranması isteniyorsa burası kullanılabilir.
        // Ancak avoid kuralları genelde puan kırar (Scorer).
        // Burada sadece "exclude" kurallarına bakıyoruz.
        // Geriye dönük uyumluluk için burayı şimdilik true dönüyoruz, 
        // veya özel bir "HARD avoid" mantığı varsa ekleyebiliriz.

        return true;
    }

    /**
     * Kaçınılacak tag'leri al
     */
    private getAvoidTags(category: AssetCategory): string[] {
        // Bu, PATRON SAYFA'dan veya config'den gelebilir
        // Şimdilik boş dönüyor, config entegrasyonunda doldurulacak
        return [];
    }

    /**
     * Asset'i ScoredAsset formatına çevir
     */
    private toScoredAsset(asset: any, category: AssetCategory): ScoredAsset {
        return {
            id: asset.id,
            name: asset.name || asset.filename || asset.id,
            filename: asset.filename || "",
            tags: asset.tags || [],
            usageCount: asset.usageCount || 0,
            originalData: asset,
        };
    }

    /**
     * Removed listesine ekle
     */
    private addRemoved(
        asset: any,
        category: AssetCategory,
        reason: RemovalReason,
        ruleId?: string,
        ruleName?: string
    ): void {
        this.removed.push({
            assetId: asset.id,
            assetName: asset.name || asset.filename || asset.id,
            category,
            reason,
            ruleId,
            ruleName,
            timestamp: Date.now(),
        });
    }

    /**
     * İstatistikleri başlat
     */
    private initStats(): FilterStats {
        const categories: AssetCategory[] = [
            "products",
            "tables",
            "plates",
            "cups",
            "napkins",
            "cutlery",
            "accessories",
            "decor",
            "pets",
        ];

        const byCategory: any = {};
        for (const cat of categories) {
            byCategory[cat] = { input: 0, removed: 0, remaining: 0 };
        }

        return {
            totalInput: 0,
            totalRemoved: 0,
            totalRemaining: 0,
            byCategory,
            byReason: {
                blocked_by_diversity: 0,
                blocked_by_patron_rule: 0,
                inactive: 0,
                incompatible_product: 0,
                threshold_not_met: 0,
                manual_exclude: 0,
            },
        };
    }

    /**
     * İstatistikleri hesapla
     */
    private calculateStats(allAssets: any, candidates: FilteredAssets): void {
        const categories: AssetCategory[] = [
            "products",
            "tables",
            "plates",
            "cups",
            "napkins",
            "cutlery",
            "accessories",
            "decor",
            "pets",
        ];

        for (const cat of categories) {
            const input = (allAssets[cat] || []).length;
            const remaining = (candidates[cat] || []).length;
            const removed = input - remaining;

            this.stats.byCategory[cat] = { input, removed, remaining };
            this.stats.totalInput += input;
            this.stats.totalRemaining += remaining;
            this.stats.totalRemoved += removed;
        }

        // Reason bazlı istatistik
        for (const entry of this.removed) {
            this.stats.byReason[entry.reason]++;
        }
    }
}

/**
 * Convenience function
 */
export async function preFilterAssets(
    allAssets: any,
    context: SelectionContext
): Promise<PreFilterResult> {
    const filter = new PreFilter(context);
    return filter.filter(allAssets);
}

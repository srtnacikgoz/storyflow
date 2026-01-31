// ============================================================
// SCORING ENGINE: Asset'lere puan ver
// ============================================================

import {
    ScoringResult,
    ScoreBreakdown,
    ScoredAsset,
    SelectionContext,
    ScoringWeights,
    AssetCategory,
} from "./types";

export class ScoringEngine {
    private weights: ScoringWeights;
    private context: SelectionContext;

    constructor(weights: ScoringWeights, context: SelectionContext) {
        this.weights = weights;
        this.context = context;
    }

    /**
     * Tek bir asset'i puanla
     */
    scoreAsset(asset: ScoredAsset, category: AssetCategory): ScoringResult {
        const breakdown: ScoreBreakdown = {
            tagMatch: 0,
            usageBonus: 0,
            moodMatch: 0,
            productCompat: 0,
            patronBonus: 0,
            patronPenalty: 0,
            total: 0,
        };

        // 1. Tag Eşleştirme (max: weights.tagMatch.weight)
        breakdown.tagMatch = this.calculateTagScore(asset);

        // 2. Kullanım Bonusu (max: weights.usageBonus.weight)
        breakdown.usageBonus = this.calculateUsageBonus(asset);

        // 3. Mood Uyumu (max: weights.moodMatch.weight)
        breakdown.moodMatch = this.calculateMoodScore(asset);

        // 4. Ürün Uyumluluğu (max: weights.productCompat.weight)
        breakdown.productCompat = this.calculateCompatScore(asset, category);

        // 5. PATRON Prefer Bonus
        breakdown.patronBonus = this.calculatePatronBonus(asset, category);

        // 6. PATRON Avoid Penalty
        breakdown.patronPenalty = this.calculatePatronPenalty(asset, category);

        // Toplam hesapla
        breakdown.total = Math.max(
            0,
            Math.min(
                100,
                breakdown.tagMatch +
                breakdown.usageBonus +
                breakdown.moodMatch +
                breakdown.productCompat +
                breakdown.patronBonus -
                breakdown.patronPenalty
            )
        );

        return {
            assetId: asset.id,
            assetName: asset.name,
            category,
            score: breakdown.total,
            breakdown,
            passesThreshold: false, // Threshold filter'da set edilecek
            appliedRules: this.getAppliedRules(asset, category),
        };
    }

    /**
     * Tag eşleştirme skoru
     */
    private calculateTagScore(asset: ScoredAsset): number {
        const assetTags = asset.tags || [];
        const contextTags = this.getContextTags();

        let score = 0;
        const maxScore = this.weights.tagMatch.weight;

        for (const tag of assetTags) {
            if (contextTags.exact.includes(tag)) {
                score += this.weights.tagMatch.exactMatchBonus;
            } else if (contextTags.partial.some((pt) => tag.includes(pt))) {
                score += this.weights.tagMatch.partialMatchBonus;
            }
        }

        return Math.min(score, maxScore);
    }

    /**
     * Kullanım bonusu hesapla (az kullanılan = daha yüksek bonus)
     */
    private calculateUsageBonus(asset: ScoredAsset): number {
        const usageCount = asset.usageCount || 0;
        const maxBonus = this.weights.usageBonus.maxBonus;

        switch (this.weights.usageBonus.formula) {
            case "linear":
                // usageCount 0 ise maxBonus, her kullanımda 2 puan düşer
                return Math.max(0, maxBonus - usageCount * 2);

            case "logarithmic":
                // Logaritmik azalma
                return Math.max(0, maxBonus - Math.log2(usageCount + 1) * 5);

            case "inverse":
                // Ters orantı
                return Math.max(0, maxBonus / (usageCount + 1));

            default:
                return Math.max(0, maxBonus - usageCount * 2);
        }
    }

    /**
     * Mood uyumu skoru
     */
    private calculateMoodScore(asset: ScoredAsset): number {
        const mood = this.context.mood;
        const moodTags = this.weights.moodMatch.moodTags[mood] || [];
        const assetTags = asset.tags || [];

        // Mood tag'lerinden kaç tanesi asset'te var?
        const matchCount = moodTags.filter((mt) => assetTags.includes(mt)).length;

        if (matchCount === 0) return 0;

        // En az 1 eşleşme varsa, oransal puan ver
        const ratio = matchCount / moodTags.length;
        return Math.round(this.weights.moodMatch.weight * ratio);
    }

    /**
     * Ürün uyumluluk skoru
     */
    private calculateCompatScore(
        asset: ScoredAsset,
        category: AssetCategory
    ): number {
        const productType = this.context.productType;
        const matrix = this.weights.productCompat.matrix;

        if (!matrix[productType]) return 10; // Matris yoksa nötr puan

        const assetTags = asset.tags || [];
        const config = matrix[productType];

        let score = 10; // Başlangıç: nötr

        // Tercih edilen tag'ler
        const preferredKey = `preferred${this.capitalize(category)}` as keyof typeof config;
        const preferred = (config[preferredKey] as string[]) || [];
        if (preferred.some((pt) => assetTags.includes(pt))) {
            score += 10;
        }

        // Kaçınılacak tag'ler
        const avoidKey = `avoid${this.capitalize(category)}` as keyof typeof config;
        const avoid = (config[avoidKey] as string[]) || [];
        if (avoid.some((at) => assetTags.includes(at))) {
            score -= 10;
        }

        return Math.max(0, Math.min(this.weights.productCompat.weight, score));
    }

    /**
     * PATRON prefer kurallarından bonus
     */
    private calculatePatronBonus(
        asset: ScoredAsset,
        category: AssetCategory
    ): number {
        const preferRules = this.context.effectiveRules.patronRules.filter(
            (r) => r.type === "prefer" && r.isActive
        );

        let bonus = 0;

        for (const rule of preferRules) {
            if (
                this.evaluateConditions(rule.conditions) &&
                this.matchesTarget(asset, category, rule.target)
            ) {
                bonus += rule.priority / 10; // priority 100 = +10 bonus
            }
        }

        return Math.min(20, bonus); // Max +20 bonus
    }

    /**
     * PATRON avoid kurallarından ceza
     */
    private calculatePatronPenalty(
        asset: ScoredAsset,
        category: AssetCategory
    ): number {
        const avoidRules = this.context.effectiveRules.patronRules.filter(
            (r) => r.type === "avoid" && r.isActive
        );

        let penalty = 0;

        for (const rule of avoidRules) {
            if (
                this.evaluateConditions(rule.conditions) &&
                this.matchesTarget(asset, category, rule.target)
            ) {
                penalty += rule.priority / 10; // priority 100 = -10 penalty
            }
        }

        return Math.min(30, penalty); // Max -30 penalty
    }

    /**
     * Context'e göre aranacak tag'leri al
     */
    private getContextTags(): { exact: string[]; partial: string[] } {
        const exact: string[] = [];
        const partial: string[] = [];

        // Mood tag'leri
        const moodTags = this.weights.moodMatch.moodTags[this.context.mood] || [];
        exact.push(...moodTags);

        // Ürün tipi
        partial.push(this.context.productType);

        // Zaman dilimi
        partial.push(this.context.timeOfDay);

        return { exact, partial };
    }

    /**
     * Uygulanan kuralların ID'lerini al
     */
    private getAppliedRules(
        asset: ScoredAsset,
        category: AssetCategory
    ): string[] {
        const applied: string[] = [];

        for (const rule of this.context.effectiveRules.patronRules) {
            if (
                rule.isActive &&
                this.evaluateConditions(rule.conditions) &&
                this.matchesTarget(asset, category, rule.target)
            ) {
                applied.push(rule.id);
            }
        }

        return applied;
    }

    // Helper methods
    private evaluateConditions(conditions: any[]): boolean {
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

    private matchesTarget(asset: ScoredAsset, category: AssetCategory, target: any): boolean {
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

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

/**
 * Tüm asset'leri puanla
 */
export function scoreAllAssets(
    candidates: any,
    weights: ScoringWeights,
    context: SelectionContext
): any {
    const engine = new ScoringEngine(weights, context);
    const scored: any = {};

    const categories = [
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

    for (const category of categories) {
        const assets = candidates[category] || [];
        scored[category] = assets.map((asset: ScoredAsset) => {
            const result = engine.scoreAsset(asset, category as AssetCategory);
            return {
                ...asset,
                score: result.score,
                scoreBreakdown: result.breakdown,
            };
        });

        // Skora göre sırala (yüksekten düşüğe)
        scored[category].sort((a: any, b: any) => b.score - a.score);
    }

    return scored;
}

/**
 * Threshold uygula
 */
export function applyThreshold(
    scoredAssets: any,
    thresholds: any,
    fallbackToHighestScore: boolean = true
): any {
    const filtered: any = {};

    const categories = [
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

    for (const category of categories) {
        const assets = scoredAssets[category] || [];
        const threshold = thresholds[category] || thresholds.default || 70;

        const passing = assets.filter((a: any) => a.score >= threshold);

        if (passing.length > 0) {
            filtered[category] = passing;
        } else if (fallbackToHighestScore && assets.length > 0) {
            // Fallback: En yüksek skorlu asset
            filtered[category] = [assets[0]];
            console.warn(
                `[Scorer] ${category}: Threshold (${threshold}) altında, fallback kullanıldı: ${assets[0].id} (score: ${assets[0].score})`
            );
        } else {
            filtered[category] = [];
        }
    }

    return filtered;
}

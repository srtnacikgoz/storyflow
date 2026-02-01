// ============================================================
// POST-VALIDATOR: Seçim sonrası doğrulama (Safety Net)
// ============================================================

import {
    ValidationResult,
    RuleViolation,
    AssetSelection,
    SelectionContext,
    AuditEntry,
    AssetCategory,
    ScoredAsset,
} from "./types";

export class PostValidator {
    private context: SelectionContext;
    private violations: RuleViolation[] = [];
    private auditEntries: AuditEntry[] = [];

    constructor(context: SelectionContext) {
        this.context = context;
    }

    /**
     * Seçimi doğrula
     */
    validate(
        selection: AssetSelection,
        qualifiedCandidates: any
    ): ValidationResult {
        this.violations = [];
        this.auditEntries = [];

        // Her seçilen asset'i kontrol et
        if (selection.product) {
            this.validateAsset(selection.product, "products", qualifiedCandidates);
        }
        if (selection.table) {
            this.validateAsset(selection.table, "tables", qualifiedCandidates);
        }
        if (selection.plate) {
            this.validateAsset(selection.plate, "plates", qualifiedCandidates);
        }
        if (selection.cup) {
            this.validateAsset(selection.cup, "cups", qualifiedCandidates);
        }
        if (selection.napkin) {
            this.validateAsset(selection.napkin, "napkins", qualifiedCandidates);
        }
        if (selection.cutlery) {
            this.validateAsset(selection.cutlery, "cutlery", qualifiedCandidates);
        }
        if (selection.accessory) {
            this.validateAsset(selection.accessory, "accessories", qualifiedCandidates);
        }
        if (selection.decor) {
            this.validateAsset(selection.decor, "decor", qualifiedCandidates);
        }
        if (selection.pet) {
            this.validateAsset(selection.pet, "pets", qualifiedCandidates);
        }

        // Sonuç
        const valid = this.violations.length === 0;

        let correctedSelection: AssetSelection | undefined;
        if (!valid) {
            correctedSelection = this.createCorrectedSelection(
                selection,
                qualifiedCandidates
            );
        }

        return {
            valid,
            violations: this.violations,
            correctedSelection,
            auditEntries: this.auditEntries,
        };
    }

    /**
     * Tek bir asset'i doğrula
     */
    private validateAsset(
        asset: ScoredAsset,
        category: AssetCategory,
        candidates: any
    ): void {
        const assetId = asset.id;

        // 1. Blocked kontrolü
        const blockedList = this.getBlockedList(category);
        if (blockedList.includes(assetId)) {
            this.addViolation({
                ruleId: `blocked_${category}`,
                ruleName: `Blocked ${category}`,
                ruleType: "blocked",
                severity: "error",
                assetId,
                assetCategory: category,
                message: `Asset ${assetId} çeşitlilik kuralı nedeniyle blocked`,
                suggestedFix: `${category} listesinden farklı asset seç`,
            });
        }

        // 2. Qualified listede mi kontrolü
        const qualifiedList = candidates[category] || [];
        const isQualified = qualifiedList.some((a: any) => a.id === assetId);
        if (!isQualified && qualifiedList.length > 0) {
            this.addViolation({
                ruleId: `not_qualified_${category}`,
                ruleName: `Not in qualified list`,
                ruleType: "threshold",
                severity: "error",
                assetId,
                assetCategory: category,
                message: `Asset ${assetId} qualified listesinde değil`,
                suggestedFix: `Qualified listeden seç: ${qualifiedList.map((a: any) => a.id).slice(0, 3).join(", ")}`,
            });
        }

        // 3. PATRON exclude kontrolü
        for (const rule of this.context.effectiveRules.patronRules) {
            if (rule.type === "exclude" && rule.isActive) {
                if (this.matchesPatronRule(asset, category, rule)) {
                    this.addViolation({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        ruleType: "patron",
                        severity: "error",
                        assetId,
                        assetCategory: category,
                        message: `PATRON kuralı "${rule.name}" ihlal edildi`,
                        suggestedFix: `Bu kurala uymayan asset seç`,
                    });
                }
            }
        }

        // Audit log
        this.addAudit(asset, category, this.violations.length === 0);
    }

    /**
     * Blocked listesini al
     */
    private getBlockedList(category: AssetCategory): string[] {
        switch (category) {
            case "products":
                return this.context.effectiveRules.blockedProducts;
            case "tables":
                return this.context.effectiveRules.blockedTables;
            case "plates":
                return this.context.effectiveRules.blockedPlates;
            case "cups":
                return this.context.effectiveRules.blockedCups;
            default:
                return [];
        }
    }

    /**
     * PATRON kuralına uyuyor mu?
     */
    private matchesPatronRule(
        asset: ScoredAsset,
        category: AssetCategory,
        rule: any
    ): boolean {
        // Koşulları değerlendir
        for (const cond of rule.conditions) {
            const contextValue = this.getContextValue(cond.field);
            if (cond.operator === "eq" && contextValue !== cond.value) return false;
            if (cond.operator === "neq" && contextValue === cond.value) return false;
        }

        // Target'ı değerlendir
        const target = rule.target;
        switch (target.type) {
            case "asset":
                return asset.id === target.assetId;
            case "category":
                return category === target.category;
            case "tag":
                return (asset.tags || []).includes(target.tag);
            default:
                return false;
        }
    }

    private getContextValue(field: string): string {
        switch (field) {
            case "productType":
                return this.context.productType;
            case "mood":
                return this.context.mood;
            case "timeOfDay":
                return this.context.timeOfDay;
            default:
                return "";
        }
    }

    /**
     * Düzeltilmiş seçim oluştur
     */
    private createCorrectedSelection(
        original: AssetSelection,
        candidates: any
    ): AssetSelection {
        const corrected: AssetSelection = { ...original };

        for (const violation of this.violations) {
            const category = violation.assetCategory;
            const alternatives = candidates[category] || [];

            // İhlal eden asset'in yerine ilk uygun alternatifi koy
            const alternative = alternatives.find(
                (a: any) => a.id !== violation.assetId
            );

            if (alternative) {
                const key = this.categoryToKey(category);
                if (key) {
                    (corrected as any)[key] = alternative;
                    console.warn(
                        `[PostValidator] ${category}: ${violation.assetId} → ${alternative.id} (düzeltildi)`
                    );
                }
            }
        }

        return corrected;
    }

    private categoryToKey(category: AssetCategory): string | undefined {
        const map: Record<AssetCategory, string> = {
            products: "product",
            tables: "table",
            plates: "plate",
            cups: "cup",
            napkins: "napkin",
            cutlery: "cutlery",
            accessories: "accessory",
            decor: "decor",
            pets: "pet",
            furniture: "table", // Fallback to table or generic
            props: "plate", // Fallback
            interior: "interior", // New field in AssetSelection
            environments: "environment", // New field in AssetSelection
            music: "music",
        };
        return map[category];
    }

    private addViolation(violation: RuleViolation): void {
        this.violations.push(violation);
    }

    private addAudit(
        asset: ScoredAsset,
        category: AssetCategory,
        passed: boolean
    ): void {
        // violation var mı bu asset için?
        const relevantViolations = this.violations.filter(v => v.assetId === asset.id);
        const passedThisTime = passed && relevantViolations.length === 0;

        this.auditEntries.push({
            id: `audit_${Date.now()}_${asset.id}`,
            pipelineId: "", // Orchestrator'dan set edilecek
            timestamp: Date.now(),
            stage: "validation",
            assetId: asset.id,
            assetName: asset.name,
            category,
            action: passedThisTime ? "selected" : "rejected",
            reason: passedThisTime
                ? "Tüm doğrulamalar geçti"
                : relevantViolations
                    .map((v) => v.message)
                    .join("; "),
            score: asset.score,
        });
    }
}

/**
 * Convenience function
 */
export function validateSelection(
    selection: AssetSelection,
    qualifiedCandidates: any,
    context: SelectionContext
): ValidationResult {
    const validator = new PostValidator(context);
    return validator.validate(selection, qualifiedCandidates);
}

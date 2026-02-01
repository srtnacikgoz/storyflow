import {
    AssetCategory,
    Asset,
    PatronRule,
    RuleType,
    RuleTarget,
    RuleCondition,
    FilterThresholds,
    ScoringWeights,
    CompatibilityMatrix
} from "../types";

export {
    AssetCategory,
    Asset,
    PatronRule,
    RuleType,
    RuleTarget,
    RuleCondition,
    FilterThresholds as CategoryThresholds,
    ScoringWeights,
    CompatibilityMatrix
};

export type RemovalReason =
    | "blocked_by_diversity"     // Çeşitlilik kuralı
    | "blocked_by_patron_rule"   // PATRON SAYFA kuralı
    | "inactive"                 // isActive: false
    | "incompatible_product"     // Ürün tipiyle uyumsuz
    | "threshold_not_met"        // Skor eşiği altında
    | "manual_exclude";          // Manuel hariç tutma

export type AuditAction =
    | "included"
    | "excluded"
    | "scored"
    | "selected"
    | "rejected"
    | "fallback_used"
    | "corrected";

// -----------------------------
// SCORING YAPILARI
// -----------------------------

// Scoring definitions moved to orchestrator/types.ts

export interface ScoringResult {
    assetId: string;
    assetName: string;
    category: AssetCategory;
    score: number;             // 0-100
    breakdown: ScoreBreakdown;
    passesThreshold: boolean;
    appliedRules: string[];    // Uygulanan PATRON rule ID'leri
}

export interface ScoreBreakdown {
    tagMatch: number;          // 0-40
    usageBonus: number;        // 0-20
    moodMatch: number;         // 0-20
    productCompat: number;     // 0-20
    patronBonus: number;       // PATRON prefer kurallarından bonus
    patronPenalty: number;     // PATRON avoid kurallarından ceza
    total: number;
}

// -----------------------------
// PRE-FILTER YAPILARI
// -----------------------------

export interface PreFilterResult {
    candidates: FilteredAssets;
    removed: RemovedAsset[];
    stats: FilterStats;
}

export interface FilteredAssets {
    products: ScoredAsset[];
    tables: ScoredAsset[];
    plates: ScoredAsset[];
    cups: ScoredAsset[];
    napkins: ScoredAsset[];
    cutlery: ScoredAsset[];
    accessories: ScoredAsset[];
    decor: ScoredAsset[];
    pets: ScoredAsset[];
    furniture: ScoredAsset[];
    props: ScoredAsset[];
    interior: ScoredAsset[];
    environments: ScoredAsset[];
    music: ScoredAsset[];
}

export interface ScoredAsset {
    id: string;
    name: string;
    filename: string;
    tags: string[];
    usageCount: number;
    score?: number;
    scoreBreakdown?: ScoreBreakdown;
    // Orijinal asset verisi
    originalData: any;
}

export interface RemovedAsset {
    assetId: string;
    assetName: string;
    category: AssetCategory;
    reason: RemovalReason;
    ruleId?: string;           // Hangi kural nedeniyle çıkarıldı
    ruleName?: string;
    timestamp: number;
}

export interface FilterStats {
    totalInput: number;
    totalRemoved: number;
    totalRemaining: number;
    byCategory: Record<AssetCategory, {
        input: number;
        removed: number;
        remaining: number;
    }>;
    byReason: Record<RemovalReason, number>;
}

// -----------------------------
// POST-VALIDATION YAPILARI
// -----------------------------

export interface ValidationResult {
    valid: boolean;
    violations: RuleViolation[];
    correctedSelection?: AssetSelection;
    auditEntries: AuditEntry[];
}

export interface RuleViolation {
    ruleId: string;
    ruleName: string;
    ruleType: "blocked" | "patron" | "threshold" | "compatibility";
    severity: "error" | "warning";
    assetId: string;
    assetCategory: AssetCategory;
    message: string;
    suggestedFix?: string;
}

export interface AssetSelection {
    product: ScoredAsset;
    table?: ScoredAsset;
    plate?: ScoredAsset;
    cup?: ScoredAsset;
    napkin?: ScoredAsset;
    cutlery?: ScoredAsset;
    accessory?: ScoredAsset;
    decor?: ScoredAsset;
    pet?: ScoredAsset;
}

// -----------------------------
// AUDIT YAPILARI
// -----------------------------

export interface AuditEntry {
    id: string;
    pipelineId: string;
    timestamp: number;
    stage: "pre-filter" | "scoring" | "threshold" | "selection" | "validation";
    assetId: string;
    assetName: string;
    category: AssetCategory;
    action: AuditAction;
    reason: string;
    score?: number;
    scoreBreakdown?: ScoreBreakdown;
    ruleApplied?: string;
    metadata?: Record<string, any>;
}

export interface AuditTrail {
    pipelineId: string;
    startTime: number;
    endTime?: number;
    entries: AuditEntry[];
    summary: AuditSummary;
}

export interface AuditSummary {
    totalAssetsProcessed: number;
    totalRemoved: number;
    totalScored: number;
    totalSelected: number;
    totalViolations: number;
    averageScore: number;
    selectionTime: number;
}

// -----------------------------
// CONFIG YAPILARI
// -----------------------------

export interface RuleEngineConfig {
    // Scoring
    scoringWeights: ScoringWeights;
    thresholds: FilterThresholds;

    // Behavior
    strictBlocking: boolean;        // true = kesinlikle geçirme
    fallbackToRandom: boolean;      // threshold altında random seç
    fallbackToHighestScore: boolean; // veya en yüksek skorluyu seç
    logWhenFallback: boolean;

    // PATRON rules
    patronRules: PatronRule[];

    // Feature flags
    enableScoring: boolean;
    enablePatronRules: boolean;
    enablePostValidation: boolean;
    enableAuditLog: boolean;

    // Metadata
    version: string;
    updatedAt: number;
}

// -----------------------------
// CONTEXT YAPILARI
// -----------------------------

export interface EffectiveRules {
    blockedProducts: string[];
    blockedTables: string[];
    blockedPlates: string[];
    blockedCups: string[];
    blockedScenarios: string[];
    blockedCompositions: string[];
    blockedHandStyles: string[];
    shouldIncludePet: boolean;
    petInstruction?: string;
    patronRules: PatronRule[];
    dynamicConfig?: any;
    recentHistory?: any;
}

export interface SelectionContext {
    productType: string;
    mood: string;
    moodDetails?: any;
    timeOfDay: string;
    scenario?: any;
    season?: string;
    effectiveRules: EffectiveRules;
    assetSelectionRules?: AssetSelectionRules;
    requiredAssets?: string[];
}

export interface AssetSelectionRules {
    plate: { enabled: boolean };
    table: { enabled: boolean };
    cup: { enabled: boolean };
    accessory: { enabled: boolean };
    napkin: { enabled: boolean };
    cutlery: { enabled: boolean };
}

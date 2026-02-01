export * from "./types";
export * from "./preFilter";
export * from "./scorer";
export * from "./postValidator";
export * from "./auditLogger";

import { preFilterAssets } from "./preFilter";
import { scoreAllAssets, applyThreshold } from "./scorer";
import { validateSelection } from "./postValidator";
import { RuleEngineConfig, SelectionContext } from "./types";

/**
 * Rule Engine Facade
 * Orchestrator bu sınıfı kullanarak tüm motoru yönetir.
 */
export class RuleEngine {
    private config: RuleEngineConfig;

    constructor(config: RuleEngineConfig) {
        this.config = config;
    }

    /**
     * Blocked ve uyumsuz asset'leri çıkar
     */
    async preFilter(allAssets: any, context: SelectionContext) {
        return preFilterAssets(allAssets, context);
    }

    /**
     * Tüm asset'leri puanla
     */
    scoreAll(candidates: any, context: SelectionContext) {
        return scoreAllAssets(candidates, this.config.scoringWeights, context);
    }

    /**
     * Threshold uygula
     */
    applyThreshold(scoredAssets: any) {
        return applyThreshold(
            scoredAssets,
            this.config.thresholds,
            this.config.fallbackToHighestScore
        );
    }

    /**
     * Son seçimi doğrula
     */
    validateSelection(selection: any, qualifiedCandidates: any, context: SelectionContext) {
        return validateSelection(selection, qualifiedCandidates, context);
    }
}

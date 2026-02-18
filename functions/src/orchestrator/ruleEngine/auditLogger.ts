// ============================================================
// AUDIT LOGGER: Karar süreçlerini kaydet
// ============================================================

import { getFirestore } from "firebase-admin/firestore";
import {
    PreFilterResult,
    ScoringResult,
    ValidationResult,
    AssetSelection,
    AuditEntry,
    AssetCategory
} from "./types";

export interface LogSelectionData {
    preFilter: PreFilterResult;
    scoring: Record<string, ScoringResult[]>; // category -> results
    qualified: Record<string, ScoringResult[]>; // category -> results
    selection: AssetSelection;
    validation: ValidationResult;
}

export class AuditLogger {
    private db = getFirestore();

    /**
     * Selection kararını logla
     */
    async logSelectionDecision(pipelineId: string, data: LogSelectionData): Promise<void> {
        try {
            const auditRef = this.db
                .collection("global")
                .doc("audit")
                .collection("selection_logs")
                .doc(pipelineId);

            const timestamp = Date.now();

            // Flat audit entries birleştir
            // Pre-filter'dan (data.preFilter.removed içinde zaten reason var)
            // Validation'dan (data.validation.auditEntries)
            // Selection'dan (data.selection üzerine türetilebilir)

            const summary = {
                pipelineId,
                timestamp,
                totalAssetsProcessed: data.preFilter.stats.totalInput,
                totalRemoved: data.preFilter.stats.totalRemoved,
                totalQualified: this.countAssets(data.qualified),
                selectedAssets: this.mapSelectionToIds(data.selection),
                valid: data.validation.valid,
                violationCount: data.validation.violations.length,
            };

            await auditRef.set({
                summary,
                details: {
                    preFilterStats: data.preFilter.stats,
                    removedAssets: data.preFilter.removed,
                    // Scoring sonuçlarını çok büyük olabileceği için özetleyebiliriz veya top 5 saklayabiliriz.
                    // Şimdilik full saklayalım ama dikkatli olalım.
                    topScores: this.getTopScores(data.scoring),
                    selection: data.selection,
                    violations: data.validation.violations,
                    auditEntries: data.validation.auditEntries,
                },
                createdAt: timestamp,
            });

            console.log(`[AuditLogger] Log saved for pipeline ${pipelineId}`);
        } catch (error) {
            console.error("[AuditLogger] Failed to save log:", error);
            // Audit hatası ana akışı bozmamalı
        }
    }

    private countAssets(assetsMap: Record<string, any[]>): number {
        return Object.values(assetsMap).reduce((acc, list) => acc + list.length, 0);
    }

    private mapSelectionToIds(selection: AssetSelection): Record<string, string> {
        const result: Record<string, string> = {};
        if (selection.product) result.product = selection.product.id;
        // Slot asset'leri — dinamik
        if (selection.slots) {
            for (const [key, asset] of Object.entries(selection.slots)) {
                if (asset?.id) result[key] = asset.id;
            }
        }
        // Slot dışı asset'ler
        if (selection.accessory) result.accessory = selection.accessory.id;
        if (selection.pet) result.pet = selection.pet.id;
        return result;
    }

    private getTopScores(scoring: Record<string, ScoringResult[]>): Record<string, any[]> {
        const result: Record<string, any[]> = {};
        for (const [cat, list] of Object.entries(scoring)) {
            result[cat] = list.slice(0, 5).map(item => ({
                id: item.assetId,
                score: item.score,
                breakdown: item.breakdown, // Skor detaylarını görelim
            }));
        }
        return result;
    }
}

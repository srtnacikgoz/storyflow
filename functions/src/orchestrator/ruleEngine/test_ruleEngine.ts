
import { RuleEngine } from "./index";
import { RuleEngineConfig, SelectionContext, Asset, PatronRule, ScoredAsset } from "./types";
import { DEFAULT_SCORING_WEIGHTS, DEFAULT_THRESHOLDS } from "./constants";

/**
 * Simple unit test runner for Rule Engine
 * Run with: ts-node functions/src/orchestrator/ruleEngine/test_ruleEngine.ts
 */

const mockAssets = {
    products: [
        { id: "p1", filename: "croissant.jpg", tags: ["breakfast"], usageCount: 5, category: "products" },
        { id: "p2", filename: "cake.jpg", tags: ["dessert"], usageCount: 0, category: "products" },
    ],
    plates: [
        { id: "pl1", filename: "white_plate.jpg", tags: ["modern", "white"], usageCount: 10, category: "plates" },
        { id: "pl2", filename: "rustic_plate.jpg", tags: ["rustic", "clay"], usageCount: 2, category: "plates" },
    ],
    tables: [
        { id: "t1", filename: "marble_table.jpg", tags: ["luxury", "white"], usageCount: 1, category: "tables" },
    ],
    cups: [],
    napkins: [],
    cutlery: [],
    accessories: [],
} as unknown as Record<string, Asset[]>;

const mockContext: SelectionContext = {
    productType: "croissants",
    mood: "energetic",
    timeOfDay: "morning",
    requiredAssets: ["products", "plates", "tables"],
    effectiveRules: {
        shouldIncludePet: false,
        blockedScenarios: [],
        blockedTables: [],
        blockedCompositions: [],
        blockedProducts: [],
        blockedPlates: [],
        blockedCups: [],
        patronRules: [],
        dynamicConfig: {
            variationRules: {
                minAssetReuseGap: 10,
                petFrequency: 10,
                scenarioGap: 5,
                themeGap: 5,
                maxDailyRepeats: 2
            },
            themes: []
        } as any,
        recentHistory: {} as any,
    }
};

async function runTests() {
    console.log("Starting Rule Engine Tests...");

    // 1. Initialize Engine
    const config: RuleEngineConfig = {
        scoringWeights: DEFAULT_SCORING_WEIGHTS,
        thresholds: { ...DEFAULT_THRESHOLDS, default: 0 }, // Lower threshold for testing
        strictBlocking: true,
        fallbackToRandom: false,
        fallbackToHighestScore: true,
        logWhenFallback: true,
        patronRules: [],
        enableScoring: true,
        enablePatronRules: true,
        enablePostValidation: true,
        enableAuditLog: true,
        version: "1.0.0",
        updatedAt: Date.now(),
    };

    const engine = new RuleEngine(config);
    console.log("✅ RuleEngine initialized");

    // 2. Test Pre-Filter
    console.log("\n--- Testing Pre-Filter ---");
    // Mock blocking rule: Block "pl1" (high usage) via recent history simulation
    mockContext.effectiveRules.blockedPlates = ["pl1"];

    const filtered = await engine.preFilter(mockAssets, mockContext);

    if (filtered.candidates.plates.find((p: ScoredAsset) => p.id === "pl1")) {
        console.error("❌ Pre-Filter Failed: Blocked plate 'pl1' was NOT removed.");
    } else {
        console.log("✅ Pre-Filter Success: Blocked plate 'pl1' was removed.");
    }

    if (filtered.candidates.plates.find((p: ScoredAsset) => p.id === "pl2")) {
        console.log("✅ Pre-Filter Success: Safe plate 'pl2' was kept.");
    } else {
        console.error("❌ Pre-Filter Failed: Safe plate 'pl2' was removed incorrectly.");
    }

    // 3. Test Scoring
    console.log("\n--- Testing Scoring ---");
    const scored = await engine.scoreAll(filtered.candidates, mockContext);

    const plate2Score = scored.plates.find((p: ScoredAsset) => p.id === "pl2");
    if (plate2Score) {
        console.log(`✅ Scoring Success: Plate 'pl2' scored ${plate2Score.score.toFixed(2)}`);
        console.log("   Breakdown:", JSON.stringify(plate2Score.breakdown));
    } else {
        console.error("❌ Scoring Failed: No score found for 'pl2'");
    }

    // 4. Test Threshold (Patron Rule)
    console.log("\n--- Testing Patron Rules ---");
    // Add a patron rule to excluded 'rustic' items
    const patronRule: PatronRule = {
        id: "r1",
        name: "No Rustic",
        type: "exclude",
        target: { type: "tag", tag: "rustic" }, // Removed category as it might be invalid for "tag" target
        conditions: [],
        priority: 100,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const configWithRule = { ...config, patronRules: [patronRule] };
    const engineWithRule = new RuleEngine(configWithRule);

    // reset blocked plates for this test
    mockContext.effectiveRules.blockedPlates = [];
    mockContext.effectiveRules.patronRules = [patronRule]; // Update context!

    const filteredWithRule = await engineWithRule.preFilter(mockAssets, mockContext);

    if (filteredWithRule.candidates.plates.find((p: ScoredAsset) => p.tags.includes("rustic"))) {
        console.error("❌ Patron Rule Failed: 'rustic' plate was NOT excluded.");
        console.log("DEBUG: Candidates:", JSON.stringify(filteredWithRule.candidates.plates.map((p: ScoredAsset) => p.tags)));
    } else {
        console.log("✅ Patron Rule Success: 'rustic' plate was excluded.");
    }

    console.log("\nTests Completed.");
}

runTests().catch(e => console.error("Test Error:", e));

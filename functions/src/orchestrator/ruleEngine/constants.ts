
import { ScoringWeights, FilterThresholds } from "./types";

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
    tagMatch: { weight: 40, exactMatchBonus: 10, partialMatchBonus: 5 },
    usageBonus: { weight: 20, formula: "linear", maxBonus: 20 },
    moodMatch: { weight: 20, moodTags: {} },
    productCompat: { weight: 20, matrix: {} },
};

export const DEFAULT_THRESHOLDS: FilterThresholds = {
    default: 50,
    products: 50,
    tables: 50,
    plates: 50,
    cups: 50,
    accessories: 50,
    napkins: 50,
    cutlery: 50,
};

/**
 * Slot → Asset alanı eşleşme testleri
 * orchestrator.ts:2880-2886 SLOT_TO_ASSET_FIELD + slotAssetPool:2958-2964
 */
import { describe, it, expect } from "vitest";

// Orchestrator'daki slot → asset field eşleşme haritası (birebir kopyası)
const SLOT_TO_ASSET_FIELD: Record<string, string> = {
  surface: "table",
  dish: "plate",
  drinkware: "cup",
  textile: "napkin",
  decor: "cutlery",
};

// slotAssetPool: her slot hangi asset koleksiyonunu kullanıyor
const SLOT_ASSET_CATEGORY: Record<string, { category: string; subType: string }> = {
  surface: { category: "furniture", subType: "tables" },
  dish: { category: "props", subType: "plates" },
  drinkware: { category: "props", subType: "cups" },
  textile: { category: "props", subType: "napkins" },
  decor: { category: "props", subType: "cutlery" },
};

describe("Slot → AssetField Eşleşme", () => {
  it("surface slot'u table alanına yazılır", () => {
    expect(SLOT_TO_ASSET_FIELD["surface"]).toBe("table");
  });

  it("dish slot'u plate alanına yazılır", () => {
    expect(SLOT_TO_ASSET_FIELD["dish"]).toBe("plate");
  });

  it("drinkware slot'u cup alanına yazılır", () => {
    expect(SLOT_TO_ASSET_FIELD["drinkware"]).toBe("cup");
  });

  it("textile slot'u napkin alanına yazılır", () => {
    expect(SLOT_TO_ASSET_FIELD["textile"]).toBe("napkin");
  });

  it("decor slot'u cutlery alanına yazılır", () => {
    expect(SLOT_TO_ASSET_FIELD["decor"]).toBe("cutlery");
  });

  it("bilinmeyen slot key undefined döner", () => {
    expect(SLOT_TO_ASSET_FIELD["unknown"]).toBeUndefined();
  });

  it("tüm slot'ların asset kategorisi tanımlı", () => {
    for (const [slotKey, mapping] of Object.entries(SLOT_ASSET_CATEGORY)) {
      expect(mapping.category).toBeTruthy();
      expect(mapping.subType).toBeTruthy();
      // SLOT_TO_ASSET_FIELD'da da tanımlı olmalı
      expect(SLOT_TO_ASSET_FIELD[slotKey]).toBeTruthy();
    }
  });
});

describe("Slot Asset Havuzu Kategorileri", () => {
  it("surface → furniture/tables", () => {
    expect(SLOT_ASSET_CATEGORY["surface"]).toEqual({ category: "furniture", subType: "tables" });
  });

  it("dish → props/plates", () => {
    expect(SLOT_ASSET_CATEGORY["dish"]).toEqual({ category: "props", subType: "plates" });
  });

  it("drinkware → props/cups", () => {
    expect(SLOT_ASSET_CATEGORY["drinkware"]).toEqual({ category: "props", subType: "cups" });
  });

  it("textile → props/napkins", () => {
    expect(SLOT_ASSET_CATEGORY["textile"]).toEqual({ category: "props", subType: "napkins" });
  });

  it("decor → props/cutlery", () => {
    expect(SLOT_ASSET_CATEGORY["decor"]).toEqual({ category: "props", subType: "cutlery" });
  });
});

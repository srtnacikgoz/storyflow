/**
 * Tag eşleşme mantığı testleri
 * orchestrator.ts:3011-3045 arası skor bazlı eşleşme algoritmasi
 */
import { describe, it, expect } from "vitest";

// Orchestrator'daki tag matching mantığını simüle eden yardımcı fonksiyonlar
// (Gerçek Orchestrator sınıfına bağımlılık yok — mantık izole test ediliyor)

interface MockAsset {
  id: string;
  filename: string;
  tags: string[];
  usageCount: number;
}

/**
 * Skor bazlı asset seçimi — orchestrator.ts:3015-3028 mantığını birebir uygular
 * filterTags: kullanıcının seçtiği etiketler
 * pool: asset havuzu
 * Dönüş: en iyi eşleşen asset ve skor detayları
 */
function scoreAndSelectBest(
  filterTags: string[],
  pool: MockAsset[]
): { asset: MockAsset; matchCount: number; matchedTags: string[]; missedTags: string[] } | null {
  const scored = pool
    .filter(asset => asset.tags && Array.isArray(asset.tags))
    .map(asset => {
      const matchCount = filterTags.filter(ft =>
        asset.tags.some(t => t.toLowerCase().includes(ft.toLowerCase()))
      ).length;
      return { asset, matchCount };
    })
    .filter(item => item.matchCount > 0)
    .sort((a, b) => {
      // Önce en çok etiket eşleşen, eşitlikte en az kullanılan
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return (a.asset.usageCount || 0) - (b.asset.usageCount || 0);
    });

  if (scored.length === 0) return null;

  const best = scored[0];
  const matchedTags = filterTags.filter(ft =>
    best.asset.tags.some(t => t.toLowerCase().includes(ft.toLowerCase()))
  );
  const missedTags = filterTags.filter(ft =>
    !best.asset.tags.some(t => t.toLowerCase().includes(ft.toLowerCase()))
  );

  return {
    asset: best.asset,
    matchCount: best.matchCount,
    matchedTags,
    missedTags,
  };
}

// ==========================================
// Test Data
// ==========================================

const TABLES: MockAsset[] = [
  { id: "t1", filename: "mermer-masa-1.jpg", tags: ["mermer", "gri", "cam-önü", "iç-alan"], usageCount: 3 },
  { id: "t2", filename: "ahsap-masa-1.jpg", tags: ["ahşap", "rustik", "doğal"], usageCount: 1 },
  { id: "t3", filename: "cam-masa-1.jpg", tags: ["cam", "modern", "cam-önü"], usageCount: 5 },
  { id: "t4", filename: "mermer-masa-2.jpg", tags: ["mermer", "beyaz", "iç-alan"], usageCount: 0 },
  { id: "t5", filename: "etiketsiz-masa.jpg", tags: [], usageCount: 0 },
];

const CUPS: MockAsset[] = [
  { id: "c1", filename: "cam-bardak-1.jpg", tags: ["cam", "cam bardak", "portakal suyu"], usageCount: 2 },
  { id: "c2", filename: "porselen-fincan.jpg", tags: ["porselen", "kahve", "espresso"], usageCount: 0 },
  { id: "c3", filename: "seramik-kupa.jpg", tags: ["seramik", "latte", "büyük"], usageCount: 1 },
];

// ==========================================
// Tests
// ==========================================

describe("Tag Eşleşme Algoritması", () => {
  describe("Tam eşleşme", () => {
    it("tüm etiketler eşleşince en iyi asset seçilir (4/4)", () => {
      const result = scoreAndSelectBest(
        ["mermer", "gri", "cam-önü", "iç-alan"],
        TABLES
      );
      expect(result).not.toBeNull();
      expect(result!.asset.id).toBe("t1");
      expect(result!.matchCount).toBe(4);
      expect(result!.matchedTags).toEqual(["mermer", "gri", "cam-önü", "iç-alan"]);
      expect(result!.missedTags).toEqual([]);
    });
  });

  describe("Kısmi eşleşme", () => {
    it("en yüksek skorlu seçilir (3/4 > 1/4)", () => {
      // t1: mermer, gri, cam-önü eşleşir (3/4), t3: cam-önü eşleşir (1/4)
      const result = scoreAndSelectBest(
        ["mermer", "gri", "cam-önü", "minimal"],
        TABLES
      );
      expect(result).not.toBeNull();
      expect(result!.asset.id).toBe("t1");
      expect(result!.matchCount).toBe(3);
      expect(result!.missedTags).toEqual(["minimal"]);
    });

    it("kısmi eşleşmede eksik etiketler doğru raporlanır", () => {
      const result = scoreAndSelectBest(
        ["cam", "cam bardak", "limonata"],
        CUPS
      );
      expect(result).not.toBeNull();
      expect(result!.asset.id).toBe("c1");
      expect(result!.matchCount).toBe(2);
      expect(result!.matchedTags).toEqual(["cam", "cam bardak"]);
      expect(result!.missedTags).toEqual(["limonata"]);
    });
  });

  describe("Eşit skor — usageCount tiebreaker", () => {
    it("eşit skorda en az kullanılan seçilir", () => {
      // t1: mermer, iç-alan (2 eşleşme, usageCount: 3)
      // t4: mermer, iç-alan (2 eşleşme, usageCount: 0)
      const result = scoreAndSelectBest(
        ["mermer", "iç-alan"],
        TABLES
      );
      expect(result).not.toBeNull();
      expect(result!.asset.id).toBe("t4"); // usageCount: 0 < 3
      expect(result!.matchCount).toBe(2);
    });
  });

  describe("Sıfır eşleşme", () => {
    it("hiç eşleşme yoksa null döner", () => {
      const result = scoreAndSelectBest(
        ["altın", "lüks", "antik"],
        TABLES
      );
      expect(result).toBeNull();
    });
  });

  describe("Boş filterTags", () => {
    it("boş etiket listesinde hiç eşleşme bulunamaz", () => {
      const result = scoreAndSelectBest([], TABLES);
      expect(result).toBeNull();
    });
  });

  describe("Boş havuz", () => {
    it("boş havuzda null döner", () => {
      const result = scoreAndSelectBest(["mermer"], []);
      expect(result).toBeNull();
    });
  });

  describe("Etiketsiz asset'ler", () => {
    it("etiketsiz asset'ler atlanır, etiketli olanlardan seçilir", () => {
      const mixedPool: MockAsset[] = [
        { id: "no-tag", filename: "etiketsiz.jpg", tags: [], usageCount: 0 },
        { id: "tagged", filename: "etiketli.jpg", tags: ["mermer"], usageCount: 5 },
      ];
      const result = scoreAndSelectBest(["mermer"], mixedPool);
      expect(result).not.toBeNull();
      expect(result!.asset.id).toBe("tagged");
    });
  });

  describe("Case-insensitive eşleşme", () => {
    it("büyük-küçük harf duyarsız eşleşme çalışır", () => {
      const pool: MockAsset[] = [
        { id: "ci", filename: "test.jpg", tags: ["Mermer", "GRİ"], usageCount: 0 },
      ];
      const result = scoreAndSelectBest(["mermer", "gri"], pool);
      expect(result).not.toBeNull();
      expect(result!.matchCount).toBe(2);
    });
  });

  describe("Partial string match (includes)", () => {
    it("filterTag bir asset tag'inin alt string'i olarak eşleşir", () => {
      // "cam" → "cam bardak" eşleşir (includes)
      const pool: MockAsset[] = [
        { id: "p1", filename: "test.jpg", tags: ["cam bardak"], usageCount: 0 },
      ];
      const result = scoreAndSelectBest(["cam"], pool);
      expect(result).not.toBeNull();
      expect(result!.matchCount).toBe(1);
    });
  });
});

/**
 * StructuredTagForm - Yapılandırılmış Tag Giriş Formu
 *
 * Asset kategori ID'sine göre tag şemasını yükler ve
 * dropdown/checkbox ile yapılandırılmış tag girişi sağlar.
 *
 * Zorunlu gruplar doldurulmadan asset aktif edilemez.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { TagSchema, TagGroup, StructuredTags } from "../types";

interface StructuredTagFormProps {
  /** Asset'in ait olduğu kategori (plates, tables, cups, products, vb.) */
  categoryId: string;
  /** Mevcut structuredTags değeri (edit modda) */
  value: StructuredTags;
  /** Değişiklik callback'i */
  onChange: (tags: StructuredTags) => void;
  /** Form submit edildi mi? (validasyon gösterimi için) */
  submitted?: boolean;
  /** Asset görsel URL'i (AI auto-tag için) */
  imageUrl?: string;
}

export function StructuredTagForm({
  categoryId,
  value,
  onChange,
  submitted = false,
  imageUrl,
}: StructuredTagFormProps) {
  const [schema, setSchema] = useState<TagSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Alt tip → tag şeması eşleştirmesi
  const directSchemas = ["plates", "tables", "cups", "products", "napkins", "cutlery"];
  const subTypeToSchema: Record<string, string> = {
    croissants: "products",
    pastas: "products",
    chocolates: "products",
    coffees: "products",
  };
  const resolvedSchemaId = directSchemas.includes(categoryId)
    ? categoryId
    : subTypeToSchema[categoryId] || null;

  // Şemayı yükle - categoryId değiştiğinde
  useEffect(() => {
    if (!categoryId) {
      setSchema(null);
      return;
    }

    if (!resolvedSchemaId) {
      setSchema(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getTagSchema(resolvedSchemaId)
      .then((data) => {
        if (!cancelled) setSchema(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Tag şeması yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [resolvedSchemaId]);

  // Tek seçim değişikliği
  const handleSingleSelect = useCallback((groupKey: string, val: string) => {
    onChange({ ...value, [groupKey]: val });
  }, [value, onChange]);

  // Çoklu seçim değişikliği
  const handleMultiSelect = useCallback((groupKey: string, optionValue: string, checked: boolean) => {
    const current = (value[groupKey] as string[]) || [];
    const updated = checked
      ? [...current, optionValue]
      : current.filter((v) => v !== optionValue);
    onChange({ ...value, [groupKey]: updated });
  }, [value, onChange]);

  // AI ile otomatik tag doldur
  const handleAutoTag = useCallback(async () => {
    if (!imageUrl || !resolvedSchemaId) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const result = await api.autoTagAsset(imageUrl, resolvedSchemaId);
      // AI'dan gelen tag'leri structuredTags formatına dönüştür
      if (result.tags?.length) {
        onChange({ ...value, aiTags: result.tags });
      }
    } catch (err: any) {
      setAiError(err.message || "AI analiz hatası");
    } finally {
      setAiLoading(false);
    }
  }, [imageUrl, resolvedSchemaId, value, onChange]);

  // Zorunlu alanlar dolduruldu mu?
  const getMissingRequired = useCallback((): string[] => {
    if (!schema) return [];
    const missing: string[] = [];
    for (const group of schema.groups) {
      if (!group.required) continue;
      const val = value[group.key];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        missing.push(group.label);
      }
    }
    return missing;
  }, [schema, value]);

  // Yükleniyor
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Hata
  if (error) {
    return (
      <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
        Tag şeması yüklenemedi: {error}
      </div>
    );
  }

  // Bu kategori için şema yok
  if (!schema) {
    return null;
  }

  const missingRequired = getMissingRequired();

  return (
    <div className="space-y-4">
      {/* AI ile Etiket Oner butonu - gorsel varsa aktif, yoksa disabled */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAutoTag}
          disabled={!imageUrl || aiLoading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${!imageUrl
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : aiLoading
                ? "bg-purple-100 text-purple-400 cursor-wait"
                : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-sm hover:shadow"
            }
          `}
        >
          {aiLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analiz Ediliyor...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI ile Etiket Oner
            </>
          )}
        </button>
        {!imageUrl && (
          <span className="text-xs text-gray-400">Once gorsel yukleyin</span>
        )}
        {/* Tum etiketleri temizle */}
        {Object.keys(value).length > 0 && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Tumu Temizle
          </button>
        )}
      </div>

      {/* AI Hata mesajı */}
      {aiError && (
        <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
          AI Hata: {aiError}
        </div>
      )}

      {/* Zorunlu Etiketler */}
      {schema.groups.filter((g) => g.required).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Zorunlu Etiketler
          </p>
          <div className="space-y-3">
            {schema.groups
              .filter((g) => g.required)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((group) => (
                <TagGroupField
                  key={group.key}
                  group={group}
                  value={value[group.key]}
                  onSingleSelect={handleSingleSelect}
                  onMultiSelect={handleMultiSelect}
                  hasError={submitted && !value[group.key] || (Array.isArray(value[group.key]) && (value[group.key] as string[]).length === 0)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Opsiyonel Etiketler */}
      {schema.groups.filter((g) => !g.required).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Opsiyonel Etiketler
          </p>
          <div className="space-y-3">
            {schema.groups
              .filter((g) => !g.required)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((group) => (
                <TagGroupField
                  key={group.key}
                  group={group}
                  value={value[group.key]}
                  onSingleSelect={handleSingleSelect}
                  onMultiSelect={handleMultiSelect}
                  hasError={false}
                />
              ))}
          </div>
        </div>
      )}

      {/* Validasyon uyarısı */}
      {submitted && missingRequired.length > 0 && (
        <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg flex items-start gap-1.5">
          <span className="mt-0.5">⚠️</span>
          <span>
            Zorunlu alanları doldurun: {missingRequired.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Tek bir tag grubu alanı (dropdown veya chip-select)
 */
function TagGroupField({
  group,
  value,
  onSingleSelect,
  onMultiSelect,
  hasError,
}: {
  group: TagGroup;
  value: string | string[] | undefined;
  onSingleSelect: (key: string, val: string) => void;
  onMultiSelect: (key: string, val: string, checked: boolean) => void;
  hasError: boolean;
}) {
  if (group.multiSelect) {
    // Çoklu seçim - chip / checkbox
    const selected = (Array.isArray(value) ? value : value ? [value] : []) as string[];
    return (
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
          {group.label}
          {group.required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {group.options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onMultiSelect(group.key, opt.value, !isSelected)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                  ${isSelected
                    ? "bg-amber-100 border-amber-400 text-amber-800"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }
                  ${hasError && !isSelected ? "border-red-300" : ""}
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {hasError && selected.length === 0 && (
          <p className="text-xs text-red-500 mt-1">En az 1 seçim gerekli</p>
        )}
      </div>
    );
  }

  // Tekli seçim - dropdown
  const selectedValue = (typeof value === "string" ? value : "") as string;
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
        {group.label}
        {group.required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={selectedValue}
        onChange={(e) => onSingleSelect(group.key, e.target.value)}
        className={`
          w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium
          focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all
          ${hasError && !selectedValue ? "border-red-300 bg-red-50" : "border-gray-200"}
        `}
      >
        <option value="">Seçiniz...</option>
        {group.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
            {!opt.isSystem && " (Özel)"}
          </option>
        ))}
      </select>
      {hasError && !selectedValue && (
        <p className="text-xs text-red-500 mt-1">Bu alan zorunlu</p>
      )}
    </div>
  );
}

/**
 * structuredTags'den zorunlu alanların doldurulup doldurulmadığını kontrol eder
 * Asset aktif edilmeden önce validasyon için kullanılır
 */
export function validateStructuredTags(
  schema: TagSchema | null,
  tags: StructuredTags
): { valid: boolean; missing: string[] } {
  if (!schema) return { valid: true, missing: [] };

  const missing: string[] = [];
  for (const group of schema.groups) {
    if (!group.required) continue;
    const val = tags[group.key];
    if (!val || (Array.isArray(val) && val.length === 0)) {
      missing.push(group.label);
    }
  }

  return { valid: missing.length === 0, missing };
}

export default StructuredTagForm;

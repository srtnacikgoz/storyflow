import { useState, useRef, useEffect, useCallback } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

// Autocomplete önerili etiket giriş component'i
// Chip/badge görünümlü tag gösterimi + serbest metin ekleme desteği
export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Etiket yazın...",
  disabled = false,
  className = "",
  error = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Input'a yazıldığında filtrelenmiş öneriler
  const filteredSuggestions = inputValue.trim()
    ? suggestions.filter(
      (s) =>
        s.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(s)
    )
    : [];

  // Yeni tag ekle
  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInputValue("");
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [value, onChange]
  );

  // Tag sil
  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  // Klavye olayları
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        // Öneriden seç
        addTag(filteredSuggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        // Serbest metin ekle
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Boş input'ta Backspace → son tag'i sil
      removeTag(value.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  // Input değişikliği
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Virgül ile ayırma desteği (yapıştırma için)
    if (val.includes(",")) {
      const parts = val.split(",");
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed && !value.includes(trimmed)) {
          onChange([...value, trimmed]);
        }
      });
      setInputValue("");
      return;
    }

    setInputValue(val);
    setShowSuggestions(val.trim().length > 0);
    setHighlightedIndex(-1);
  };

  // Dışarı tıklama ile dropdown'ı kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Tag'ler ve input alanı */}
      <div
        className={`flex flex-wrap items-center gap-1.5 px-3 py-2 border rounded-lg bg-white min-h-[42px] cursor-text transition-colors ${disabled
            ? "bg-gray-100 border-gray-200 cursor-not-allowed"
            : error
              ? "border-red-500 ring-1 ring-red-500"
              : "border-gray-300 hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
          }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Mevcut tag'ler - chip/badge olarak */}
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-sm rounded-full"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label={`${tag} etiketini sil`}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* Input alanı */}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.trim()) setShowSuggestions(true);
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
          />
        )}
      </div>

      {/* Autocomplete önerileri */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${index === highlightedIndex
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
                }`}
              onMouseDown={(e) => {
                // mouseDown kullan, blur'dan önce çalışsın
                e.preventDefault();
                addTag(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Yardımcı metin */}
      {!disabled && value.length === 0 && !inputValue && (
        <p className="mt-1 text-xs text-gray-400">
          Örn: filtre kahve (Virgül veya Enter ile ayırın)
        </p>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { useRecentInputs } from "../hooks/useRecentInputs";

interface InputWithRecentProps {
  storageKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** textarea olarak render et */
  multiline?: boolean;
  rows?: number;
  maxRecent?: number;
  label?: string;
}

/**
 * Son yazılan değerleri hatırlayan input/textarea.
 * Focus olunca dropdown gösterir, blur olunca değeri kaydeder.
 */
export default function InputWithRecent({
  storageKey, value, onChange, placeholder, className = "",
  multiline = false, rows = 2, maxRecent, label,
}: InputWithRecentProps) {
  const { recentValues, save } = useRecentInputs(storageKey, maxRecent);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Blur'da kaydet (kısa gecikme — dropdown tıklaması için)
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (value.trim()) save(value);
    }, 200);
  }, [value, save]);

  const handleSelect = useCallback((v: string) => {
    onChange(v);
    setOpen(false);
  }, [onChange]);

  // Mevcut değerle eşleşmeyenleri filtrele
  const filtered = value.trim()
    ? recentValues.filter(v => v !== value && v.toLowerCase().includes(value.toLowerCase()))
    : recentValues.filter(v => v !== value);

  const showDropdown = open && filtered.length > 0;

  const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 ${className}`;

  return (
    <div ref={wrapperRef} className="relative">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          <div className="px-2.5 py-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Son kullanılanlar</div>
          {filtered.map((v, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(v)}
              className="w-full text-left px-2.5 py-1.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition truncate"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

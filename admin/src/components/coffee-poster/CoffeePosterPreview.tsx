import { forwardRef, useState, useCallback } from 'react';

export interface CoffeeItem {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  items: CoffeeItem[];
}

export type PosterColumns = 1 | 2;

interface CoffeePosterPreviewProps {
  categories: Category[];
  columns?: PosterColumns;
}

// Font boyutları container genişliğinin yüzdesi olarak tanımlanır
const FONT_SCALE = {
  brandName: 0.05,        // Sade Patisserie — %5
  brandSub: 0.014,        // patisserie l'artisan — %1.4
  categoryName: 0.022,    // Kategori başlık — %2.2
  itemName: 0.028,        // Ürün adı — %2.8
  itemDesc: 0.0238,       // Açıklama — ürün adının %85'i
};

const CoffeePosterPreview = forwardRef<HTMLDivElement, CoffeePosterPreviewProps>(
  ({ categories, columns = 2 }, ref) => {
    const MUSTARD = '#D4A945';
    const DESC_COLOR = '#aaaaaa';
    const [w, setW] = useState(600);

    // Container genişliğini ölç
    const measureRef = useCallback((node: HTMLDivElement | null) => {
      if (!node) return;
      const update = () => setW(node.offsetWidth);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(node);
      return () => ro.disconnect();
    }, []);

    // ref birleştir (dışarıdan gelen ref + ölçüm ref)
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        measureRef(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref, measureRef]
    );

    const f = (scale: number) => Math.round(w * scale);

    return (
      <div
        ref={setRefs}
        style={{
          backgroundColor: '#FFFFFF',
          aspectRatio: '3 / 4',
          width: '100%',
          padding: '8% 8%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '6%' }}>
          <div
            style={{
              fontFamily: "'Santana', Georgia, serif",
              fontWeight: 700,
              fontSize: f(FONT_SCALE.brandName),
              letterSpacing: '0.12em',
              color: '#000000',
              lineHeight: 1.2,
            }}
          >
            Sade Patisserie
          </div>
          <div
            style={{
              fontFamily: "'Santana', Georgia, serif",
              fontWeight: 400,
              fontSize: f(FONT_SCALE.brandSub),
              letterSpacing: '0.4em',
              color: '#000000',
              marginTop: '0.8%',
              textTransform: 'lowercase',
            }}
          >
            patisserie l&apos;artisan
          </div>
        </div>

        {/* Kategoriler */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '15%' }}>
          {categories.map((category) => (
            <div key={category.id}>
              {/* Kategori başlık */}
              {(() => {
                const catFs = f(FONT_SCALE.categoryName);
                const dotSize = Math.round(catFs * 0.4);
                const gapPx = Math.round(w * 0.025);
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: gapPx,
                    marginBottom: '3%',
                  }}>
                    <div style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: '50%',
                      backgroundColor: MUSTARD,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: catFs,
                      lineHeight: 1,
                      fontWeight: 400,
                      letterSpacing: '0.35em',
                      textTransform: 'uppercase',
                      color: '#000000',
                      whiteSpace: 'nowrap',
                    }}>
                      {category.name}
                    </span>
                    <div style={{ flex: 1, height: 1, backgroundColor: MUSTARD }} />
                  </div>
                );
              })()}

              {/* Ürünler */}
              <div
                style={{
                  paddingLeft: '4%',
                  display: 'grid',
                  gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
                  columnGap: '6%',
                  rowGap: '2.8%',
                }}
              >
                {category.items.map((item) => (
                  <div key={item.id}>
                    <div
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: f(FONT_SCALE.itemName),
                        fontWeight: 500,
                        color: '#000000',
                        lineHeight: 1.2,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {item.name}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: f(FONT_SCALE.itemDesc),
                          fontWeight: 400,
                          color: DESC_COLOR,
                          lineHeight: 1.4,
                          marginTop: f(FONT_SCALE.itemName) * 0.08,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

CoffeePosterPreview.displayName = 'CoffeePosterPreview';

export default CoffeePosterPreview;

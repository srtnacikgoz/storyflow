import { forwardRef } from 'react';

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

const CoffeePosterPreview = forwardRef<HTMLDivElement, CoffeePosterPreviewProps>(
  ({ categories, columns = 2 }, ref) => {
    const MUSTARD = '#D4A945';
    const GRAY = '#999999';

    return (
      <div
        ref={ref}
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
              fontSize: '4%',
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
              fontSize: '1.8%',
              letterSpacing: '0.4em',
              color: '#000000',
              marginTop: '1%',
              textTransform: 'lowercase',
            }}
          >
            patisserie l&apos;artisan
          </div>
        </div>

        {/* Kategoriler */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '5%' }}>
          {categories.map((category) => (
            <div key={category.id}>
              {/* Kategori başlık */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2.5%',
                  marginBottom: '3%',
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: MUSTARD,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '2.2%',
                    fontWeight: 400,
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: '#000000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {category.name}
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: MUSTARD }} />
              </div>

              {/* Ürünler — 2 sütunlu grid */}
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
                        fontSize: '2.8%',
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
                          fontFamily: 'Georgia, serif',
                          fontSize: '2%',
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: GRAY,
                          lineHeight: 1.3,
                          marginTop: '0.5%',
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

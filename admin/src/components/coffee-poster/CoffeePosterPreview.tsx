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

interface CoffeePosterPreviewProps {
  categories: Category[];
}

const CoffeePosterPreview = forwardRef<HTMLDivElement, CoffeePosterPreviewProps>(
  ({ categories }, ref) => {
    const MUSTARD = '#D4A945';
    const GRAY = '#999999';

    // Toplam ürün sayısına göre font ölçeği
    const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
    const scale = totalItems > 10 ? 0.85 : totalItems > 7 ? 0.92 : 1;

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: '#FFFFFF',
          aspectRatio: '3 / 4',
          width: '100%',
          padding: '10% 10%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: `${6 * scale}%` }}>
          <div
            style={{
              fontFamily: "'Santana', Georgia, serif",
              fontWeight: 700,
              fontSize: `${4.2 * scale}%`,
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
              fontSize: `${1.8 * scale}%`,
              letterSpacing: '0.4em',
              color: '#000000',
              marginTop: '1%',
              textTransform: 'lowercase',
            }}
          >
            patisserie l&apos;artisan
          </div>
        </div>

        {/* Ayraç */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2%',
            marginBottom: `${6 * scale}%`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '6%',
                height: '1.5px',
                backgroundColor: MUSTARD,
              }}
            />
          ))}
        </div>

        {/* Kategoriler */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {categories.map((category) => (
            <div key={category.id}>
              {/* Kategori başlık */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2%',
                  marginBottom: `${2.5 * scale}%`,
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
                    fontSize: `${2.2 * scale}%`,
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

              {/* Ürünler */}
              <div
                style={{
                  paddingLeft: '5%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${1.8 * scale}%`,
                }}
              >
                {category.items.map((item) => (
                  <div key={item.id}>
                    <div
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: `${3 * scale}%`,
                        fontWeight: 500,
                        color: '#000000',
                        lineHeight: 1.2,
                      }}
                    >
                      {item.name}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontFamily: 'Georgia, serif',
                          fontSize: `${2.2 * scale}%`,
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: GRAY,
                          lineHeight: 1.2,
                          marginTop: '0.3%',
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

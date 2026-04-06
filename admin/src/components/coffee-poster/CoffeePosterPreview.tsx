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

// html2canvas ile doğru render için tüm stiller inline olmalı
const CoffeePosterPreview = forwardRef<HTMLDivElement, CoffeePosterPreviewProps>(
  ({ categories }, ref) => {
    const MUSTARD = '#D4A945';
    const GRAY = '#999999';

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: '#FFFFFF',
          aspectRatio: '3 / 4',
          width: '100%',
          padding: '8% 10%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden',
        }}
      >
        {/* Logo Bölümü */}
        <div style={{ textAlign: 'center', marginBottom: '5%' }}>
          <div
            style={{
              fontFamily: "'Santana', Georgia, serif",
              fontWeight: 700,
              fontSize: '4.5%',
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
              fontSize: '2%',
              letterSpacing: '0.4em',
              color: '#000000',
              marginTop: '1%',
              textTransform: 'lowercase',
            }}
          >
            patisserie l&apos;artisan
          </div>
        </div>

        {/* Ayraç — Üç Kesik Çizgi */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2%',
            marginBottom: '5%',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8%',
                height: '1.5px',
                backgroundColor: MUSTARD,
              }}
            />
          ))}
        </div>

        {/* Kategoriler */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4%' }}>
          {categories.map((category) => (
            <div key={category.id}>
              {/* Kategori Başlığı */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2%',
                  marginBottom: '2%',
                }}
              >
                {/* Hardal nokta */}
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: MUSTARD,
                    flexShrink: 0,
                  }}
                />

                {/* Kategori adı */}
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '2.5%',
                    fontWeight: 400,
                    letterSpacing: '0.4em',
                    textTransform: 'uppercase',
                    color: '#000000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {category.name}
                </span>

                {/* Hardal yatay çizgi */}
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: MUSTARD,
                  }}
                />
              </div>

              {/* Ürünler */}
              <div
                style={{
                  paddingLeft: '5%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5%',
                }}
              >
                {category.items.map((item) => (
                  <div key={item.id}>
                    <div
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '3.4%',
                        fontWeight: 500,
                        color: '#000000',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.name}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontFamily: 'Georgia, serif',
                          fontSize: '2.5%',
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: GRAY,
                          lineHeight: 1.3,
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

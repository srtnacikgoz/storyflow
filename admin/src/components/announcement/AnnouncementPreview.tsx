import { forwardRef, useState, useCallback } from 'react';

// --- Tipler ---

export type TemplateId = 'classic' | 'showcase' | 'band' | 'minimal';

export interface AnnouncementPreviewProps {
  templateId: TemplateId;
  imageDataUrl: string | null;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  dateOrPrice: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  aspectRatio: string;
}

// Font boyutları container genişliğinin yüzdesi
const S = {
  badge: 0.02,
  title: 0.055,
  subtitle: 0.026,
  desc: 0.02,
  info: 0.024,
  brand: 0.028,
  brandSub: 0.01,
};

// --- Bileşen ---

const AnnouncementPreview = forwardRef<HTMLDivElement, AnnouncementPreviewProps>(
  (props, ref) => {
    const {
      templateId, imageDataUrl, badge, title, subtitle,
      description, dateOrPrice, accentColor, bgColor, textColor, aspectRatio,
    } = props;

    const [w, setW] = useState(500);

    // Container genişliğini ölç
    const measureRef = useCallback((node: HTMLDivElement | null) => {
      if (!node) return;
      const update = () => setW(node.offsetWidth);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(node);
      return () => ro.disconnect();
    }, []);

    // Dışarıdan gelen ref + ölçüm ref birleştir
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        measureRef(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref, measureRef],
    );

    const f = (scale: number) => Math.round(w * scale);

    // --- Ortak render yardımcıları ---

    const renderImg = (style: React.CSSProperties) =>
      imageDataUrl ? (
        <img src={imageDataUrl} alt="" style={{ objectFit: 'cover', display: 'block', ...style }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f0eb', ...style }}>
          <svg style={{ width: f(0.06), height: f(0.06), opacity: 0.3 }} fill="none" stroke="#999" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );

    const renderBadge = (bg?: string, color?: string, borderMode?: boolean) => {
      if (!badge) return null;
      const base: React.CSSProperties = {
        display: 'inline-block',
        fontSize: f(S.badge),
        fontWeight: 700,
        letterSpacing: '0.15em',
        padding: `${f(0.006)}px ${f(0.022)}px`,
        borderRadius: f(0.005),
        textTransform: 'uppercase',
      };
      if (borderMode) return <span style={{ ...base, border: `2px solid ${color || accentColor}`, color: color || accentColor }}>{badge}</span>;
      return <span style={{ ...base, backgroundColor: bg || accentColor, color: color || '#FFFFFF' }}>{badge}</span>;
    };

    const renderBrand = (color: string, withSub = true) => (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Santana', Georgia, serif", fontSize: f(S.brand), fontWeight: 700, letterSpacing: '0.12em', color }}>
          Sade Patisserie
        </div>
        {withSub && (
          <div style={{ fontFamily: "'Santana', Georgia, serif", fontSize: f(S.brandSub), letterSpacing: '0.3em', color, opacity: 0.5, marginTop: f(0.003), textTransform: 'lowercase' as const }}>
            patisserie l&apos;artisan
          </div>
        )}
      </div>
    );

    // --- ŞABLON: Klasik ---
    const renderClassic = () => (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '6% 7%' }}>
        {badge && <div style={{ textAlign: 'center', marginBottom: '4%' }}>{renderBadge()}</div>}
        <div style={{ flex: '0 0 48%', borderRadius: f(0.015), overflow: 'hidden', marginBottom: '4%' }}>
          {renderImg({ width: '100%', height: '100%' })}
        </div>
        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: f(0.008) }}>
          {title && <div style={{ fontSize: f(S.title), fontWeight: 700, color: textColor, lineHeight: 1.1 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: f(S.subtitle), color: textColor, opacity: 0.65 }}>{subtitle}</div>}
          {description && <div style={{ fontSize: f(S.desc), color: textColor, opacity: 0.55, lineHeight: 1.4 }}>{description}</div>}
          {dateOrPrice && <div style={{ fontSize: f(S.info), fontWeight: 600, color: accentColor, marginTop: f(0.01) }}>{dateOrPrice}</div>}
        </div>
        <div style={{ borderTop: `1px solid ${accentColor}40`, paddingTop: '3%' }}>
          {renderBrand(textColor)}
        </div>
      </div>
    );

    // --- ŞABLON: Vitrin ---
    const renderShowcase = () => (
      <>
        {renderImg({ position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%' })}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
          background: `linear-gradient(to top, ${bgColor}ee 0%, ${bgColor}bb 35%, transparent 100%)`,
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 8% 6%', display: 'flex', flexDirection: 'column', gap: f(0.012) }}>
          {badge && <div>{renderBadge()}</div>}
          {title && <div style={{ fontSize: f(S.title * 1.05), fontWeight: 700, color: textColor, lineHeight: 1.1 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: f(S.subtitle), color: textColor, opacity: 0.85 }}>{subtitle}</div>}
          {description && <div style={{ fontSize: f(S.desc), color: textColor, opacity: 0.7, lineHeight: 1.4 }}>{description}</div>}
          {dateOrPrice && <div style={{ fontSize: f(S.info), fontWeight: 600, color: accentColor }}>{dateOrPrice}</div>}
          <div style={{ borderTop: `1px solid ${textColor}25`, paddingTop: '3%', marginTop: f(0.005) }}>
            {renderBrand(textColor, false)}
          </div>
        </div>
      </>
    );

    // --- ŞABLON: Bant ---
    const renderBand = () => (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: '0 0 50%', overflow: 'hidden' }}>
          {renderImg({ width: '100%', height: '100%' })}
        </div>
        <div style={{
          flex: 1, backgroundColor: accentColor, padding: '4% 8%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: f(0.01),
        }}>
          {badge && <div>{renderBadge('#FFFFFF25', '#FFFFFF')}</div>}
          {title && <div style={{ fontSize: f(S.title), fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>{title}</div>}
          {subtitle && <div style={{ fontSize: f(S.subtitle), color: '#FFFFFF', opacity: 0.9 }}>{subtitle}</div>}
          {description && <div style={{ fontSize: f(S.desc), color: '#FFFFFF', opacity: 0.8, lineHeight: 1.4 }}>{description}</div>}
          {dateOrPrice && <div style={{ fontSize: f(S.info), fontWeight: 700, color: '#FFFFFF' }}>{dateOrPrice}</div>}
        </div>
        <div style={{ padding: '2.5% 8%', backgroundColor: bgColor, textAlign: 'center' }}>
          {renderBrand(textColor, false)}
        </div>
      </div>
    );

    // --- ŞABLON: Minimal ---
    const renderMinimal = () => (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: '8% 10%', alignItems: 'center', justifyContent: 'center', gap: f(0.015),
      }}>
        {renderBrand(textColor)}
        <div style={{ width: f(0.05), height: f(0.05), borderRadius: '50%', backgroundColor: accentColor }} />
        {title && <div style={{ fontSize: f(S.title * 1.05), fontWeight: 700, color: textColor, lineHeight: 1.1, textAlign: 'center' }}>{title}</div>}
        {subtitle && <div style={{ fontSize: f(S.subtitle), color: textColor, opacity: 0.6, textAlign: 'center' }}>{subtitle}</div>}
        <div style={{ width: '65%', borderRadius: f(0.015), overflow: 'hidden' }}>
          {renderImg(imageDataUrl ? { width: '100%' } : { width: '100%', aspectRatio: '4/3' })}
        </div>
        {description && <div style={{ fontSize: f(S.desc), color: textColor, opacity: 0.55, lineHeight: 1.5, textAlign: 'center', maxWidth: '85%' }}>{description}</div>}
        {dateOrPrice && <div style={{ fontSize: f(S.info), fontWeight: 600, color: accentColor }}>{dateOrPrice}</div>}
        {badge && <div>{renderBadge(undefined, undefined, true)}</div>}
      </div>
    );

    // --- Ana render ---

    const templates: Record<TemplateId, () => React.ReactNode> = {
      classic: renderClassic,
      showcase: renderShowcase,
      band: renderBand,
      minimal: renderMinimal,
    };

    return (
      <div
        ref={setRefs}
        style={{
          aspectRatio,
          width: '100%',
          backgroundColor: bgColor,
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
          fontFamily: 'Georgia, serif',
        }}
      >
        {templates[templateId]()}
      </div>
    );
  },
);

AnnouncementPreview.displayName = 'AnnouncementPreview';

export default AnnouncementPreview;

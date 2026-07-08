import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Lendy — Your cozy book lending library';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

const BRAND = {
  cream: '#fdf6e3',
  ink: '#2d2d2d',
  pink: '#ff6b9d',
  purple: '#7c5cff',
  gold: '#ffd700',
  green: '#4ade80',
  blue: '#60a5fa',
};

// Small pixel-art book glyph built from divs (echoes the favicon)
function BookGlyph() {
  const stripe = (color: string) => ({
    width: 34,
    height: 8,
    background: color,
  });
  return (
    <div
      style={{
        display: 'flex',
        background: BRAND.ink,
        padding: 8,
        gap: 6,
        boxShadow: `10px 10px 0 ${BRAND.ink}`,
      }}
    >
      {/* Left page */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: '14px 10px',
          gap: 9,
        }}
      >
        <div style={stripe(BRAND.pink)} />
        <div style={stripe(BRAND.gold)} />
        <div style={stripe(BRAND.blue)} />
      </div>
      {/* Right page */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: '14px 10px',
          gap: 9,
        }}
      >
        <div style={stripe(BRAND.purple)} />
        <div style={stripe(BRAND.green)} />
        <div style={stripe(BRAND.pink)} />
      </div>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        background: '#ffffff',
        border: `4px solid ${BRAND.ink}`,
        boxShadow: `5px 5px 0 ${color}`,
        padding: '10px 22px',
        fontSize: 30,
        fontWeight: 800,
        color: BRAND.ink,
      }}
    >
      {label}
    </div>
  );
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: BRAND.cream,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Dotted background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle, ${BRAND.ink}1a 3px, transparent 3px)`,
            backgroundSize: '38px 38px',
          }}
        />

        {/* Main pixel card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#ffffff',
            border: `6px solid ${BRAND.ink}`,
            boxShadow: `16px 16px 0 ${BRAND.ink}`,
            padding: '58px 76px 64px',
            position: 'relative',
          }}
        >
          {/* Wordmark row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 34,
              marginBottom: 26,
            }}
          >
            <BookGlyph />
            <div style={{ display: 'flex', fontSize: 148, fontWeight: 900, letterSpacing: -4 }}>
              <span style={{ color: BRAND.pink }}>L</span>
              <span style={{ color: BRAND.purple }}>e</span>
              <span style={{ color: BRAND.gold }}>n</span>
              <span style={{ color: BRAND.green }}>d</span>
              <span style={{ color: BRAND.blue }}>y</span>
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: BRAND.ink,
              marginBottom: 34,
            }}
          >
            Track what you own, lend &amp; borrow.
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', width: '78%', height: 5, background: BRAND.ink, marginBottom: 34 }} />

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 22 }}>
            <Pill label="📚 Track" color={BRAND.pink} />
            <Pill label="🤝 Lend" color={BRAND.green} />
            <Pill label="📖 Borrow" color={BRAND.blue} />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

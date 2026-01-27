import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Lendy - Your Personal Book Lending Library';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#fdf6e3',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background pattern dots */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle, #ff6b9d20 2px, transparent 2px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating emojis */}
        <div style={{ position: 'absolute', top: 80, left: 100, fontSize: 60, opacity: 0.3 }}>📚</div>
        <div style={{ position: 'absolute', top: 120, right: 120, fontSize: 50, opacity: 0.3 }}>📖</div>
        <div style={{ position: 'absolute', bottom: 100, left: 150, fontSize: 45, opacity: 0.3 }}>📕</div>
        <div style={{ position: 'absolute', bottom: 80, right: 100, fontSize: 55, opacity: 0.3 }}>📗</div>

        {/* Main card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            border: '6px solid #2d2d2d',
            boxShadow: '12px 12px 0 #2d2d2d',
            padding: '60px 80px',
            position: 'relative',
          }}
        >
          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 80,
              fontWeight: 'bold',
              marginBottom: 20,
            }}
          >
            <span style={{ color: '#ff6b9d' }}>L</span>
            <span style={{ color: '#7c5cff' }}>e</span>
            <span style={{ color: '#ffd700' }}>n</span>
            <span style={{ color: '#4ade80' }}>d</span>
            <span style={{ color: '#60a5fa' }}>y</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 28,
              color: '#666',
              marginBottom: 30,
            }}
          >
            Your cozy book lending library
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 30,
            }}
          >
            <div style={{ width: 8, height: 8, background: '#2d2d2d', borderRadius: 4 }} />
            <div style={{ width: 200, height: 4, background: '#2d2d2d' }} />
            <div style={{ width: 8, height: 8, background: '#2d2d2d', borderRadius: 4 }} />
          </div>

          {/* Features */}
          <div
            style={{
              fontSize: 24,
              color: '#888',
              display: 'flex',
              gap: 20,
            }}
          >
            <span>📚 Track</span>
            <span>•</span>
            <span>🤝 Lend</span>
            <span>•</span>
            <span>📖 Borrow</span>
          </div>
        </div>

        {/* Sparkles */}
        <div style={{ position: 'absolute', top: 200, left: 180, fontSize: 30 }}>✨</div>
        <div style={{ position: 'absolute', bottom: 200, right: 180, fontSize: 30 }}>⭐</div>
      </div>
    ),
    {
      ...size,
    }
  );
}

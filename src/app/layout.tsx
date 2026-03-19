import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'WhatsApp Channel Tool - AI Generator',
  description: 'Herramienta de IA para generar contenido cristiano para WhatsApp',
  icons: {
    icon: '/icon.webp'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="app-layout">
          {/* Sidebar - visible on desktop */}
          <aside className="glass-panel sidebar-desktop">
            <div>
              <h2 className="title-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>WA Tool</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Canal Cristiano</p>
            </div>
            
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link href="/" className="btn" style={{ justifyContent: 'flex-start' }}>✍️ Generador</Link>
              <Link href="/responder" className="btn" style={{ justifyContent: 'flex-start' }}>💬 Responder</Link>
              <Link href="/historial" className="btn" style={{ justifyContent: 'flex-start' }}>🕒 Historial</Link>
              <Link href="/settings" className="btn" style={{ justifyContent: 'flex-start' }}>⚙️ Ajustes</Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {children}
          </main>

          {/* Bottom Nav - visible on mobile */}
          <nav className="bottom-nav glass-panel">
            <Link href="/" className="bottom-nav-item">
              <span>✍️</span>
              <span>Generador</span>
            </Link>
            <Link href="/responder" className="bottom-nav-item">
              <span>💬</span>
              <span>Responder</span>
            </Link>
            <Link href="/historial" className="bottom-nav-item">
              <span>🕒</span>
              <span>Historial</span>
            </Link>
            <Link href="/settings" className="bottom-nav-item">
              <span>⚙️</span>
              <span>Ajustes</span>
            </Link>
          </nav>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'WhatsApp Channel Tool - AI Generator',
  description: 'Herramienta de IA para generar contenido cristiano para WhatsApp',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          {/* Sidebar */}
          <aside className="glass-panel" style={{ width: '280px', margin: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h2 className="title-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>WA Tool</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Canal Cristiano</p>
            </div>
            
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link href="/" className="btn" style={{ justifyContent: 'flex-start' }}>✍️ Generador</Link>
              <Link href="/responder" className="btn" style={{ justifyContent: 'flex-start' }}>💬 Responder Duda</Link>
              <Link href="/historial" className="btn" style={{ justifyContent: 'flex-start' }}>🕒 Historial</Link>
              <Link href="/settings" className="btn" style={{ justifyContent: 'flex-start' }}>⚙️ Ajustes</Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main style={{ flex: 1, padding: '1rem 2rem' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

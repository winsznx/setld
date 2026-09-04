import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'setld — receipt-verified execution assurance',
  description: 'The agent did not report completion. The receipt did.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;560;600;620;640&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site">
          <a href="/" className="brand">setld</a>
          <nav>
            <a href="/proof">Live proof</a>
            <a href="/verify">Verify</a>
            <a href="https://github.com/winsznx/setld" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

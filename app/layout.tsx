import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, IBM_Plex_Mono, Silkscreen, Yatra_One } from 'next/font/google';
import './globals.css';

const display = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'block',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'block',
});

const pixel = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pixel',
  display: 'block',
});

const hindi = Yatra_One({
  subsets: ['latin', 'devanagari'],
  weight: ['400'],
  variable: '--font-hindi',
  display: 'block',
});

export const metadata: Metadata = {
  title: 'Frame in Goa — Hacker House Goa 2026 Builder ID',
  description:
    'Drop a photo, get your official Hacker House Goa 2026 frame or Builder ID. 28—31 Oct · Goa, India. Less noise. More building.',
  openGraph: {
    title: 'Frame in Goa — Hacker House Goa 2026',
    description:
      'Drop a photo, get your official HH Goa 2026 PFP frame or Builder ID card. Instant. No login.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#08381F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${mono.variable} ${pixel.variable} ${hindi.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

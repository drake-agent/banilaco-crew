import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Banilaco Crew - K-Beauty Creator Program',
  description:
    'Join the Banilaco Crew and earn up to 40% commission on every sale. Free samples, exclusive community, and endless possibilities for K-beauty creators.',
  keywords: [
    'banila co',
    'affiliate program',
    'creator program',
    'K-beauty',
    'skincare',
    'commission',
  ],
  authors: [{ name: 'Banila Co' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://banilaco-crew.com',
    siteName: 'Banilaco Crew',
    title: 'Banilaco Crew - K-Beauty Creator Program',
    description:
      'Join the Banilaco Crew and earn up to 40% commission on every sale.',
    images: [
      {
        url: 'https://banilaco-crew.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Banilaco Crew',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Banilaco Crew - K-Beauty Creator Program',
    description: 'Join the Banilaco Crew and earn up to 40% commission.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

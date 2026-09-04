import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Mogging | PostHog internal tools',
  description: 'Make prettier QR codes fastererer',
  alternates: {
    canonical: 'https://qr-mogging.hosthog.dev/',
  },
  icons: {
    icon: '/posthog-mark.svg',
  },
  openGraph: {
    title: 'QR Mogging | PostHog internal tools',
    description: 'Make prettier QR codes fastererer',
    url: 'https://qr-mogging.hosthog.dev/',
    siteName: 'PostHog internal tools',
    type: 'website',
    images: [
      {
        url: 'https://qr-mogging.hosthog.dev/og.png',
        width: 1733,
        height: 908,
        alt: 'QR Mogging — PostHog internal tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QR Mogging | PostHog internal tools',
    description: 'Make prettier QR codes fastererer',
    images: ['https://qr-mogging.hosthog.dev/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

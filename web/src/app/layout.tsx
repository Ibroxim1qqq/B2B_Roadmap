import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'B2B MAP | O\'zbekiston Qurilish Obyektlari Xaritasi',
  description: 'O\'zbekiston bo\'yicha barcha ko\'p xonadonli uy-joylar va qurilish obyektlari xaritasi platformasi',
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className={`${inter.className} h-screen w-screen overflow-hidden bg-gray-100`}>
        {children}
      </body>
    </html>
  );
}

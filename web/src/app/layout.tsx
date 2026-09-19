import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'B2B Samarqand Construction Map | Shaffof Qurilish CRM',
  description: 'Samarqand viloyatidagi barcha 388 ta qurilish obyektlari xaritasi va B2B savdo CRM platformasi',
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

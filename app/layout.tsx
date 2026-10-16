import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VideoForge AI — Studio de création vidéo',
  description: 'Préparez, éditez et organisez vos projets de vidéos courtes.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}

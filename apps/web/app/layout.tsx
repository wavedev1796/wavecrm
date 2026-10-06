import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import type { Metadata } from 'next';
import { MARCA } from '@/content/comun';

export const metadata: Metadata = {
  title: { default: MARCA.titulo, template: MARCA.plantillaTitulo },
  description: MARCA.descripcion,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}


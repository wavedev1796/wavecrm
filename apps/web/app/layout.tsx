import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Wave CRM', template: '%s · Wave CRM' },
  description: 'Gestión comercial para el equipo de Wave.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}


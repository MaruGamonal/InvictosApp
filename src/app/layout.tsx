import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'INVICTOS',
  description: 'Plataforma de gestión y descubrimiento de torneos de fútbol amateur.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

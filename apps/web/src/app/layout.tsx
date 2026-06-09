import './globals.css';

export const metadata = {
  title: 'Tenant AI Admin',
  description: 'Panel administrativo para tenants de Tenant AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NovaCRM',
  description: 'Enterprise ITSM and CRM platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

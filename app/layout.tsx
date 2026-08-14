import localFont from 'next/font/local';
import './globals.css';
import type { Metadata } from 'next';
import { RuntimePublicEnv } from '@/components/layout/runtime-public-env';
import { PreferencesProvider } from '@/components/layout/preferences-provider';
import { Toaster } from '@/components/ui/toast';
import { getPreferences } from '@/lib/preferences';

const inter = localFont({
  src: './fonts/Inter-Variable.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
});

const jetbrains = localFont({
  src: './fonts/JetBrainsMono-Variable.woff2',
  variable: '--font-mono',
  display: 'swap',
  weight: '100 800',
});

export const metadata: Metadata = {
  title: 'NovaCRM',
  description: 'Enterprise ITSM and CRM platform',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme, locale } = getPreferences();

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrains.variable} ${theme}`} suppressHydrationWarning>
      <body className="font-sans">
        <RuntimePublicEnv />
        <PreferencesProvider locale={locale} theme={theme}>
          {children}
          <Toaster />
        </PreferencesProvider>
      </body>
    </html>
  );
}

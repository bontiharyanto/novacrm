import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import { RuntimePublicEnv } from '@/components/layout/runtime-public-env';
import { PreferencesProvider } from '@/components/layout/preferences-provider';
import { getPreferences } from '@/lib/preferences';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
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
        </PreferencesProvider>
      </body>
    </html>
  );
}

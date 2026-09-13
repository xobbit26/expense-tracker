import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '@/_app/providers/providers';

import '@/_app/styles/globals.css';

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Трекер расходов',
};

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

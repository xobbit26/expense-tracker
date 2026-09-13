'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

import '@/shared/lib/zod-locale';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

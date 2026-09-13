import type { User } from '@expense-tracker/shared';

import { LogoutButton } from '@/features/auth/logout';
import { ThemeToggle } from '@/features/theme-toggle';

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="flex items-center justify-between border-b p-4">
      <span className="font-semibold">Expense Tracker</span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">{user.name}</span>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}

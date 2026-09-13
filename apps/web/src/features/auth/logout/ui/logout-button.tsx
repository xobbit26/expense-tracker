import { Button } from '@/shared/ui/button';

import { logoutAction } from '../api/logout';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button variant="ghost" type="submit">
        Выйти
      </Button>
    </form>
  );
}

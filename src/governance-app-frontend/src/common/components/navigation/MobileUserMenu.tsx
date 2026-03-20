import { UserMenu } from './UserMenu';

export const MobileUserMenu = () => {
  return (
    <div className="flex items-center justify-end pt-[env(safe-area-inset-top)] lg:hidden">
      <UserMenu compact />
    </div>
  );
};

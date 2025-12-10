import { useLocation } from '@tanstack/react-router';

import { navigationItems } from './NavigationItems';
import { UserMenu } from './UserMenu';

export const Header = () => {
  const location = useLocation();

  // Find the matching navigation item to set the title
  // This might need more robust matching for sub-routes if they exist later
  const currentItem = navigationItems.find((item) => item.href === location.pathname);
  const title = currentItem ? currentItem.label : 'Governance'; // Default title

  return (
    <header className="sticky top-0 z-10 mb-4 flex w-full items-center justify-between border-b bg-background p-4 md:mb-0">
      <div className="flex items-center gap-4">
        {/* Mobile Logo or Title could go here if different from generic title */}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
};

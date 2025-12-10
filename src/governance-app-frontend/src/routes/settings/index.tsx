import { createFileRoute } from '@tanstack/react-router';

import { ThemeCard } from '@/features/settings/components/ThemeCard';

export const Route = createFileRoute('/settings/')({
  component: Settings,
});

function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm leading-relaxed font-semibold tracking-wider text-gray-500 uppercase">
          General
        </h2>
        <ThemeCard />
      </section>

      <section>
        <h2 className="mb-3 text-sm leading-relaxed font-semibold tracking-wider text-gray-500 uppercase">
          Account
        </h2>
      </section>
    </div>
  );
}

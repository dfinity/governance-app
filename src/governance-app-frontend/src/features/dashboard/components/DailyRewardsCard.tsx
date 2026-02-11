import { useTranslation } from 'react-i18next';

export const DailyRewardsCard = () => {
  const { t } = useTranslation();

  // @TODO: Integrate daily rewards data source
  return (
    <div className="rounded-xl border border-border/50 bg-white px-5 py-4 shadow-sm dark:bg-zinc-800/50">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t(($) => $.home.dailyRewards)}
      </p>
      <p className="text-2xl font-semibold text-foreground">—</p>
    </div>
  );
};

import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';

export function EngagementCard() {
  const { t } = useTranslation();

  return (
    <Card className="gap-3 py-4" data-testid="stakes-summary-engagement-card">
      <CardContent>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.neuron.summary.engagement)}
        </p>
        <p className="text-2xl font-semibold text-foreground">—</p>
      </CardContent>
    </Card>
  );
}

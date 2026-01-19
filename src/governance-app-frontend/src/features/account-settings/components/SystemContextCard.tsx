import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SystemContextCard = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {t(($) => $.accountSettings.governance.systemContext.title)}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(($) => $.accountSettings.governance.systemContext.description)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href="https://internetcomputer.org/docs/current/concepts/governance"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground w-fit"
        >
          {t(($) => $.accountSettings.governance.systemContext.links.learnHow)}
          <ArrowRight className="ml-1 size-3 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
        </a>
        <a
          href="https://dashboard.internetcomputer.org/governance"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground w-fit"
        >
          {t(($) => $.accountSettings.governance.systemContext.links.readUpdate)}
          <ArrowRight className="ml-1 size-3 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
        </a>
      </div>
    </div>
  );
};

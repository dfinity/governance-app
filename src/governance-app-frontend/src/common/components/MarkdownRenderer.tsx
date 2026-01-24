import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@common/components/AlertDialog';
import { nonNullish } from '@dfinity/utils';
import { isExternalLink } from '@utils/urls';

type Props = {
  content: string;
};

export const MarkdownRenderer = ({ content }: Props) => {
  const { t } = useTranslation();
  const [externalLinkDialog, setExternalLinkDialog] = useState<{
    isOpen: boolean;
    url: string;
  }>({
    isOpen: false,
    url: '',
  });

  const handleExternalLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string | undefined,
  ) => {
    if (nonNullish(href) && isExternalLink(href)) {
      e.preventDefault();
      setExternalLinkDialog({ isOpen: true, url: href });
    }
  };

  const handleConfirmNavigation = () => {
    window.open(externalLinkDialog.url, '_blank', 'noopener,noreferrer');
    setExternalLinkDialog({ isOpen: false, url: '' });
  };

  const handleCancelNavigation = () => {
    setExternalLinkDialog({ isOpen: false, url: '' });
  };

  return (
    <>
      <div className="prose prose-sm max-w-none break-words text-muted-foreground dark:prose-invert prose-h1:text-xl prose-h1:font-bold prose-h2:text-lg prose-h2:font-semibold prose-code:rounded-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            table: ({ node: _, ...props }) => (
              <div className="overflow-x-auto">
                <table {...props} />
              </div>
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            a: ({ node: _, href, ...props }) => {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="word-break-all break-all"
                  onClick={(e) => handleExternalLinkClick(e, href)}
                  {...props}
                />
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      <AlertDialog
        open={externalLinkDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelNavigation();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(($) => $.common.externalLink.title)}</AlertDialogTitle>
            <AlertDialogDescription className="break-all">
              {t(($) => $.common.externalLink.description, { url: externalLinkDialog.url })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>
              {t(($) => $.common.cancel)}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>
              {t(($) => $.common.externalLink.continue)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

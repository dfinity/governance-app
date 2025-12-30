import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  content: string;
};

export const MarkdownRenderer = ({ content }: Props) => {
  return (
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
          a: ({ node: _, ...props }) => {
            return (
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="word-break-all break-all"
                {...props}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

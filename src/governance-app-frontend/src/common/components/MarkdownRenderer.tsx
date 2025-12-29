
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-h1:text-xl prose-h1:font-bold prose-h2:text-lg prose-h2:font-semibold prose-pre:bg-muted prose-pre:text-foreground prose-code:bg-muted prose-code:rounded-sm prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

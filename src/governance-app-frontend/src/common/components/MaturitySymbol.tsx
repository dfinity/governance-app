import { Sparkles } from 'lucide-react';

interface MaturitySymbolProps {
  onClick?: () => void;
  className?: string;
}

export function MaturitySymbol({ onClick, className = '' }: MaturitySymbolProps) {
  return (
    <div
      className={cn('cursor-help rounded-sm border border-amber-400 bg-amber-100 p-0.5 transition-all duration-300 hover:scale-110', className)}
      onClick={onClick}
      role="button"
    >
      <Sparkles className="size-5 text-amber-500" />
    </div>
  );
}

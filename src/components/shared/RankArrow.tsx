import { ChevronUp, ChevronDown, Minus } from 'lucide-react';

export function RankArrow({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center text-[--chart-2]">
        <ChevronUp className="h-4 w-4" />
        <span className="text-xs font-semibold">{change}</span>
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center text-[--primary]">
        <ChevronDown className="h-4 w-4" />
        <span className="text-xs font-semibold">{Math.abs(change)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[--muted-foreground]">
      <Minus className="h-4 w-4" />
    </span>
  );
}

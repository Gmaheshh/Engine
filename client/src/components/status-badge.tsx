import { ReactNode } from "react";

type BadgeVariant = "long" | "short" | "flat" | "neutral" | "warning";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className = "" }: StatusBadgeProps) {
  const baseClasses = "px-2 py-0.5 text-[10px] font-mono font-medium rounded uppercase tracking-wider inline-flex items-center gap-1.5 border";
  
  const variants = {
    long: "bg-green-500/10 text-green-400 border-green-500/20",
    short: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    flat: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    neutral: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {variant === 'long' && <span className="w-1 h-1 rounded-full bg-green-400" />}
      {variant === 'short' && <span className="w-1 h-1 rounded-full bg-rose-400" />}
      {variant === 'flat' && <span className="w-1 h-1 rounded-full bg-gray-400" />}
      {children}
    </span>
  );
}

export function SignalBadge({ signal }: { signal?: number | null }) {
  if (signal === 1) return <StatusBadge variant="long">LONG</StatusBadge>;
  if (signal === -1) return <StatusBadge variant="short">SHORT</StatusBadge>;
  if (signal === 0) return <StatusBadge variant="flat">FLAT</StatusBadge>;
  return <span className="text-muted-foreground">-</span>;
}

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  trendValue, 
  loading,
  className = "" 
}: StatCardProps) {
  return (
    <div className={`terminal-panel p-5 group hover:border-primary/30 transition-colors ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-muted-foreground font-mono">{title}</h3>
        {icon && (
          <div className="text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        {loading ? (
          <div className="h-8 w-24 bg-white/5 animate-pulse rounded"></div>
        ) : (
          <div className="text-3xl font-bold font-mono tracking-tight text-foreground shadow-sm">
            {value}
          </div>
        )}
        
        {trend && !loading && (
          <div className={`text-xs font-mono flex items-center ${
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            {trendValue}
          </div>
        )}
      </div>
      
      {subtitle && !loading && (
        <div className="mt-2 text-xs text-muted-foreground/70">
          {subtitle}
        </div>
      )}
    </div>
  );
}

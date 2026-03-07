import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Activity, 
  BarChart2, 
  Terminal, 
  Crosshair, 
  List, 
  BugPlay, 
  Zap,
  Menu,
  ChevronRight
} from "lucide-react";
import { useHealth, useRunEngine } from "@/hooks/use-trading";
import { Button } from "@/components/ui/button";

interface LayoutShellProps {
  children: ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [location] = useLocation();
  const { data: health, isLoading: isHealthLoading, isError: isHealthError } = useHealth();
  const runEngine = useRunEngine();

  const isHealthy = health?.status === "ok";

  const navItems = [
    { href: "/", label: "Dashboard", icon: <Terminal className="w-4 h-4" /> },
    { href: "/signals", label: "Live Signals", icon: <Activity className="w-4 h-4" /> },
    { href: "/signals/ranked", label: "Ranked", icon: <BarChart2 className="w-4 h-4" /> },
    { href: "/scan", label: "Scanner", icon: <Crosshair className="w-4 h-4" /> },
    { href: "/universe", label: "Universe", icon: <List className="w-4 h-4" /> },
    { href: "/debug", label: "Debug Tool", icon: <BugPlay className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-xl flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-border/40">
          <div className="flex items-center gap-2 text-primary font-mono font-bold text-lg tracking-tight">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <Zap className="w-3 h-3 text-primary" />
            </div>
            QUANT<span className="text-foreground">TERM</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-mono text-muted-foreground mb-4 px-2 tracking-wider">SYSTEM_NAV</div>
          
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}
                `}
              >
                <div className={`${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {item.icon}
                </div>
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border/40 bg-black/20">
          <Button 
            onClick={() => runEngine.mutate()}
            disabled={runEngine.isPending}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-mono shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all"
            variant="outline"
          >
            {runEngine.isPending ? "EXECUTING..." : "RUN_ENGINE()"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 flex-shrink-0 border-b border-border/40 bg-card/20 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              {location === '/' ? '/dashboard' : location}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">ENGINE_STATUS:</span>
              {isHealthLoading ? (
                <span className="text-muted-foreground animate-pulse">CHECKING...</span>
              ) : isHealthError || !isHealthy ? (
                <div className="flex items-center gap-1.5 text-destructive px-2 py-1 rounded bg-destructive/10 border border-destructive/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse-slow"></div>
                  OFFLINE
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-green-400 px-2 py-1 rounded bg-green-400/10 border border-green-400/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse-slow"></div>
                  ONLINE
                </div>
              )}
            </div>
            
            <div className="text-xs font-mono text-muted-foreground border-l border-border/50 pl-6 py-1">
              {new Date().toISOString().split('T')[0]} <span className="text-foreground">{new Date().toISOString().split('T')[1].substring(0,8)}</span> UTC
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

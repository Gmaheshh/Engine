import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Signals from "@/pages/signals";
import RankedSignals from "@/pages/ranked";
import Scanner from "@/pages/scanner";
import DebugTool from "@/pages/debug";
import Universe from "@/pages/universe";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/signals" component={Signals} />
      <Route path="/signals/ranked" component={RankedSignals} />
      <Route path="/scan" component={Scanner} />
      <Route path="/debug" component={DebugTool} />
      <Route path="/universe" component={Universe} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

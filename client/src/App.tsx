import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";

import DebugTool from "@/pages/debug";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import RankedSignals from "@/pages/ranked";
import Scanner from "@/pages/scanner";
import Signals from "@/pages/signals";
import Universe from "@/pages/universe";

function AppRouter() {
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRouter />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

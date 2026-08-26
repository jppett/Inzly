import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PropertyDetails from "@/pages/PropertyDetails";
import SavedHomes from "@/pages/SavedHomes";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/property/:slug" component={PropertyDetails} />
      <Route path="/saved" component={SavedHomes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SonnerToaster position="bottom-right" />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/LanguageContext";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { ActiveSessionBanner } from "@/components/ActiveSessionBanner";
import { Onboarding } from "@/components/Onboarding";
import { HelmetProvider } from "react-helmet-async";

// Pages
import Home from "@/pages/Home";
import StationDetails from "@/pages/StationDetails";
import AddStation from "@/pages/AddStation";
import NearbyStations from "@/pages/NearbyStations";
import ChargingHistory from "@/pages/ChargingHistory";
import ChargingStats from "@/pages/ChargingStats";
import AuthPage from "@/pages/AuthPage";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={AuthPage} />
      <Route path="/add" component={AddStation} />
      <Route path="/nearby" component={NearbyStations} />
      <Route path="/history" component={ChargingHistory} />
      <Route path="/stats" component={ChargingStats} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/station/:id" component={StationDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <div className="app-shell bg-background flex flex-col font-body">
              <Onboarding />
              <ActiveSessionBanner />
              <Header />
              <main className="flex-1 container mx-auto px-4 py-4 overflow-y-auto pwa-main-content">
                <Router />
              </main>
              <MobileNav />
            </div>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

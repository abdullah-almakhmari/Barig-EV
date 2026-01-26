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
import { SplashScreen } from "@/components/SplashScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PullToRefresh } from "@/components/PullToRefresh";
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
import Contact from "@/pages/Contact";
import Profile from "@/pages/Profile";
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
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/contact" component={Contact} />
      <Route path="/station/:id" component={StationDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <TooltipProvider>
              <SplashScreen />
              <div className="app-shell bg-background flex flex-col font-body">
                <Onboarding />
                <ActiveSessionBanner />
                <Header />
                <main className="flex-1 container mx-auto px-4 py-3 overflow-hidden pwa-main-content">
                  <PullToRefresh onRefresh={async () => {
                    await queryClient.invalidateQueries();
                    window.location.reload();
                  }}>
                    <div className="page-transition">
                      <Router />
                    </div>
                  </PullToRefresh>
                </main>
                <MobileNav />
              </div>
              <Toaster />
            </TooltipProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;

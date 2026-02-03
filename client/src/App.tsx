import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
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
import { ScrollToTop } from "@/components/ScrollToTop";
import { UpdateNotification } from "@/components/UpdateNotification";
import { HelmetProvider } from "react-helmet-async";

// Pages
import Home from "@/pages/Home";
import StationDetails from "@/pages/StationDetails";
import AddStation from "@/pages/AddStation";
import EditStation from "@/pages/EditStation";
import NearbyStations from "@/pages/NearbyStations";
import ChargingHistory from "@/pages/ChargingHistory";
import ChargingStats from "@/pages/ChargingStats";
import AuthPage from "@/pages/AuthPage";
import AdminPanel from "@/pages/AdminPanel";
import Contact from "@/pages/Contact";
import Profile from "@/pages/Profile";
import MyCharger from "@/pages/MyCharger";
import Rent from "@/pages/Rent";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={AuthPage} />
      <Route path="/admin/add-station" component={AddStation} />
      <Route path="/nearby" component={NearbyStations} />
      <Route path="/history" component={ChargingHistory} />
      <Route path="/stats" component={ChargingStats} />
      <Route path="/profile" component={Profile} />
      <Route path="/my-charger" component={MyCharger} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/contact" component={Contact} />
      <Route path="/station/:id" component={StationDetails} />
      <Route path="/station/:id/edit" component={EditStation} />
      <Route path="/rent/:stationId" component={Rent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const checkRegistration = () => {
      if (window.swRegistration) {
        setSwRegistration(window.swRegistration);
      }
    };
    
    checkRegistration();
    
    const interval = setInterval(checkRegistration, 1000);
    setTimeout(() => clearInterval(interval), 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh when app returns from background
  useEffect(() => {
    let lastHiddenTime = 0;
    const BACKGROUND_THRESHOLD = 5 * 60 * 1000; // 5 minutes in background

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background - record time
        lastHiddenTime = Date.now();
      } else {
        // App came back to foreground
        const timeInBackground = Date.now() - lastHiddenTime;
        
        if (lastHiddenTime > 0 && timeInBackground > BACKGROUND_THRESHOLD) {
          // Clear React Query cache
          queryClient.clear();
          
          // Check for service worker updates
          if (swRegistration) {
            swRegistration.update();
          }
          
          // Clear browser caches and reload
          const clearAndReload = async () => {
            if ('caches' in window) {
              const names = await caches.keys();
              await Promise.all(names.map(name => caches.delete(name)));
            }
            window.location.reload();
          };
          clearAndReload();
        } else {
          // Just refresh data without full reload
          queryClient.invalidateQueries();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [swRegistration]);

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
                <main className="flex-1 container mx-auto px-4 py-3 pwa-main-content overflow-y-auto">
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
                <ScrollToTop />
                <UpdateNotification registration={swRegistration} />
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

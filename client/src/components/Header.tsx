import { useState } from "react";
import { useLanguage } from "./LanguageContext";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { MapPin, Plus, Languages, Zap, Navigation, History, LogIn, LogOut, User, Shield, BarChart3, MessageCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsPWA, useIsMobile } from "@/hooks/use-pwa";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getCsrfToken } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Header() {
  const { language, setLanguage } = useLanguage();
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const isPWA = useIsPWA();
  const isMobile = useIsMobile();
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const showMobileNav = isPWA && isMobile;
  const isArabic = i18n.language === "ar";

  const { data: activeSession } = useQuery({
    queryKey: ["/api/charging-sessions/my-active"],
    queryFn: async () => {
      const res = await fetch("/api/charging-sessions/my-active", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return apiRequest("POST", `/api/charging-sessions/${sessionId}/end`, {});
    },
  });

  const handleLogoutClick = async () => {
    if (activeSession) {
      setShowLogoutWarning(true);
    } else {
      performLogout();
    }
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  const handleEndSessionAndLogout = async () => {
    if (activeSession) {
      setIsLoggingOut(true);
      try {
        await endSessionMutation.mutateAsync(activeSession.id);
      } catch (e) {
        console.error("Failed to end session:", e);
      }
    }
    await performLogout();
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <>
    <header className={`sticky top-0 z-50 w-full ${showMobileNav ? '' : 'border-b'} bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 ${isPWA ? 'pwa-header' : ''}`}>
      <div className={`container mx-auto px-4 ${showMobileNav ? 'h-14' : 'h-16'} flex items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2 group native-press">
          <div className={`${showMobileNav ? 'w-9 h-9' : 'w-10 h-10'} rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all`}>
            <Zap className={`${showMobileNav ? 'w-5 h-5' : 'w-6 h-6'} fill-current`} />
          </div>
          <span className="font-display font-bold text-xl hidden sm:block">
            {t("app.title")}
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" style={{ direction: 'ltr' }}>
          {!showMobileNav && (
            <>
              <Link href="/">
                <Button
                  variant={location === "/" ? "secondary" : "ghost"}
                  className="gap-2 font-medium"
                  data-testid="button-nav-map"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("nav.map")}</span>
                </Button>
              </Link>

              <Link href="/nearby">
                <Button
                  variant={location === "/nearby" ? "secondary" : "ghost"}
                  className="gap-2 font-medium"
                  data-testid="button-nav-nearby"
                >
                  <Navigation className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("nav.nearby")}</span>
                </Button>
              </Link>

              {user?.role === "admin" && (
                <Link href="/admin/add-station">
                  <Button
                    variant={location === "/admin/add-station" ? "secondary" : "ghost"}
                    className="gap-2 font-medium"
                    data-testid="button-nav-add"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("nav.add")}</span>
                  </Button>
                </Link>
              )}

              <Link href="/history">
                <Button
                  variant={location === "/history" ? "secondary" : "ghost"}
                  className="gap-2 font-medium"
                  data-testid="button-nav-history"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("nav.history")}</span>
                </Button>
              </Link>

              <Link href="/stats">
                <Button
                  variant={location === "/stats" ? "secondary" : "ghost"}
                  className="gap-2 font-medium"
                  data-testid="button-nav-stats"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === "ar" ? "إحصائيات" : "Stats"}</span>
                </Button>
              </Link>

              <div className="w-px h-6 bg-border mx-2" />
            </>
          )}

          {user?.role === "admin" && (
            <Link href="/admin">
              <Button
                variant={location === "/admin" ? "secondary" : "ghost"}
                className="gap-2 font-medium"
                data-testid="button-nav-admin"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">{t("admin.title")}</span>
              </Button>
            </Link>
          )}

          <Link href="/contact">
            <Button
              variant={location === "/contact" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-full"
              data-testid="button-nav-contact-mobile"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="rounded-full"
            data-testid="button-language"
          >
            <Languages className="w-5 h-5" />
          </Button>

          {!isLoading && (
            isAuthenticated ? (
              <>
                <Link href="/profile" data-testid="link-profile">
                  <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm" className="gap-2" data-testid="button-login">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("auth.login")}</span>
                </Button>
              </Link>
            )
          )}
        </nav>
      </div>
    </header>

    <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {isArabic ? "جلسة شحن نشطة" : "Active Charging Session"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArabic 
              ? "لديك جلسة شحن نشطة حالياً. ماذا تريد أن تفعل؟" 
              : "You have an active charging session. What would you like to do?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel disabled={isLoggingOut}>
            {isArabic ? "إلغاء" : "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEndSessionAndLogout}
            disabled={isLoggingOut}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isLoggingOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isArabic ? "إنهاء الجلسة وتسجيل الخروج" : "End session & logout"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

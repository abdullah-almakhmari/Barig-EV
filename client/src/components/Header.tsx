import { useLanguage } from "./LanguageContext";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { MapPin, Plus, Languages, Zap, Navigation, History, LogIn, LogOut, User, Shield, BarChart3, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsPWA, useIsMobile } from "@/hooks/use-pwa";

export function Header() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const isPWA = useIsPWA();
  const isMobile = useIsMobile();
  
  const showMobileNav = isPWA && isMobile;

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
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

        <nav className="flex items-center gap-1 sm:gap-2">
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

              <Link href="/add">
                <Button
                  variant={location === "/add" ? "secondary" : "ghost"}
                  className="gap-2 font-medium"
                  data-testid="button-nav-add"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("nav.add")}</span>
                </Button>
              </Link>

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

              <Link href="/contact">
                <Button
                  variant={location === "/contact" ? "secondary" : "ghost"}
                  className="gap-2 font-medium"
                  data-testid="button-nav-contact"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("nav.contact")}</span>
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
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full" 
                  onClick={() => {
                    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
                      .then(() => window.location.href = "/");
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
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
  );
}

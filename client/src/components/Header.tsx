import { useLanguage } from "./LanguageContext";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { MapPin, Plus, Languages, Zap, Navigation, History, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <span className="font-display font-bold text-xl hidden sm:block">
            {t("app.title")}
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
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

          <div className="w-px h-6 bg-border mx-2" />

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

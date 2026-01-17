import { useLanguage } from "./LanguageContext";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { MapPin, Plus, List, Languages, Zap, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [location] = useLocation();

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
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
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nav.add")}</span>
            </Button>
          </Link>

          <div className="w-px h-6 bg-border mx-2" />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="rounded-full hover:bg-accent/10 hover:text-accent transition-colors"
          >
            <Languages className="w-5 h-5" />
          </Button>
        </nav>
      </div>
    </header>
  );
}

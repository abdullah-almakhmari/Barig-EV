import { useLocation, Link } from "wouter";
import { MapPin, Navigation, Plus, History, BarChart3 } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { useIsPWA, useIsMobile } from "@/hooks/use-pwa";

const navItems = [
  { path: "/", icon: MapPin, labelAr: "الخريطة", labelEn: "Map" },
  { path: "/nearby", icon: Navigation, labelAr: "قريب", labelEn: "Nearby" },
  { path: "/add", icon: Plus, labelAr: "إضافة", labelEn: "Add" },
  { path: "/history", icon: History, labelAr: "السجل", labelEn: "History" },
  { path: "/stats", icon: BarChart3, labelAr: "إحصائيات", labelEn: "Stats" },
];

export function MobileNav() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const isPWA = useIsPWA();
  const isMobile = useIsMobile();

  if (!isPWA || !isMobile) return null;

  return (
    <nav className="pwa-bottom-nav">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                <span className="text-[10px] font-medium">
                  {language === "ar" ? item.labelAr : item.labelEn}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

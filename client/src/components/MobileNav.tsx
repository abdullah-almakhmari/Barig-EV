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

const triggerHaptic = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate(10);
  }
};

export function MobileNav() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const isPWA = useIsPWA();
  const isMobile = useIsMobile();

  if (!isPWA || !isMobile) return null;

  return (
    <nav className="pwa-bottom-nav slide-up">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                onClick={triggerHaptic}
                className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl native-press transition-all duration-200 ${
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground"
                }`}
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
              >
                <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'font-semibold' : ''}`}>
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

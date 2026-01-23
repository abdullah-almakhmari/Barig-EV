import { useLocation, Link } from "wouter";
import { MapPin, Navigation, Plus, History, BarChart3 } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { useIsPWA, useIsMobile } from "@/hooks/use-pwa";

const navItems = [
  { path: "/", icon: MapPin, labelAr: "الخريطة", labelEn: "Map" },
  { path: "/nearby", icon: Navigation, labelAr: "قريب", labelEn: "Nearby" },
  { path: "/add", icon: Plus, labelAr: "إضافة", labelEn: "Add", isCenter: true },
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
    <nav className="pwa-bottom-nav">
      <div className="flex justify-around items-end h-[68px] pb-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          if (item.isCenter) {
            return (
              <Link key={item.path} href={item.path}>
                <button
                  onClick={triggerHaptic}
                  className="flex flex-col items-center justify-center -mt-4"
                  data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                    isActive 
                      ? "bg-primary text-white scale-105" 
                      : "bg-primary/90 text-white"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-medium mt-1 ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    {language === "ar" ? item.labelAr : item.labelEn}
                  </span>
                </button>
              </Link>
            );
          }
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                onClick={triggerHaptic}
                className="flex flex-col items-center justify-center min-w-[64px] py-2"
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
              >
                <div className={`relative transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                  <Icon className={`w-6 h-6 ${isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground"}`} />
                </div>
                <span className={`text-[10px] mt-1 ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'}`}>
                  {language === "ar" ? item.labelAr : item.labelEn}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

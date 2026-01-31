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
      <div className="flex items-center justify-around h-[72px] pb-2 px-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const label = language === "ar" ? item.labelAr : item.labelEn;
          
          if (item.isCenter) {
            return (
              <Link key={item.path} href={item.path} className="flex-1 flex justify-center">
                <button
                  onClick={triggerHaptic}
                  className="flex flex-col items-center -mt-3"
                  data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                >
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    <Icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span 
                    className="text-[11px] mt-1 text-primary"
                    style={{ fontWeight: 500 }}
                  >
                    {label}
                  </span>
                </button>
              </Link>
            );
          }
          
          return (
            <Link key={item.path} href={item.path} className="flex-1 flex justify-center">
              <button
                onClick={triggerHaptic}
                className="w-16 h-14 flex flex-col items-center justify-center relative"
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
              >
                <div 
                  className="absolute inset-1 rounded-xl bg-primary/10 dark:bg-primary/20 transition-opacity duration-200"
                  style={{ opacity: isActive ? 1 : 0 }}
                />
                
                <Icon 
                  className="w-6 h-6 relative z-10 transition-colors duration-200"
                  style={{ 
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                  }}
                  strokeWidth={2}
                />
                
                <span 
                  className="relative z-10 text-[11px] mt-1 transition-colors duration-200"
                  style={{ 
                    fontWeight: 500,
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                  }}
                >
                  {label}
                </span>
                
                <div 
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary transition-opacity duration-200"
                  style={{ opacity: isActive ? 1 : 0 }}
                />
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

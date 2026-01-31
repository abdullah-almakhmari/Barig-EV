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
      <div className="flex items-end h-[72px] pb-2 px-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const label = language === "ar" ? item.labelAr : item.labelEn;
          
          if (item.isCenter) {
            return (
              <Link key={item.path} href={item.path} className="flex-1">
                <button
                  onClick={triggerHaptic}
                  className="w-full flex flex-col items-center -mt-3"
                  data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                >
                  <div 
                    className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center 
                      bg-primary text-white shadow-lg shadow-primary/30
                      transition-colors duration-200
                    `}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <span 
                    className={`
                      text-[11px] mt-1 transition-colors duration-200
                      ${isActive ? 'text-primary' : 'text-muted-foreground'}
                    `}
                    style={{ fontWeight: 500 }}
                  >
                    {label}
                  </span>
                </button>
              </Link>
            );
          }
          
          return (
            <Link key={item.path} href={item.path} className="flex-1">
              <button
                onClick={triggerHaptic}
                className="w-full flex flex-col items-center py-1.5 relative"
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
              >
                {/* Background pill - using opacity instead of display */}
                <div 
                  className={`
                    absolute inset-x-2 top-0.5 bottom-0.5 rounded-xl
                    bg-primary/10 dark:bg-primary/20
                    transition-opacity duration-200
                  `}
                  style={{ opacity: isActive ? 1 : 0 }}
                />
                
                {/* Icon - fixed size container */}
                <div className="relative z-10 w-7 h-7 flex items-center justify-center">
                  <Icon 
                    className={`
                      w-[22px] h-[22px] transition-colors duration-200
                      ${isActive ? "text-primary" : "text-muted-foreground"}
                    `}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                
                {/* Label - fixed font weight, only color changes */}
                <span 
                  className={`
                    relative z-10 text-[11px] mt-0.5 transition-colors duration-200
                  `}
                  style={{ 
                    fontWeight: 500,
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                  }}
                >
                  {label}
                </span>
                
                {/* Active indicator dot - using opacity */}
                <div 
                  className="absolute bottom-0 left-1/2 w-1 h-1 rounded-full bg-primary transition-opacity duration-200"
                  style={{ 
                    transform: 'translateX(-50%)',
                    opacity: isActive ? 1 : 0 
                  }}
                />
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

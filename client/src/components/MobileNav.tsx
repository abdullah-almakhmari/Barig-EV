import { useLocation, Link } from "wouter";
import { MapPin, Navigation, Plus, History, BarChart3 } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { useIsPWA, useIsMobile } from "@/hooks/use-pwa";

const navItems = [
  { path: "/stats", icon: BarChart3, labelAr: "إحصائيات", labelEn: "Stats" },
  { path: "/history", icon: History, labelAr: "السجل", labelEn: "History" },
  { path: "/admin/add-station", icon: Plus, labelAr: "إضافة", labelEn: "Add", isCenter: true },
  { path: "/nearby", icon: Navigation, labelAr: "قريب", labelEn: "Nearby" },
  { path: "/", icon: MapPin, labelAr: "الخريطة", labelEn: "Map" },
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
      <div 
        className="h-[72px] pb-2 px-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
        }}
      >
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const label = language === "ar" ? item.labelAr : item.labelEn;
          
          if (item.isCenter) {
            return (
              <Link key={item.path} href={item.path}>
                <button
                  onClick={triggerHaptic}
                  className="w-full flex flex-col items-center -mt-3"
                  data-testid={`nav-${item.path.split("/").filter(Boolean).pop() || "home"}`}
                >
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    <Icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span 
                    className="text-[11px] mt-1 text-primary text-center whitespace-nowrap"
                    style={{ fontWeight: 500 }}
                  >
                    {label}
                  </span>
                </button>
              </Link>
            );
          }
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                onClick={triggerHaptic}
                className="w-full flex flex-col items-center justify-center relative"
                style={{ height: '56px' }}
                data-testid={`nav-${item.path.split("/").filter(Boolean).pop() || "home"}`}
              >
                <div 
                  className="absolute inset-1 rounded-xl bg-primary/10 dark:bg-primary/20"
                  style={{ 
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 200ms',
                  }}
                />
                
                <Icon 
                  className="w-6 h-6 relative"
                  style={{ 
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    transition: 'color 200ms',
                  }}
                  strokeWidth={2}
                />
                
                <span 
                  className="relative text-[11px] mt-1 text-center whitespace-nowrap"
                  style={{ 
                    fontWeight: 500,
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    transition: 'color 200ms',
                  }}
                >
                  {label}
                </span>
                
                <div 
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                  style={{ 
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 200ms',
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

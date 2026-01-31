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
      <div className="flex justify-around items-end h-[72px] pb-2 px-2 relative">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const label = language === "ar" ? item.labelAr : item.labelEn;
          
          if (item.isCenter) {
            return (
              <Link key={item.path} href={item.path}>
                <button
                  onClick={triggerHaptic}
                  className="flex flex-col items-center justify-center -mt-4 relative z-10"
                  data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                >
                  <div 
                    className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center 
                      shadow-lg transition-all duration-300 ease-out
                      ${isActive 
                        ? "bg-primary text-white shadow-primary/40" 
                        : "bg-primary text-white shadow-primary/30"
                      }
                    `}
                    style={{
                      transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                    }}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <span 
                    className={`
                      text-[11px] mt-1.5 font-medium transition-colors duration-200
                      ${isActive ? 'text-primary' : 'text-muted-foreground'}
                    `}
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
                className="flex flex-col items-center justify-center min-w-[60px] py-1.5 relative group"
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
              >
                {/* Background pill for active state */}
                <div 
                  className={`
                    absolute inset-x-1 top-0 bottom-1 rounded-2xl transition-all duration-300 ease-out
                    ${isActive 
                      ? 'bg-primary/10 dark:bg-primary/20' 
                      : 'bg-transparent group-active:bg-muted/50'
                    }
                  `}
                />
                
                {/* Icon container */}
                <div 
                  className={`
                    relative z-10 w-7 h-7 flex items-center justify-center 
                    transition-all duration-200 ease-out
                  `}
                >
                  <Icon 
                    className={`
                      w-[22px] h-[22px] transition-all duration-200
                      ${isActive 
                        ? "text-primary" 
                        : "text-muted-foreground group-active:text-foreground"
                      }
                    `}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                
                {/* Label */}
                <span 
                  className={`
                    relative z-10 text-[11px] mt-0.5 min-w-[48px] text-center
                    transition-all duration-200
                    ${isActive 
                      ? 'text-primary font-semibold' 
                      : 'text-muted-foreground font-medium group-active:text-foreground'
                    }
                  `}
                >
                  {label}
                </span>
                
                {/* Active indicator dot */}
                <div 
                  className={`
                    absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full
                    transition-all duration-300 ease-out
                    ${isActive 
                      ? 'bg-primary opacity-100 scale-100' 
                      : 'bg-primary opacity-0 scale-0'
                    }
                  `}
                />
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

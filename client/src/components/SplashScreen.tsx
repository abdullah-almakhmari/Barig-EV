import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { useIsPWA } from "@/hooks/use-pwa";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const isPWA = useIsPWA();

  useEffect(() => {
    if (!isPWA) {
      setShow(false);
      return;
    }

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShow(false), 400);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isPWA]);

  if (!show) return null;

  return (
    <div className={`splash-screen ${fadeOut ? 'splash-fade-out' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/5 to-black/30" />
      
      <div className="splash-logo flex flex-col items-center gap-5 relative z-10">
        <div className="w-28 h-28 rounded-[28px] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/10">
          <Zap className="w-16 h-16 text-white fill-current drop-shadow-lg" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-4xl font-bold text-white font-display tracking-wide">بارق</h1>
          <p className="text-white/80 text-sm font-medium">محطات شحن السيارات الكهربائية</p>
        </div>
      </div>
      
      <div className="absolute bottom-16 flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full spin-smooth" />
      </div>
      
      <div className="absolute bottom-8 text-white/40 text-xs">
        Bariq EV
      </div>
    </div>
  );
}

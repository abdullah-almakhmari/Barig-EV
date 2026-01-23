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
      setTimeout(() => setShow(false), 300);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isPWA]);

  if (!show) return null;

  return (
    <div className={`splash-screen ${fadeOut ? 'splash-fade-out' : ''}`}>
      <div className="splash-logo flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
          <Zap className="w-14 h-14 text-white fill-current" />
        </div>
        <h1 className="text-3xl font-bold text-white font-display">بارق</h1>
        <p className="text-white/70 text-sm">محطات شحن السيارات الكهربائية</p>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full spin-smooth" />
      </div>
    </div>
  );
}

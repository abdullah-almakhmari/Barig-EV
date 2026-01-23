import { useState, useEffect } from "react";
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/40" />
      
      <div className="splash-logo flex flex-col items-center gap-8 relative z-10">
        <img 
          src="/icons/icon-192.png" 
          alt="Bariq" 
          className="w-28 h-28 rounded-[28px] shadow-2xl"
        />
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-5xl font-bold text-white tracking-wide drop-shadow-lg">بارق</h1>
          <div className="w-16 h-0.5 bg-white/40 rounded-full" />
          <p className="text-white/90 text-base font-medium tracking-wide">اشحن بثقة</p>
        </div>
      </div>
      
      <div className="absolute bottom-20 flex flex-col items-center gap-4">
        <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full spin-smooth" />
        <p className="text-white/50 text-xs">جاري التحميل...</p>
      </div>
      
      <div className="absolute bottom-6 text-white/30 text-[10px] tracking-widest uppercase">
        Bariq EV
      </div>
    </div>
  );
}

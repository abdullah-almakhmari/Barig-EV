import { useState, useRef, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useIsPWA } from "@/hooks/use-pwa";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPWA = useIsPWA();

  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startY.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, maxPull));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isPWA) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isPWA]);

  if (!isPWA) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      {pullDistance > 0 && (
        <div 
          className="flex justify-center items-center transition-all"
          style={{ height: pullDistance, marginTop: -pullDistance / 2 }}
        >
          <div 
            className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ${isRefreshing ? 'spin-smooth' : ''}`}
            style={{ 
              transform: `rotate(${pullDistance * 2}deg)`,
              opacity: Math.min(pullDistance / threshold, 1)
            }}
          >
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

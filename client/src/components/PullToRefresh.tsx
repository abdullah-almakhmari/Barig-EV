import { useState, useRef, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const threshold = 100;
  const maxPull = 150;

  useEffect(() => {
    setIsEnabled(isTouchDevice());
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    startScrollTop.current = scrollTop;
    
    if (scrollTop <= 5) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      startY.current = 0;
      setIsPulling(false);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || !startY.current || isRefreshing) return;
    
    const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
    if (currentScrollTop > 5) {
      setPullDistance(0);
      setIsPulling(false);
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 10 && currentScrollTop <= 5) {
      setPullDistance(Math.min(diff * 0.4, maxPull));
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing, isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) {
      setPullDistance(0);
      startY.current = 0;
      return;
    }
    
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
    setIsPulling(false);
  }, [pullDistance, isRefreshing, onRefresh, isPulling]);

  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isEnabled]);

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {pullDistance > 0 && (
        <div 
          className="absolute left-0 right-0 flex justify-center items-center transition-all z-50"
          style={{ top: -10, height: pullDistance }}
        >
          <div 
            className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: `rotate(${pullDistance * 3}deg)`,
              opacity: Math.min(pullDistance / threshold, 1)
            }}
          >
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.2s' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

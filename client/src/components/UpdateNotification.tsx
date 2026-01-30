import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

interface UpdateNotificationProps {
  registration: ServiceWorkerRegistration | null;
}

export function UpdateNotification({ registration }: UpdateNotificationProps) {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!registration) return;

    const handleUpdate = () => {
      const waitingWorker = registration.waiting;
      if (waitingWorker) {
        setShowUpdate(true);
      }
    };

    handleUpdate();

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, [registration]);

  const handleUpdate = () => {
    if (!registration?.waiting) return;
    
    setIsUpdating(true);
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  const isArabic = document.documentElement.lang === "ar";

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300"
      data-testid="update-notification"
    >
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {isArabic ? "تحديث جديد متوفر" : "New update available"}
            </p>
            <p className="text-xs opacity-90 mt-1">
              {isArabic 
                ? "اضغط للتحديث والحصول على أحدث الميزات" 
                : "Tap to update and get the latest features"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20 shrink-0"
            onClick={handleDismiss}
            data-testid="button-dismiss-update"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="w-full mt-3 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          data-testid="button-apply-update"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 me-2 animate-spin" />
              {isArabic ? "جاري التحديث..." : "Updating..."}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 me-2" />
              {isArabic ? "تحديث الآن" : "Update now"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

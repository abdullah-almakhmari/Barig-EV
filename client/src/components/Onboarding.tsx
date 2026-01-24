import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Users, MapPin, CheckCircle, X } from "lucide-react";

const ONBOARDING_STORAGE_KEY = "bariq_onboarding_dismissed";

function safeLocalStorage() {
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    return true;
  } catch {
    return false;
  }
}

export function Onboarding() {
  const { t, i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const isRTL = i18n.language === "ar";

  useEffect(() => {
    try {
      if (safeLocalStorage()) {
        const dismissed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!dismissed) {
          setIsVisible(true);
        }
      } else {
        const dismissed = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!dismissed) {
          setIsVisible(true);
        }
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      if (safeLocalStorage()) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      } else {
        sessionStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      }
    } catch {
      console.log("Storage not available");
    }
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background overflow-auto"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ touchAction: "pan-y" }}
      data-testid="onboarding-overlay"
    >
      <button
        onClick={handleDismiss}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleDismiss();
        }}
        className="absolute top-4 end-4 text-muted-foreground hover-elevate p-3 rounded z-10"
        style={{ touchAction: "manipulation" }}
        aria-label={t("onboarding.skip")}
        data-testid="button-onboarding-skip"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="w-8 h-8" />
          <span className="text-2xl font-bold">{t("app.title")}</span>
        </div>

        <h1 className="text-lg font-semibold text-foreground leading-snug" data-testid="text-onboarding-headline">
          {t("onboarding.headline")}
        </h1>

        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          {t("onboarding.problem")}
        </p>

        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 w-full max-w-sm">
          <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-start">
            <p className="font-medium text-foreground text-sm">{t("onboarding.trustTitle")}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("onboarding.trustDesc")}</p>
          </div>
        </div>

        <ul className="w-full max-w-sm space-y-3 text-start">
          <li className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm text-foreground">{t("onboarding.howTo1")}</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm text-foreground">{t("onboarding.howTo2")}</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm text-foreground">{t("onboarding.howTo3")}</span>
          </li>
        </ul>
      </div>

      <div className="px-6 pb-8 pt-4 safe-area-inset-bottom">
        <Button 
          onClick={handleDismiss}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleDismiss();
          }}
          className="w-full"
          size="lg"
          style={{ touchAction: "manipulation", minHeight: "48px" }}
          data-testid="button-onboarding-start"
        >
          {t("onboarding.getStarted")}
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Users, MapPin, CheckCircle, X } from "lucide-react";

const ONBOARDING_STORAGE_KEY = "bariq_onboarding_dismissed";

export function Onboarding() {
  const { t, i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const isRTL = i18n.language === "ar";

  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="onboarding-overlay"
    >
      <Card className="relative w-full max-w-xs p-3 shadow-lg mt-8 ms-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 end-2 text-muted-foreground hover-elevate p-0.5 rounded z-10"
          aria-label={t("onboarding.skip")}
          data-testid="button-onboarding-skip"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-1 text-primary">
            <Zap className="w-5 h-5" />
            <span className="text-base font-bold">{t("app.title")}</span>
          </div>

          <h1 className="text-sm font-semibold text-foreground leading-tight" data-testid="text-onboarding-headline">
            {t("onboarding.headline")}
          </h1>

          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {t("onboarding.problem")}
          </p>

          <div className="flex items-start gap-2 bg-muted/50 rounded-md p-2 w-full">
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="text-start">
              <p className="font-medium text-foreground text-[11px]">{t("onboarding.trustTitle")}</p>
              <p className="text-muted-foreground text-[10px] leading-snug">{t("onboarding.trustDesc")}</p>
            </div>
          </div>

          <ul className="w-full space-y-1.5 text-start">
            <li className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-2.5 h-2.5 text-primary" />
              </div>
              <span className="text-[11px] text-foreground">{t("onboarding.howTo1")}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-2.5 h-2.5 text-primary" />
              </div>
              <span className="text-[11px] text-foreground">{t("onboarding.howTo2")}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-2.5 h-2.5 text-primary" />
              </div>
              <span className="text-[11px] text-foreground">{t("onboarding.howTo3")}</span>
            </li>
          </ul>

          <Button 
            onClick={handleDismiss} 
            className="w-full h-8 text-xs"
            data-testid="button-onboarding-start"
          >
            {t("onboarding.getStarted")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

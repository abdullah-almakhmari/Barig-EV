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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="onboarding-overlay"
    >
      <Card className="relative max-w-md w-full p-5 sm:p-6 shadow-lg my-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-3 end-3 text-muted-foreground hover-elevate p-1 rounded"
          aria-label={t("onboarding.skip")}
          data-testid="button-onboarding-skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-7 h-7" />
            <span className="text-xl font-bold">{t("app.title")}</span>
          </div>

          <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-tight" data-testid="text-onboarding-headline">
            {t("onboarding.headline")}
          </h1>

          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed px-2">
            {t("onboarding.problem")}
          </p>

          <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 w-full">
            <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-start">
              <p className="font-medium text-foreground text-sm">{t("onboarding.trustTitle")}</p>
              <p className="text-muted-foreground text-xs mt-1">{t("onboarding.trustDesc")}</p>
            </div>
          </div>

          <ul className="w-full space-y-2.5 text-start">
            <li className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-foreground">{t("onboarding.howTo1")}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-foreground">{t("onboarding.howTo2")}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-foreground">{t("onboarding.howTo3")}</span>
            </li>
          </ul>

          <Button 
            onClick={handleDismiss} 
            className="w-full mt-2"
            size="default"
            data-testid="button-onboarding-start"
          >
            {t("onboarding.getStarted")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

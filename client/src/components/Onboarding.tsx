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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="onboarding-overlay"
    >
      <Card className="relative max-w-lg w-full p-6 md:p-8 shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-4 end-4 text-muted-foreground hover-elevate p-1 rounded"
          aria-label={t("onboarding.skip")}
          data-testid="button-onboarding-skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-8 h-8" />
            <span className="text-2xl font-bold">{t("app.title")}</span>
          </div>

          <h1 className="text-xl md:text-2xl font-semibold text-foreground" data-testid="text-onboarding-headline">
            {t("onboarding.headline")}
          </h1>

          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            {t("onboarding.problem")}
          </p>

          <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4 w-full">
            <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-start">
              <p className="font-medium text-foreground text-sm">{t("onboarding.trustTitle")}</p>
              <p className="text-muted-foreground text-xs mt-1">{t("onboarding.trustDesc")}</p>
            </div>
          </div>

          <ul className="w-full space-y-3 text-start">
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

          <Button 
            onClick={handleDismiss} 
            className="w-full"
            size="lg"
            data-testid="button-onboarding-start"
          >
            {t("onboarding.getStarted")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

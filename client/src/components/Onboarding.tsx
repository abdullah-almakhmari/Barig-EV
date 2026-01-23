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
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/95 backdrop-blur-sm p-2 pt-16 overflow-y-auto"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="onboarding-overlay"
    >
      <Card className="relative w-full max-w-sm p-4 shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-2 end-2 text-muted-foreground hover-elevate p-1 rounded z-10"
          aria-label={t("onboarding.skip")}
          data-testid="button-onboarding-skip"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-1.5 text-primary">
            <Zap className="w-6 h-6" />
            <span className="text-lg font-bold">{t("app.title")}</span>
          </div>

          <h1 className="text-base font-semibold text-foreground leading-tight" data-testid="text-onboarding-headline">
            {t("onboarding.headline")}
          </h1>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("onboarding.problem")}
          </p>

          <div className="flex items-start gap-2 bg-muted/50 rounded-md p-2.5 w-full">
            <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-start">
              <p className="font-medium text-foreground text-xs">{t("onboarding.trustTitle")}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">{t("onboarding.trustDesc")}</p>
            </div>
          </div>

          <ul className="w-full space-y-2 text-start">
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs text-foreground">{t("onboarding.howTo1")}</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs text-foreground">{t("onboarding.howTo2")}</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs text-foreground">{t("onboarding.howTo3")}</span>
            </li>
          </ul>

          <Button 
            onClick={handleDismiss} 
            className="w-full"
            size="sm"
            data-testid="button-onboarding-start"
          >
            <span>{t("onboarding.getStarted")}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

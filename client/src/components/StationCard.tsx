import { useTranslation } from "react-i18next";
import { useLanguage } from "./LanguageContext";
import { Station, StationCharger } from "@shared/schema";
import { Zap, Battery, AlertTriangle, CheckCircle, Navigation, BatteryCharging, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface VerificationSummary {
  working: number;
  notWorking: number;
  busy: number;
  totalVotes: number;
  leadingVote: string | null;
  isVerified: boolean;
  isStrongVerified: boolean;
  lastVerifiedAt: string | null;
}

function formatTimeAgo(isoString: string, t: (key: string, options?: any) => string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) {
    return t("verify.justNow");
  } else if (diffMinutes < 60) {
    return t("verify.minutesAgo", { count: diffMinutes });
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return t("verify.hoursAgo", { count: diffHours });
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return t("verify.daysAgo", { count: diffDays });
    }
  }
}

interface StationWithChargers extends Station {
  chargers?: StationCharger[];
}

interface StationCardProps {
  station: StationWithChargers;
  variant?: "full" | "compact";
  isRentalStation?: boolean;
}

export function StationCard({ station, variant = "full", isRentalStation = false }: StationCardProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const isAr = language === "ar";
  const name = isAr ? station.nameAr : station.name;
  const city = isAr ? station.cityAr : station.city;

  const { data: verificationSummary } = useQuery<VerificationSummary>({
    queryKey: ['/api/stations', station.id, 'verification-summary'],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${station.id}/verification-summary`);
      if (!res.ok) throw new Error('Failed to fetch verification summary');
      return res.json();
    },
    staleTime: 60000,
  });

  const getAvailabilityStatus = () => {
    if (station.status === "OFFLINE") {
      return {
        color: "bg-red-500/10 text-red-600 border-red-500/20",
        icon: <AlertTriangle className="w-3 h-3 me-1" />,
        label: t("station.status.offline")
      };
    }
    if ((station.availableChargers ?? 0) > 0) {
      return {
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: <CheckCircle className="w-3 h-3 me-1" />,
        label: t("station.status.available")
      };
    }
    return {
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      icon: <BatteryCharging className="w-3 h-3 me-1" />,
      label: t("station.status.inuse")
    };
  };

  const availabilityStatus = getAvailabilityStatus();

  const handleCardClick = () => {
    if (variant === "compact") {
      setLocation(`/station/${station.id}`);
    }
  };

  return (
    <div 
      className={`
        group relative overflow-hidden rounded-2xl bg-card border border-border/50
        shadow-sm hover:shadow-md transition-all duration-300
        ${variant === "full" ? "p-5" : "p-3"}
        ${variant === "compact" ? "cursor-pointer" : ""}
      `}
      onClick={handleCardClick}
      data-testid={`station-card-${station.id}`}
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={availabilityStatus.color}>
              {availabilityStatus.icon}
              {availabilityStatus.label}
            </Badge>
            <Badge variant="outline" className="bg-muted/50">
              <BatteryCharging className="w-3 h-3 me-1" />
              {Math.max(0, station.availableChargers ?? 0)}/{station.chargerCount ?? 1} {t("station.available")}
            </Badge>
          </div>
          <h3 className="font-bold text-lg leading-tight text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground mt-1 flex items-center">
            <Navigation className="w-3 h-3 me-1" />
            {city}
          </p>
          {verificationSummary?.lastVerifiedAt && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <Clock className="w-3 h-3 me-1" />
              {t("status.verifiedAgo", { time: formatTimeAgo(verificationSummary.lastVerifiedAt, t) })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary" className="font-mono text-xs">
            {station.powerKw ? `${station.powerKw} kW` : "N/A"}
          </Badge>
          {isRentalStation ? (
            <Badge className="bg-violet-500 text-white border-0 text-xs">
              {t("station.price.paid")}
            </Badge>
          ) : station.isFree ? (
            <Badge className="bg-emerald-500 text-white border-0 text-xs">
              {t("station.price.free")}
            </Badge>
          ) : !station.isFree && (
            <Badge className="bg-amber-500 text-white border-0 text-xs">
              {t("station.price.paid")}
            </Badge>
          )}
        </div>
      </div>

      {variant === "full" && (
        <div className="space-y-4 relative z-10">
          {/* Show multiple charger types if available */}
          {station.chargers && station.chargers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {station.chargers.map((charger, idx) => (
                <div 
                  key={charger.id || idx}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    charger.chargerType === 'DC' 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span className="font-medium">{charger.chargerType}</span>
                  <span className="text-xs opacity-75">{charger.powerKw}kW</span>
                  {charger.connectorType && (
                    <span className="text-xs opacity-75">• {charger.connectorType}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-xl border border-border/50">
              <div className={`p-2 rounded-lg ${station.chargerType?.includes('DC') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <p className="font-semibold">{t(`station.type.${station.chargerType?.toLowerCase() || 'ac'}`)}</p>
                <p className="text-xs text-muted-foreground">{station.operator || "Unknown Operator"}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Link href={`/station/${station.id}`} className="flex-1">
              <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                {t("nav.list")}
              </Button>
            </Link>
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, '_blank')}>
              <Navigation className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

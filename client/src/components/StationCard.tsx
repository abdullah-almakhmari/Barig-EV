import { useTranslation } from "react-i18next";
import { useLanguage } from "./LanguageContext";
import { Station } from "@shared/schema";
import { Zap, Battery, AlertTriangle, CheckCircle, Navigation, BatteryCharging } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface StationCardProps {
  station: Station;
  variant?: "full" | "compact";
}

export function StationCard({ station, variant = "full" }: StationCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const isAr = language === "ar";
  const name = isAr ? station.nameAr : station.name;
  const city = isAr ? station.cityAr : station.city;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "OPERATIONAL": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "MAINTENANCE": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "OFFLINE": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "OPERATIONAL": return <CheckCircle className="w-3 h-3 me-1" />;
      case "MAINTENANCE": return <AlertTriangle className="w-3 h-3 me-1" />;
      case "OFFLINE": return <AlertTriangle className="w-3 h-3 me-1" />;
      default: return null;
    }
  };

  return (
    <div className={`
      group relative overflow-hidden rounded-2xl bg-card border border-border/50
      shadow-sm hover:shadow-md transition-all duration-300
      ${variant === "full" ? "p-5" : "p-3"}
    `}>
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={getStatusColor(station.status)}>
              {getStatusIcon(station.status)}
              {t(`station.status.${station.status?.toLowerCase()}`)}
            </Badge>
            <Badge 
              variant="outline" 
              className={`${
                (station.availableChargers ?? 0) > 0 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                  : "bg-red-500/10 text-red-600 border-red-500/20"
              }`}
            >
              <BatteryCharging className="w-3 h-3 me-1" />
              {station.availableChargers ?? 0}/{station.chargerCount ?? 1} {t("station.available")}
            </Badge>
          </div>
          <h3 className="font-bold text-lg leading-tight text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground mt-1 flex items-center">
            <Navigation className="w-3 h-3 me-1" />
            {city}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary" className="font-mono text-xs">
            {station.powerKw ? `${station.powerKw} kW` : "N/A"}
          </Badge>
          {station.isFree && (
            <Badge className="bg-emerald-500 text-white border-0 text-xs">
              {t("station.price.free")}
            </Badge>
          )}
        </div>
      </div>

      {variant === "full" && (
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-xl border border-border/50">
            <div className={`p-2 rounded-lg ${station.chargerType.includes('DC') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <p className="font-semibold">{t(`station.type.${station.chargerType.toLowerCase()}`)}</p>
              <p className="text-xs text-muted-foreground">{station.operator || "Unknown Operator"}</p>
            </div>
          </div>

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

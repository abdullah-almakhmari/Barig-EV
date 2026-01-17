import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations } from "@/hooks/use-stations";
import { Loader2, BatteryCharging, Clock, Zap, Battery } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";

export default function ChargingHistory() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data: sessions, isLoading } = useChargingSessions();
  const { data: stations } = useStations();

  const getStationName = (stationId: number) => {
    const station = stations?.find(s => s.id === stationId);
    if (!station) return `Station #${stationId}`;
    return language === "ar" ? station.nameAr : station.name;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <SEO title={t("charging.history")} />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <BatteryCharging className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("charging.history")}</h1>
          <p className="text-muted-foreground text-sm">
            {sessions?.length || 0} {language === "ar" ? "جلسة" : "sessions"}
          </p>
        </div>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Link key={session.id} href={`/station/${session.stationId}`}>
              <Card className="p-4 hover-elevate cursor-pointer" data-testid={`session-card-${session.id}`}>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold">{getStationName(session.stationId)}</span>
                      {session.isActive && (
                        <Badge className="bg-orange-500 text-white animate-pulse">
                          {language === "ar" ? "نشط" : "Active"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.startTime && format(
                        new Date(session.startTime), 
                        "PPp", 
                        { locale: language === "ar" ? ar : undefined }
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <div className="font-bold text-sm">
                        {session.isActive ? (
                          <span className="text-orange-500">
                            {session.startTime && Math.floor((Date.now() - new Date(session.startTime).getTime()) / 60000)} min
                          </span>
                        ) : (
                          formatDuration(session.durationMinutes)
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("charging.duration")}</div>
                    </div>

                    {session.energyKwh !== null && (
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Zap className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                        <div className="font-bold text-sm text-emerald-600">
                          {session.energyKwh?.toFixed(1)} kWh
                        </div>
                        <div className="text-xs text-muted-foreground">{t("charging.energyCharged")}</div>
                      </div>
                    )}

                    {(session.batteryStartPercent !== null || session.batteryEndPercent !== null) && (
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Battery className="w-4 h-4 mx-auto text-primary mb-1" />
                        <div className="font-bold text-sm text-primary">
                          {session.batteryStartPercent ?? "?"}% → {session.batteryEndPercent ?? "?"}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {language === "ar" ? "البطارية" : "Battery"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <BatteryCharging className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">{t("charging.noHistory")}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {language === "ar" 
              ? "ابدأ جلسة شحن من صفحة المحطة لتتبع استخدامك"
              : "Start a charging session from a station page to track your usage"
            }
          </p>
        </Card>
      )}
    </div>
  );
}

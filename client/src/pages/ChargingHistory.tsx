import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations } from "@/hooks/use-stations";
import { Loader2, BatteryCharging, Clock, Zap, Battery, Camera, ChevronDown, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import type { ChargingSession } from "@shared/schema";

type GroupedSessions = {
  stationId: number;
  stationName: string;
  sessions: ChargingSession[];
  totalEnergy: number;
  totalDuration: number;
  hasActiveSession: boolean;
};

export default function ChargingHistory() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data: sessions, isLoading } = useChargingSessions();
  const { data: stations } = useStations();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const getStationName = (stationId: number) => {
    const station = stations?.find(s => s.id === stationId);
    if (!station) return `Station #${stationId}`;
    return language === "ar" ? station.nameAr : station.name;
  };

  const groupedSessions = useMemo(() => {
    if (!sessions) return [];
    
    const grouped = sessions.reduce((acc, session) => {
      const key = session.stationId;
      if (!acc[key]) {
        acc[key] = {
          stationId: session.stationId,
          stationName: getStationName(session.stationId),
          sessions: [],
          totalEnergy: 0,
          totalDuration: 0,
          hasActiveSession: false,
        };
      }
      acc[key].sessions.push(session);
      if (session.energyKwh) acc[key].totalEnergy += session.energyKwh;
      if (session.durationMinutes) acc[key].totalDuration += session.durationMinutes;
      if (session.isActive) acc[key].hasActiveSession = true;
      return acc;
    }, {} as Record<number, GroupedSessions>);

    return Object.values(grouped).sort((a, b) => {
      const aLatest = a.sessions[0]?.startTime ? new Date(a.sessions[0].startTime).getTime() : 0;
      const bLatest = b.sessions[0]?.startTime ? new Date(b.sessions[0].startTime).getTime() : 0;
      return bLatest - aLatest;
    });
  }, [sessions, stations, language]);

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
            {sessions?.length || 0} {language === "ar" ? "جلسة" : "sessions"} • {groupedSessions.length} {language === "ar" ? "محطة" : "stations"}
          </p>
        </div>
      </div>

      {groupedSessions.length > 0 ? (
        <Accordion type="multiple" className="space-y-3">
          {groupedSessions.map((group) => (
            <AccordionItem 
              key={group.stationId} 
              value={`station-${group.stationId}`}
              className="border rounded-lg bg-card overflow-hidden"
              data-testid={`accordion-station-${group.stationId}`}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full text-start">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-bold text-lg">{group.stationName}</span>
                    {group.hasActiveSession && (
                      <Badge className="bg-orange-500 text-white animate-pulse">
                        {language === "ar" ? "نشط" : "Active"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3" />
                      {group.sessions.length} {language === "ar" ? "جلسة" : "sessions"}
                    </Badge>
                    {group.totalEnergy > 0 && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                        <Zap className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                        {group.totalEnergy.toFixed(1)} kWh
                      </Badge>
                    )}
                    {group.totalDuration > 0 && (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                        {formatDuration(group.totalDuration)}
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {group.sessions.map((session) => (
                    <Link key={session.id} href={`/station/${session.stationId}`}>
                      <div 
                        className="border rounded-lg p-3 bg-muted/30 hover-elevate cursor-pointer"
                        data-testid={`session-card-${session.id}`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {session.isActive && (
                                <Badge className="bg-orange-500 text-white animate-pulse text-xs">
                                  {language === "ar" ? "نشط" : "Active"}
                                </Badge>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {session.startTime && format(
                                  new Date(session.startTime), 
                                  "PPp", 
                                  { locale: language === "ar" ? ar : undefined }
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className={session.isActive ? "text-orange-500 font-medium" : ""}>
                                {session.isActive ? (
                                  session.startTime && `${Math.floor((Date.now() - new Date(session.startTime).getTime()) / 60000)} min`
                                ) : (
                                  formatDuration(session.durationMinutes)
                                )}
                              </span>
                            </div>

                            {session.energyKwh !== null && session.energyKwh > 0 && (
                              <div className="flex items-center gap-1 text-sm text-emerald-600">
                                <Zap className="w-3 h-3" />
                                <span>{session.energyKwh?.toFixed(1)} kWh</span>
                              </div>
                            )}

                            {(session.batteryStartPercent !== null || session.batteryEndPercent !== null) && (
                              <div className="flex items-center gap-1 text-sm text-primary">
                                <Battery className="w-3 h-3" />
                                <span>{session.batteryStartPercent ?? "?"}% → {session.batteryEndPercent ?? "?"}%</span>
                              </div>
                            )}

                            {session.screenshotPath && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedScreenshot(session.screenshotPath!);
                                }}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                data-testid={`screenshot-btn-${session.id}`}
                              >
                                <Camera className="w-3 h-3" />
                                <span>{language === "ar" ? "صورة" : "Photo"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href={`/station/${group.stationId}`}>
                  <div className="mt-3 text-center text-sm text-primary hover:underline cursor-pointer">
                    {language === "ar" ? "عرض تفاصيل المحطة" : "View station details"} →
                  </div>
                </Link>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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

      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "صورة شاشة الشاحن" : "Charger Screenshot"}
            </DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="relative">
              <img
                src={selectedScreenshot.startsWith('/') ? selectedScreenshot : `/${selectedScreenshot}`}
                alt="Charger screenshot"
                className="w-full rounded-lg"
                data-testid="screenshot-image"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

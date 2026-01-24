import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations } from "@/hooks/use-stations";
import { Loader2, BatteryCharging, Clock, Zap, Battery, Camera, ChevronDown, MapPin, Banknote, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import type { ChargingSession } from "@shared/schema";

// Pricing constants (shared with ChargingStats)
const ELECTRICITY_STORAGE_KEY = "bariq_electricity_rate";
const CURRENCY_STORAGE_KEY = "bariq_currency";
const DEFAULT_ELECTRICITY_RATE = 0.014;
const DEFAULT_CURRENCY = "OMR";

const CURRENCIES = [
  { code: "OMR", nameAr: "ريال عماني", nameEn: "Omani Rial", symbol: "ر.ع" },
  { code: "AED", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", symbol: "ر.س" },
  { code: "KWD", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BHD", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", symbol: "د.ب" },
  { code: "QAR", nameAr: "ريال قطري", nameEn: "Qatari Riyal", symbol: "ر.ق" },
];

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
  const { toast } = useToast();
  const { data: sessions, isLoading } = useChargingSessions();
  const { data: stations } = useStations();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [electricityRate, setElectricityRate] = useState(DEFAULT_ELECTRICITY_RATE);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  const resetMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/charging-sessions/reset-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chargingSessions.list.path] });
      toast({
        title: language === "ar" ? "تم بنجاح" : "Success",
        description: language === "ar" ? "تم حذف جميع جلسات الشحن" : "All charging sessions deleted",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: error.messageAr || error.message || (language === "ar" ? "حدث خطأ" : "An error occurred"),
      });
    }
  });

  // Load pricing settings from localStorage
  useEffect(() => {
    const savedRate = localStorage.getItem(ELECTRICITY_STORAGE_KEY);
    if (savedRate) {
      const rate = parseFloat(savedRate);
      if (!isNaN(rate) && rate > 0) setElectricityRate(rate);
    }
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (savedCurrency && CURRENCIES.some(c => c.code === savedCurrency)) {
      setCurrency(savedCurrency);
    }
  }, []);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const currencySymbol = language === "ar" ? selectedCurrency.symbol : selectedCurrency.code;
  
  const calculateCost = (energyKwh: number | null) => {
    if (!energyKwh || energyKwh <= 0) return null;
    return (energyKwh * electricityRate).toFixed(3);
  };

  const getStationName = (stationId: number) => {
    const station = stations?.find(s => s.id === stationId);
    if (!station) return `Station #${stationId}`;
    return language === "ar" ? station.nameAr : station.name;
  };

  const allTimeTotals = useMemo(() => {
    if (!sessions) return { totalEnergy: 0, totalDuration: 0, totalCost: 0 };
    return sessions.reduce((acc, session) => {
      if (session.energyKwh) acc.totalEnergy += session.energyKwh;
      if (session.durationMinutes) acc.totalDuration += session.durationMinutes;
      return acc;
    }, { totalEnergy: 0, totalDuration: 0, totalCost: 0 });
  }, [sessions]);

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
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
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
        
        {sessions && sessions.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                data-testid="button-reset-history"
              >
                <Trash2 className="w-4 h-4 me-1" />
                {language === "ar" ? "تصفير" : "Reset"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {language === "ar" ? "إعادة تصفير السجل" : "Reset Charging History"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {language === "ar" 
                    ? "سيتم حذف جميع جلسات الشحن السابقة نهائياً. هذا الإجراء لا يمكن التراجع عنه."
                    : "All your previous charging sessions will be permanently deleted. This action cannot be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    language === "ar" ? "حذف الكل" : "Delete All"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {allTimeTotals.totalEnergy > 0 && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-emerald-500/10 to-primary/10 border-emerald-200 dark:border-emerald-800" data-testid="all-time-totals-card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي الطاقة المشحونة" : "Total Energy Charged"}
                </p>
                <p className="text-2xl font-bold text-emerald-600" data-testid="total-kwh-value">
                  {allTimeTotals.totalEnergy.toFixed(1)} kWh
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "التكلفة التقديرية" : "Estimated Cost"}
                </p>
                <p className="text-2xl font-bold text-amber-600" data-testid="total-cost-value">
                  {(allTimeTotals.totalEnergy * electricityRate).toFixed(3)} {currencySymbol}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

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
                    {group.totalEnergy > 0 && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                        <Banknote className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                        {(group.totalEnergy * electricityRate).toFixed(3)} {currencySymbol}
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

                            {calculateCost(session.energyKwh) && (
                              <div className="flex items-center gap-1 text-sm text-amber-600">
                                <Banknote className="w-3 h-3" />
                                <span>{calculateCost(session.energyKwh)} {currencySymbol}</span>
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

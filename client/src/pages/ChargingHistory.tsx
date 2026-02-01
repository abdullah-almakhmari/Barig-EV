import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations, useUserVehicles } from "@/hooks/use-stations";
import { Loader2, BatteryCharging, Clock, Zap, Battery, Camera, MapPin, Banknote, Car, Cpu, Thermometer, Gauge, Activity, Radio, CircuitBoard, Bolt, TrendingUp, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import type { ChargingSession } from "@shared/schema";

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

const VEHICLE_FILTER_KEY = "bariq_selected_vehicle";

export default function ChargingHistory() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const { data: sessions, isLoading } = useChargingSessions();
  const { data: stations } = useStations();
  const { data: userVehicles = [] } = useUserVehicles();
  
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [electricityRate, setElectricityRate] = useState(DEFAULT_ELECTRICITY_RATE);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    const saved = localStorage.getItem(VEHICLE_FILTER_KEY);
    return saved || "all";
  });
  const [expandedTelemetry, setExpandedTelemetry] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(VEHICLE_FILTER_KEY, selectedVehicleId);
  }, [selectedVehicleId]);

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

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (selectedVehicleId === "all") return sessions;
    return sessions.filter(session => session.userVehicleId !== null && String(session.userVehicleId) === selectedVehicleId);
  }, [sessions, selectedVehicleId]);

  const allTimeTotals = useMemo(() => {
    if (!filteredSessions.length) return { totalEnergy: 0, totalDuration: 0, totalCost: 0 };
    return filteredSessions.reduce((acc, session) => {
      if (session.energyKwh) acc.totalEnergy += session.energyKwh;
      if (session.durationMinutes) acc.totalDuration += session.durationMinutes;
      return acc;
    }, { totalEnergy: 0, totalDuration: 0, totalCost: 0 });
  }, [filteredSessions]);

  const groupedByDate = useMemo(() => {
    if (!filteredSessions.length) return [];
    
    const grouped = filteredSessions.reduce((acc, session) => {
      const date = session.startTime 
        ? format(new Date(session.startTime), "yyyy-MM-dd")
        : "unknown";
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(session);
      return acc;
    }, {} as Record<string, ChargingSession[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, sessions]) => ({
        date,
        sessions: sessions.sort((a, b) => {
          const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
          return bTime - aTime;
        }),
        totalEnergy: sessions.reduce((sum, s) => sum + (s.energyKwh || 0), 0),
      }));
  }, [filteredSessions]);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} ${isArabic ? "د" : "min"}`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return isArabic ? `${hours}س ${remainingMins}د` : `${hours}h ${remainingMins}m`;
  };

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === "unknown") return isArabic ? "تاريخ غير معروف" : "Unknown Date";
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return isArabic ? "اليوم" : "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return isArabic ? "أمس" : "Yesterday";
    }
    return format(date, "EEEE, d MMMM", { locale: isArabic ? ar : undefined });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4">
      <SEO title={t("charging.history")} />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pt-4 pb-3 -mx-4 px-4 border-b mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <BatteryCharging className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("charging.history")}</h1>
            <p className="text-muted-foreground text-xs">
              {filteredSessions.length} {isArabic ? "جلسة شحن" : "charging sessions"}
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle Filter - Only show if user has vehicles */}
      {userVehicles.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedVehicleId === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVehicleId("all")}
              className="shrink-0"
              data-testid="filter-all-vehicles"
            >
              {isArabic ? "الكل" : "All"}
            </Button>
            {userVehicles.map((vehicle) => (
              <Button
                key={vehicle.id}
                variant={selectedVehicleId === String(vehicle.id) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedVehicleId(String(vehicle.id))}
                className="shrink-0 gap-1.5"
                data-testid={`filter-vehicle-${vehicle.id}`}
              >
                <Car className="w-3.5 h-3.5" />
                {vehicle.nickname || (vehicle.evVehicle ? `${vehicle.evVehicle.brand}` : (isArabic ? "سيارة" : "Vehicle"))}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Summary Card */}
      {allTimeTotals.totalEnergy > 0 && (
        <Card className="p-4 mb-5 bg-gradient-to-br from-emerald-50 to-primary/5 dark:from-emerald-950/30 dark:to-primary/10 border-emerald-200/50 dark:border-emerald-800/50" data-testid="all-time-totals-card">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600" data-testid="total-kwh-value">
                {allTimeTotals.totalEnergy.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "كيلوواط ساعة" : "kWh charged"}
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-2">
                <Banknote className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600" data-testid="total-cost-value">
                {(allTimeTotals.totalEnergy * electricityRate).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {currencySymbol} {isArabic ? "تقديري" : "estimated"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Sessions List - Grouped by Date */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div key={group.date}>
              {/* Date Header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {formatDateHeader(group.date)}
                </h2>
                {group.totalEnergy > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="w-3 h-3 me-1" />
                    {group.totalEnergy.toFixed(1)} kWh
                  </Badge>
                )}
              </div>
              
              {/* Sessions */}
              <div className="space-y-3">
                {group.sessions.map((session) => {
                  const sessionData = session as any;
                  const hasDetailedTelemetry = sessionData.isAutoTracked && (
                    sessionData.gridVoltage || sessionData.gridFrequency || 
                    sessionData.maxCurrentA || sessionData.avgCurrentA ||
                    sessionData.maxPowerKw || sessionData.maxTempC
                  );
                  const isExpanded = expandedTelemetry === session.id;
                  
                  return (
                    <Card 
                      key={session.id} 
                      className="overflow-hidden"
                      data-testid={`session-card-${session.id}`}
                    >
                      <Link href={`/station/${session.stationId}`}>
                        <div className="p-4 hover-elevate cursor-pointer active:scale-[0.99] transition-transform">
                          {/* Station Name & Status */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-medium truncate">
                                {getStationName(session.stationId)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {session.isActive && (
                                <Badge className="bg-orange-500 text-white animate-pulse text-xs">
                                  {isArabic ? "جارٍ" : "Active"}
                                </Badge>
                              )}
                              {sessionData.isAutoTracked && (
                                <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300">
                                  <Cpu className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Session Details Grid */}
                          <div className="grid grid-cols-3 gap-3">
                            {/* Time */}
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-semibold">
                                {session.isActive ? (
                                  <span className="text-orange-500">
                                    {session.startTime && `${Math.floor((Date.now() - new Date(session.startTime).getTime()) / 60000)}`}
                                  </span>
                                ) : (
                                  formatDuration(session.durationMinutes)
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {session.startTime && format(new Date(session.startTime), "HH:mm")}
                              </p>
                            </div>
                            
                            {/* Energy */}
                            <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                              <Zap className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                              <p className="text-sm font-semibold text-emerald-600">
                                {session.energyKwh ? `${session.energyKwh.toFixed(1)}` : "-"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">kWh</p>
                            </div>
                            
                            {/* Cost or Battery */}
                            <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                              {sessionData.rentalTotalCost ? (
                                <>
                                  <Banknote className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                                  <p className="text-sm font-semibold text-amber-600">
                                    {Number(sessionData.rentalTotalCost).toFixed(2)}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{isArabic ? "إيجار" : "Rental"}</p>
                                </>
                              ) : session.batteryStartPercent !== null || session.batteryEndPercent !== null ? (
                                <>
                                  <Battery className="w-4 h-4 mx-auto mb-1 text-primary" />
                                  <p className="text-sm font-semibold text-primary">
                                    {session.batteryStartPercent ?? "?"}% → {session.batteryEndPercent ?? "?"}%
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{isArabic ? "البطارية" : "Battery"}</p>
                                </>
                              ) : calculateCost(session.energyKwh) ? (
                                <>
                                  <Banknote className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                                  <p className="text-sm font-semibold text-amber-600">
                                    {calculateCost(session.energyKwh)}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{currencySymbol}</p>
                                </>
                              ) : (
                                <>
                                  <Banknote className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                                  <p className="text-sm font-semibold text-muted-foreground">-</p>
                                  <p className="text-[10px] text-muted-foreground">{currencySymbol}</p>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Screenshot indicator */}
                          {session.screenshotPath && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedScreenshot(session.screenshotPath!);
                              }}
                              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded-lg"
                              data-testid={`screenshot-btn-${session.id}`}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {isArabic ? "عرض صورة الشاحن" : "View charger photo"}
                            </button>
                          )}
                        </div>
                      </Link>
                      
                      {/* Telemetry Section */}
                      {hasDetailedTelemetry && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTelemetry(isExpanded ? null : session.id);
                            }}
                            className="w-full px-4 py-2.5 flex items-center justify-center gap-2 text-xs text-primary border-t bg-primary/5 hover-elevate transition-colors"
                            data-testid={`telemetry-toggle-${session.id}`}
                          >
                            <CircuitBoard className="w-3.5 h-3.5" />
                            <span>{isArabic ? "بيانات الشاحن التفصيلية" : "Charger Telemetry"}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </button>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-3 border-t bg-gradient-to-b from-primary/5 to-transparent">
                              <div className="grid grid-cols-2 gap-2">
                                {sessionData.gridVoltage && (
                                  <div className="bg-card rounded-lg p-3 border">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Bolt className="w-4 h-4 text-blue-500" />
                                      <span className="text-[10px] text-muted-foreground">
                                        {isArabic ? "جهد الشبكة" : "Grid V"}
                                      </span>
                                    </div>
                                    <p className="text-lg font-bold text-blue-600">
                                      {sessionData.gridVoltage.toFixed(0)}V
                                    </p>
                                  </div>
                                )}
                                
                                {sessionData.gridFrequency && (
                                  <div className="bg-card rounded-lg p-3 border">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Radio className="w-4 h-4 text-indigo-500" />
                                      <span className="text-[10px] text-muted-foreground">
                                        {isArabic ? "التردد" : "Freq"}
                                      </span>
                                    </div>
                                    <p className="text-lg font-bold text-indigo-600">
                                      {sessionData.gridFrequency.toFixed(1)}Hz
                                    </p>
                                  </div>
                                )}
                                
                                {sessionData.maxCurrentA && (
                                  <div className="bg-card rounded-lg p-3 border">
                                    <div className="flex items-center gap-2 mb-1">
                                      <TrendingUp className="w-4 h-4 text-amber-500" />
                                      <span className="text-[10px] text-muted-foreground">
                                        {isArabic ? "أقصى تيار" : "Max A"}
                                      </span>
                                    </div>
                                    <p className="text-lg font-bold text-amber-600">
                                      {sessionData.maxCurrentA.toFixed(1)}A
                                    </p>
                                  </div>
                                )}
                                
                                {sessionData.maxPowerKw && (
                                  <div className="bg-card rounded-lg p-3 border">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Gauge className="w-4 h-4 text-purple-500" />
                                      <span className="text-[10px] text-muted-foreground">
                                        {isArabic ? "أقصى قدرة" : "Max kW"}
                                      </span>
                                    </div>
                                    <p className="text-lg font-bold text-purple-600">
                                      {sessionData.maxPowerKw.toFixed(1)}kW
                                    </p>
                                  </div>
                                )}
                                
                                {sessionData.maxTempC && (
                                  <div className="bg-card rounded-lg p-3 border">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Thermometer className="w-4 h-4 text-orange-500" />
                                      <span className="text-[10px] text-muted-foreground">
                                        {isArabic ? "الحرارة" : "Temp"}
                                      </span>
                                    </div>
                                    <p className="text-lg font-bold text-orange-600">
                                      {sessionData.maxTempC.toFixed(0)}°C
                                    </p>
                                  </div>
                                )}
                                
                                {sessionData.avgCurrentA && (
                                  <div className="bg-card rounded-lg p-3 border">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Activity className="w-4 h-4 text-cyan-500" />
                                      <span className="text-[10px] text-muted-foreground">
                                        {isArabic ? "متوسط التيار" : "Avg A"}
                                      </span>
                                    </div>
                                    <p className="text-lg font-bold text-cyan-600">
                                      {sessionData.avgCurrentA.toFixed(1)}A
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                                <div className="flex items-center gap-2 text-xs text-primary">
                                  <Cpu className="w-3 h-3" />
                                  <span>
                                    {isArabic 
                                      ? "تم تسجيل البيانات تلقائياً" 
                                      : "Auto-recorded via ESP32"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <BatteryCharging className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium mb-2">{t("charging.noHistory")}</p>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? "ابدأ جلسة شحن من صفحة المحطة"
              : "Start a charging session from a station page"
            }
          </p>
        </Card>
      )}

      {/* Screenshot Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {isArabic ? "صورة شاشة الشاحن" : "Charger Screenshot"}
            </DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="p-4 pt-2">
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

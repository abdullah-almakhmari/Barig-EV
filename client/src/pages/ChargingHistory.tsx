import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations, useUserVehicles } from "@/hooks/use-stations";
import { Loader2, BatteryCharging, Clock, Zap, Battery, Camera, ChevronDown, MapPin, Banknote, Car, Trash2, Upload, FileSpreadsheet, Cpu, Thermometer, Gauge, Activity, Radio, CircuitBoard, Timer, Bolt, TrendingUp, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChargingSession } from "@shared/schema";

interface ParsedSession {
  startTime: string;
  durationMinutes: number;
  energyKwh: number;
}

function parseTeslaCSV(csvContent: string): ParsedSession[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const sessions: ParsedSession[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    if (values.length >= 3) {
      const startTime = values[0].trim();
      const durationMinutes = parseFloat(values[1]) || 0;
      const energyKwh = parseFloat(values[2]) || 0;
      
      if (startTime && energyKwh > 0) {
        sessions.push({ startTime, durationMinutes, energyKwh });
      }
    }
  }
  
  return sessions;
}

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

const VEHICLE_FILTER_KEY = "bariq_selected_vehicle";

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

  // Save vehicle filter to localStorage when changed
  useEffect(() => {
    localStorage.setItem(VEHICLE_FILTER_KEY, selectedVehicleId);
  }, [selectedVehicleId]);

  // Check if the currently selected vehicle is a Tesla
  const selectedVehicleIsTesla = useMemo(() => {
    if (selectedVehicleId === "all") return false;
    const selectedVehicle = userVehicles.find(v => String(v.id) === selectedVehicleId);
    if (!selectedVehicle) return false;
    return (
      selectedVehicle.evVehicle?.brand?.toLowerCase().includes('tesla') ||
      selectedVehicle.nickname?.toLowerCase().includes('tesla')
    );
  }, [userVehicles, selectedVehicleId]);

  // Get the selected Tesla vehicle for import
  const selectedTeslaVehicle = useMemo(() => {
    if (!selectedVehicleIsTesla) return null;
    return userVehicles.find(v => String(v.id) === selectedVehicleId);
  }, [userVehicles, selectedVehicleId, selectedVehicleIsTesla]);
  const [sessionToDelete, setSessionToDelete] = useState<ChargingSession | null>(null);
  const [expandedTelemetry, setExpandedTelemetry] = useState<number | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [parsedSessions, setParsedSessions] = useState<ParsedSession[]>([]);
  const [importStationId, setImportStationId] = useState<string>("");
  const [importVehicleId, setImportVehicleId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/charging-sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions"] });
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? "تم حذف الجلسة بنجاح" : "Session deleted successfully",
      });
      setSessionToDelete(null);
    },
    onError: () => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل حذف الجلسة" : "Failed to delete session",
        variant: "destructive",
      });
    },
  });

  const importSessionsMutation = useMutation({
    mutationFn: async (data: { sessions: ParsedSession[]; stationId: number; userVehicleId?: number }) => {
      const res = await apiRequest("POST", "/api/charging-sessions/import-csv", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions"] });
      toast({
        title: t("charging.importSuccess"),
        description: `${data.imported} ${t("charging.importSuccessDesc")}`,
      });
      setShowImportDialog(false);
      setParsedSessions([]);
      setImportStationId("");
      setImportVehicleId("");
    },
    onError: () => {
      toast({
        title: t("charging.importError"),
        description: isArabic ? "حدث خطأ أثناء الاستيراد" : "An error occurred during import",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseTeslaCSV(content);
      setParsedSessions(parsed);
      if (parsed.length === 0) {
        toast({
          title: isArabic ? "خطأ" : "Error",
          description: t("charging.noValidSessions"),
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importStationId || parsedSessions.length === 0) return;
    
    importSessionsMutation.mutate({
      sessions: parsedSessions,
      stationId: parseInt(importStationId),
      userVehicleId: importVehicleId ? parseInt(importVehicleId) : undefined,
    });
  };

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

  const groupedSessions = useMemo(() => {
    if (!filteredSessions.length) return [];
    
    const grouped = filteredSessions.reduce((acc, session) => {
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
  }, [filteredSessions, stations, language]);

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
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BatteryCharging className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("charging.history")}</h1>
            <p className="text-muted-foreground text-sm">
              {filteredSessions.length} {isArabic ? "جلسة" : "sessions"} • {groupedSessions.length} {isArabic ? "محطة" : "stations"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedVehicleIsTesla && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setShowImportDialog(true);
                if (selectedTeslaVehicle) {
                  setImportVehicleId(String(selectedTeslaVehicle.id));
                }
              }}
              data-testid="button-import-csv"
              className="gap-1"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{t("charging.import")}</span>
            </Button>
          )}
        </div>
      </div>

      {userVehicles.length > 0 && (
        <div className="mb-6">
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger className="w-full" data-testid="select-vehicle-filter">
              <Car className="w-4 h-4 me-2" />
              <SelectValue placeholder={isArabic ? "جميع السيارات" : "All vehicles"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {isArabic ? "جميع السيارات" : "All vehicles"}
              </SelectItem>
              {userVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                  {vehicle.nickname || (vehicle.evVehicle ? `${vehicle.evVehicle.brand} ${vehicle.evVehicle.model}` : (isArabic ? "سيارة غير معروفة" : "Unknown vehicle"))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
                  {group.sessions.map((session) => {
                    const sessionData = session as any;
                    const hasDetailedTelemetry = sessionData.isAutoTracked && (
                      sessionData.gridVoltage || sessionData.gridFrequency || 
                      sessionData.maxCurrentA || sessionData.avgCurrentA ||
                      sessionData.maxPowerKw || sessionData.maxTempC
                    );
                    const isExpanded = expandedTelemetry === session.id;
                    
                    return (
                      <div key={session.id} className="border rounded-lg bg-muted/30 overflow-hidden">
                        <Link href={`/station/${session.stationId}`}>
                          <div 
                            className="p-3 hover-elevate cursor-pointer"
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
                                  {sessionData.isAutoTracked && (
                                    <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300">
                                      <Cpu className="w-3 h-3 me-1" />
                                      {language === "ar" ? "تلقائي" : "Auto"}
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
                                    <span>{session.energyKwh?.toFixed(2)} kWh</span>
                                  </div>
                                )}

                                {session.isRentalSession && session.rentalTotalCost ? (
                                  <div className="flex items-center gap-1 text-sm text-orange-600">
                                    <Banknote className="w-3 h-3" />
                                    <span>{Number(session.rentalTotalCost).toFixed(3)} {language === 'ar' ? 'ر.ع' : 'OMR'}</span>
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-orange-100 text-orange-700">
                                      {language === 'ar' ? 'إيجار' : 'Rental'}
                                    </Badge>
                                  </div>
                                ) : calculateCost(session.energyKwh) && (
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

                                {sessionData.maxPowerKw && (
                                  <div className="flex items-center gap-1 text-sm text-purple-600">
                                    <Gauge className="w-3 h-3" />
                                    <span>{sessionData.maxPowerKw.toFixed(1)} kW</span>
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

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSessionToDelete(session);
                                  }}
                                  className="flex items-center gap-1 text-sm text-destructive hover:underline"
                                  data-testid={`delete-btn-${session.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{language === "ar" ? "حذف" : "Delete"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </Link>
                        
                        {hasDetailedTelemetry && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTelemetry(isExpanded ? null : session.id);
                              }}
                              className="w-full px-3 py-2 flex items-center justify-center gap-2 text-xs text-primary border-t bg-primary/5 hover:bg-primary/10 transition-colors"
                              data-testid={`telemetry-toggle-${session.id}`}
                            >
                              <CircuitBoard className="w-3 h-3" />
                              <span>{language === "ar" ? "بيانات الشاحن التفصيلية" : "Detailed Charger Telemetry"}</span>
                              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </button>
                            
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-2 border-t bg-gradient-to-b from-primary/5 to-transparent">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {sessionData.gridVoltage && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                                          <Bolt className="w-3 h-3 text-blue-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "جهد الشبكة" : "Grid Voltage"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-blue-600">
                                        {sessionData.gridVoltage.toFixed(1)} <span className="text-xs font-normal">V</span>
                                      </p>
                                    </div>
                                  )}
                                  
                                  {sessionData.gridFrequency && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                          <Radio className="w-3 h-3 text-indigo-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "تردد الشبكة" : "Grid Frequency"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-indigo-600">
                                        {sessionData.gridFrequency.toFixed(2)} <span className="text-xs font-normal">Hz</span>
                                      </p>
                                    </div>
                                  )}
                                  
                                  {sessionData.maxCurrentA && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                                          <TrendingUp className="w-3 h-3 text-amber-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "أقصى تيار" : "Max Current"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-amber-600">
                                        {sessionData.maxCurrentA.toFixed(1)} <span className="text-xs font-normal">A</span>
                                      </p>
                                    </div>
                                  )}
                                  
                                  {sessionData.avgCurrentA && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                          <Activity className="w-3 h-3 text-cyan-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "متوسط التيار" : "Avg Current"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-cyan-600">
                                        {sessionData.avgCurrentA.toFixed(1)} <span className="text-xs font-normal">A</span>
                                      </p>
                                    </div>
                                  )}
                                  
                                  {sessionData.maxPowerKw && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                                          <Gauge className="w-3 h-3 text-purple-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "أقصى قدرة" : "Max Power"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-purple-600">
                                        {sessionData.maxPowerKw.toFixed(2)} <span className="text-xs font-normal">kW</span>
                                      </p>
                                    </div>
                                  )}
                                  
                                  {sessionData.maxTempC && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                                          <Thermometer className="w-3 h-3 text-orange-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "أقصى حرارة" : "Max Temp"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-orange-600">
                                        {sessionData.maxTempC.toFixed(1)} <span className="text-xs font-normal">°C</span>
                                      </p>
                                    </div>
                                  )}
                                  
                                  {session.durationMinutes && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-500/10 flex items-center justify-center">
                                          <Timer className="w-3 h-3 text-slate-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "مدة الشحن" : "Duration"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                                        {formatDuration(session.durationMinutes)}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {session.energyKwh && session.energyKwh > 0 && (
                                    <div className="bg-card rounded-lg p-2.5 border shadow-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                          <Zap className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                          {language === "ar" ? "الطاقة" : "Energy"}
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-emerald-600">
                                        {session.energyKwh.toFixed(2)} <span className="text-xs font-normal">kWh</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                                  <div className="flex items-center gap-2 text-xs text-primary">
                                    <Cpu className="w-3 h-3" />
                                    <span className="font-medium">
                                      {language === "ar" 
                                        ? "تم تسجيل هذه البيانات تلقائياً من شاحن Tesla Wall Connector" 
                                        : "Data auto-recorded from Tesla Wall Connector via ESP32"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
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

      <Dialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
            </DialogTitle>
            <DialogDescription>
              {isArabic 
                ? "هل أنت متأكد من حذف هذه الجلسة؟ سيتم إعادة حساب الإحصائيات تلقائياً."
                : "Are you sure you want to delete this session? Statistics will be recalculated automatically."
              }
            </DialogDescription>
          </DialogHeader>
          {sessionToDelete && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{getStationName(sessionToDelete.stationId)}</p>
              <p className="text-muted-foreground">
                {sessionToDelete.startTime && format(
                  new Date(sessionToDelete.startTime),
                  "PPp",
                  { locale: isArabic ? ar : undefined }
                )}
              </p>
              {sessionToDelete.energyKwh && (
                <p className="text-emerald-600">{sessionToDelete.energyKwh.toFixed(1)} kWh</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSessionToDelete(null)}
              data-testid="cancel-delete-btn"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => sessionToDelete && deleteSessionMutation.mutate(sessionToDelete.id)}
              disabled={deleteSessionMutation.isPending}
              data-testid="confirm-delete-btn"
            >
              {deleteSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isArabic ? "حذف" : "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {t("charging.importTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("charging.importDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("charging.selectFile")}</Label>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full mt-2 gap-2"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-csv-file"
              >
                <Upload className="w-4 h-4" />
                {parsedSessions.length > 0 
                  ? `${parsedSessions.length} ${t("charging.sessionsFound")}`
                  : t("charging.selectFile")
                }
              </Button>
            </div>

            {parsedSessions.length > 0 && (
              <>
                <div>
                  <Label>{t("charging.selectStation")}</Label>
                  <Select value={importStationId} onValueChange={setImportStationId}>
                    <SelectTrigger className="w-full mt-2" data-testid="select-import-station">
                      <SelectValue placeholder={t("charging.selectStation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {stations?.filter(s => s.stationType === "HOME").map((station) => (
                        <SelectItem key={station.id} value={String(station.id)}>
                          {isArabic ? station.nameAr : station.name}
                        </SelectItem>
                      ))}
                      {stations?.filter(s => s.stationType !== "HOME").map((station) => (
                        <SelectItem key={station.id} value={String(station.id)}>
                          {isArabic ? station.nameAr : station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTeslaVehicle && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <Label className="text-muted-foreground text-xs">
                      {isArabic ? "السيارة المختارة" : "Selected Vehicle"}
                    </Label>
                    <p className="font-medium text-primary mt-1">
                      {selectedTeslaVehicle.nickname || 
                        (selectedTeslaVehicle.evVehicle 
                          ? `${selectedTeslaVehicle.evVehicle.brand} ${selectedTeslaVehicle.evVehicle.model}` 
                          : "Tesla")}
                    </p>
                  </div>
                )}

                <Card className="p-3 bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{isArabic ? "إجمالي الطاقة" : "Total Energy"}</span>
                    <span className="font-bold text-emerald-600">
                      {parsedSessions.reduce((sum, s) => sum + s.energyKwh, 0).toFixed(1)} kWh
                    </span>
                  </div>
                </Card>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setParsedSessions([]);
                setImportStationId("");
                setImportVehicleId("");
              }}
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importStationId || parsedSessions.length === 0 || importSessionsMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importSessionsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4 me-2" />
                  {t("charging.importButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

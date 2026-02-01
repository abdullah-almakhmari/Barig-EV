import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations, useUserVehicles } from "@/hooks/use-stations";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Zap, Clock, MapPin, TrendingUp, ChevronLeft, ChevronRight, Settings, Check, Car, Fuel, Leaf, Battery } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SEO } from "@/components/SEO";
import { Link } from "wouter";
import { startOfMonth, endOfMonth, format, subMonths, addMonths, isSameMonth } from "date-fns";
import { ar } from "date-fns/locale";

const ELECTRICITY_STORAGE_KEY = "bariq_electricity_rate";
const PETROL_STORAGE_KEY = "bariq_petrol_price";
const CURRENCY_STORAGE_KEY = "bariq_currency";
const VEHICLE_FILTER_KEY = "bariq_selected_vehicle";
const DEFAULT_ELECTRICITY_RATE = 0.014;
const DEFAULT_PETROL_PRICE = 0.239;
const DEFAULT_CURRENCY = "OMR";

const CURRENCIES = [
  { code: "OMR", nameAr: "ريال عماني", nameEn: "Omani Rial", symbol: "ر.ع" },
  { code: "AED", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", symbol: "ر.س" },
  { code: "KWD", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BHD", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", symbol: "د.ب" },
  { code: "QAR", nameAr: "ريال قطري", nameEn: "Qatari Riyal", symbol: "ر.ق" },
];

export default function ChargingStats() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { data: sessions, isLoading } = useChargingSessions();
  const { data: stations } = useStations();
  const { data: userVehicles = [] } = useUserVehicles();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    const saved = localStorage.getItem(VEHICLE_FILTER_KEY);
    return saved || "all";
  });

  useEffect(() => {
    localStorage.setItem(VEHICLE_FILTER_KEY, selectedVehicleId);
  }, [selectedVehicleId]);
  
  const [electricityRate, setElectricityRate] = useState(DEFAULT_ELECTRICITY_RATE);
  const [petrolPrice, setPetrolPrice] = useState(DEFAULT_PETROL_PRICE);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [rateInput, setRateInput] = useState("");
  const [petrolInput, setPetrolInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState(DEFAULT_CURRENCY);
  const [showSettings, setShowSettings] = useState(false);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  useEffect(() => {
    const savedElecRate = localStorage.getItem(ELECTRICITY_STORAGE_KEY);
    if (savedElecRate) {
      const rate = parseFloat(savedElecRate);
      if (!isNaN(rate) && rate > 0) {
        setElectricityRate(rate);
        setRateInput(rate.toString());
      }
    } else {
      setRateInput(DEFAULT_ELECTRICITY_RATE.toString());
    }

    const savedPetrolPrice = localStorage.getItem(PETROL_STORAGE_KEY);
    if (savedPetrolPrice) {
      const price = parseFloat(savedPetrolPrice);
      if (!isNaN(price) && price > 0) {
        setPetrolPrice(price);
        setPetrolInput(price.toString());
      }
    } else {
      setPetrolInput(DEFAULT_PETROL_PRICE.toString());
    }

    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (savedCurrency && CURRENCIES.some(c => c.code === savedCurrency)) {
      setCurrency(savedCurrency);
      setCurrencyInput(savedCurrency);
    }
  }, []);

  const saveSettings = () => {
    const elecRate = parseFloat(rateInput);
    const petPrice = parseFloat(petrolInput);
    
    if (!isNaN(elecRate) && elecRate > 0) {
      setElectricityRate(elecRate);
      localStorage.setItem(ELECTRICITY_STORAGE_KEY, elecRate.toString());
    }
    
    if (!isNaN(petPrice) && petPrice > 0) {
      setPetrolPrice(petPrice);
      localStorage.setItem(PETROL_STORAGE_KEY, petPrice.toString());
    }

    if (currencyInput && CURRENCIES.some(c => c.code === currencyInput)) {
      setCurrency(currencyInput);
      localStorage.setItem(CURRENCY_STORAGE_KEY, currencyInput);
    }
    
    setShowSettings(false);
  };

  const isArabic = language === "ar";

  const getStationName = (stationId: number) => {
    const station = stations?.find(s => s.id === stationId);
    if (!station) return `Station #${stationId}`;
    return isArabic ? station.nameAr : station.name;
  };

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (selectedVehicleId === "all") return sessions;
    return sessions.filter(session => session.userVehicleId !== null && String(session.userVehicleId) === selectedVehicleId);
  }, [sessions, selectedVehicleId]);

  const monthlyStats = useMemo(() => {
    if (!filteredSessions.length) return null;

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const monthSessions = filteredSessions.filter(s => {
      if (!s.startTime) return false;
      const sessionDate = new Date(s.startTime);
      return sessionDate >= monthStart && sessionDate <= monthEnd;
    });

    const totalEnergy = monthSessions.reduce((sum, s) => sum + (s.energyKwh || 0), 0);
    const totalDuration = monthSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const sessionCount = monthSessions.length;
    const avgEnergy = sessionCount > 0 ? totalEnergy / sessionCount : 0;

    const stationVisits: Record<number, number> = {};
    monthSessions.forEach(s => {
      stationVisits[s.stationId] = (stationVisits[s.stationId] || 0) + 1;
    });
    const topStation = Object.entries(stationVisits).sort((a, b) => b[1] - a[1])[0];

    const estimatedCost = totalEnergy * electricityRate;
    const petrolLitersSaved = totalEnergy * 0.7;
    const petrolMoneySaved = petrolLitersSaved * petrolPrice;

    return {
      totalEnergy,
      totalDuration,
      sessionCount,
      avgEnergy,
      topStation: topStation ? { id: Number(topStation[0]), visits: topStation[1] } : null,
      estimatedCost,
      petrolLitersSaved,
      petrolMoneySaved,
      sessions: monthSessions,
    };
  }, [filteredSessions, selectedMonth, electricityRate, petrolPrice]);

  const yearlyData = useMemo(() => {
    if (!filteredSessions.length) return [];

    const months = [];
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthSessions = filteredSessions.filter(s => {
        if (!s.startTime) return false;
        const sessionDate = new Date(s.startTime);
        return sessionDate >= monthStart && sessionDate <= monthEnd;
      });

      const energy = monthSessions.reduce((sum, s) => sum + (s.energyKwh || 0), 0);
      const count = monthSessions.length;

      months.push({
        month: format(month, "MMM", { locale: isArabic ? ar : undefined }),
        fullMonth: format(month, "MMMM yyyy", { locale: isArabic ? ar : undefined }),
        energy: Math.round(energy * 10) / 10,
        sessions: count,
        date: month,
        isCurrentMonth: isSameMonth(month, selectedMonth),
      });
    }

    return months;
  }, [filteredSessions, selectedMonth, isArabic]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} ${isArabic ? "دقيقة" : "min"}`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) return `${hours} ${isArabic ? "ساعة" : "h"}`;
    return `${hours}${isArabic ? "س" : "h"} ${remainingMins}${isArabic ? "د" : "m"}`;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setSelectedMonth(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <Card className="p-8 text-center bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium mb-2">
            {isArabic ? "سجل الدخول لرؤية إحصائياتك" : "Login to see your statistics"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {isArabic ? "تتبع استهلاكك للطاقة والتوفير" : "Track your energy consumption and savings"}
          </p>
          <Link href="/login">
            <Button data-testid="button-login">
              {isArabic ? "تسجيل الدخول" : "Login"}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      <SEO title={isArabic ? "إحصائيات الشحن" : "Charging Statistics"} />
      
      {/* Header Card */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-0" data-testid="stats-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-page-title">
                {isArabic ? "إحصائيات الشحن" : "Charging Statistics"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "تتبع استهلاكك للطاقة" : "Track your energy consumption"}
              </p>
            </div>
          </div>
          
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>
                  {isArabic ? "إعدادات التسعيرة" : "Pricing Settings"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="currency-select">
                    {isArabic ? "العملة" : "Currency"}
                  </Label>
                  <Select value={currencyInput} onValueChange={setCurrencyInput}>
                    <SelectTrigger id="currency-select" data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code} data-testid={`currency-option-${curr.code}`}>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{curr.symbol}</span>
                            <span>{isArabic ? curr.nameAr : curr.nameEn}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="electricity-rate">
                    {isArabic 
                      ? `سعر الكيلوواط (${CURRENCIES.find(c => c.code === currencyInput)?.symbol || "ر.ع"})` 
                      : `Electricity price per kWh (${currencyInput})`}
                  </Label>
                  <Input
                    id="electricity-rate"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.1"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    data-testid="input-electricity-rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="petrol-price">
                    {isArabic 
                      ? `سعر لتر البنزين (${CURRENCIES.find(c => c.code === currencyInput)?.symbol || "ر.ع"})` 
                      : `Petrol price per liter (${currencyInput})`}
                  </Label>
                  <Input
                    id="petrol-price"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.180"
                    value={petrolInput}
                    onChange={(e) => setPetrolInput(e.target.value)}
                    data-testid="input-petrol-price"
                  />
                </div>

                <Button onClick={saveSettings} className="w-full" data-testid="button-save-settings">
                  <Check className="w-4 h-4 me-2" />
                  {isArabic ? "حفظ الإعدادات" : "Save Settings"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Month Navigation */}
      <Card className="p-3 border-0 bg-muted/50" data-testid="month-navigator">
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigateMonth("prev")}
            data-testid="button-prev-month"
          >
            {isArabic ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </Button>
          <div className="text-center">
            <div className="font-bold text-lg" data-testid="text-selected-month">
              {format(selectedMonth, "MMMM yyyy", { locale: isArabic ? ar : undefined })}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigateMonth("next")}
            disabled={isSameMonth(selectedMonth, new Date())}
            data-testid="button-next-month"
          >
            {isArabic ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
        </div>
      </Card>

      {/* Vehicle Filter */}
      {userVehicles.length > 0 && (
        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
          <SelectTrigger className="bg-background" data-testid="select-vehicle-filter">
            <Car className="w-4 h-4 me-2 shrink-0" />
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
      )}

      {monthlyStats && monthlyStats.sessionCount > 0 ? (
        <>
          {/* Main Energy Card */}
          <Card className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border-0" data-testid="card-energy">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">{isArabic ? "إجمالي الطاقة" : "Total Energy"}</p>
                <div className="text-3xl font-bold text-emerald-600" data-testid="text-total-energy">
                  {monthlyStats.totalEnergy.toFixed(1)} <span className="text-lg font-normal">kWh</span>
                </div>
              </div>
              <div className="text-end">
                <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" data-testid="badge-sessions">
                  {monthlyStats.sessionCount} {isArabic ? "جلسة" : "sessions"}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Duration */}
            <Card className="p-4 bg-purple-50 dark:bg-purple-950/30 border-0" data-testid="card-duration">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي الوقت" : "Total Time"}</p>
                  <p className="font-bold text-purple-600 truncate" data-testid="text-duration">
                    {formatDuration(monthlyStats.totalDuration)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Average */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-0" data-testid="card-average">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{isArabic ? "معدل الجلسة" : "Avg/Session"}</p>
                  <p className="font-bold text-blue-600 truncate" data-testid="text-average">
                    {monthlyStats.avgEnergy.toFixed(1)} kWh
                  </p>
                </div>
              </div>
            </Card>

            {/* Cost */}
            <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-0" data-testid="card-cost">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                  <Battery className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{isArabic ? "تكلفة الكهرباء" : "Electricity Cost"}</p>
                  <p className="font-bold text-amber-600 truncate" data-testid="text-cost">
                    ~{monthlyStats.estimatedCost.toFixed(2)} {selectedCurrency.symbol}
                  </p>
                </div>
              </div>
            </Card>

            {/* Savings */}
            <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-0" data-testid="card-savings">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{isArabic ? "وفرت من البنزين" : "Petrol Saved"}</p>
                  <p className="font-bold text-green-600 truncate" data-testid="text-savings">
                    {monthlyStats.petrolMoneySaved.toFixed(2)} {selectedCurrency.symbol}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Station */}
          {monthlyStats.topStation && (
            <Card className="p-4 border-0 bg-primary/5" data-testid="card-top-station">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{isArabic ? "المحطة الأكثر زيارة" : "Most Visited Station"}</p>
                  <p className="font-bold truncate" data-testid="text-top-station">{getStationName(monthlyStats.topStation.id)}</p>
                </div>
                <Badge variant="secondary" data-testid="badge-visits">
                  {monthlyStats.topStation.visits} {isArabic ? "زيارة" : "visits"}
                </Badge>
              </div>
            </Card>
          )}

          {/* Yearly Chart */}
          {yearlyData.length > 0 && (
            <Card className="p-4 border-0" data-testid="card-chart">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{isArabic ? "الاستهلاك الشهري" : "Monthly Consumption"}</span>
              </div>
              <div className="h-[200px]" data-testid="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-3 shadow-lg">
                              <div className="font-semibold mb-1">{data.fullMonth}</div>
                              <div className="flex items-center gap-2 text-sm">
                                <Zap className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 font-medium">{data.energy} kWh</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {data.sessions} {isArabic ? "جلسة" : "sessions"}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="energy" radius={[4, 4, 0, 0]}>
                      {yearlyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isCurrentMonth ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-8 text-center bg-muted/30 border-0" data-testid="card-empty">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">
            {isArabic ? "لا توجد بيانات لهذا الشهر" : "No data for this month"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? "ابدأ جلسة شحن لتتبع استهلاكك"
              : "Start a charging session to track your consumption"
            }
          </p>
        </Card>
      )}

      {/* View History Link */}
      <Link href="/history">
        <Card className="p-4 hover-elevate cursor-pointer" data-testid="link-history">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-medium">{isArabic ? "عرض سجل الشحن الكامل" : "View full charging history"}</span>
            </div>
            {isArabic ? <ChevronLeft className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          </div>
        </Card>
      </Link>
    </div>
  );
}

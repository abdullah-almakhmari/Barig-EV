import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations, useUserVehicles } from "@/hooks/use-stations";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, BarChart3, Zap, Clock, MapPin, TrendingUp, Calendar, ChevronLeft, ChevronRight, Settings, Check, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [electricityRate, setElectricityRate] = useState(DEFAULT_ELECTRICITY_RATE);
  const [petrolPrice, setPetrolPrice] = useState(DEFAULT_PETROL_PRICE);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [rateInput, setRateInput] = useState("");
  const [petrolInput, setPetrolInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState(DEFAULT_CURRENCY);
  const [showSettings, setShowSettings] = useState(false);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const getCurrencySymbol = () => isArabic ? selectedCurrency.symbol : selectedCurrency.code;

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
    return sessions.filter(session => session.userVehicleId === selectedVehicleId);
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
      <div className="max-w-4xl mx-auto pb-20">
        <Card className="p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {isArabic ? "سجل الدخول لرؤية إحصائياتك" : "Login to see your statistics"}
          </p>
          <Link href="/login">
            <Button className="mt-4">
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
    <div className="max-w-4xl mx-auto pb-20">
      <SEO title={isArabic ? "إحصائيات الشحن" : "Charging Statistics"} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? "إحصائيات الشحن" : "Charging Statistics"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isArabic ? "تتبع استهلاكك للطاقة" : "Track your energy consumption"}
            </p>
          </div>
        </div>

        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" data-testid="button-settings">
              <Settings className="w-4 h-4" />
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

              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "سعر الكهرباء" : "Electricity"}
                  </span>
                  <span className="font-semibold text-primary">
                    {electricityRate.toFixed(3)} {isArabic ? `${selectedCurrency.symbol}/كيلوواط` : `${currency}/kWh`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "سعر البنزين" : "Petrol"}
                  </span>
                  <span className="font-semibold text-orange-600">
                    {petrolPrice.toFixed(3)} {isArabic ? `${selectedCurrency.symbol}/لتر` : `${currency}/L`}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.customName || vehicle.vehicle?.name || (isArabic ? "سيارة غير معروفة" : "Unknown vehicle")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => navigateMonth("prev")}
            data-testid="button-prev-month"
          >
            {isArabic ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          <div className="min-w-[150px] text-center font-semibold">
            {format(selectedMonth, "MMMM yyyy", { locale: isArabic ? ar : undefined })}
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => navigateMonth("next")}
            disabled={isSameMonth(selectedMonth, new Date())}
            data-testid="button-next-month"
          >
            {isArabic ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        <Select value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "year")}>
          <SelectTrigger className="w-[140px]" data-testid="select-view-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{isArabic ? "شهري" : "Monthly"}</SelectItem>
            <SelectItem value="year">{isArabic ? "سنوي" : "Yearly"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {monthlyStats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card className="p-4" data-testid="stat-energy">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {monthlyStats.totalEnergy.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">kWh {isArabic ? "مستهلك" : "consumed"}</div>
            </Card>

            <Card className="p-4" data-testid="stat-sessions">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {monthlyStats.sessionCount}
              </div>
              <div className="text-xs text-muted-foreground">{isArabic ? "جلسة شحن" : "sessions"}</div>
            </Card>

            <Card className="p-4" data-testid="stat-duration">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {formatDuration(monthlyStats.totalDuration)}
              </div>
              <div className="text-xs text-muted-foreground">{isArabic ? "إجمالي الوقت" : "total time"}</div>
            </Card>

            <Card className="p-4" data-testid="stat-avg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {monthlyStats.avgEnergy.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">kWh/{isArabic ? "جلسة" : "session"}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/10" data-testid="stat-cost">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">{selectedCurrency.symbol}</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    ~{monthlyStats.estimatedCost.toFixed(2)} {isArabic ? selectedCurrency.symbol : currency}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isArabic ? "تكلفة الشحن التقديرية" : "estimated charging cost"}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {monthlyStats.topStation && (
            <Card className="p-4 mb-6" data-testid="stat-top-station">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "المحطة الأكثر زيارة" : "Most visited station"}
                  </div>
                  <div className="font-semibold">{getStationName(monthlyStats.topStation.id)}</div>
                </div>
                <Badge variant="secondary">
                  {monthlyStats.topStation.visits} {isArabic ? "زيارة" : "visits"}
                </Badge>
              </div>
            </Card>
          )}
        </>
      )}

      {yearlyData.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {isArabic ? "استهلاك الطاقة الشهري" : "Monthly Energy Consumption"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]" data-testid="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
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
                            <div className="text-sm text-emerald-600">
                              ⚡ {data.energy} kWh
                            </div>
                            <div className="text-sm text-muted-foreground">
                              🔌 {data.sessions} {isArabic ? "جلسة" : "sessions"}
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
          </CardContent>
        </Card>
      )}

      {(!sessions || sessions.length === 0) && (
        <Card className="p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {isArabic ? "لا توجد بيانات شحن بعد" : "No charging data yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {isArabic 
              ? "ابدأ جلسة شحن لتتبع استهلاكك"
              : "Start a charging session to track your consumption"
            }
          </p>
        </Card>
      )}

      <div className="text-center mt-6">
        <Link href="/history">
          <Button variant="outline">
            {isArabic ? "عرض سجل الشحن الكامل" : "View full charging history"} →
          </Button>
        </Link>
      </div>
    </div>
  );
}

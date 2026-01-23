import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useChargingSessions, useStations } from "@/hooks/use-stations";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, BarChart3, Zap, Clock, MapPin, TrendingUp, Fuel, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SEO } from "@/components/SEO";
import { Link } from "wouter";
import { startOfMonth, endOfMonth, format, subMonths, addMonths, isSameMonth } from "date-fns";
import { ar } from "date-fns/locale";

export default function ChargingStats() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { data: sessions, isLoading } = useChargingSessions();
  const { data: stations } = useStations();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  const isArabic = language === "ar";

  const getStationName = (stationId: number) => {
    const station = stations?.find(s => s.id === stationId);
    if (!station) return `Station #${stationId}`;
    return isArabic ? station.nameAr : station.name;
  };

  const monthlyStats = useMemo(() => {
    if (!sessions) return null;

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const monthSessions = sessions.filter(s => {
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

    const estimatedCost = totalEnergy * 0.1;
    const petrolSaved = totalEnergy * 0.7;

    return {
      totalEnergy,
      totalDuration,
      sessionCount,
      avgEnergy,
      topStation: topStation ? { id: Number(topStation[0]), visits: topStation[1] } : null,
      estimatedCost,
      petrolSaved,
      sessions: monthSessions,
    };
  }, [sessions, selectedMonth]);

  const yearlyData = useMemo(() => {
    if (!sessions) return [];

    const months = [];
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthSessions = sessions.filter(s => {
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
  }, [sessions, selectedMonth, isArabic]);

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
      
      <div className="flex items-center gap-3 mb-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/10" data-testid="stat-savings">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Fuel className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    ~{monthlyStats.petrolSaved.toFixed(0)} {isArabic ? "لتر" : "L"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isArabic ? "بنزين موفر تقريباً" : "petrol saved (approx)"}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/10" data-testid="stat-cost">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">ر.ع</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    ~{monthlyStats.estimatedCost.toFixed(2)} {isArabic ? "ر.ع" : "OMR"}
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

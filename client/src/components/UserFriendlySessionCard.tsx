import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, ShieldAlert, Zap, Clock, Gauge, Thermometer, 
  Activity, Calendar, MapPin, Trash2, Camera, CheckCircle2,
  AlertTriangle, BatteryCharging, Banknote, Wifi, WifiOff
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { ChargingSession } from "@shared/schema";

interface UserFriendlySessionCardProps {
  session: ChargingSession & {
    isAutoTracked?: boolean;
    gridVoltage?: number | null;
    gridFrequency?: number | null;
    maxCurrentA?: number | null;
    avgCurrentA?: number | null;
    maxPowerKw?: number | null;
    maxTempC?: number | null;
  };
  stationName: string;
  onDelete?: () => void;
  onScreenshot?: () => void;
  electricityRate: number;
  currencySymbol: string;
}

export function UserFriendlySessionCard({
  session,
  stationName,
  onDelete,
  onScreenshot,
  electricityRate,
  currencySymbol,
}: UserFriendlySessionCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const getSafetyStatus = () => {
    if (!session.maxTempC || session.maxTempC >= 100) return null;
    if (session.maxTempC < 45) {
      return {
        status: "safe",
        label: isArabic ? "الشحن آمن" : "Safe Charging",
        description: isArabic ? "درجة حرارة طبيعية" : "Normal temperature",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        icon: Shield,
      };
    } else if (session.maxTempC < 55) {
      return {
        status: "warm",
        label: isArabic ? "حرارة متوسطة" : "Moderate Heat",
        description: isArabic ? "ضمن الحدود الآمنة" : "Within safe limits",
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950/50",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: Thermometer,
      };
    } else {
      return {
        status: "hot",
        label: isArabic ? "انتبه: حرارة عالية" : "Warning: High Heat",
        description: isArabic ? "تم تسجيل حرارة مرتفعة" : "High temperature recorded",
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950/50",
        borderColor: "border-red-200 dark:border-red-800",
        icon: ShieldAlert,
      };
    }
  };

  const getChargingSpeedInfo = () => {
    const power = session.maxPowerKw;
    if (!power) return null;
    
    let speedLabel: string;
    let speedDescription: string;
    let speedColor: string;
    
    if (power <= 7) {
      speedLabel = isArabic ? "شحن بطيء" : "Slow Charging";
      speedDescription = isArabic ? "مناسب للشحن الليلي" : "Good for overnight";
      speedColor = "text-blue-600";
    } else if (power <= 22) {
      speedLabel = isArabic ? "شحن عادي" : "Normal Charging";
      speedDescription = isArabic ? "سرعة مثالية للاستخدام اليومي" : "Ideal for daily use";
      speedColor = "text-emerald-600";
    } else if (power <= 50) {
      speedLabel = isArabic ? "شحن سريع" : "Fast Charging";
      speedDescription = isArabic ? "شحن سريع للرحلات" : "Fast charging for trips";
      speedColor = "text-amber-600";
    } else {
      speedLabel = isArabic ? "شحن فائق السرعة" : "Ultra Fast";
      speedDescription = isArabic ? "أسرع تجربة شحن" : "Fastest charging experience";
      speedColor = "text-purple-600";
    }
    
    return { power, speedLabel, speedDescription, speedColor };
  };

  const getGridStatus = () => {
    if (!session.gridVoltage && !session.gridFrequency) return null;
    
    const voltage = session.gridVoltage || 0;
    const frequency = session.gridFrequency || 0;
    
    const voltageOk = voltage >= 220 && voltage <= 250;
    const frequencyOk = frequency >= 49.5 && frequency <= 50.5;
    
    if (voltageOk && frequencyOk) {
      return {
        status: "stable",
        label: isArabic ? "الشبكة مستقرة" : "Stable Grid",
        color: "text-emerald-600",
        icon: Wifi,
      };
    } else {
      return {
        status: "unstable",
        label: isArabic ? "تذبذب في الشبكة" : "Grid Fluctuation",
        color: "text-amber-600",
        icon: WifiOff,
      };
    }
  };


  const formatDurationFriendly = (minutes: number | null) => {
    if (!minutes) return isArabic ? "غير محدد" : "Unknown";
    
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.round(minutes % 60);
    
    if (isArabic) {
      if (hours === 0) return `${remainingMins} دقيقة`;
      if (remainingMins === 0) return `${hours} ساعة`;
      return `${hours} ساعة و ${remainingMins} دقيقة`;
    } else {
      if (hours === 0) return `${remainingMins} min`;
      if (remainingMins === 0) return `${hours}h`;
      return `${hours}h ${remainingMins}m`;
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return isArabic ? "اليوم" : "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return isArabic ? "أمس" : "Yesterday";
    }
    return format(date, "d MMM yyyy", { locale: isArabic ? ar : undefined });
  };

  const formatTime = (date: Date) => {
    return format(date, "h:mm a", { locale: isArabic ? ar : undefined });
  };

  const calculateCost = (energyKwh: number | null) => {
    if (!energyKwh || energyKwh <= 0) return null;
    return (energyKwh * electricityRate).toFixed(3);
  };

  const safetyStatus = getSafetyStatus();
  const speedInfo = getChargingSpeedInfo();
  const gridStatus = getGridStatus();
  const sessionDate = session.startTime ? new Date(session.startTime) : null;
  const hasAutoData = session.isAutoTracked && (session.gridVoltage || session.maxPowerKw || session.maxTempC);

  // Simplified view for active charging sessions
  if (session.isActive) {
    const liveDuration = session.startTime 
      ? Math.floor((Date.now() - new Date(session.startTime).getTime()) / 60000)
      : 0;
    
    return (
      <Card 
        className="overflow-hidden ring-2 ring-orange-500 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/30"
        data-testid={`session-card-${session.id}`}
      >
        {/* Live indicator header */}
        <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="font-bold">
              {isArabic ? "جارٍ الشحن الآن" : "Charging Now"}
            </span>
          </div>
          {session.isAutoTracked && (
            <Badge className="bg-white/20 text-white border-0 text-xs">
              {isArabic ? "تلقائي" : "Auto"}
            </Badge>
          )}
        </div>

        <div className="p-4">
          {/* Station name */}
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-sm">{stationName}</span>
            {session.isRentalSession && (
              <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 ms-auto">
                {isArabic ? "إيجار" : "Rental"}
              </Badge>
            )}
          </div>

          {/* Main live stats - Energy prominent */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 mb-2">
              <Zap className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-4xl font-bold text-emerald-600">
              {session.energyKwh ? session.energyKwh.toFixed(2) : "0.00"}
              <span className="text-lg font-normal ms-1">kWh</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isArabic ? "الطاقة المشحونة" : "Energy Charged"}
            </p>
          </div>

          {/* Duration and Power in row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-900">
              <Clock className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-bold text-blue-600">
                {formatDurationFriendly(liveDuration)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "المدة" : "Duration"}
              </p>
            </div>

            {speedInfo ? (
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-900">
                <Gauge className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xl font-bold text-purple-600">
                  {speedInfo.power.toFixed(1)}
                  <span className="text-sm font-normal ms-1">kW</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "القوة" : "Power"}
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-900">
                <Banknote className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xl font-bold text-amber-600">
                  {calculateCost(session.energyKwh) || "0.00"}
                </p>
                <p className="text-xs text-muted-foreground">{currencySymbol}</p>
              </div>
            )}
          </div>

          {/* Temperature warning only if high */}
          {safetyStatus && safetyStatus.status !== "safe" && (
            <div className={`mt-3 flex items-center gap-2 p-2 rounded-lg ${safetyStatus.bgColor} border ${safetyStatus.borderColor}`}>
              <safetyStatus.icon className={`w-4 h-4 ${safetyStatus.color}`} />
              <span className={`text-sm font-medium ${safetyStatus.color}`}>
                {safetyStatus.label}
              </span>
              {session.maxTempC && (
                <span className={`ms-auto font-bold ${safetyStatus.color}`}>
                  {session.maxTempC.toFixed(0)}°C
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Regular view for completed sessions
  return (
    <Card 
      className="overflow-hidden transition-all"
      data-testid={`session-card-${session.id}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-lg">{stationName}</h3>
            </div>
            {sessionDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(sessionDate)}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{formatTime(sessionDate)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {session.isAutoTracked && (
              <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300">
                {isArabic ? "تلقائي" : "Auto"}
              </Badge>
            )}
            {session.isRentalSession && (
              <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                {isArabic ? "إيجار" : "Rental"}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">
                {isArabic ? "الطاقة المشحونة" : "Energy Charged"}
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {session.energyKwh ? `${session.energyKwh.toFixed(1)}` : "-"}
              <span className="text-sm font-normal ms-1">kWh</span>
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">
                {isArabic ? "مدة الشحن" : "Duration"}
              </span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {formatDurationFriendly(session.durationMinutes)}
            </p>
          </div>
        </div>


        {hasAutoData && (
          <div className="space-y-2 mb-4">
            {safetyStatus && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${safetyStatus.bgColor} border ${safetyStatus.borderColor}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${safetyStatus.bgColor}`}>
                  <safetyStatus.icon className={`w-5 h-5 ${safetyStatus.color}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${safetyStatus.color}`}>{safetyStatus.label}</p>
                  <p className="text-xs text-muted-foreground">{safetyStatus.description}</p>
                </div>
                {session.maxTempC && (
                  <span className={`text-lg font-bold ${safetyStatus.color}`}>
                    {session.maxTempC.toFixed(0)}°C
                  </span>
                )}
              </div>
            )}

            {speedInfo && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Gauge className={`w-5 h-5 ${speedInfo.speedColor}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${speedInfo.speedColor}`}>{speedInfo.speedLabel}</p>
                  <p className="text-xs text-muted-foreground">{speedInfo.speedDescription}</p>
                </div>
                <span className={`text-lg font-bold ${speedInfo.speedColor}`}>
                  {speedInfo.power.toFixed(0)} kW
                </span>
              </div>
            )}

            {gridStatus && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border">
                <gridStatus.icon className={`w-4 h-4 ${gridStatus.color}`} />
                <span className={`text-sm font-medium ${gridStatus.color}`}>{gridStatus.label}</span>
                {session.gridVoltage && (
                  <span className="text-xs text-muted-foreground ms-auto">
                    {session.gridVoltage.toFixed(0)}V / {session.gridFrequency?.toFixed(1) || "-"}Hz
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-muted-foreground">
              {isArabic ? "التكلفة التقديرية" : "Est. Cost"}
            </span>
          </div>
          {session.isRentalSession && session.rentalTotalCost ? (
            <span className="text-lg font-bold text-orange-600">
              {Number(session.rentalTotalCost).toFixed(3)} {isArabic ? "ر.ع" : "OMR"}
            </span>
          ) : (
            <span className="text-lg font-bold text-amber-600">
              {calculateCost(session.energyKwh) || "-"} {currencySymbol}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            {session.screenshotPath && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onScreenshot?.();
                }}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50"
                data-testid={`screenshot-btn-${session.id}`}
              >
                <Camera className="w-4 h-4" />
                <span>{isArabic ? "صورة" : "Photo"}</span>
              </button>
            )}
          </div>
          
          {!session.isAutoTracked && onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1.5 text-sm text-destructive hover:underline px-2 py-1 rounded-lg hover:bg-destructive/10"
              data-testid={`delete-btn-${session.id}`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isArabic ? "حذف" : "Delete"}</span>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

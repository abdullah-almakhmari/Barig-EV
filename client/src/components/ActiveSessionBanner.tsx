import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, X, Clock, Battery, Gauge, Loader2, Camera, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/components/LanguageContext";
import { apiRequest, getCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChargingSession, Station } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { api } from "@shared/routes";
import { Badge } from "@/components/ui/badge";

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

interface ActiveSessionResponse {
  session: ChargingSession;
  station: Station | null;
}

export function ActiveSessionBanner() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [batteryEnd, setBatteryEnd] = useState("");
  const [batteryEndError, setBatteryEndError] = useState("");
  const [energyKwh, setEnergyKwh] = useState("");
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [electricityRate, setElectricityRate] = useState(DEFAULT_ELECTRICITY_RATE);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

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

  // Calculate estimated cost
  const estimatedCost = energyKwh ? (parseFloat(energyKwh) * electricityRate) : 0;
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const currencySymbol = language === "ar" ? selectedCurrency.symbol : selectedCurrency.code;

  const { data, isLoading } = useQuery<ActiveSessionResponse | null>({
    queryKey: ["/api/charging-sessions/my-active"],
    queryFn: async () => {
      const res = await fetch("/api/charging-sessions/my-active", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && !authLoading,
    refetchInterval: 30000,
  });

  const endSessionMutation = useMutation({
    mutationFn: async ({ sessionId, batteryEndPercent, energyKwh, screenshotPath }: { sessionId: number; batteryEndPercent?: number; energyKwh?: number; screenshotPath?: string }) => {
      return apiRequest("POST", `/api/charging-sessions/${sessionId}/end`, { batteryEndPercent, energyKwh, screenshotPath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions/my-active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions"] });
      if (data?.station) {
        queryClient.invalidateQueries({ queryKey: [api.stations.get.path, data.station.id] });
        queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
        queryClient.invalidateQueries({ queryKey: ['/api/stations', data.station.id, 'verification-summary'] });
      }
      toast({ title: t("charging.sessionEnded"), description: t("charging.sessionEndedDesc") });
      setShowEndDialog(false);
      setBatteryEnd("");
      setEnergyKwh("");
      setScreenshotPath(null);
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  // Cancel session mutation (deletes without recording) - MUST be here before any conditional returns
  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return apiRequest("DELETE", `/api/charging-sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions/my-active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions"] });
      if (data?.station) {
        queryClient.invalidateQueries({ queryKey: [api.stations.get.path, data.station.id] });
        queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
      }
      toast({ 
        title: language === "ar" ? "تم إلغاء الجلسة" : "Session cancelled",
        description: language === "ar" ? "لن يتم حفظ هذه الجلسة في السجل" : "This session will not be saved to history"
      });
      setShowEndDialog(false);
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!data?.session?.startTime) return;

    const updateElapsed = () => {
      const start = new Date(data.session.startTime!);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours > 0) {
        setElapsedTime(`${hours}h ${mins}m`);
      } else {
        setElapsedTime(`${mins}m`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [data?.session?.startTime]);

  if (authLoading || isLoading || !data || !data.session || dismissed) {
    return null;
  }

  const stationName = language === "ar" 
    ? data.station?.nameAr || data.station?.name 
    : data.station?.name || data.station?.nameAr;

  const handleViewSession = () => {
    if (data.station) {
      setLocation(`/station/${data.station.id}`);
    }
  };

  const handleEndSession = () => {
    setShowEndDialog(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !data?.session) return;

      const maxSizeMB = 8;
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({ 
          title: language === "ar" ? "الصورة كبيرة جداً" : "Image too large",
          description: language === "ar" 
            ? `الحد الأقصى ${maxSizeMB} ميجابايت` 
            : `Maximum size is ${maxSizeMB}MB`,
          variant: "destructive" 
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setIsUploading(true);
      setOcrConfidence(null);
      
      let csrfToken: string;
      try {
        csrfToken = await getCsrfToken();
      } catch (err) {
        console.error("Failed to get CSRF token:", err);
        throw new Error(language === "ar" ? "خطأ في الأمان" : "Security error");
      }
      
      const formData = new FormData();
      formData.append("file", file);

      let res: Response;
      try {
        res = await fetch("/api/uploads/upload", {
          method: "POST",
          headers: { 
            "x-csrf-token": csrfToken,
          },
          credentials: "include",
          body: formData,
        });
      } catch (networkError) {
        console.error("Network error during upload:", networkError);
        throw new Error(language === "ar" ? "خطأ في الشبكة" : "Network error");
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Upload failed:", res.status, errorData);
        throw new Error(errorData.errorAr || errorData.error || "Upload failed");
      }

      let uploadResult;
      try {
        uploadResult = await res.json();
      } catch (parseError) {
        console.error("Failed to parse upload response:", parseError);
        throw new Error(language === "ar" ? "خطأ في الخادم" : "Server error");
      }

      const { objectPath } = uploadResult;
      if (!objectPath) {
        throw new Error(language === "ar" ? "فشل حفظ الصورة" : "Failed to save image");
      }

      setScreenshotPath(objectPath);
      setIsUploading(false);
      
      setIsAnalyzing(true);
      try {
        const ocrRes = await fetch("/api/ocr/analyze-charging-screen", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify({ objectPath }),
        });

        if (ocrRes.ok) {
          const ocrResult = await ocrRes.json();
          if (ocrResult.energyKwh !== null && ocrResult.confidence === "high") {
            setEnergyKwh(ocrResult.energyKwh.toString());
            setOcrConfidence(ocrResult.confidence);
            toast({ 
              title: language === "ar" ? "تم قراءة الطاقة تلقائياً" : "Energy auto-detected",
              description: language === "ar" 
                ? `${ocrResult.energyKwh} كيلوواط/ساعة` 
                : `${ocrResult.energyKwh} kWh detected from photo`,
            });
          } else {
            toast({ 
              title: language === "ar" ? "الصورة محفوظة" : "Photo saved",
              description: language === "ar" 
                ? "يرجى إدخال قيمة الطاقة يدوياً" 
                : "Please enter the energy value manually",
            });
          }
        } else {
          toast({ 
            title: language === "ar" ? "الصورة محفوظة" : "Photo saved",
            description: language === "ar" 
              ? "يرجى إدخال قيمة الطاقة يدوياً" 
              : "Please enter the energy value manually",
          });
        }
      } catch (ocrError) {
        console.error("OCR error:", ocrError);
        toast({ 
          title: language === "ar" ? "الصورة محفوظة" : "Photo saved",
          description: language === "ar" 
            ? "يرجى إدخال قيمة الطاقة يدوياً" 
            : "Please enter the energy value manually",
        });
      }
      setIsAnalyzing(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ 
        title: language === "ar" ? "فشل رفع الصورة" : "Photo upload failed",
        description: error?.message || t("common.error"),
        variant: "destructive" 
      });
      setIsUploading(false);
      setIsAnalyzing(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const confirmEndSession = () => {
    if (!data?.session) return;
    endSessionMutation.mutate({
      sessionId: data.session.id,
      batteryEndPercent: batteryEnd ? Number(batteryEnd) : undefined,
      energyKwh: energyKwh ? Number(energyKwh) : undefined,
      screenshotPath: screenshotPath || undefined,
    });
  };

  return (
    <>
    <div className="bg-orange-500 text-white px-4 py-3" data-testid="active-session-banner">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium" data-testid="text-active-session-message">
              {t("charging.activeSessionBanner")} {stationName && `${t("charging.atStation")} ${stationName}`}
            </p>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Clock className="h-3 w-3" />
              <span data-testid="text-session-duration">{elapsedTime}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewSession}
            className="bg-white text-orange-600 hover:bg-orange-50"
            data-testid="button-view-session"
          >
            {t("charging.resume")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            data-testid="button-end-session"
          >
            {t("charging.endNow")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="text-white hover:bg-white/20"
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("charging.endSession")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="batteryEnd" className="flex items-center gap-2">
              <Battery className="w-4 h-4" />
              {t("charging.batteryEnd")}
            </Label>
            <div className="relative">
              <Input
                id="batteryEnd"
                type="number"
                min={data?.session?.batteryStartPercent ?? 0}
                max="100"
                placeholder={language === "ar" ? "أدخل نسبة البطارية" : "Enter battery %"}
                value={batteryEnd}
                onChange={(e) => {
                  const val = e.target.value;
                  setBatteryEnd(val);
                  if (val && data?.session?.batteryStartPercent !== null && data?.session?.batteryStartPercent !== undefined) {
                    if (Number(val) < data.session.batteryStartPercent) {
                      setBatteryEndError(language === "ar" ? "يجب أن تكون أكبر من نسبة البداية" : "Must be greater than start percentage");
                    } else {
                      setBatteryEndError("");
                    }
                  } else {
                    setBatteryEndError("");
                  }
                }}
                className={`pr-8 ${batteryEndError ? "border-red-500" : ""}`}
                data-testid="input-battery-end-banner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            {batteryEndError && <p className="text-xs text-red-500">{batteryEndError}</p>}
            {data?.session?.batteryStartPercent !== null && data?.session?.batteryStartPercent !== undefined && (
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? `نسبة البداية: ${data.session.batteryStartPercent}%` : `Started at: ${data.session.batteryStartPercent}%`}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="energyKwh" className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              {t("charging.energyCharged")}
              {ocrConfidence && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    ocrConfidence === "high" ? "bg-emerald-100 text-emerald-700" :
                    ocrConfidence === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {language === "ar" ? "قراءة آلية" : "AI detected"}
                </Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                id="energyKwh"
                type="number"
                min="0"
                step="0.1"
                placeholder={language === "ar" ? "أدخل كمية الطاقة" : "Enter energy"}
                value={energyKwh}
                onChange={(e) => {
                  setEnergyKwh(e.target.value);
                  setOcrConfidence(null); // Clear confidence when user edits
                }}
                className="pr-12"
                data-testid="input-energy-kwh-banner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">kWh</span>
            </div>
            {estimatedCost > 0 && (
              <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  {language === "ar" ? "التكلفة التقديرية:" : "Estimated cost:"}{" "}
                  <span className="font-semibold">{estimatedCost.toFixed(3)} {currencySymbol}</span>
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {t("charging.screenshot")}
            </Label>
            <p className="text-sm text-muted-foreground">{t("charging.screenshotHint")}</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isAnalyzing}
              className="w-full"
              data-testid="button-upload-screenshot"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === "ar" ? "جاري الرفع..." : "Uploading..."}
                </>
              ) : isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <Sparkles className="mr-1 h-4 w-4" />
                  {language === "ar" ? "جاري القراءة الآلية..." : "Reading with AI..."}
                </>
              ) : screenshotPath ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-emerald-500" />
                  {t("charging.screenshotUploaded")}
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  {t("charging.uploadScreenshot")}
                </>
              )}
            </Button>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {!(data?.session as any)?.isAutoTracked && (
            <Button 
              variant="destructive"
              onClick={() => {
                if (data?.session) {
                  cancelSessionMutation.mutate(data.session.id);
                }
              }}
              disabled={cancelSessionMutation.isPending || endSessionMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-cancel-session-banner"
            >
              {cancelSessionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <X className="mr-2 h-4 w-4" />
              {language === "ar" ? "إلغاء (بدون حفظ)" : "Cancel (don't save)"}
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="flex-1 sm:flex-none">
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={confirmEndSession}
              disabled={endSessionMutation.isPending || isUploading || isAnalyzing || !!batteryEndError}
              className="bg-emerald-500 hover:bg-emerald-600 flex-1 sm:flex-none"
              data-testid="button-confirm-end-session-banner"
            >
              {endSessionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("charging.endSession")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

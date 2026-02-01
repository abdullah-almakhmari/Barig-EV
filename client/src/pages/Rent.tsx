import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, MapPin, Clock, X, CheckCircle2, BatteryCharging, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import type { RentalRequest, ChargingSession } from "@shared/schema";

interface StationInfo {
  station: {
    id: number;
    name: string;
    nameAr?: string;
    city: string;
    cityAr?: string;
    address: string;
  };
  rental: {
    pricePerKwh: number;
    currency: string;
    description?: string;
    descriptionAr?: string;
  };
}

export default function Rent() {
  const [, params] = useRoute("/rent/:stationId");
  const stationId = params?.stationId ? parseInt(params.stationId) : null;
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stationInfo, isLoading: stationLoading, error: stationError } = useQuery<StationInfo>({
    queryKey: ["/api/rental-requests/station-info", stationId],
    enabled: !!stationId,
  });

  const { data: rentalData, isLoading: rentalLoading, refetch: refetchRental } = useQuery<{
    request: RentalRequest;
    session: ChargingSession | null;
  }>({
    queryKey: ["/api/rental-requests/my-request", stationId],
    enabled: !!stationId && isAuthenticated,
    refetchInterval: 5000,
  });

  const startRentalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/rental-requests", { stationId });
    },
    onSuccess: () => {
      refetchRental();
      toast({
        title: isRtl ? "جاري الانتظار..." : "Waiting...",
        description: isRtl
          ? "ابدأ الشحن خلال 15 دقيقة لربط الجلسة تلقائياً"
          : "Start charging within 15 minutes to auto-link your session",
      });
    },
    onError: (error: any) => {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: error.message || (isRtl ? "فشل بدء طلب التأجير" : "Failed to start rental request"),
        variant: "destructive",
      });
    },
  });

  const cancelRentalMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest("DELETE", `/api/rental-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rental-requests/my-request", stationId] });
      toast({
        title: isRtl ? "تم الإلغاء" : "Cancelled",
        description: isRtl ? "تم إلغاء طلب التأجير" : "Rental request cancelled",
      });
    },
  });

  useEffect(() => {
    if (rentalData?.request?.status === "ACTIVE" && rentalData.session) {
      setLocation("/history");
    }
  }, [rentalData, setLocation]);

  if (authLoading || stationLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-8" dir={isRtl ? "rtl" : "ltr"}>
        <SEO title={isRtl ? "تأجير الشاحن" : "Rent Charger"} />
        <Card className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            {isRtl ? "سجل الدخول للمتابعة" : "Login to continue"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {isRtl ? "تحتاج إلى تسجيل الدخول لاستخدام نظام التأجير" : "You need to login to use the rental system"}
          </p>
          <Button onClick={() => setLocation("/login")} data-testid="button-login-redirect">
            {isRtl ? "تسجيل الدخول" : "Login"}
          </Button>
        </Card>
      </div>
    );
  }

  if (stationError || !stationInfo) {
    return (
      <div className="max-w-md mx-auto py-8" dir={isRtl ? "rtl" : "ltr"}>
        <SEO title={isRtl ? "غير متاح" : "Unavailable"} />
        <Card className="p-6 text-center">
          <X className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">
            {isRtl ? "الشاحن غير متاح للتأجير" : "Charger not available for rent"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {isRtl ? "قد يكون الشاحن غير موجود أو غير متاح حالياً" : "The charger may not exist or is currently unavailable"}
          </p>
          <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-go-home">
            {isRtl ? "الرجوع للخريطة" : "Back to map"}
          </Button>
        </Card>
      </div>
    );
  }

  const { station, rental } = stationInfo;
  const stationName = isRtl && station.nameAr ? station.nameAr : station.name;
  const cityName = isRtl && station.cityAr ? station.cityAr : station.city;
  const rentalDescription = isRtl && rental.descriptionAr ? rental.descriptionAr : rental.description;

  const hasActiveRequest = rentalData?.request?.status && ["PENDING", "ACTIVE"].includes(rentalData.request.status);
  const isPending = rentalData?.request?.status === "PENDING";
  const isActive = rentalData?.request?.status === "ACTIVE";

  const getTimeRemaining = () => {
    if (!rentalData?.request?.expiresAt) return "";
    const expiresAt = new Date(rentalData.request.expiresAt);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    if (diffMs <= 0) return isRtl ? "منتهي" : "Expired";
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-md mx-auto py-4" dir={isRtl ? "rtl" : "ltr"}>
      <SEO title={isRtl ? `تأجير - ${stationName}` : `Rent - ${stationName}`} />

      <Card className="overflow-hidden">
        <div className="bg-primary/10 p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{stationName}</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{cityName} - {station.address}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
            <span className="text-muted-foreground">
              {isRtl ? "سعر الكيلوواط/ساعة" : "Price per kWh"}
            </span>
            <Badge variant="outline" className="font-mono text-lg px-3 py-1">
              {rental.pricePerKwh} {rental.currency}
            </Badge>
          </div>

          {rentalDescription && (
            <p className="text-sm text-muted-foreground">{rentalDescription}</p>
          )}

          {isPending && (
            <Card className="border-orange-500/30 bg-orange-500/10 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {isRtl ? "جاري الانتظار للشحن..." : "Waiting for charging..."}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {isRtl
                  ? "قم بتوصيل سيارتك وابدأ الشحن. سيتم ربط الجلسة تلقائياً."
                  : "Connect your car and start charging. The session will be linked automatically."}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>{isRtl ? "الوقت المتبقي:" : "Time remaining:"}</span>
                <span className="font-mono font-medium">{getTimeRemaining()}</span>
              </div>
            </Card>
          )}

          {isActive && rentalData?.session && (
            <Card className="border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center gap-3 mb-3">
                <BatteryCharging className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600 dark:text-green-400">
                  {isRtl ? "جاري الشحن!" : "Charging in progress!"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isRtl
                  ? "تم بدء جلسة الشحن. يمكنك متابعة التفاصيل في سجل الشحن."
                  : "Charging session started. You can view details in the charging history."}
              </p>
              <Button
                className="w-full mt-3"
                onClick={() => setLocation("/history")}
                data-testid="button-view-session"
              >
                {isRtl ? "عرض الجلسة" : "View Session"}
              </Button>
            </Card>
          )}

          {!hasActiveRequest && (
            <>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    {isRtl
                      ? "بعد الضغط، قم بتوصيل سيارتك خلال 15 دقيقة"
                      : "After pressing, connect your car within 15 minutes"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    {isRtl
                      ? "سيتم تتبع الجلسة وحساب التكلفة تلقائياً"
                      : "Session will be tracked and cost calculated automatically"}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => startRentalMutation.mutate()}
                disabled={startRentalMutation.isPending}
                data-testid="button-start-rental"
              >
                {startRentalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRtl ? "بدء التأجير" : "Start Rental"}
              </Button>
            </>
          )}

          {isPending && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => cancelRentalMutation.mutate(rentalData!.request.id)}
              disabled={cancelRentalMutation.isPending}
              data-testid="button-cancel-rental"
            >
              {cancelRentalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <X className="h-4 w-4" />
              {isRtl ? "إلغاء الطلب" : "Cancel Request"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

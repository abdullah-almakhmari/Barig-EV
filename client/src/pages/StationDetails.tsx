import { useState } from "react";
import { useRoute } from "wouter";
import { useStation, useStationReports } from "@/hooks/use-stations";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import type { StationWithConnector, ChargerRental, StationCharger } from "@shared/schema";
import { Loader2, Navigation, Clock, ShieldCheck, MapPin, BatteryCharging, Home, Phone, MessageCircle, AlertTriangle, CheckCircle2, XCircle, Users, ShieldAlert, ThumbsUp, ThumbsDown, Zap, Shield, Trash2, Cpu, Edit3, ChevronDown, Plug, DollarSign, Info, CircleDot, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReportDialog } from "@/components/ReportDialog";
import { ChargingSessionDialog } from "@/components/ChargingSessionDialog";
import { TrustedUserBadge } from "@/components/TrustedUserBadge";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/SEO";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { VerificationSummary } from "@shared/schema";

function formatTimeAgo(isoString: string, t: (key: string, options?: any) => string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) {
    return t("verify.justNow");
  } else if (diffMinutes < 60) {
    return t("verify.minutesAgo", { count: diffMinutes });
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    return t("verify.hoursAgo", { count: diffHours });
  }
}

type PrimaryStatus = 'WORKING' | 'BUSY' | 'NOT_WORKING' | 'NOT_RECENTLY_VERIFIED' | 'CHARGING';

const RECENCY_THRESHOLD_MS = 30 * 60 * 1000;

function isRecentlyVerified(lastVerifiedAt: string | null | undefined): boolean {
  if (!lastVerifiedAt) return false;
  const lastTime = new Date(lastVerifiedAt).getTime();
  const now = Date.now();
  return (now - lastTime) < RECENCY_THRESHOLD_MS;
}

function getPrimaryStatus(
  verificationSummary: VerificationSummary | undefined, 
  stationStatus?: string,
  availableChargers?: number,
  totalChargers?: number,
  hasActiveChargingSession?: boolean
): PrimaryStatus {
  if (hasActiveChargingSession) {
    return 'CHARGING';
  }
  
  if (stationStatus === 'OFFLINE') {
    return 'NOT_WORKING';
  }
  
  if (typeof availableChargers === 'number' && availableChargers === 0 && (totalChargers ?? 0) > 0) {
    return 'BUSY';
  }
  
  if (stationStatus === 'OPERATIONAL') {
    if (verificationSummary && 
        verificationSummary.totalVotes > 0 && 
        isRecentlyVerified(verificationSummary.lastVerifiedAt) &&
        verificationSummary.leadingVote === 'BUSY') {
      return 'BUSY';
    }
    return 'WORKING';
  }
  
  if (!verificationSummary || verificationSummary.totalVotes === 0) {
    return 'NOT_RECENTLY_VERIFIED';
  }
  
  if (!isRecentlyVerified(verificationSummary.lastVerifiedAt)) {
    return 'NOT_RECENTLY_VERIFIED';
  }
  
  if (verificationSummary.leadingVote === 'BUSY') return 'BUSY';
  
  return 'NOT_RECENTLY_VERIFIED';
}

function getStatusConfig(status: PrimaryStatus, isAr: boolean) {
  switch (status) {
    case 'WORKING':
      return {
        label: isAr ? "يعمل" : "Working",
        sublabel: isAr ? "جاهز للاستخدام" : "Ready to use",
        bgColor: 'bg-emerald-500',
        lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
        textColor: 'text-white',
        accentColor: 'text-emerald-600',
        icon: CheckCircle2,
        isRecommended: true,
      };
    case 'BUSY':
      return {
        label: isAr ? "مشغول" : "Busy",
        sublabel: isAr ? "جميع الشواحن قيد الاستخدام" : "All chargers in use",
        bgColor: 'bg-orange-500',
        lightBg: 'bg-orange-50 dark:bg-orange-950/30',
        textColor: 'text-white',
        accentColor: 'text-orange-600',
        icon: Clock,
        isRecommended: false,
      };
    case 'NOT_WORKING':
      return {
        label: isAr ? "لا يعمل" : "Not Working",
        sublabel: isAr ? "المحطة معطلة حالياً" : "Station is currently down",
        bgColor: 'bg-red-500',
        lightBg: 'bg-red-50 dark:bg-red-950/30',
        textColor: 'text-white',
        accentColor: 'text-red-600',
        icon: XCircle,
        isRecommended: false,
      };
    case 'CHARGING':
      return {
        label: isAr ? "جاري الشحن" : "Charging",
        sublabel: isAr ? "جلسة شحن نشطة" : "Active charging session",
        bgColor: 'bg-orange-500',
        lightBg: 'bg-orange-50 dark:bg-orange-950/30',
        textColor: 'text-white',
        accentColor: 'text-orange-600',
        icon: Zap,
        isRecommended: false,
      };
    case 'NOT_RECENTLY_VERIFIED':
    default:
      return {
        label: isAr ? "غير مؤكد" : "Unverified",
        sublabel: isAr ? "لا توجد تأكيدات حديثة" : "No recent confirmations",
        bgColor: 'bg-muted',
        lightBg: 'bg-muted/50',
        textColor: 'text-muted-foreground',
        accentColor: 'text-muted-foreground',
        icon: ShieldAlert,
        isRecommended: false,
      };
  }
}

export default function StationDetails() {
  const [, params] = useRoute("/station/:id");
  const id = params ? parseInt(params.id) : 0;
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  
  const { data: stationData, isLoading } = useStation(id);
  const station = stationData as StationWithConnector | undefined;
  const { data: reports } = useStationReports(id);
  
  const { data: verificationSummary } = useQuery<VerificationSummary>({
    queryKey: ['/api/stations', id, 'verification-summary'],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${id}/verification-summary`);
      if (!res.ok) throw new Error('Failed to fetch verification summary');
      return res.json();
    },
    enabled: id > 0,
  });

  interface VerificationHistoryItem {
    id: number;
    vote: string;
    createdAt: string;
    userName: string;
    userTrustLevel: string;
  }

  const { data: verificationHistory } = useQuery<VerificationHistoryItem[]>({
    queryKey: ['/api/stations', id, 'verification-history'],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${id}/verification-history`);
      if (!res.ok) throw new Error('Failed to fetch verification history');
      return res.json();
    },
    enabled: id > 0,
  });

  const { data: rentalInfo } = useQuery<ChargerRental | null>({
    queryKey: ['/api/charger-rentals/station', id],
    queryFn: async () => {
      const res = await fetch(`/api/charger-rentals/station/${id}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch rental info');
      }
      return res.json();
    },
    enabled: id > 0 && station?.stationType === 'HOME',
  });

  const { data: stationChargers } = useQuery<StationCharger[]>({
    queryKey: ['/api/stations', id, 'chargers'],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${id}/chargers`);
      if (!res.ok) throw new Error('Failed to fetch chargers');
      return res.json();
    },
    enabled: id > 0,
  });
  
  const submitVerification = useMutation({
    mutationFn: async (vote: 'WORKING' | 'NOT_WORKING') => {
      return apiRequest('POST', `/api/stations/${id}/verify`, { vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations', id, 'verification-summary'] });
      toast({
        title: t("verify.submitted"),
        description: t("verify.submittedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        variant: "destructive",
      });
    },
  });

  const updateStationStatusMutation = useMutation({
    mutationFn: async (status: 'OPERATIONAL' | 'OFFLINE') => {
      return apiRequest('PATCH', `/api/admin/stations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stations.get.path, id] });
      queryClient.invalidateQueries({ queryKey: ['/api/stations', id, 'verification-summary'] });
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
      toast({
        title: language === "ar" ? "تم تحديث حالة المحطة" : "Station status updated",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        variant: "destructive",
      });
    },
  });

  const isAdmin = user?.role === "admin";
  const [, navigate] = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteStationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/stations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
      toast({
        title: t("station.deleteSuccess"),
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: t("station.deleteError"),
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!station) return <div className="p-20 text-center">{t("common.error")}</div>;

  const isAr = language === "ar";
  const name = isAr ? station.nameAr : station.name;
  const city = isAr ? station.cityAr : station.city;
  const description = isAr ? (station.descriptionAr || station.description) : (station.description || station.descriptionAr);
  
  const primaryStatus = getPrimaryStatus(
    verificationSummary, 
    station.status ?? undefined,
    station.availableChargers ?? undefined,
    station.chargerCount ?? undefined,
    (station as any).hasActiveChargingSession ?? false
  );
  const statusConfig = getStatusConfig(primaryStatus, isAr);
  const StatusIcon = statusConfig.icon;

  const availableCount = Math.max(0, station.availableChargers ?? 0);
  const totalCount = station.chargerCount ?? 0;
  const occupiedCount = Math.max(0, totalCount - availableCount);

  const getAvailabilityStatus = () => {
    if (availableCount === 0 && totalCount > 0) {
      return { label: isAr ? "جميع الشواحن مشغولة" : "All chargers occupied", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" };
    }
    if (availableCount === totalCount) {
      return { label: isAr ? "جميع الشواحن متاحة" : "All chargers available", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" };
    }
    return { label: isAr ? `${availableCount} من ${totalCount} متاح` : `${availableCount} of ${totalCount} available`, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" };
  };

  const getPricingStatus = () => {
    if (rentalInfo?.isAvailableForRent && rentalInfo?.pricePerKwh > 0) {
      return { 
        label: isAr ? "إيجار منزلي" : "Home Rental", 
        sublabel: isAr ? `${rentalInfo.pricePerKwh} ر.ع./ك.و.س` : `${rentalInfo.pricePerKwh} OMR/kWh`,
        color: "text-purple-600", 
        bg: "bg-purple-50 dark:bg-purple-950/30" 
      };
    }
    if (station.isFree) {
      return { label: isAr ? "مجاني" : "Free", sublabel: isAr ? "شحن بدون رسوم" : "No charging fees", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" };
    }
    return { 
      label: isAr ? "مدفوع" : "Paid", 
      sublabel: station.priceText || (isAr ? "تحقق من الأسعار" : "Check pricing"), 
      color: "text-amber-600", 
      bg: "bg-amber-50 dark:bg-amber-950/30" 
    };
  };

  const availabilityStatus = getAvailabilityStatus();
  const pricingStatus = getPricingStatus();

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      <SEO title={name} description={`${name} - ${city}`} />
      
      {/* Compact Status Header */}
      <Card className={`overflow-hidden ${statusConfig.lightBg} border-0`} data-testid="status-hero">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate" data-testid="text-station-name">{name}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{city}</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="uppercase text-xs tracking-wide">{station.operator}</span>
              </div>
            </div>
            
            <div className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl ${statusConfig.bgColor}`}>
              <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
              <div className="text-end">
                <div className={`text-sm font-bold ${statusConfig.textColor}`} data-testid="text-primary-status">
                  {statusConfig.label}
                </div>
              </div>
            </div>
          </div>
          
          {/* Recommendation Badge */}
          <div className="flex items-center justify-center mt-3">
            <div 
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.isRecommended ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}
              data-testid="badge-recommendation"
            >
              {statusConfig.isRecommended ? (
                <ThumbsUp className="w-4 h-4" />
              ) : (
                <ThumbsDown className="w-4 h-4" />
              )}
              <span>{statusConfig.isRecommended ? (isAr ? "موصى به الآن" : "Recommended now") : (isAr ? "غير موصى به" : "Not recommended")}</span>
            </div>
          </div>
          
          {/* Trusted Confirmation */}
          {verificationSummary && verificationSummary.isStrongVerified && (
            <p className="mt-2 text-xs text-center text-muted-foreground flex items-center justify-center gap-1" data-testid="text-trusted-confirmation">
              <ShieldCheck className="w-3 h-3" />
              {t("status.confirmedByTrusted")}
            </p>
          )}
          
          {/* Station Type Badge - Centered */}
          <div className="flex justify-center mt-3">
            {station.stationType === "HOME" ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-1" data-testid="badge-home-charger">
                <Home className="w-4 h-4 me-1.5" />
                {isAr ? "شاحن منزلي" : "Home Charger"}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-1" data-testid="badge-public-charger">
                <Building2 className="w-4 h-4 me-1.5" />
                {isAr ? "شاحن عام" : "Public Charger"}
              </Badge>
            )}
          </div>
          
          {/* Other Badges Row */}
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {station.hasActiveConnector && (
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs" data-testid="badge-auto-tracked">
                <Cpu className="w-3 h-3 me-1" />
                {isAr ? "تتبع آلي" : "Auto-tracked"}
              </Badge>
            )}
            {station.trustLevel === "LOW" && (
              <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs" data-testid="badge-low-trust">
                <AlertTriangle className="w-3 h-3 me-1" />
                {t("station.underReview")}
              </Badge>
            )}
            {verificationSummary?.lastVerifiedAt && (
              <Badge variant="outline" className="text-xs" data-testid="badge-last-verified">
                <Clock className="w-3 h-3 me-1" />
                {formatTimeAgo(verificationSummary.lastVerifiedAt, t)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <Button 
            className="flex-1 shadow-md" 
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, '_blank')}
            data-testid="button-navigate"
          >
            <Navigation className="w-4 h-4 me-2" />
            {t("station.navigate")}
          </Button>
          {station.stationType === "HOME" && station.contactWhatsapp && (
            <Button 
              variant="outline"
              className="border-green-500 text-green-600"
              onClick={() => window.open(`https://wa.me/${station.contactWhatsapp?.replace(/[^0-9]/g, '')}`, '_blank')}
              data-testid="button-contact-whatsapp"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
          {station.stationType === "HOME" && station.contactPhone && (
            <Button 
              variant="outline"
              onClick={() => window.open(`tel:${station.contactPhone}`, '_blank')}
              data-testid="button-contact-phone"
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* Admin Controls */}
      {isAdmin && (
        <Card className="p-4 border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{isAr ? "تحكم الأدمن" : "Admin Controls"}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-500 text-white"
              onClick={() => updateStationStatusMutation.mutate('OPERATIONAL')}
              disabled={updateStationStatusMutation.isPending || station.status === 'OPERATIONAL'}
              data-testid="button-admin-set-working"
            >
              <CheckCircle2 className="w-4 h-4 me-1" />
              {isAr ? "يعمل" : "Working"}
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-500 text-white"
              onClick={() => updateStationStatusMutation.mutate('OFFLINE')}
              disabled={updateStationStatusMutation.isPending || station.status === 'OFFLINE'}
              data-testid="button-admin-set-not-working"
            >
              <XCircle className="w-4 h-4 me-1" />
              {isAr ? "لا يعمل" : "Not Working"}
            </Button>
          </div>
        </Card>
      )}

      {/* Owner Actions */}
      {user && station.addedByUserId === user.id && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {t("station.youAdded")}
              </Badge>
              <TrustScoreBadge stationId={id} />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/station/${id}/edit`)}
                data-testid="button-edit-station"
              >
                <Edit3 className="w-4 h-4 me-1" />
                {isAr ? "تعديل" : "Edit"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="button-delete-station"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Station Info Cards - Professional Status Display */}
      <div className="space-y-3">
        {/* Availability Status */}
        <Card className={`p-4 ${availabilityStatus.bg} border-0`} data-testid="card-availability">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${availabilityStatus.color === 'text-emerald-600' ? 'bg-emerald-500' : availabilityStatus.color === 'text-orange-600' ? 'bg-orange-500' : 'bg-blue-500'} flex items-center justify-center`}>
                <BatteryCharging className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "توفر الشواحن" : "Charger Availability"}</p>
                <p className={`font-bold ${availabilityStatus.color}`} data-testid="text-availability-status">{availabilityStatus.label}</p>
              </div>
            </div>
            <div className="text-end">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{availableCount}</div>
                  <div className="text-[10px] text-muted-foreground">{isAr ? "متاح" : "Free"}</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{occupiedCount}</div>
                  <div className="text-[10px] text-muted-foreground">{isAr ? "مشغول" : "Used"}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <ChargingSessionDialog 
              stationId={id}
              availableChargers={availableCount}
              totalChargers={totalCount || 1}
              stationStatus={station.status ?? undefined}
              hasActiveConnector={station.hasActiveConnector ?? false}
            />
          </div>
        </Card>

        {/* Pricing Status */}
        <Card className={`p-4 ${pricingStatus.bg} border-0`} data-testid="card-pricing">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${pricingStatus.color === 'text-emerald-600' ? 'bg-emerald-500' : pricingStatus.color === 'text-purple-600' ? 'bg-purple-500' : 'bg-amber-500'} flex items-center justify-center`}>
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "التسعير" : "Pricing"}</p>
                <p className={`font-bold ${pricingStatus.color}`} data-testid="text-pricing-status">{pricingStatus.label}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{pricingStatus.sublabel}</p>
          </div>
        </Card>

        {/* Power Info - Shows all charger types */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-amber-50/50 dark:from-blue-950/30 dark:to-amber-950/20 border-0" data-testid="card-power">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium">{isAr ? "الشواحن المتوفرة" : "Available Chargers"}</p>
          </div>
          
          {stationChargers && stationChargers.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {stationChargers.map((charger) => (
                <div 
                  key={charger.id} 
                  className={`p-3 rounded-lg ${
                    charger.chargerType === 'DC' 
                      ? 'bg-amber-100 dark:bg-amber-900/40' 
                      : 'bg-blue-100 dark:bg-blue-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        charger.chargerType === 'DC' 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {charger.chargerType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">×{charger.count}</span>
                  </div>
                  <p className={`font-bold text-lg ${
                    charger.chargerType === 'DC' 
                      ? 'text-amber-700 dark:text-amber-400' 
                      : 'text-blue-700 dark:text-blue-400'
                  }`}>
                    {charger.powerKw} kW
                  </p>
                  {charger.connectorType && (
                    <p className="text-xs text-muted-foreground">{charger.connectorType}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <div>
                <Badge variant="secondary" className="text-xs bg-blue-500 text-white mb-1">
                  {station.chargerType}
                </Badge>
                <p className="font-bold text-lg text-blue-700 dark:text-blue-400" data-testid="text-power-output">
                  {station.powerKw} kW
                </p>
              </div>
              <span className="text-sm text-muted-foreground">×{station.chargerCount || 1}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Community Verification */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{isAr ? "تأكيد المجتمع" : "Community Verification"}</span>
            {verificationSummary && verificationSummary.totalVotes > 0 && (
              <Badge variant="outline" className="text-xs">{verificationSummary.totalVotes}</Badge>
            )}
          </div>
          {isAuthenticated && <TrustedUserBadge trustLevel={user?.userTrustLevel} />}
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">{t("verify.helpOthers")}</p>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isAuthenticated) {
                toast({ title: t("verify.loginRequired"), variant: "destructive" });
                return;
              }
              submitVerification.mutate('WORKING');
            }}
            disabled={submitVerification.isPending}
            className="border-emerald-500 text-emerald-600"
            data-testid="button-verify-working"
          >
            <CheckCircle2 className="w-4 h-4 me-1" />
            {t("verify.confirmWorking")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isAuthenticated) {
                toast({ title: t("verify.loginRequired"), variant: "destructive" });
                return;
              }
              submitVerification.mutate('NOT_WORKING');
            }}
            disabled={submitVerification.isPending}
            className="border-red-500 text-red-600"
            data-testid="button-verify-not-working"
          >
            <XCircle className="w-4 h-4 me-1" />
            {t("verify.confirmNotWorking")}
          </Button>
        </div>
      </Card>


      {/* Station Details - Expandable */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-4 flex items-center justify-between hover-elevate transition-colors"
          data-testid="button-toggle-details"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{isAr ? "تفاصيل المحطة" : "Station Details"}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>
        
        {showDetails && (
          <div className="px-4 pb-4 space-y-3 border-t">
            {description && (
              <div className="pt-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            )}
            
          </div>
        )}
      </Card>

      {/* Verification History */}
      {verificationHistory && verificationHistory.length > 0 && (
        <Card className="overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between hover-elevate transition-colors"
            data-testid="button-toggle-history"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{isAr ? "سجل التأكيدات" : "Verification History"}</span>
              <Badge variant="outline" className="text-xs">{verificationHistory.length}</Badge>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
          
          {showHistory && (
            <div className="px-4 pb-4 space-y-2 border-t max-h-[250px] overflow-y-auto">
              {verificationHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mt-2 first:mt-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      item.vote === 'WORKING' ? 'bg-emerald-500' : 
                      item.vote === 'NOT_WORKING' ? 'bg-red-500' : 'bg-orange-500'
                    }`}>
                      {item.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.userName}</span>
                        {item.userTrustLevel === 'TRUSTED' && (
                          <Shield className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(item.createdAt, t)}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${
                    item.vote === 'WORKING' ? 'bg-emerald-500' : 
                    item.vote === 'NOT_WORKING' ? 'bg-red-500' : 'bg-orange-500'
                  } text-white border-0 text-xs`}>
                    {item.vote === 'WORKING' ? (isAr ? "يعمل" : "Working") : 
                     item.vote === 'NOT_WORKING' ? (isAr ? "لا يعمل" : "Not Working") : (isAr ? "مشغول" : "Busy")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recent Reports */}
      {reports && reports.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-muted-foreground">{isAr ? "البلاغات الأخيرة" : "Recent Reports"}</span>
            <Badge variant="outline" className="text-xs">{reports.length}</Badge>
          </div>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {reports.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <CircleDot className={`w-3 h-3 shrink-0 ${report.status === 'WORKING' ? 'text-emerald-500' : 'text-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {report.status === 'WORKING' ? t("station.report.working") : t("station.report.broken")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(report.createdAt!), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Report Problem - Bottom of Page */}
      <ReportDialog 
        stationId={id} 
        trigger={
          <Button 
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md border-0 h-12 text-base font-medium rounded-xl"
            data-testid="button-report-problem"
          >
            <AlertTriangle className="w-5 h-5 me-2" />
            {isAr ? "الإبلاغ عن مشكلة" : "Report a Problem"}
          </Button>
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("station.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("station.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStationMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteStationMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteStationMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("station.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

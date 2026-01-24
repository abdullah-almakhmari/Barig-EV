import { useState } from "react";
import { useRoute } from "wouter";
import { useStation, useStationReports } from "@/hooks/use-stations";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { Loader2, Navigation, Clock, ShieldCheck, MapPin, BatteryCharging, Home, Phone, MessageCircle, AlertTriangle, CheckCircle2, XCircle, Users, ShieldAlert, ThumbsUp, ThumbsDown, Zap, Shield, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type PrimaryStatus = 'WORKING' | 'BUSY' | 'NOT_WORKING' | 'NOT_RECENTLY_VERIFIED';

const RECENCY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes - same as verification window

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
  totalChargers?: number
): PrimaryStatus {
  // If station is marked as OFFLINE by admin/system, always show NOT_WORKING
  if (stationStatus === 'OFFLINE') {
    return 'NOT_WORKING';
  }
  
  // If no available chargers (all in use), show BUSY - matches map marker logic
  if (typeof availableChargers === 'number' && availableChargers === 0 && (totalChargers ?? 0) > 0) {
    return 'BUSY';
  }
  
  // If station is OPERATIONAL, show WORKING
  if (stationStatus === 'OPERATIONAL') {
    // Check if there are recent verifications indicating BUSY
    if (verificationSummary && 
        verificationSummary.totalVotes > 0 && 
        isRecentlyVerified(verificationSummary.lastVerifiedAt) &&
        verificationSummary.leadingVote === 'BUSY') {
      return 'BUSY';
    }
    return 'WORKING';
  }
  
  // For other statuses (MAINTENANCE, etc), check verifications
  if (!verificationSummary || verificationSummary.totalVotes === 0) {
    return 'NOT_RECENTLY_VERIFIED';
  }
  
  if (!isRecentlyVerified(verificationSummary.lastVerifiedAt)) {
    return 'NOT_RECENTLY_VERIFIED';
  }
  
  // Only show leadingVote for display purposes (BUSY indicator)
  if (verificationSummary.leadingVote === 'BUSY') return 'BUSY';
  
  return 'NOT_RECENTLY_VERIFIED';
}

function getStatusConfig(status: PrimaryStatus, t: (key: string) => string) {
  switch (status) {
    case 'WORKING':
      return {
        label: t("status.working"),
        recommendation: t("status.recommendedNow"),
        actionLabel: t("status.goHere"),
        bgColor: 'bg-emerald-500',
        textColor: 'text-white',
        borderColor: 'border-emerald-600',
        icon: CheckCircle2,
        isRecommended: true,
      };
    case 'BUSY':
      return {
        label: t("status.busy"),
        recommendation: t("status.notRecommended"),
        actionLabel: t("status.tryAnother"),
        bgColor: 'bg-orange-500',
        textColor: 'text-white',
        borderColor: 'border-orange-600',
        icon: Clock,
        isRecommended: false,
      };
    case 'NOT_WORKING':
      return {
        label: t("status.notWorking"),
        recommendation: t("status.notRecommended"),
        actionLabel: t("status.tryAnother"),
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        borderColor: 'border-red-600',
        icon: XCircle,
        isRecommended: false,
      };
    case 'NOT_RECENTLY_VERIFIED':
    default:
      return {
        label: t("status.notRecentlyVerified"),
        recommendation: t("status.noRecentData"),
        actionLabel: null,
        bgColor: 'bg-muted',
        textColor: 'text-muted-foreground',
        borderColor: 'border-border',
        icon: ShieldAlert,
        isRecommended: false,
      };
  }
}

export default function StationDetails() {
  const [, params] = useRoute("/station/:id");
  const id = params ? parseInt(params.id) : 0;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const { data: station, isLoading } = useStation(id);
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

  // Delete station mutation - only for station owner
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
  
  const primaryStatus = getPrimaryStatus(
    verificationSummary, 
    station.status ?? undefined,
    station.availableChargers ?? undefined,
    station.chargerCount ?? undefined
  );
  const statusConfig = getStatusConfig(primaryStatus, t);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20">
      <SEO title={name} description={`${name} - ${city}`} />
      
      {/* PRIMARY STATUS HERO - The 5-Second Decision Section */}
      <div 
        className={`rounded-3xl p-6 sm:p-8 ${statusConfig.bgColor} ${statusConfig.textColor} shadow-xl relative overflow-hidden`}
        data-testid="status-hero"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-full -mr-12 -mt-12 pointer-events-none" />
        
        <div className="relative z-10 text-center">
          {/* Primary Status - BIGGEST text */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <StatusIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight" data-testid="text-primary-status">
              {statusConfig.label}
            </h1>
          </div>
          
          {/* Time Context */}
          <div className="mb-4 opacity-90" data-testid="text-time-context">
            {verificationSummary?.lastVerifiedAt ? (
              <p className="text-lg flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {isRecentlyVerified(verificationSummary.lastVerifiedAt) 
                  ? t("status.verifiedAgo", { time: formatTimeAgo(verificationSummary.lastVerifiedAt, t) })
                  : t("status.lastConfirmedAgo", { time: formatTimeAgo(verificationSummary.lastVerifiedAt, t) })
                }
              </p>
            ) : (
              <p className="text-lg">{t("status.noRecentData")}</p>
            )}
          </div>
          
          {/* Recommendation Label */}
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.isRecommended ? 'bg-white/20' : 'bg-black/20'}`}
            data-testid="badge-recommendation"
          >
            {statusConfig.isRecommended ? (
              <ThumbsUp className="w-5 h-5" />
            ) : (
              <ThumbsDown className="w-5 h-5" />
            )}
            <span className="font-semibold text-lg">{statusConfig.recommendation}</span>
          </div>
          
          {/* Trusted Users Confirmation - subtle */}
          {verificationSummary && verificationSummary.isStrongVerified && (
            <p className="mt-3 text-sm opacity-80 flex items-center justify-center gap-1" data-testid="text-trusted-confirmation">
              <ShieldCheck className="w-4 h-4" />
              {t("status.confirmedByTrusted")}
            </p>
          )}
        </div>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="bg-card rounded-2xl p-4 border shadow-sm border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">
              {language === "ar" ? "تحكم الأدمن" : "Admin Controls"}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => updateStationStatusMutation.mutate('OPERATIONAL')}
              disabled={updateStationStatusMutation.isPending || station.status === 'OPERATIONAL'}
              data-testid="button-admin-set-working"
            >
              <CheckCircle2 className="w-4 h-4" />
              {language === "ar" ? "تعيين كـ يعمل" : "Set as Working"}
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
              onClick={() => updateStationStatusMutation.mutate('OFFLINE')}
              disabled={updateStationStatusMutation.isPending || station.status === 'OFFLINE'}
              data-testid="button-admin-set-not-working"
            >
              <XCircle className="w-4 h-4" />
              {language === "ar" ? "تعيين كـ لا يعمل" : "Set as Not Working"}
            </Button>
          </div>
        </div>
      )}

      {/* Station Name & Quick Actions - Secondary but visible */}
      <div className="bg-card rounded-2xl p-5 border shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-2xl font-bold text-foreground">{name}</h2>
              {station.trustLevel === "LOW" && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs" data-testid="badge-low-trust">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("station.underReview")}
                </Badge>
              )}
              {station.stationType === "HOME" && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                  <Home className="w-3 h-3 mr-1" />
                  {t("station.type.home")}
                </Badge>
              )}
            </div>
            <div className="flex items-center text-muted-foreground gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{city}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="uppercase tracking-wide">{station.operator}</span>
            </div>
            
            {/* Trust Score Badge - Feature Flagged */}
            <div className="mt-2">
              <TrustScoreBadge stationId={id} />
            </div>
            
            {/* Show if user is the owner */}
            {user && station.addedByUserId === user.id && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {t("station.youAdded")}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                  data-testid="button-delete-station"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t("station.delete")}
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              size="lg"
              className="shadow-lg shadow-primary/20" 
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, '_blank')}
              data-testid="button-navigate"
            >
              <Navigation className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
              {t("station.navigate")}
            </Button>
            {station.stationType === "HOME" && station.contactWhatsapp && (
              <Button 
                variant="outline"
                size="lg"
                className="border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => window.open(`https://wa.me/${station.contactWhatsapp?.replace(/[^0-9]/g, '')}`, '_blank')}
                data-testid="button-contact-whatsapp"
              >
                <MessageCircle className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
                WhatsApp
              </Button>
            )}
            {station.stationType === "HOME" && station.contactPhone && (
              <Button 
                variant="outline"
                size="lg"
                onClick={() => window.open(`tel:${station.contactPhone}`, '_blank')}
                data-testid="button-contact-phone"
              >
                <Phone className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
                {t("station.contact")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Charger Availability - Compact */}
      <div className="bg-card rounded-2xl p-5 border shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-primary" />
              <span className="font-semibold">{t("charging.title")}</span>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{station.availableChargers ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t("charging.available")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{(station.chargerCount ?? 0) - (station.availableChargers ?? 0)}</div>
                <div className="text-xs text-muted-foreground">{t("charging.occupied")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{station.chargerCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t("charging.total")}</div>
              </div>
            </div>
          </div>
          <ChargingSessionDialog 
            stationId={id}
            availableChargers={station.availableChargers ?? 0}
            totalChargers={station.chargerCount ?? 1}
            stationStatus={station.status ?? undefined}
          />
        </div>
      </div>

      {/* Community Verification - Quick Actions */}
      <div className="bg-card rounded-2xl p-5 border shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">{t("verify.title")}</span>
            {verificationSummary && verificationSummary.totalVotes > 0 && (
              <span className="text-sm text-muted-foreground">
                ({verificationSummary.totalVotes} {t("verify.verifiedBy", { count: verificationSummary.totalVotes }).split(' ').slice(-2).join(' ')})
              </span>
            )}
          </div>
          {isAuthenticated && <TrustedUserBadge trustLevel={user?.userTrustLevel} />}
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">{t("verify.helpOthers")}</p>
        
        <div className="flex flex-wrap gap-2">
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
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            data-testid="button-verify-working"
          >
            <CheckCircle2 className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
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
            className="border-red-500 text-red-600 hover:bg-red-50"
            data-testid="button-verify-not-working"
          >
            <XCircle className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
            {t("verify.confirmNotWorking")}
          </Button>
          <ReportDialog stationId={id} />
        </div>
      </div>

      {/* Station Details - De-emphasized, collapsible feel */}
      <details className="group bg-card rounded-2xl border shadow-sm">
        <summary className="cursor-pointer p-5 flex items-center justify-between hover:bg-muted/50 rounded-2xl transition-colors">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-semibold">{t("station.stationDetails")}</span>
          </div>
          <span className="text-muted-foreground text-sm group-open:hidden">{t("station.tapToExpand")}</span>
        </summary>
        <div className="px-5 pb-5 space-y-3 border-t">
          <div className="flex justify-between py-2 border-b border-dashed">
            <span className="text-muted-foreground">{t("station.powerOutput")}</span>
            <span className="font-mono font-medium">{station.powerKw} kW</span>
          </div>
          <div className="flex justify-between py-2 border-b border-dashed">
            <span className="text-muted-foreground">{t("station.connectorType")}</span>
            <div className="flex gap-1 flex-wrap justify-end">
              {station.chargerType.split(',').map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type.trim()}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-between py-2 border-b border-dashed">
            <span className="text-muted-foreground">{t("station.pricing")}</span>
            <span className="font-medium text-emerald-600">
              {station.isFree ? t("station.price.free") : station.priceText || t("station.price.paid")}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">{t("station.statusLabel")}</span>
            <Badge variant={station.status === "OPERATIONAL" ? "default" : "destructive"}>
              {t(`station.status.${station.status?.toLowerCase()}`)}
            </Badge>
          </div>
        </div>
      </details>

      {/* Community Verification History */}
      {verificationHistory && verificationHistory.length > 0 && (
        <details className="group bg-card rounded-2xl border shadow-sm" open>
          <summary className="cursor-pointer p-5 flex items-center justify-between hover:bg-muted/50 rounded-2xl transition-colors">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold">{t("verify.communityHistory")}</span>
              <Badge variant="outline" className="text-xs">{verificationHistory.length}</Badge>
            </div>
            <span className="text-muted-foreground text-sm group-open:hidden">{t("station.tapToExpand")}</span>
          </summary>
          <div className="px-5 pb-5 space-y-2 border-t max-h-[250px] overflow-y-auto">
            {verificationHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
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
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">
                          <Shield className="w-3 h-3 me-1" />
                          {t("trust.trustedUser")}
                        </Badge>
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
                } text-white border-0`}>
                  {item.vote === 'WORKING' ? t("status.working") : 
                   item.vote === 'NOT_WORKING' ? t("status.notWorking") : t("status.busy")}
                </Badge>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Recent Reports - De-emphasized */}
      {reports && reports.length > 0 && (
        <details className="group bg-card rounded-2xl border shadow-sm">
          <summary className="cursor-pointer p-5 flex items-center justify-between hover:bg-muted/50 rounded-2xl transition-colors">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">{t("station.recentReports")}</span>
              <Badge variant="outline" className="text-xs">{reports.length}</Badge>
            </div>
            <span className="text-muted-foreground text-sm group-open:hidden">{t("station.tapToExpand")}</span>
          </summary>
          <div className="px-5 pb-5 space-y-2 border-t max-h-[200px] overflow-y-auto">
            {reports.map((report) => (
              <div key={report.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${report.status === 'WORKING' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium text-sm">
                    {report.status === 'WORKING' ? t("station.report.working") : t("station.report.broken")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(report.createdAt!), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

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

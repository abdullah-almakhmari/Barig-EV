import { useRoute } from "wouter";
import { useStation, useStationReports } from "@/hooks/use-stations";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { Loader2, Navigation, Clock, ShieldCheck, MapPin, BatteryCharging, Home, Phone, MessageCircle, AlertTriangle, CheckCircle2, XCircle, Users, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportDialog } from "@/components/ReportDialog";
import { ChargingSessionDialog } from "@/components/ChargingSessionDialog";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/SEO";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { VerificationSummary } from "@shared/schema";

// Helper function to format time ago
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

export default function StationDetails() {
  const [, params] = useRoute("/station/:id");
  const id = params ? parseInt(params.id) : 0;
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const { data: station, isLoading } = useStation(id);
  const { data: reports } = useStationReports(id);
  
  // Verification summary
  const { data: verificationSummary } = useQuery<VerificationSummary>({
    queryKey: ['/api/stations', id, 'verification-summary'],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${id}/verification-summary`);
      if (!res.ok) throw new Error('Failed to fetch verification summary');
      return res.json();
    },
    enabled: id > 0,
  });
  
  // Submit verification mutation
  const submitVerification = useMutation({
    mutationFn: async (vote: 'WORKING' | 'NOT_WORKING' | 'BUSY') => {
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

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!station) return <div className="p-20 text-center">{t("common.error")}</div>;

  const isAr = language === "ar";
  const name = isAr ? station.nameAr : station.name;
  const city = isAr ? station.cityAr : station.city;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <SEO title={name} description={`${name} - ${city}`} />
      {/* Header Card */}
      <div className="bg-card rounded-3xl p-6 sm:p-8 border shadow-lg shadow-black/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Badge variant={station.status === "OPERATIONAL" ? "default" : "destructive"} className="px-3 py-1">
                {t(`station.status.${station.status?.toLowerCase()}`)}
              </Badge>
              {/* Prominent Community Verification Badge */}
              {verificationSummary && verificationSummary.isVerified && verificationSummary.leadingVote === 'WORKING' ? (
                <Badge 
                  variant="secondary" 
                  className={`px-3 py-1 ${verificationSummary.isStrongVerified ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                  data-testid="badge-community-verified"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                  {t("verify.verifiedByCommunity", { count: verificationSummary.totalVotes })}
                </Badge>
              ) : verificationSummary && verificationSummary.isVerified && verificationSummary.leadingVote === 'NOT_WORKING' ? (
                <Badge 
                  variant="destructive" 
                  className="px-3 py-1"
                  data-testid="badge-community-not-working"
                >
                  <XCircle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                  {t("verify.notWorking")}
                </Badge>
              ) : verificationSummary && verificationSummary.isVerified && verificationSummary.leadingVote === 'BUSY' ? (
                <Badge 
                  variant="secondary" 
                  className="px-3 py-1 bg-orange-100 text-orange-700 border-orange-200"
                  data-testid="badge-community-busy"
                >
                  <Clock className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                  {t("verify.busy")}
                </Badge>
              ) : (
                <Badge 
                  variant="outline" 
                  className="px-3 py-1 text-muted-foreground border-dashed"
                  data-testid="badge-not-verified"
                >
                  <ShieldAlert className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                  {t("verify.underReview")}
                </Badge>
              )}
              {station.trustLevel === "LOW" && (
                <Badge variant="destructive" className="px-3 py-1 bg-yellow-100 text-yellow-700 border-yellow-200" data-testid="badge-low-trust">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("station.underReview")}
                </Badge>
              )}
              {station.stationType === "HOME" && (
                <Badge variant="secondary" className="px-3 py-1 bg-orange-100 text-orange-700 border-orange-200">
                  <Home className="w-3 h-3 mr-1" />
                  {t("station.type.home")}
                </Badge>
              )}
              <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                {station.operator}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-foreground tracking-tight">
              {name}
            </h1>
            
            <div className="flex items-center text-muted-foreground gap-2">
              <MapPin className="w-4 h-4" />
              <p className="text-lg">{city}</p>
            </div>
            
            <div className="mt-4 flex gap-2">
              {station.chargerType.split(',').map(type => (
                <Badge key={type} variant="secondary" className="text-xs border-primary/20 bg-primary/5 text-primary">
                  {type.trim()}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">
                {station.powerKw} kW
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[160px]">
            <Button 
              className="w-full h-12 text-lg shadow-lg shadow-primary/20" 
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, '_blank')}
            >
              <Navigation className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
              Navigate
            </Button>
            {station.stationType === "HOME" && station.contactWhatsapp && (
              <Button 
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
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
                onClick={() => window.open(`tel:${station.contactPhone}`, '_blank')}
                data-testid="button-contact-phone"
              >
                <Phone className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
                {t("station.contact")}
              </Button>
            )}
            <ReportDialog stationId={id} />
          </div>
        </div>
      </div>

      {/* Charger Availability Card */}
      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <BatteryCharging className="w-5 h-5 text-primary" />
          {t("charging.title")}
        </h3>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-emerald-500/10 rounded-xl">
            <div className="text-3xl font-bold text-emerald-600">{station.availableChargers ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("charging.available")}</div>
          </div>
          <div className="text-center p-4 bg-orange-500/10 rounded-xl">
            <div className="text-3xl font-bold text-orange-600">{(station.chargerCount ?? 0) - (station.availableChargers ?? 0)}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("charging.occupied")}</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-xl">
            <div className="text-3xl font-bold text-foreground">{station.chargerCount ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("charging.total")}</div>
          </div>
        </div>

        <ChargingSessionDialog 
          stationId={id}
          availableChargers={station.availableChargers ?? 0}
          totalChargers={station.chargerCount ?? 1}
        />
      </div>

      {/* Community Verification Card */}
      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t("verify.title")}
        </h3>
        
        {/* Verification Summary with Time Context */}
        <div className="mb-4 space-y-2">
          {verificationSummary && verificationSummary.totalVotes > 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {verificationSummary.isStrongVerified ? (
                  <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {t("verify.strongVerified", { count: verificationSummary.totalVotes })}
                  </Badge>
                ) : verificationSummary.isVerified ? (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {t("verify.verifiedBy", { count: verificationSummary.totalVotes })}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">
                    {t("verify.verifiedBy", { count: verificationSummary.totalVotes })}
                  </span>
                )}
                {verificationSummary.leadingVote && (
                  <Badge 
                    variant="outline"
                    className={
                      verificationSummary.leadingVote === 'WORKING' 
                        ? 'border-emerald-500 text-emerald-600' 
                        : verificationSummary.leadingVote === 'NOT_WORKING'
                        ? 'border-red-500 text-red-600'
                        : 'border-orange-500 text-orange-600'
                    }
                  >
                    {t(`verify.${verificationSummary.leadingVote === 'WORKING' ? 'working' : verificationSummary.leadingVote === 'NOT_WORKING' ? 'notWorking' : 'busy'}`)}
                  </Badge>
                )}
              </div>
              {/* Time context */}
              {verificationSummary.lastVerifiedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t("verify.lastConfirmed", { time: formatTimeAgo(verificationSummary.lastVerifiedAt, t) })}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("verify.notRecentlyVerified")}</p>
          )}
        </div>
        
        {/* Micro-copy explanation */}
        <p className="text-xs text-muted-foreground mb-4">{t("verify.helpOthers")}</p>
        
        {/* Verification Buttons */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isAuthenticated) {
                toast({ title: t("verify.loginRequired"), variant: "destructive" });
                return;
              }
              submitVerification.mutate('BUSY');
            }}
            disabled={submitVerification.isPending}
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
            data-testid="button-verify-busy"
          >
            <Clock className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
            {t("verify.confirmBusy")}
          </Button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 border shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Station Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-muted-foreground">Power Output</span>
              <span className="font-mono font-medium">{station.powerKw} kW</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-muted-foreground">Connector Type</span>
              <span className="font-medium">{station.chargerType}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-muted-foreground">Pricing</span>
              <span className="font-medium text-emerald-600">
                {station.isFree ? t("station.price.free") : station.priceText || t("station.price.paid")}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Recent Reports
          </h3>
          <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {reports && reports.length > 0 ? (
              reports.map((report) => (
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
              ))
            ) : (
              <p className="text-muted-foreground text-sm italic">No reports yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRoute } from "wouter";
import { useStation, useStationReports } from "@/hooks/use-stations";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { Loader2, Navigation, Clock, ShieldCheck, MapPin, BatteryCharging, Home, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportDialog } from "@/components/ReportDialog";
import { ChargingSessionDialog } from "@/components/ChargingSessionDialog";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/SEO";

export default function StationDetails() {
  const [, params] = useRoute("/station/:id");
  const id = params ? parseInt(params.id) : 0;
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const { data: station, isLoading } = useStation(id);
  const { data: reports } = useStationReports(id);

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

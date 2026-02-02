import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Station, ChargerRental } from "@shared/schema";
import { useLanguage } from "@/components/LanguageContext";
import { Loader2, Navigation, RefreshCw, AlertCircle, Building2, Home, LayoutGrid, Zap, MapPin, CheckCircle, AlertTriangle, BatteryCharging, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";

type StationTypeFilter = "ALL" | "PUBLIC" | "HOME";

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDistance(distance: number, isArabic: boolean): string {
  if (distance < 1) {
    const meters = Math.round(distance * 1000);
    return isArabic ? `${meters} متر` : `${meters} m`;
  }
  return isArabic ? `${distance.toFixed(1)} كم` : `${distance.toFixed(1)} km`;
}

function getChargerTypes(chargerType: string | null | undefined): string[] {
  if (!chargerType) return ['AC'];
  const type = chargerType.toUpperCase();
  if (type === 'BOTH' || type.includes('AC') && type.includes('DC')) {
    return ['AC', 'DC'];
  }
  if (type.includes('DC')) return ['DC'];
  return ['AC'];
}

interface VerificationSummary {
  working: number;
  notWorking: number;
  busy: number;
  totalVotes: number;
  leadingVote: string | null;
  isVerified: boolean;
  isStrongVerified: boolean;
  lastVerifiedAt: string | null;
}

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
    if (diffHours < 24) {
      return t("verify.hoursAgo", { count: diffHours });
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return t("verify.daysAgo", { count: diffDays });
    }
  }
}

interface StationWithDistance extends Station {
  distance: number;
}

function NearbyStationCard({ 
  station, 
  isRentalStation,
  t,
  isArabic 
}: { 
  station: StationWithDistance; 
  isRentalStation: boolean;
  t: (key: string, options?: any) => string;
  isArabic: boolean;
}) {
  const name = isArabic ? station.nameAr : station.name;
  const city = isArabic ? station.cityAr : station.city;

  const { data: verificationSummary } = useQuery<VerificationSummary>({
    queryKey: ['/api/stations', station.id, 'verification-summary'],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${station.id}/verification-summary`);
      if (!res.ok) throw new Error('Failed to fetch verification summary');
      return res.json();
    },
    staleTime: 60000,
  });

  const chargerTypes = getChargerTypes(station.chargerType);

  const availableChargers = Math.max(0, station.availableChargers ?? 0);
  const isBusy = station.status === "BUSY" || 
    (station.status !== "OFFLINE" && availableChargers === 0);

  const getAvailabilityStatus = () => {
    if (station.status === "OFFLINE") {
      return {
        color: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
        dotColor: "bg-red-500",
        icon: AlertTriangle,
        label: t("station.status.offline")
      };
    }
    if (isBusy) {
      return {
        color: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800",
        dotColor: "bg-orange-500",
        icon: BatteryCharging,
        label: t("station.status.inuse")
      };
    }
    return {
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
      dotColor: "bg-emerald-500",
      icon: CheckCircle,
      label: t("station.status.available")
    };
  };

  const availabilityStatus = getAvailabilityStatus();
  const StatusIcon = availabilityStatus.icon;

  return (
    <Link href={`/station/${station.id}`}>
      <Card 
        className="p-0 overflow-hidden hover-elevate cursor-pointer border transition-all duration-200"
        data-testid={`nearby-station-${station.id}`}
      >
        <div className="flex">
          {/* Distance Indicator - Left Side */}
          <div className={`flex flex-col items-center justify-center w-20 shrink-0 border-e py-4 px-2 ${
            isBusy ? "bg-orange-500/5" : "bg-primary/5"
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              isBusy ? "bg-orange-500/10" : "bg-primary/10"
            }`}>
              <MapPin className={`w-5 h-5 ${isBusy ? "text-orange-500" : "text-primary"}`} />
            </div>
            <span className={`text-lg font-bold ${isBusy ? "text-orange-500" : "text-primary"}`}>
              {station.distance < 1 
                ? Math.round(station.distance * 1000) 
                : station.distance.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {station.distance < 1 
                ? (isArabic ? "متر" : "m") 
                : (isArabic ? "كم" : "km")}
            </span>
          </div>

          {/* Station Info - Right Side */}
          <div className="flex-1 p-4">
            {/* Status and Power Row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${availabilityStatus.color}`}>
                  <StatusIcon className="w-3 h-3 me-1" />
                  {availabilityStatus.label}
                </Badge>
                {isRentalStation ? (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500">
                    {t("station.price.paid")}
                  </Badge>
                ) : station.isFree ? (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500">
                    {t("station.price.free")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500">
                    {t("station.price.paid")}
                  </Badge>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>

            {/* Station Name */}
            <h3 className="font-semibold text-base leading-tight mb-1 line-clamp-1">
              {name || (isArabic ? "محطة بدون اسم" : "Unnamed Station")}
            </h3>

            {/* Location */}
            <p className="text-sm text-muted-foreground flex items-center mb-2">
              <Navigation className="w-3 h-3 me-1 shrink-0" />
              <span className="line-clamp-1">{city || station.address || "-"}</span>
            </p>

            {/* Bottom Row - Charger Info */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Charger Types */}
              {chargerTypes.map((type) => (
                <div 
                  key={type}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                    type === 'DC' 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}
                  data-testid={`charger-type-${station.id}-${type}`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{type}</span>
                </div>
              ))}
              
              {/* Power */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs" data-testid={`charger-power-${station.id}`}>
                <span className="font-mono font-medium">{station.powerKw || "?"} kW</span>
              </div>
              
              {/* Available Chargers */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`charger-count-${station.id}`}>
                <BatteryCharging className="w-3.5 h-3.5" />
                <span>{availableChargers}/{station.chargerCount ?? 1}</span>
              </div>

              {verificationSummary?.lastVerifiedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(verificationSummary.lastVerifiedAt, t)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function NearbyStations() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [stationTypeFilter, setStationTypeFilter] = useState<StationTypeFilter>("ALL");

  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });

  const { data: chargerRentals = [] } = useQuery<ChargerRental[]>({
    queryKey: ["/api/charger-rentals"],
  });

  const rentalStationIds = useMemo(() => {
    return new Set(
      chargerRentals
        .filter(r => r.isAvailableForRent && r.pricePerKwh > 0)
        .map(r => r.stationId)
    );
  }, [chargerRentals]);

  const getUserLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError(t("nearby.notSupported"));
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(t("nearby.permissionDenied"));
        } else {
          setLocationError(t("common.error"));
        }
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const sortedStations = userLocation
    ? [...stations]
        .filter(station => {
          if (stationTypeFilter === "ALL") return true;
          return station.stationType === stationTypeFilter;
        })
        .map(station => ({
          ...station,
          distance: calculateDistance(userLocation.lat, userLocation.lng, station.lat, station.lng)
        }))
        .sort((a, b) => a.distance - b.distance)
    : [];

  const filterOptions: { value: StationTypeFilter; labelAr: string; labelEn: string; icon: typeof LayoutGrid }[] = [
    { value: "ALL", labelAr: "الكل", labelEn: "All", icon: LayoutGrid },
    { value: "PUBLIC", labelAr: "عامة", labelEn: "Public", icon: Building2 },
    { value: "HOME", labelAr: "منزلية", labelEn: "Home", icon: Home },
  ];

  if (isGettingLocation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("nearby.detecting")}</p>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-center text-muted-foreground max-w-md">{locationError}</p>
        <Button onClick={getUserLocation} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {t("nearby.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <SEO title={t("nearby.title")} />
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Navigation className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("nearby.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {sortedStations.length} {isArabic ? "محطة" : "stations"}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const isActive = stationTypeFilter === option.value;
          return (
            <Button
              key={option.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setStationTypeFilter(option.value)}
              className={`flex items-center gap-2 whitespace-nowrap ${isActive ? "" : "bg-background"}`}
              data-testid={`button-filter-${option.value.toLowerCase()}`}
            >
              <Icon className="w-4 h-4" />
              {isArabic ? option.labelAr : option.labelEn}
            </Button>
          );
        })}
      </div>

      {/* Stations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sortedStations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? "لا توجد محطات متاحة" : "No stations available"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedStations.map((station) => (
            <NearbyStationCard
              key={station.id}
              station={station}
              isRentalStation={rentalStationIds.has(station.id)}
              t={t}
              isArabic={isArabic}
            />
          ))}
        </div>
      )}
    </div>
  );
}

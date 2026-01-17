import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Station } from "@shared/schema";
import { StationCard } from "@/components/StationCard";
import { useLanguage } from "@/components/LanguageContext";
import { Loader2, MapPin, Navigation, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";

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

export default function NearbyStations() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);

  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });

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
    ? [...stations].map(station => ({
        ...station,
        distance: calculateDistance(userLocation.lat, userLocation.lng, station.lat, station.lng)
      })).sort((a, b) => a.distance - b.distance)
    : [];

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
    <div className="container mx-auto px-4 py-6">
      <SEO title={t("nearby.title")} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("nearby.title")}</h1>
        </div>
        <Button variant="outline" size="icon" onClick={getUserLocation} data-testid="button-refresh-location">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStations.map((station) => (
            <Link key={station.id} href={`/station/${station.id}`}>
              <div className="relative cursor-pointer">
                <StationCard station={station} variant="compact" />
                <div className="absolute top-4 end-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                  {station.distance.toFixed(1)} {t("nearby.distance")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

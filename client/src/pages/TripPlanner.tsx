import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Station } from "@shared/schema";
import { useLanguage } from "@/components/LanguageContext";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  Loader2, 
  Building2, 
  Home, 
  Zap,
  Route,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Locate
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";

import "leaflet/dist/leaflet.css";

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface RouteInfo {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

type StationPriority = 'best' | 'good' | 'busy' | 'offline';

function getStationPriority(status: string, availableChargers: number, chargerCount: number): StationPriority {
  if (status === "OFFLINE") return 'offline';
  const available = Math.max(0, availableChargers);
  const total = chargerCount || 1;
  if (available === 0) return 'busy';
  if (available === total) return 'best';
  return 'good';
}

const createStationIcon = (station: Station) => {
  const priority = getStationPriority(station.status, station.availableChargers ?? 0, station.chargerCount ?? 1);
  
  let color: string;
  const size = 14;
  
  switch (priority) {
    case 'best':
      color = '#10b981';
      break;
    case 'good':
      color = '#22c55e';
      break;
    case 'busy':
      color = '#f97316';
      break;
    case 'offline':
    default:
      color = '#ef4444';
      break;
  }
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createLocationIcon = (isOrigin: boolean) => {
  const color = isOrigin ? "#10B981" : "#EF4444";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function MapController({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  
  return null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function LocationSearch({
  value,
  onChange,
  onSelect,
  onUseCurrentLocation,
  placeholder,
  icon: Icon,
  iconColor,
  showCurrentLocation = false,
  isArabic = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: LocationResult) => void;
  onUseCurrentLocation?: () => void;
  placeholder: string;
  icon: typeof MapPin;
  iconColor: string;
  showCurrentLocation?: boolean;
  isArabic?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(value, 400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchLocation = async () => {
      if (debouncedValue.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);
      try {
        const response = await fetch(`/api/location-search?q=${encodeURIComponent(debouncedValue)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Location search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchLocation();
  }, [debouncedValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon 
            className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5" 
            style={{ color: iconColor }}
          />
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value.length >= 2) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            className="ps-10 pe-10 h-12 text-base rounded-xl bg-muted/30 border-muted"
            onFocus={() => {
              if (value.length >= 2 || results.length > 0) {
                setIsOpen(true);
              }
            }}
            data-testid="input-location-search"
          />
          {isLoading && (
            <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
          )}
          {value && !isLoading && (
            <button
              onClick={() => {
                onChange("");
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              data-testid="button-clear-location"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {showCurrentLocation && onUseCurrentLocation && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl"
            onClick={onUseCurrentLocation}
            data-testid="button-use-current-location"
          >
            <Locate className="w-5 h-5" />
          </Button>
        )}
      </div>
      
      {isOpen && (
        <Card className="absolute z-[9999] w-full mt-2 max-h-64 overflow-y-auto shadow-lg">
          {isLoading && (
            <div className="px-4 py-3 text-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin inline me-2" />
              {isArabic ? "جاري البحث..." : "Searching..."}
            </div>
          )}
          {!isLoading && results.length === 0 && value.length >= 2 && (
            <div className="px-4 py-3 text-center text-muted-foreground text-sm">
              {isArabic ? "لا توجد نتائج" : "No results found"}
            </div>
          )}
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => {
                onSelect(result);
                onChange(result.display_name.split(",")[0]);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-start flex items-start gap-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
              data-testid={`button-location-result-${result.place_id}`}
            >
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{result.display_name.split(",")[0]}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {result.display_name.split(",").slice(1, 3).join(",")}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

function getDistanceFromRoute(
  point: [number, number],
  routeCoords: [number, number][]
): number {
  let minDistance = Infinity;
  const [lat, lng] = point;
  
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [lat1, lng1] = routeCoords[i];
    const [lat2, lng2] = routeCoords[i + 1];
    
    const dx = lat2 - lat1;
    const dy = lng2 - lng1;
    const lengthSq = dx * dx + dy * dy;
    
    let t = 0;
    if (lengthSq > 0) {
      t = Math.max(0, Math.min(1, ((lat - lat1) * dx + (lng - lng1) * dy) / lengthSq));
    }
    
    const nearestLat = lat1 + t * dx;
    const nearestLng = lng1 + t * dy;
    
    const dLat = (lat - nearestLat) * 111;
    const dLng = (lng - nearestLng) * 111 * Math.cos(lat * Math.PI / 180);
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance;
}

export default function TripPlanner() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isArabic = language === "ar";
  
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [routeDistance, setRouteDistance] = useState(5);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const [filters, setFilters] = useState({
    public: true,
    home: true,
    free: false,
    dcOnly: false,
  });

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setOrigin({ lat: latitude, lng: longitude });
        
        try {
          const response = await fetch(
            `/api/location-reverse?lat=${latitude}&lng=${longitude}`
          );
          const data = await response.json();
          if (data.display_name) {
            setOriginText(data.display_name.split(",")[0]);
          } else {
            setOriginText(isArabic ? "موقعي الحالي" : "My Location");
          }
        } catch {
          setOriginText(isArabic ? "موقعي الحالي" : "My Location");
        }
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isArabic]);

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });

  const calculateRoute = useCallback(async () => {
    if (!origin || !destination) return;
    
    setIsLoadingRoute(true);
    try {
      const response = await fetch(
        `/api/route?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const coordinates = routeData.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );
        
        setRoute({
          coordinates,
          distance: routeData.distance / 1000,
          duration: routeData.duration / 60,
        });
      }
    } catch (error) {
      console.error("Route calculation error:", error);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [origin, destination]);

  useEffect(() => {
    if (origin && destination) {
      calculateRoute();
    }
  }, [origin, destination, calculateRoute]);

  const visibleStations = stations.filter((station) => {
    if (station.isHidden || station.approvalStatus !== "APPROVED") return false;
    
    if (!filters.public && station.stationType === "PUBLIC") return false;
    if (!filters.home && station.stationType === "HOME") return false;
    if (filters.free && !station.isFree) return false;
    if (filters.dcOnly && station.chargerType !== "DC") return false;
    
    if (route) {
      const distance = getDistanceFromRoute(
        [station.lat, station.lng],
        route.coordinates
      );
      return distance <= routeDistance;
    }
    
    return true;
  });

  const stationsAlongRoute = route ? visibleStations : [];

  const mapBounds = route
    ? L.latLngBounds(route.coordinates)
    : origin && destination
    ? L.latLngBounds([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ])
    : null;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} ${isArabic ? "دقيقة" : "min"}`;
    return `${hours} ${isArabic ? "ساعة" : "h"} ${mins} ${isArabic ? "د" : "m"}`;
  };

  return (
    <>
      <Helmet>
        <title>{isArabic ? "مخطط الرحلات - بارق" : "Trip Planner - Bariq"}</title>
        <meta 
          name="description" 
          content={isArabic 
            ? "خطط رحلتك واعثر على محطات شحن السيارات الكهربائية على طول الطريق في عُمان والخليج"
            : "Plan your trip and find EV charging stations along your route in Oman and the GCC"
          } 
        />
      </Helmet>
      
      <div className="space-y-4 pb-20" dir={isArabic ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-6 h-6" />
          <h1 className="text-xl font-bold" data-testid="text-trip-planner-title">
            {isArabic ? "مخطط الرحلات" : "Trip Planner"}
          </h1>
        </div>

        <Card className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">
              {isArabic ? "من أين؟" : "From"}
            </Label>
            <LocationSearch
              value={originText}
              onChange={setOriginText}
              onSelect={(result) => {
                setOrigin({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
              }}
              onUseCurrentLocation={handleUseCurrentLocation}
              placeholder={isArabic ? "ابحث عن موقع أو استخدم موقعك الحالي" : "Search location or use current"}
              icon={Navigation}
              iconColor="#10B981"
              showCurrentLocation={true}
              isArabic={isArabic}
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">
              {isArabic ? "إلى أين؟" : "To"}
            </Label>
            <LocationSearch
              value={destText}
              onChange={setDestText}
              onSelect={(result) => {
                setDestination({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
              }}
              placeholder={isArabic ? "ابحث عن وجهتك" : "Search your destination"}
              icon={MapPin}
              iconColor="#EF4444"
              isArabic={isArabic}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full py-2 text-sm text-muted-foreground"
            data-testid="button-toggle-filters"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>{isArabic ? "خيارات الفلترة" : "Filter Options"}</span>
            </div>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFilters && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-public"
                    checked={filters.public}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, public: !!checked })
                    }
                    data-testid="checkbox-filter-public"
                  />
                  <Label htmlFor="filter-public" className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    {isArabic ? "عامة" : "Public"}
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-home"
                    checked={filters.home}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, home: !!checked })
                    }
                    data-testid="checkbox-filter-home"
                  />
                  <Label htmlFor="filter-home" className="flex items-center gap-1.5 text-sm">
                    <Home className="w-4 h-4 text-green-500" />
                    {isArabic ? "منزلية" : "Home"}
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-free"
                    checked={filters.free}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, free: !!checked })
                    }
                    data-testid="checkbox-filter-free"
                  />
                  <Label htmlFor="filter-free" className="flex items-center gap-1.5 text-sm">
                    <span className="text-green-600 font-bold text-xs">FREE</span>
                    {isArabic ? "مجانية فقط" : "Free only"}
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-dc"
                    checked={filters.dcOnly}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, dcOnly: !!checked })
                    }
                    data-testid="checkbox-filter-dc"
                  />
                  <Label htmlFor="filter-dc" className="flex items-center gap-1.5 text-sm">
                    <Zap className="w-4 h-4 text-amber-500 fill-current" />
                    {isArabic ? "DC فقط" : "DC only"}
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {isArabic 
                    ? `المسافة من المسار: ${routeDistance} كم`
                    : `Distance from route: ${routeDistance} km`
                  }
                </Label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={routeDistance}
                  onChange={(e) => setRouteDistance(parseInt(e.target.value))}
                  className="w-full accent-primary"
                  data-testid="input-route-distance"
                />
              </div>
            </div>
          )}

          {isLoadingRoute && (
            <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isArabic ? "جاري حساب المسار..." : "Calculating route..."}</span>
            </div>
          )}
        </Card>

        {route && (
          <Card className="p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-primary" />
                  <span className="font-medium">{route.distance.toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDuration(route.duration)}</span>
                </div>
              </div>
              <Badge variant="secondary">
                <Zap className="w-3 h-3 me-1" />
                {stationsAlongRoute.length} {isArabic ? "محطة" : "stations"}
              </Badge>
            </div>
          </Card>
        )}

        <div className="rounded-xl overflow-hidden border" style={{ height: "350px" }} data-testid="map-trip-planner">
          <MapContainer
            key={`map-${visibleStations.length}`}
            center={[23.5880, 58.3829]}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            dragging={false}
            touchZoom={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {mapBounds && <MapController bounds={mapBounds} />}
            
            {route && (
              <Polyline
                positions={route.coordinates}
                color="#3B82F6"
                weight={5}
                opacity={0.8}
              />
            )}
            
            {origin && (
              <Marker
                position={[origin.lat, origin.lng]}
                icon={createLocationIcon(true)}
              >
                <Popup>{isArabic ? "نقطة البداية" : "Starting point"}</Popup>
              </Marker>
            )}
            
            {destination && (
              <Marker
                position={[destination.lat, destination.lng]}
                icon={createLocationIcon(false)}
              >
                <Popup>{isArabic ? "الوجهة" : "Destination"}</Popup>
              </Marker>
            )}
            
            {visibleStations.map((station) => (
              <Marker
                key={station.id}
                position={[station.lat, station.lng]}
                icon={createStationIcon(station.stationType || "PUBLIC", station.status || "OPERATIONAL")}
              >
                <Popup>
                  <div className="text-center min-w-[150px]">
                    <p className="font-bold mb-1">
                      {isArabic ? station.nameAr : station.name}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Badge variant={station.stationType === "HOME" ? "secondary" : "default"} className="text-xs">
                        {station.stationType === "HOME" 
                          ? (isArabic ? "منزلي" : "Home") 
                          : (isArabic ? "عام" : "Public")
                        }
                      </Badge>
                      {station.isFree && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          {isArabic ? "مجاني" : "Free"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {station.chargerType} • {station.powerKw} kW
                    </p>
                    <Link href={`/station/${station.id}`}>
                      <Button size="sm" className="w-full" data-testid={`button-view-station-${station.id}`}>
                        {isArabic ? "عرض التفاصيل" : "View Details"}
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {!route && visibleStations.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {isArabic 
              ? `${visibleStations.length} محطة متاحة على الخريطة` 
              : `${visibleStations.length} stations available on map`}
          </p>
        )}

        {route && stationsAlongRoute.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-lg">
              {isArabic ? "المحطات على المسار" : "Stations Along Route"}
            </h2>
            <div className="space-y-2">
              {stationsAlongRoute.map((station) => (
                <Link key={station.id} href={`/station/${station.id}`} data-testid={`link-station-${station.id}`}>
                  <Card className="p-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          station.stationType === "HOME" 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : "bg-blue-100 dark:bg-blue-900/30"
                        }`}
                      >
                        {station.stationType === "HOME" 
                          ? <Home className="w-5 h-5 text-green-600" />
                          : <Building2 className="w-5 h-5 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {isArabic ? station.nameAr : station.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{station.chargerType}</span>
                          <span>•</span>
                          <span>{station.powerKw} kW</span>
                          {station.isFree && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">{isArabic ? "مجاني" : "Free"}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={station.status === "OPERATIONAL" ? "default" : "destructive"}
                        className="shrink-0"
                      >
                        {station.status === "OPERATIONAL" 
                          ? (isArabic ? "متاح" : "Available")
                          : (isArabic ? "مشغول" : "Busy")
                        }
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {route && stationsAlongRoute.length === 0 && (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <AlertCircle className="w-12 h-12 opacity-50" />
              <p className="text-sm">
                {isArabic 
                  ? "لا توجد محطات شحن على هذا المسار. جرب زيادة المسافة من المسار في الفلتر."
                  : "No charging stations found along this route. Try increasing the distance from route in filters."
                }
              </p>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

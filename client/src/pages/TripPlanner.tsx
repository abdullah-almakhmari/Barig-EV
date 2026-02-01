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
  AlertCircle
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

const createStationIcon = (type: string, status: string) => {
  const isHome = type === "HOME";
  const isAvailable = status === "OPERATIONAL";
  
  const bgColor = isAvailable 
    ? (isHome ? "#10B981" : "#3B82F6") 
    : "#EF4444";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${bgColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          ${isHome 
            ? '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>'
            : '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>'
          }
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
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
  placeholder,
  icon: Icon,
  iconColor,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: LocationResult) => void;
  placeholder: string;
  icon: typeof MapPin;
  iconColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(value, 500);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchLocation = async () => {
      if (debouncedValue.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            debouncedValue
          )}&countrycodes=om,ae,sa,qa,bh,kw&limit=5`,
          {
            headers: {
              "Accept-Language": "ar,en",
            },
          }
        );
        const data = await response.json();
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Location search error:", error);
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
      <div className="relative">
        <Icon 
          className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5" 
          style={{ color: iconColor }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="ps-10 pe-10 h-12 text-base"
          onFocus={() => results.length > 0 && setIsOpen(true)}
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
            }}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {isOpen && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => {
                onSelect(result);
                onChange(result.display_name.split(",")[0]);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-start hover-elevate flex items-start gap-3 border-b last:border-b-0"
              data-testid={`location-result-${result.place_id}`}
            >
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-sm line-clamp-2">{result.display_name}</span>
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
  
  for (const coord of routeCoords) {
    const distance = Math.sqrt(
      Math.pow(point[0] - coord[0], 2) + Math.pow(point[1] - coord[1], 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance * 111;
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
  
  const [filters, setFilters] = useState({
    public: true,
    home: true,
    free: false,
    dcOnly: false,
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });

  const calculateRoute = useCallback(async () => {
    if (!origin || !destination) return;
    
    setIsLoadingRoute(true);
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
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

  const stationsAlongRoute = route
    ? stations.filter((station) => {
        if (station.isHidden || station.approvalStatus !== "APPROVED") return false;
        
        if (!filters.public && station.stationType === "PUBLIC") return false;
        if (!filters.home && station.stationType === "HOME") return false;
        if (filters.free && !station.isFree) return false;
        if (filters.dcOnly && station.chargerType !== "DC") return false;
        
        const distance = getDistanceFromRoute(
          [station.lat, station.lng],
          route.coordinates
        );
        return distance <= routeDistance;
      })
    : [];

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
      </Helmet>
      
      <div className="space-y-4 pb-20" dir={isArabic ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">
            {isArabic ? "مخطط الرحلات" : "Trip Planner"}
          </h1>
        </div>

        <Card className="p-4 space-y-4">
          <LocationSearch
            value={originText}
            onChange={setOriginText}
            onSelect={(result) => {
              setOrigin({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
            }}
            placeholder={isArabic ? "من أين؟ (نقطة البداية)" : "From where? (Starting point)"}
            icon={Navigation}
            iconColor="#10B981"
          />
          
          <LocationSearch
            value={destText}
            onChange={setDestText}
            onSelect={(result) => {
              setDestination({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
            }}
            placeholder={isArabic ? "إلى أين؟ (الوجهة)" : "Where to? (Destination)"}
            icon={MapPin}
            iconColor="#EF4444"
          />

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

        {!origin && !destination && (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Search className="w-12 h-12 opacity-50" />
              <p className="text-sm">
                {isArabic 
                  ? "ابحث عن نقطة البداية والوجهة لعرض محطات الشحن على المسار"
                  : "Search for origin and destination to see charging stations along the route"
                }
              </p>
            </div>
          </Card>
        )}

        <div className="rounded-xl overflow-hidden border" style={{ height: "400px" }}>
          <MapContainer
            center={[23.5880, 58.3829]}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
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
            
            {stationsAlongRoute.map((station) => (
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
                      <Button size="sm" className="w-full">
                        {isArabic ? "عرض التفاصيل" : "View Details"}
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {route && stationsAlongRoute.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-lg">
              {isArabic ? "المحطات على المسار" : "Stations Along Route"}
            </h2>
            <div className="space-y-2">
              {stationsAlongRoute.map((station) => (
                <Link key={station.id} href={`/station/${station.id}`}>
                  <Card className="p-3 hover-elevate">
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

import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import { Station } from "@shared/schema";
import { StationCard } from "./StationCard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, Loader2, Move, Lock, Maximize2, Minimize2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

type StationPriority = 'best' | 'good' | 'busy' | 'offline';

function getStationPriority(station: Station): StationPriority {
  if (station.status === "OFFLINE") return 'offline';
  const available = station.availableChargers ?? 0;
  const total = station.chargerCount ?? 1;
  if (available === 0) return 'busy';
  if (available === total) return 'best';
  return 'good';
}

function createCustomIcon(station: Station, isBestNearby: boolean = false) {
  const priority = getStationPriority(station);
  
  let color: string;
  let size: number;
  let pulseAnimation = '';
  let shadowSize: string;
  
  switch (priority) {
    case 'best':
      color = '#10b981';
      size = isBestNearby ? 24 : 18;
      shadowSize = isBestNearby ? '0 4px 12px rgba(16, 185, 129, 0.5)' : '0 4px 6px rgba(0,0,0,0.3)';
      if (isBestNearby) {
        pulseAnimation = 'animation: pulse 2s infinite;';
      }
      break;
    case 'good':
      color = '#22c55e';
      size = 16;
      shadowSize = '0 4px 6px rgba(0,0,0,0.3)';
      break;
    case 'busy':
      color = '#f97316';
      size = 14;
      shadowSize = '0 3px 4px rgba(0,0,0,0.2)';
      break;
    case 'offline':
    default:
      color = '#ef4444';
      size = 12;
      shadowSize = '0 2px 3px rgba(0,0,0,0.2)';
      break;
  }
  
  const pulseKeyframes = isBestNearby ? `
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.9; }
      }
    </style>
  ` : '';
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      ${pulseKeyframes}
      <div style="
        background-color: ${color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: ${isBestNearby ? '4px' : '3px'} solid white; 
        box-shadow: ${shadowSize};
        ${pulseAnimation}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #3b82f6, 0 4px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBoundsToStations({ stations }: { stations: Station[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map(s => [s.lat, s.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [stations.length, map]);

  return null;
}

function MapInteractionControl({ 
  isInteractionEnabled,
  onToggle 
}: { 
  isInteractionEnabled: boolean;
  onToggle: () => void;
}) {
  const map = useMap();
  const { t } = useTranslation();

  useEffect(() => {
    if (isInteractionEnabled) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
    }
  }, [map, isInteractionEnabled]);

  return (
    <div className="absolute bottom-4 start-4 z-[1000]">
      <Button
        size="sm"
        variant={isInteractionEnabled ? "default" : "secondary"}
        onClick={onToggle}
        className="shadow-lg gap-2 text-xs font-medium"
        data-testid="button-toggle-map-interaction"
      >
        {isInteractionEnabled ? (
          <>
            <Lock className="h-4 w-4" />
            <span>{t("map.lockMap", "قفل الخريطة")}</span>
          </>
        ) : (
          <>
            <Move className="h-4 w-4" />
            <span>{t("map.enableMovement", "تحريك الخريطة")}</span>
          </>
        )}
      </Button>
    </div>
  );
}

function LocateControl({ 
  onLocationFound 
}: { 
  onLocationFound: (lat: number, lng: number) => void 
}) {
  const map = useMap();
  const { t } = useTranslation();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert(t("map.locationNotSupported"));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 14, { duration: 1.5 });
        onLocationFound(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="absolute top-4 end-4 z-[1000]">
      <Button
        size="icon"
        variant="secondary"
        onClick={handleLocate}
        disabled={isLocating}
        className="shadow-lg bg-background hover:bg-muted"
        data-testid="button-locate-me"
        title={t("map.locateMe")}
      >
        {isLocating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Navigation className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface StationMapProps {
  stations: Station[];
}

export function StationMap({ stations }: StationMapProps) {
  const center: [number, number] = [23.5880, 58.3829];
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isMapInteractionEnabled, setIsMapInteractionEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleLocationFound = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
  };

  const toggleMapInteraction = useCallback(() => {
    setIsMapInteractionEnabled(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const newValue = !prev;
      if (newValue) {
        setIsMapInteractionEnabled(true);
      }
      return newValue;
    });
  }, []);

  const bestNearbyStationId = useMemo(() => {
    if (!userLocation) return null;
    
    const availableStations = stations.filter(
      s => s.status !== "OFFLINE" && (s.availableChargers ?? 0) > 0
    );
    
    if (availableStations.length === 0) return null;
    
    const stationsWithDistance = availableStations.map(s => ({
      station: s,
      distance: getDistance(userLocation[0], userLocation[1], s.lat, s.lng),
      priority: getStationPriority(s),
    }));
    
    stationsWithDistance.sort((a, b) => {
      if (a.priority === 'best' && b.priority !== 'best') return -1;
      if (a.priority !== 'best' && b.priority === 'best') return 1;
      return a.distance - b.distance;
    });
    
    const bestStation = stationsWithDistance[0];
    if (bestStation && bestStation.distance <= 50) {
      return bestStation.station.id;
    }
    
    return null;
  }, [stations, userLocation]);

  const mapContainerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-background" 
    : "h-full w-full rounded-2xl overflow-hidden border border-border shadow-inner bg-muted/20 relative";

  return (
    <div className={mapContainerClass}>
      <MapContainer 
        key={`map-${stations.length}`}
        center={center} 
        zoom={11} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
        dragging={false}
        touchZoom={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBoundsToStations stations={stations} />
        <LocateControl onLocationFound={handleLocationFound} />
        <MapInteractionControl 
          isInteractionEnabled={isMapInteractionEnabled} 
          onToggle={toggleMapInteraction} 
        />

        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={100}
              pathOptions={{ 
                color: '#3b82f6', 
                fillColor: '#3b82f6', 
                fillOpacity: 0.15,
                weight: 2
              }}
            />
            <Marker position={userLocation} icon={userLocationIcon} />
          </>
        )}
        
        {stations.map((station) => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]}
            icon={createCustomIcon(station, station.id === bestNearbyStationId)}
            zIndexOffset={station.id === bestNearbyStationId ? 1000 : 0}
          >
            <Popup>
              <div dir={document.documentElement.dir} className="w-full">
                <StationCard station={station} variant="compact" />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute top-4 start-4 z-[1000]">
        <Button
          size="icon"
          variant="secondary"
          onClick={toggleFullscreen}
          className="shadow-lg bg-background hover:bg-muted"
          data-testid="button-toggle-fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5" />
          ) : (
            <Maximize2 className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import { Station } from "@shared/schema";
import { StationCard } from "./StationCard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

// Fix Leaflet icons
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons based on availability status
const createCustomIcon = (station: Station) => {
  let color: string;
  
  if (station.status === "OFFLINE") {
    color = '#ef4444'; // Red - offline
  } else if ((station.availableChargers ?? 0) > 0) {
    color = '#10b981'; // Green - available
  } else {
    color = '#f97316'; // Orange - in use
  }
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// User location marker icon
const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #3b82f6, 0 4px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Component to fit bounds to all stations
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

// LocateControl component to handle location button
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

interface StationMapProps {
  stations: Station[];
}

export function StationMap({ stations }: StationMapProps) {
  const center: [number, number] = [23.5880, 58.3829];
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const handleLocationFound = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
  };

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-border shadow-inner bg-muted/20 relative">
      <MapContainer 
        key={`map-${stations.length}`}
        center={center} 
        zoom={11} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBoundsToStations stations={stations} />
        <LocateControl onLocationFound={handleLocationFound} />

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
            icon={createCustomIcon(station)}
          >
            <Popup>
              <div dir={document.documentElement.dir} className="w-full">
                <StationCard station={station} variant="compact" />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

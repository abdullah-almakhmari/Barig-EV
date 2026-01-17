import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Station } from "@shared/schema";
import { StationCard } from "./StationCard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

// Custom Icons could be added here
const createCustomIcon = (type: string) => {
  const color = type.includes('DC') ? '#f59e0b' : '#10b981'; // Amber for DC, Emerald for AC
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

interface StationMapProps {
  stations: Station[];
}

export function StationMap({ stations }: StationMapProps) {
  // Muscat, Oman Coordinates
  const center: [number, number] = [23.5880, 58.3829];

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-border shadow-inner bg-muted/20">
      <MapContainer 
        center={center} 
        zoom={11} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {stations.map((station) => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]}
            icon={createCustomIcon(station.chargerType)}
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

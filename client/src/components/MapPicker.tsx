import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { Map, Check, X } from "lucide-react";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const selectedIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface LocationPickerProps {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}

function LocationPicker({ position, onPositionChange }: LocationPickerProps) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(position);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkerPosition([lat, lng]);
      onPositionChange(lat, lng);
    },
  });

  return <Marker position={markerPosition} icon={selectedIcon} />;
}

interface MapPickerProps {
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number) => void;
}

export function MapPicker({ initialLat, initialLng, onConfirm }: MapPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>([initialLat, initialLng]);

  const handleConfirm = () => {
    onConfirm(selectedPosition[0], selectedPosition[1]);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        data-testid="button-pick-from-map"
      >
        <Map className="h-4 w-4" />
        {t("add.pickFromMap")}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              {t("add.selectLocation")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 relative">
            <MapContainer
              center={selectedPosition}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker
                position={selectedPosition}
                onPositionChange={(lat, lng) => setSelectedPosition([lat, lng])}
              />
            </MapContainer>
            
            <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
              <p className="text-sm text-muted-foreground mb-1">{t("add.clickToSelect")}</p>
              <p className="font-mono text-sm">
                {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

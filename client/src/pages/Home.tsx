import { useStations } from "@/hooks/use-stations";
import { StationMap } from "@/components/StationMap";
import { StationCard } from "@/components/StationCard";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { MapPin, List, Zap, Home as HomeIcon, Battery, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";

const STATIONS_PER_PAGE = 12;

export default function Home() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(STATIONS_PER_PAGE);
  
  const { data: stations, isLoading, error } = useStations({ 
    type: typeFilter !== "ALL" ? typeFilter : undefined 
  });

  const { data: rentalStationsData } = useQuery<{ stationIds: number[] }>({
    queryKey: ['/api/stations/rental-stations'],
  });
  const rentalStationIds = new Set(rentalStationsData?.stationIds || []);

  const stationList = stations || [];

  const stats = useMemo(() => {
    const total = stationList.length;
    const available = stationList.filter(s => (s.availableChargers ?? 0) > 0 && s.status !== "OFFLINE").length;
    const dcCount = stationList.filter(s => s.chargerType?.includes("DC")).length;
    const homeCount = stationList.filter(s => s.stationType === "HOME").length;
    return { total, available, dcCount, homeCount };
  }, [stationList]);

  const filterOptions = [
    { value: "ALL", label: isArabic ? "الكل" : "All", icon: MapPin, count: stats.total },
    { value: "DC", label: isArabic ? "سريع" : "Fast", icon: Zap, count: stats.dcCount },
    { value: "AC", label: isArabic ? "عادي" : "Normal", icon: Battery, count: stats.total - stats.dcCount - stats.homeCount },
    { value: "HOME", label: isArabic ? "منزلي" : "Home", icon: HomeIcon, count: stats.homeCount },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary/50" />
          </div>
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-destructive">{t("common.error")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-300">
      <SEO />
      
      {/* Header Stats Card */}
      <Card className="p-4 mb-3 bg-gradient-to-br from-primary/5 to-primary/10 border-0" data-testid="home-header">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold" data-testid="text-home-title">
                {isArabic ? "محطات الشحن" : "Charging Stations"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isArabic ? `${stats.available} متاحة من ${stats.total}` : `${stats.available} available of ${stats.total}`}
              </p>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === "map" ? "default" : "ghost"}
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => setViewMode("map")}
              data-testid="button-view-map"
            >
              <MapPin className="w-3.5 h-3.5" />
              {isArabic ? "خريطة" : "Map"}
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-3.5 h-3.5" />
              {isArabic ? "قائمة" : "List"}
            </Button>
          </div>
        </div>
        
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = typeFilter === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTypeFilter(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background text-muted-foreground hover-elevate"
                }`}
                data-testid={`filter-${option.value.toLowerCase()}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{option.label}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-[10px] px-1.5 py-0 h-4 ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : ""}`}
                >
                  {option.count}
                </Badge>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Map Legend */}
      {viewMode === "map" && (
        <div className="flex items-center justify-center gap-4 mb-2 text-xs" data-testid="map-legend">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
            <span className="text-muted-foreground">{isArabic ? "متاح" : "Available"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
            <span className="text-muted-foreground">{isArabic ? "مشغول" : "Busy"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
            <span className="text-muted-foreground">{isArabic ? "غير متاح" : "Offline"}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {viewMode === "map" ? (
          <div className="h-full" data-testid="map-container">
            <StationMap stations={stationList} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto pb-4" data-testid="list-container">
            {stationList.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stationList.slice(0, visibleCount).map((station) => (
                    <StationCard 
                      key={station.id} 
                      station={station} 
                      isRentalStation={rentalStationIds.has(station.id)}
                    />
                  ))}
                </div>
                {stationList.length > visibleCount && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setVisibleCount(prev => prev + STATIONS_PER_PAGE)}
                      className="gap-2"
                      data-testid="button-show-more"
                    >
                      <ChevronDown className="w-4 h-4" />
                      {isArabic ? "عرض المزيد" : "Show more"} ({stationList.length - visibleCount})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="p-8 text-center bg-muted/30 border-0">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {isArabic ? "لا توجد محطات" : "No stations found"}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

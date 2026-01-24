import { useStations } from "@/hooks/use-stations";
import { StationMap } from "@/components/StationMap";
import { StationCard } from "@/components/StationCard";
import { useTranslation } from "react-i18next";
import { Map as MapIcon, List as ListIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";

const STATIONS_PER_PAGE = 12;

export default function Home() {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(STATIONS_PER_PAGE);
  
  const { data: stations, isLoading, error } = useStations({ 
    type: typeFilter !== "ALL" ? typeFilter : undefined 
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-destructive">
        {t("common.error")}
      </div>
    );
  }

  const stationList = stations || [];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-500">
      <SEO />
      {/* Hero / Filter Section - Compact */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-primary p-4 text-white shadow-xl shadow-emerald-900/10 mb-3">
        <h1 className="text-lg sm:text-xl font-bold mb-1">{t("hero.title")}</h1>
        <p className="text-emerald-100 text-sm mb-3">{t("hero.subtitle")}</p>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl bg-white/10 border-white/20 text-white focus:ring-white/30">
            <Filter className="w-4 h-4 me-2" />
            <SelectValue placeholder={t("filter.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filter.all")}</SelectItem>
            <SelectItem value="DC">{t("filter.fast")}</SelectItem>
            <SelectItem value="AC">{t("filter.slow")}</SelectItem>
            <SelectItem value="HOME">{t("filter.home")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content - Fills remaining space */}
      <Tabs defaultValue="map" className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-sm">
              {stationList.length}
            </span>
            {t("nav.list")}
          </h2>
          <TabsList className="grid w-[180px] grid-cols-2 rounded-xl h-9">
            <TabsTrigger value="map" className="rounded-lg text-sm">{t("nav.map")}</TabsTrigger>
            <TabsTrigger value="list" className="rounded-lg text-sm">{t("nav.list")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="flex-1 mt-0 min-h-0">
          <StationMap stations={stationList} />
        </TabsContent>
        
        <TabsContent value="list" className="flex-1 mt-0 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationList.slice(0, visibleCount).map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
            {stationList.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                {t("station.noResults")}
              </div>
            )}
          </div>
          {stationList.length > visibleCount && (
            <div className="flex justify-center mt-4 pb-4">
              <Button 
                variant="outline" 
                onClick={() => setVisibleCount(prev => prev + STATIONS_PER_PAGE)}
                data-testid="button-show-more"
              >
                {t("common.showMore")} ({stationList.length - visibleCount} {t("common.remaining")})
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

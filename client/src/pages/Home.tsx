import { useStations } from "@/hooks/use-stations";
import { StationMap } from "@/components/StationMap";
import { StationCard } from "@/components/StationCard";
import { useTranslation } from "react-i18next";
import { Search, Map as MapIcon, List as ListIcon, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";

const STATIONS_PER_PAGE = 12;

export default function Home() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(STATIONS_PER_PAGE);
  
  const { data: stations, isLoading, error } = useStations({ 
    search, 
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <SEO />
      {/* Hero / Filter Section */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-900 to-primary p-6 text-white shadow-xl shadow-emerald-900/10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t("hero.title")}</h1>
        <p className="text-emerald-100 mb-6 max-w-xl">{t("hero.subtitle")}</p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
            <Input 
              placeholder={t("filter.all")} 
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 ps-10 h-12 rounded-xl focus-visible:ring-white/30 focus-visible:border-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-xl bg-white/10 border-white/20 text-white focus:ring-white/30">
              <SelectValue placeholder={t("filter.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filter.all")}</SelectItem>
              <SelectItem value="DC">{t("filter.fast")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="map" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1.5 rounded-lg">
              {stationList.length}
            </span>
            {t("nav.list")}
          </h2>
          <TabsList className="grid w-[200px] grid-cols-2 rounded-xl">
            <TabsTrigger value="map" className="rounded-lg">{t("nav.map")}</TabsTrigger>
            <TabsTrigger value="list" className="rounded-lg">{t("nav.list")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="h-[600px] mt-0">
          <StationMap stations={stationList} />
        </TabsContent>
        
        <TabsContent value="list" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stationList.slice(0, visibleCount).map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
            {stationList.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                {t("station.noResults")}
              </div>
            )}
          </div>
          {stationList.length > visibleCount && (
            <div className="flex justify-center mt-6">
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

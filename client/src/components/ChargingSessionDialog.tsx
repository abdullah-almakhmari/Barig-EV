import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap, BatteryCharging, Battery, Gauge, Car, Plus } from "lucide-react";
import { useStartChargingSession, useEndChargingSession, useActiveSession, useVehicles, useUserVehicles, useCreateUserVehicle } from "@/hooks/use-stations";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { ChargingSession, EvVehicle, UserVehicleWithDetails } from "@shared/schema";

interface ChargingSessionDialogProps {
  stationId: number;
  availableChargers: number;
  totalChargers: number;
}

const VEHICLE_STORAGE_KEY = "bariq_selected_user_vehicle";

export function ChargingSessionDialog({ stationId, availableChargers, totalChargers }: ChargingSessionDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);
  const [batteryStart, setBatteryStart] = useState("");
  const [batteryEnd, setBatteryEnd] = useState("");
  const [energyKwh, setEnergyKwh] = useState("");
  const [selectedUserVehicleId, setSelectedUserVehicleId] = useState<string>("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [selectedCatalogVehicleId, setSelectedCatalogVehicleId] = useState<string>("");

  const { data: activeSession, isLoading: loadingSession } = useActiveSession(stationId);
  const { data: userVehicles = [], isLoading: loadingUserVehicles } = useUserVehicles();
  const { data: catalogVehicles = [], isLoading: loadingCatalogVehicles } = useVehicles();
  const startSession = useStartChargingSession();
  const endSession = useEndChargingSession();
  const createUserVehicle = useCreateUserVehicle();
  
  const isArabic = i18n.language === "ar";
  const isLoggedIn = !!user;

  useEffect(() => {
    const stored = localStorage.getItem(VEHICLE_STORAGE_KEY);
    if (stored) {
      setSelectedUserVehicleId(stored);
    }
  }, []);

  useEffect(() => {
    if (userVehicles.length > 0 && !selectedUserVehicleId) {
      const defaultVehicle = userVehicles.find(v => v.isDefault) || userVehicles[0];
      if (defaultVehicle) {
        setSelectedUserVehicleId(String(defaultVehicle.id));
        localStorage.setItem(VEHICLE_STORAGE_KEY, String(defaultVehicle.id));
      }
    }
  }, [userVehicles]);

  const handleUserVehicleChange = (value: string) => {
    if (value === "add_new") {
      setShowAddVehicle(true);
    } else {
      setSelectedUserVehicleId(value);
      localStorage.setItem(VEHICLE_STORAGE_KEY, value);
    }
  };

  const handleAddVehicle = async () => {
    if (!selectedCatalogVehicleId) return;
    try {
      const newVehicle = await createUserVehicle.mutateAsync({
        evVehicleId: Number(selectedCatalogVehicleId),
        isDefault: userVehicles.length === 0,
      });
      setSelectedUserVehicleId(String(newVehicle.id));
      localStorage.setItem(VEHICLE_STORAGE_KEY, String(newVehicle.id));
      setShowAddVehicle(false);
      setSelectedCatalogVehicleId("");
      toast({ title: t("vehicle.added"), description: t("vehicle.addedDesc") });
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    }
  };

  const selectedUserVehicle = userVehicles.find(v => v.id === Number(selectedUserVehicleId));
  const selectedCatalogVehicle = catalogVehicles.find(v => v.id === Number(selectedCatalogVehicleId));

  const handleStartSession = async () => {
    try {
      await startSession.mutateAsync({
        stationId,
        userVehicleId: selectedUserVehicleId ? Number(selectedUserVehicleId) : undefined,
        batteryStartPercent: batteryStart ? Number(batteryStart) : undefined,
      });
      toast({ title: t("charging.sessionStarted"), description: t("charging.sessionStartedDesc") });
      setOpenStart(false);
      setBatteryStart("");
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await endSession.mutateAsync({
        sessionId: activeSession.id,
        stationId,
        batteryEndPercent: batteryEnd ? Number(batteryEnd) : undefined,
        energyKwh: energyKwh ? Number(energyKwh) : undefined,
      });
      toast({ title: t("charging.sessionEnded"), description: t("charging.sessionEndedDesc") });
      setOpenEnd(false);
      setBatteryEnd("");
      setEnergyKwh("");
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    }
  };

  const formatDuration = (startTime: Date | string | null) => {
    if (!startTime) return "0 min";
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  if (loadingSession) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {activeSession ? (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <BatteryCharging className="w-5 h-5 animate-pulse" />
            <span className="font-bold">{t("charging.activeSession")}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("charging.duration")}</span>
              <p className="font-bold text-lg">{formatDuration(activeSession.startTime)}</p>
            </div>
            {activeSession.batteryStartPercent !== null && (
              <div>
                <span className="text-muted-foreground">{t("charging.batteryStart")}</span>
                <p className="font-bold text-lg">{activeSession.batteryStartPercent}%</p>
              </div>
            )}
          </div>

          <Dialog open={openEnd} onOpenChange={setOpenEnd}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                data-testid="button-end-session"
              >
                <Zap className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                {t("charging.endSession")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("charging.endSession")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="batteryEnd" className="flex items-center gap-2">
                    <Battery className="w-4 h-4" />
                    {t("charging.batteryEnd")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="batteryEnd"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="85"
                      value={batteryEnd}
                      onChange={(e) => setBatteryEnd(e.target.value)}
                      className="pr-8"
                      data-testid="input-battery-end"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="energyKwh" className="flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    {t("charging.energyCharged")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="energyKwh"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="25.5"
                      value={energyKwh}
                      onChange={(e) => setEnergyKwh(e.target.value)}
                      className="pr-12"
                      data-testid="input-energy-kwh"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">kWh</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenEnd(false)}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleEndSession}
                  disabled={endSession.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600"
                  data-testid="button-confirm-end-session"
                >
                  {endSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("charging.endSession")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <Dialog open={openStart} onOpenChange={setOpenStart}>
          <DialogTrigger asChild>
            <Button 
              disabled={availableChargers <= 0}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-start-session"
            >
              <Zap className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              {t("charging.startSession")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("charging.startSession")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {showAddVehicle ? (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t("vehicle.addNew")}
                  </Label>
                  <Select value={selectedCatalogVehicleId} onValueChange={setSelectedCatalogVehicleId}>
                    <SelectTrigger data-testid="select-catalog-vehicle">
                      <SelectValue placeholder={t("vehicle.selectModel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                          {isArabic ? `${vehicle.brandAr} ${vehicle.modelAr}` : `${vehicle.brand} ${vehicle.model}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCatalogVehicle && (
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>{selectedCatalogVehicle.batteryCapacityKwh} kWh</span>
                      <span>{selectedCatalogVehicle.chargerType}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddVehicle(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button size="sm" onClick={handleAddVehicle} disabled={!selectedCatalogVehicleId || createUserVehicle.isPending}>
                      {createUserVehicle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("vehicle.add")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    {t("vehicle.select")}
                  </Label>
                  <Select value={selectedUserVehicleId} onValueChange={handleUserVehicleChange}>
                    <SelectTrigger data-testid="select-vehicle">
                      <SelectValue placeholder={t("vehicle.selectHint")} />
                    </SelectTrigger>
                    <SelectContent>
                      {userVehicles.map((uv) => (
                        <SelectItem key={uv.id} value={String(uv.id)} data-testid={`vehicle-option-${uv.id}`}>
                          {uv.nickname || (uv.evVehicle ? (isArabic ? `${uv.evVehicle.brandAr} ${uv.evVehicle.modelAr}` : `${uv.evVehicle.brand} ${uv.evVehicle.model}`) : `${t("vehicle.unknown")}`)}
                          {uv.isDefault && ` ★`}
                        </SelectItem>
                      ))}
                      {isLoggedIn && (
                        <SelectItem value="add_new" data-testid="add-new-vehicle">
                          <span className="flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            {t("vehicle.addNew")}
                          </span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedUserVehicle?.evVehicle && (
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>{selectedUserVehicle.evVehicle.batteryCapacityKwh} kWh</span>
                      <span>{selectedUserVehicle.evVehicle.chargerType}</span>
                    </div>
                  )}
                  {!isLoggedIn && userVehicles.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("vehicle.loginToSave")}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="batteryStart" className="flex items-center gap-2">
                  <Battery className="w-4 h-4" />
                  {t("charging.batteryStart")}
                </Label>
                <div className="relative">
                  <Input
                    id="batteryStart"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="20"
                    value={batteryStart}
                    onChange={(e) => setBatteryStart(e.target.value)}
                    className="pr-8"
                    data-testid="input-battery-start"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("charging.batteryOptional")}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenStart(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleStartSession}
                disabled={startSession.isPending}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="button-confirm-start-session"
              >
                {startSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("charging.startSession")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

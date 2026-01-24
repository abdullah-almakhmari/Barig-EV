import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap, BatteryCharging, Battery, Gauge, Car, Plus, Camera, Check, X } from "lucide-react";
import { useStartChargingSession, useEndChargingSession, useActiveSession, useVehicles, useUserVehicles, useCreateUserVehicle } from "@/hooks/use-stations";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getCsrfToken, apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { ChargingSession, EvVehicle, UserVehicleWithDetails } from "@shared/schema";

interface ChargingSessionDialogProps {
  stationId: number;
  availableChargers: number;
  totalChargers: number;
}

const VEHICLE_STORAGE_KEY = "bariq_selected_user_vehicle";

// Pricing constants (shared with ChargingStats)
const ELECTRICITY_STORAGE_KEY = "bariq_electricity_rate";
const CURRENCY_STORAGE_KEY = "bariq_currency";
const DEFAULT_ELECTRICITY_RATE = 0.1;
const DEFAULT_CURRENCY = "OMR";

const CURRENCIES = [
  { code: "OMR", nameAr: "ريال عماني", nameEn: "Omani Rial", symbol: "ر.ع" },
  { code: "AED", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", symbol: "ر.س" },
  { code: "KWD", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BHD", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", symbol: "د.ب" },
  { code: "QAR", nameAr: "ريال قطري", nameEn: "Qatari Riyal", symbol: "ر.ق" },
];

export function ChargingSessionDialog({ stationId, availableChargers, totalChargers }: ChargingSessionDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);
  const [batteryStart, setBatteryStart] = useState("");
  const [batteryEnd, setBatteryEnd] = useState("");
  const [energyKwh, setEnergyKwh] = useState("");
  const [batteryEndError, setBatteryEndError] = useState("");
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUserVehicleId, setSelectedUserVehicleId] = useState<string>("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [selectedCatalogVehicleId, setSelectedCatalogVehicleId] = useState<string>("");
  const [showOtherVehicle, setShowOtherVehicle] = useState(false);
  const [customVehicleName, setCustomVehicleName] = useState("");
  const [showCustomCatalogVehicle, setShowCustomCatalogVehicle] = useState(false);
  const [customCatalogVehicleName, setCustomCatalogVehicleName] = useState("");
  const [electricityRate, setElectricityRate] = useState(DEFAULT_ELECTRICITY_RATE);
  const [pricingCurrency, setPricingCurrency] = useState(DEFAULT_CURRENCY);

  // Load pricing settings from localStorage
  useEffect(() => {
    const savedRate = localStorage.getItem(ELECTRICITY_STORAGE_KEY);
    if (savedRate) {
      const rate = parseFloat(savedRate);
      if (!isNaN(rate) && rate > 0) setElectricityRate(rate);
    }
    const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (savedCurrency && CURRENCIES.some(c => c.code === savedCurrency)) {
      setPricingCurrency(savedCurrency);
    }
  }, []);

  const { data: activeSession, isLoading: loadingSession } = useActiveSession(stationId);
  const { data: userVehicles = [], isLoading: loadingUserVehicles } = useUserVehicles();
  const { data: catalogVehicles = [], isLoading: loadingCatalogVehicles } = useVehicles();
  const startSession = useStartChargingSession();
  const endSession = useEndChargingSession();
  const createUserVehicle = useCreateUserVehicle();

  // Cancel session mutation (deletes without recording)
  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return apiRequest("DELETE", `/api/charging-sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chargingSessions.getActive.path, stationId] });
      queryClient.invalidateQueries({ queryKey: [api.chargingSessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stations.get.path, stationId] });
      queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions/my-active"] });
      toast({ 
        title: i18n.language === "ar" ? "تم إلغاء الجلسة" : "Session cancelled",
        description: i18n.language === "ar" ? "لن يتم حفظ هذه الجلسة في السجل" : "This session will not be saved to history"
      });
      setOpenEnd(false);
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });
  
  const isArabic = i18n.language === "ar";
  const isLoggedIn = !!user;

  // Calculate estimated cost
  const estimatedCost = energyKwh ? (parseFloat(energyKwh) * electricityRate) : 0;
  const selectedPricingCurrency = CURRENCIES.find(c => c.code === pricingCurrency) || CURRENCIES[0];
  const currencySymbol = isArabic ? selectedPricingCurrency.symbol : selectedPricingCurrency.code;

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
      setShowOtherVehicle(false);
    } else if (value === "other") {
      setShowOtherVehicle(true);
      setShowAddVehicle(false);
      setSelectedUserVehicleId("");
    } else {
      setSelectedUserVehicleId(value);
      setShowOtherVehicle(false);
      localStorage.setItem(VEHICLE_STORAGE_KEY, value);
    }
  };

  const handleCatalogVehicleChange = (value: string) => {
    if (value === "other_catalog") {
      setShowCustomCatalogVehicle(true);
      setSelectedCatalogVehicleId("");
    } else {
      setShowCustomCatalogVehicle(false);
      setSelectedCatalogVehicleId(value);
    }
  };

  const handleAddVehicle = async () => {
    if (showCustomCatalogVehicle) {
      if (!customCatalogVehicleName.trim()) return;
      try {
        const newVehicle = await createUserVehicle.mutateAsync({
          nickname: customCatalogVehicleName.trim(),
          isDefault: userVehicles.length === 0,
        });
        setSelectedUserVehicleId(String(newVehicle.id));
        localStorage.setItem(VEHICLE_STORAGE_KEY, String(newVehicle.id));
        setShowAddVehicle(false);
        setShowCustomCatalogVehicle(false);
        setCustomCatalogVehicleName("");
        toast({ title: t("vehicle.added"), description: t("vehicle.addedDesc") });
      } catch (error: any) {
        toast({ variant: "destructive", title: t("common.error"), description: error.message });
      }
    } else {
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
    }
  };

  const selectedUserVehicle = userVehicles.find(v => v.id === Number(selectedUserVehicleId));
  const selectedCatalogVehicle = catalogVehicles.find(v => v.id === Number(selectedCatalogVehicleId));

  const handleStartSession = async () => {
    try {
      await startSession.mutateAsync({
        stationId,
        userVehicleId: showOtherVehicle ? undefined : (selectedUserVehicleId ? Number(selectedUserVehicleId) : undefined),
        customVehicleName: showOtherVehicle ? customVehicleName : undefined,
        batteryStartPercent: batteryStart ? Number(batteryStart) : undefined,
      });
      toast({ title: t("charging.sessionStarted"), description: t("charging.sessionStartedDesc") });
      setOpenStart(false);
      setBatteryStart("");
      setCustomVehicleName("");
      setShowOtherVehicle(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "image/jpeg",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await res.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      setScreenshotPath(objectPath);
      toast({ title: t("charging.screenshotUploaded") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setIsUploading(false);
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
        screenshotPath: screenshotPath || undefined,
      });
      toast({ title: t("charging.sessionEnded"), description: t("charging.sessionEndedDesc") });
      setOpenEnd(false);
      setBatteryEnd("");
      setEnergyKwh("");
      setScreenshotPath(null);
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
                      min={activeSession?.batteryStartPercent ?? 0}
                      max="100"
                      placeholder={isArabic ? "أدخل نسبة البطارية" : "Enter battery %"}
                      value={batteryEnd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatteryEnd(val);
                        if (val && activeSession?.batteryStartPercent !== null && activeSession?.batteryStartPercent !== undefined) {
                          if (Number(val) < activeSession.batteryStartPercent) {
                            setBatteryEndError(isArabic ? "يجب أن تكون أكبر من نسبة البداية" : "Must be greater than start percentage");
                          } else {
                            setBatteryEndError("");
                          }
                        } else {
                          setBatteryEndError("");
                        }
                      }}
                      className={`pr-8 ${batteryEndError ? "border-red-500" : ""}`}
                      data-testid="input-battery-end"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  {batteryEndError && <p className="text-xs text-red-500">{batteryEndError}</p>}
                  {activeSession?.batteryStartPercent !== null && activeSession?.batteryStartPercent !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? `نسبة البداية: ${activeSession.batteryStartPercent}%` : `Started at: ${activeSession.batteryStartPercent}%`}
                    </p>
                  )}
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
                      placeholder={isArabic ? "أدخل كمية الطاقة" : "Enter energy"}
                      value={energyKwh}
                      onChange={(e) => setEnergyKwh(e.target.value)}
                      className="pr-12"
                      data-testid="input-energy-kwh"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">kWh</span>
                  </div>
                  {estimatedCost > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700 dark:text-emerald-400">
                        {isArabic ? "التكلفة التقديرية:" : "Estimated cost:"}{" "}
                        <span className="font-semibold">{estimatedCost.toFixed(3)} {currencySymbol}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {t("charging.screenshot")}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t("charging.screenshotHint")}</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    data-testid="button-upload-screenshot-details"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : screenshotPath ? (
                      <Check className="mr-2 h-4 w-4 text-emerald-500" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    {screenshotPath ? t("charging.screenshotUploaded") : t("charging.uploadScreenshot")}
                  </Button>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (activeSession) {
                      cancelSessionMutation.mutate(activeSession.id);
                    }
                  }}
                  disabled={cancelSessionMutation.isPending || endSession.isPending}
                  className="w-full sm:w-auto"
                  data-testid="button-cancel-session"
                >
                  {cancelSessionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <X className="mr-2 h-4 w-4" />
                  {isArabic ? "إلغاء (بدون حفظ)" : "Cancel (don't save)"}
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setOpenEnd(false)} className="flex-1 sm:flex-none">
                    {t("common.cancel")}
                  </Button>
                  <Button 
                    onClick={handleEndSession}
                    disabled={endSession.isPending || isUploading || !!batteryEndError}
                    className="bg-emerald-500 hover:bg-emerald-600 flex-1 sm:flex-none"
                    data-testid="button-confirm-end-session"
                  >
                    {endSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("charging.endSession")}
                  </Button>
                </div>
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
                  {!showCustomCatalogVehicle ? (
                    <Select value={selectedCatalogVehicleId} onValueChange={handleCatalogVehicleChange}>
                      <SelectTrigger data-testid="select-catalog-vehicle">
                        <SelectValue placeholder={t("vehicle.selectModel")} />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                            {isArabic ? `${vehicle.brandAr} ${vehicle.modelAr}` : `${vehicle.brand} ${vehicle.model}`}
                          </SelectItem>
                        ))}
                        <SelectItem value="other_catalog" data-testid="other-catalog-vehicle">
                          {t("vehicle.other")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder={t("vehicle.enterCustomName")}
                        value={customCatalogVehicleName}
                        onChange={(e) => setCustomCatalogVehicleName(e.target.value)}
                        data-testid="input-custom-catalog-vehicle"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-0 h-auto text-xs text-primary"
                        onClick={() => {
                          setShowCustomCatalogVehicle(false);
                          setCustomCatalogVehicleName("");
                        }}
                      >
                        {t("vehicle.selectFromList")}
                      </Button>
                    </div>
                  )}
                  {selectedCatalogVehicle && !showCustomCatalogVehicle && (
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>{selectedCatalogVehicle.batteryCapacityKwh} kWh</span>
                      <span>{selectedCatalogVehicle.chargerType}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setShowAddVehicle(false);
                      setShowCustomCatalogVehicle(false);
                      setCustomCatalogVehicleName("");
                    }}>
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleAddVehicle} 
                      disabled={(!selectedCatalogVehicleId && !showCustomCatalogVehicle) || (showCustomCatalogVehicle && !customCatalogVehicleName.trim()) || createUserVehicle.isPending}
                    >
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
                      <SelectItem value="other" data-testid="other-vehicle">
                        {t("vehicle.other")}
                      </SelectItem>
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
                  {selectedUserVehicle?.evVehicle && !showOtherVehicle && (
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>{selectedUserVehicle.evVehicle.batteryCapacityKwh} kWh</span>
                      <span>{selectedUserVehicle.evVehicle.chargerType}</span>
                    </div>
                  )}
                  {showOtherVehicle && (
                    <div className="space-y-2">
                      <Input
                        placeholder={t("vehicle.enterCustomName")}
                        value={customVehicleName}
                        onChange={(e) => setCustomVehicleName(e.target.value)}
                        data-testid="input-custom-vehicle-name"
                      />
                    </div>
                  )}
                  {!isLoggedIn && userVehicles.length === 0 && !showOtherVehicle && (
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
                    placeholder={isArabic ? "أدخل نسبة البطارية" : "Enter battery %"}
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

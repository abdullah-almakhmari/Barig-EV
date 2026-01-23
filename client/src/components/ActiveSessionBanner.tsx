import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, X, Clock, Battery, Gauge, Loader2, Camera, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/components/LanguageContext";
import { apiRequest, getCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChargingSession, Station } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { api } from "@shared/routes";

interface ActiveSessionResponse {
  session: ChargingSession;
  station: Station | null;
}

export function ActiveSessionBanner() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [batteryEnd, setBatteryEnd] = useState("");
  const [energyKwh, setEnergyKwh] = useState("");
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<ActiveSessionResponse | null>({
    queryKey: ["/api/charging-sessions/my-active"],
    queryFn: async () => {
      const res = await fetch("/api/charging-sessions/my-active", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && !authLoading,
    refetchInterval: 30000,
  });

  const endSessionMutation = useMutation({
    mutationFn: async ({ sessionId, batteryEndPercent, energyKwh, screenshotPath }: { sessionId: number; batteryEndPercent?: number; energyKwh?: number; screenshotPath?: string }) => {
      return apiRequest("POST", `/api/charging-sessions/${sessionId}/end`, { batteryEndPercent, energyKwh, screenshotPath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions/my-active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions"] });
      if (data?.station) {
        queryClient.invalidateQueries({ queryKey: [api.stations.get.path, data.station.id] });
        queryClient.invalidateQueries({ queryKey: [api.stations.list.path] });
        queryClient.invalidateQueries({ queryKey: ['/api/stations', data.station.id, 'verification-summary'] });
      }
      toast({ title: t("charging.sessionEnded"), description: t("charging.sessionEndedDesc") });
      setShowEndDialog(false);
      setBatteryEnd("");
      setEnergyKwh("");
      setScreenshotPath(null);
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!data?.session?.startTime) return;

    const updateElapsed = () => {
      const start = new Date(data.session.startTime!);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours > 0) {
        setElapsedTime(`${hours}h ${mins}m`);
      } else {
        setElapsedTime(`${mins}m`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [data?.session?.startTime]);

  if (authLoading || isLoading || !data || !data.session || dismissed) {
    return null;
  }

  const stationName = language === "ar" 
    ? data.station?.nameAr || data.station?.name 
    : data.station?.name || data.station?.nameAr;

  const handleViewSession = () => {
    if (data.station) {
      setLocation(`/station/${data.station.id}`);
    }
  };

  const handleEndSession = () => {
    setShowEndDialog(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.session) return;

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

      // Automatically end session after successful upload
      endSessionMutation.mutate({
        sessionId: data.session.id,
        screenshotPath: objectPath,
      });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const confirmEndSession = () => {
    if (!data?.session) return;
    endSessionMutation.mutate({
      sessionId: data.session.id,
      batteryEndPercent: batteryEnd ? Number(batteryEnd) : undefined,
      energyKwh: energyKwh ? Number(energyKwh) : undefined,
      screenshotPath: screenshotPath || undefined,
    });
  };

  return (
    <>
    <div className="bg-orange-500 text-white px-4 py-3" data-testid="active-session-banner">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium" data-testid="text-active-session-message">
              {t("charging.activeSessionBanner")} {stationName && `${t("charging.atStation")} ${stationName}`}
            </p>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Clock className="h-3 w-3" />
              <span data-testid="text-session-duration">{elapsedTime}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewSession}
            className="bg-white text-orange-600 hover:bg-orange-50"
            data-testid="button-view-session"
          >
            {t("charging.resume")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            data-testid="button-end-session"
          >
            {t("charging.endNow")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="text-white hover:bg-white/20"
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
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
                data-testid="input-battery-end-banner"
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
                data-testid="input-energy-kwh-banner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">kWh</span>
            </div>
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
              data-testid="button-upload-screenshot"
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEndDialog(false)}>
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={confirmEndSession}
            disabled={endSessionMutation.isPending || isUploading}
            className="bg-emerald-500 hover:bg-emerald-600"
            data-testid="button-confirm-end-session-banner"
          >
            {endSessionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("charging.endSession")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

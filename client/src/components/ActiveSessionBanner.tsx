import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap, X, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/components/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChargingSession, Station } from "@shared/schema";
import { useState, useEffect } from "react";

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
    mutationFn: async (sessionId: number) => {
      return apiRequest("POST", `/api/charging-sessions/${sessionId}/end`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions/my-active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/charging-sessions"] });
      toast({ title: t("charging.sessionEnded"), description: t("charging.sessionEndedDesc") });
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
    endSessionMutation.mutate(data.session.id);
  };

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3" data-testid="active-session-banner">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/20 rounded-full p-2">
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
            data-testid="button-view-session"
          >
            {t("charging.resume")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending}
            className="bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20"
            data-testid="button-end-session"
          >
            {t("charging.endNow")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="hover:bg-primary-foreground/20"
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

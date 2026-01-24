import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, FileWarning, MapPin, Check, X, AlertTriangle, Eye, EyeOff, Download, Database, ChevronDown, Camera, BatteryCharging, MessageCircle, Users, Zap, CheckCircle, BarChart3, FileSpreadsheet, GraduationCap, Clock, Globe, Activity, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { SEO } from "@/components/SEO";
import type { Station, ChargingSession, ContactMessage } from "@shared/schema";

type AdminReport = {
  id: number;
  stationId: number;
  userId: string | null;
  status: string;
  reason: string | null;
  reviewStatus: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  stationName?: string;
  stationNameAr?: string;
  reporterEmail?: string;
  reportCount?: number;
};

export default function AdminPanel() {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";

  const { data: reports, isLoading: reportsLoading } = useQuery<AdminReport[]>({
    queryKey: ["/api/admin/reports"],
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ["/api/admin/stations"],
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: sessionsWithScreenshots, isLoading: sessionsLoading } = useQuery<(ChargingSession & { stationName?: string; stationNameAr?: string; userEmail?: string })[]>({
    queryKey: ["/api/admin/charging-sessions"],
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: contactMessages, isLoading: messagesLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/contact-messages"],
    enabled: user?.role === "admin",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/contact-messages/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-messages"] });
      toast({ title: isArabic ? "تم تحديث الرسالة" : "Message updated" });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const groupedReports = useMemo(() => {
    if (!reports) return [];
    const grouped = reports.reduce((acc, report) => {
      const key = report.stationId;
      if (!acc[key]) {
        acc[key] = {
          stationId: report.stationId,
          stationName: report.stationName,
          stationNameAr: report.stationNameAr,
          reports: [],
        };
      }
      acc[key].reports.push(report);
      return acc;
    }, {} as Record<number, { stationId: number; stationName?: string; stationNameAr?: string; reports: AdminReport[] }>);
    return Object.values(grouped);
  }, [reports]);

  const groupedScreenshots = useMemo(() => {
    if (!sessionsWithScreenshots) return [];
    const grouped = sessionsWithScreenshots.reduce((acc, session) => {
      const key = session.userId || "unknown";
      if (!acc[key]) {
        acc[key] = {
          userId: session.userId,
          userEmail: session.userEmail,
          sessions: [],
        };
      }
      acc[key].sessions.push(session);
      return acc;
    }, {} as Record<string, { userId: string | null; userEmail?: string; sessions: typeof sessionsWithScreenshots }>);
    return Object.values(grouped).sort((a, b) => b.sessions.length - a.sessions.length);
  }, [sessionsWithScreenshots]);

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, reviewStatus }: { id: number; reviewStatus: string }) => {
      return await apiRequest("PATCH", `/api/admin/reports/${id}/review`, { reviewStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: t("admin.reportUpdated") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ id, isHidden }: { id: number; isHidden: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/stations/${id}/visibility`, { isHidden });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stations"] });
      toast({ title: t("admin.stationUpdated") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const updateApprovalMutation = useMutation({
    mutationFn: async ({ id, approvalStatus }: { id: number; approvalStatus: string }) => {
      return await apiRequest("PATCH", `/api/admin/stations/${id}/approval`, { approvalStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stations"] });
      toast({ title: t("admin.approvalUpdated") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const getReviewStatusBadge = (reviewStatus: string | null, reportStatus?: string) => {
    switch (reviewStatus) {
      case "resolved":
        return <Badge className="bg-green-500">{t("admin.resolved")}</Badge>;
      case "rejected":
        return <Badge variant="secondary">{t("admin.rejected")}</Badge>;
      case "confirmed_working":
        return <Badge className="bg-green-500">{isArabic ? "مؤكد - يعمل" : "Confirmed Working"}</Badge>;
      case "confirmed_broken":
        return <Badge className="bg-red-500">{isArabic ? "مؤكد - لا يعمل" : "Confirmed Broken"}</Badge>;
      case "confirmed":
        if (reportStatus === "NOT_WORKING" || reportStatus === "BROKEN") {
          return <Badge className="bg-red-500">{t("admin.confirmed")}</Badge>;
        }
        return <Badge className="bg-green-500">{t("admin.confirmed")}</Badge>;
      default:
        return <Badge variant="secondary">{t("admin.open")}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SEO title={t("admin.title")} description={t("admin.description")} />
      
      <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8" />
          {t("admin.title")}
        </h1>
        <p className="text-slate-300">{t("admin.description")}</p>
      </div>

      {/* Dashboard Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FileWarning className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "البلاغات" : "Reports"}</p>
                <p className="text-2xl font-bold text-amber-600">
                  {reportsLoading ? "..." : reports?.filter(r => r.reviewStatus === "pending" || !r.reviewStatus).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">{isArabic ? "قيد المراجعة" : "Pending"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "المحطات" : "Stations"}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stationsLoading ? "..." : stations?.filter(s => s.approvalStatus === "pending").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">{isArabic ? "تنتظر الموافقة" : "Pending"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <MessageCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "الرسائل" : "Messages"}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {messagesLoading ? "..." : contactMessages?.filter(m => m.status === "unread").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">{isArabic ? "غير مقروءة" : "Unread"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Camera className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "الصور" : "Screenshots"}</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {sessionsLoading ? "..." : sessionsWithScreenshots?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">{isArabic ? "جلسات شحن" : "Sessions"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full sm:w-[750px] grid-cols-5 rounded-xl">
          <TabsTrigger value="reports" className="rounded-lg flex items-center gap-2" data-testid="tab-reports">
            <FileWarning className="w-4 h-4" />
            {t("admin.reports")}
          </TabsTrigger>
          <TabsTrigger value="stations" className="rounded-lg flex items-center gap-2" data-testid="tab-stations">
            <MapPin className="w-4 h-4" />
            {t("admin.stations")}
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-lg flex items-center gap-2" data-testid="tab-messages">
            <MessageCircle className="w-4 h-4" />
            {isArabic ? "الرسائل" : "Messages"}
            {contactMessages && contactMessages.filter(m => m.status === "unread").length > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                {contactMessages.filter(m => m.status === "unread").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-lg flex items-center gap-2" data-testid="tab-sessions">
            <Camera className="w-4 h-4" />
            {isArabic ? "الصور" : "Screenshots"}
          </TabsTrigger>
          <TabsTrigger value="export" className="rounded-lg flex items-center gap-2" data-testid="tab-export">
            <Database className="w-4 h-4" />
            {isArabic ? "تصدير" : "Export"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          {reportsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            </div>
          ) : groupedReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t("admin.noReports")}
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {groupedReports.map((group) => {
                const openReports = group.reports.filter(r => r.reviewStatus === "open");
                const hasOpenReports = openReports.length > 0;
                
                return (
                  <AccordionItem 
                    key={group.stationId} 
                    value={`station-${group.stationId}`}
                    className="border rounded-lg bg-card"
                    data-testid={`accordion-station-${group.stationId}`}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full text-start">
                        <span className="font-semibold text-lg">
                          {isArabic ? group.stationNameAr : group.stationName}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {hasOpenReports && (
                            <Badge className="bg-orange-500">
                              {openReports.length} {isArabic ? "مفتوح" : "Open"}
                            </Badge>
                          )}
                          <Badge variant="outline" className="flex items-center gap-1">
                            <FileWarning className="w-3 h-3" />
                            {group.reports.length} {t("admin.totalReports")}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-2">
                        {group.reports.map((report) => (
                          <div 
                            key={report.id} 
                            className="border rounded-lg p-4 bg-muted/30"
                            data-testid={`card-report-${report.id}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                {getReviewStatusBadge(report.reviewStatus, report.status)}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">{t("admin.reason")}:</span>{" "}
                                <span className="font-medium">{report.reason || report.status}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t("admin.reportedBy")}:</span>{" "}
                                <span className="font-medium">{report.reporterEmail || t("admin.anonymous")}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t("admin.createdAt")}:</span>{" "}
                                <span className="font-medium">
                                  {report.createdAt ? new Date(report.createdAt).toLocaleDateString(isArabic ? "ar-OM" : "en-US") : "-"}
                                </span>
                              </div>
                            </div>
                            
                            {report.reviewStatus === "open" && (
                              <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t">
                                <Button
                                  size="sm"
                                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "confirmed_working" })}
                                  disabled={updateReportMutation.isPending}
                                  data-testid={`button-confirm-working-${report.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                  {isArabic ? "تأكيد أنه يعمل" : "Confirm Working"}
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white"
                                  onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "confirmed_broken" })}
                                  disabled={updateReportMutation.isPending}
                                  data-testid={`button-confirm-broken-${report.id}`}
                                >
                                  <X className="w-4 h-4" />
                                  {isArabic ? "تأكيد أنه لا يعمل" : "Confirm Broken"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1"
                                  onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "rejected" })}
                                  disabled={updateReportMutation.isPending}
                                  data-testid={`button-reject-${report.id}`}
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  {t("admin.reject")}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="stations" className="mt-4">
          {stationsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            </div>
          ) : !stations || stations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t("admin.noStations")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Station Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {stations.filter(s => s.approvalStatus === "PENDING").length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? "بانتظار الموافقة" : "Pending"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-500/50 bg-green-500/5">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {stations.filter(s => s.approvalStatus === "APPROVED" && !s.isHidden).length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? "موافق عليها" : "Approved"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-500/50 bg-red-500/5">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {stations.filter(s => s.approvalStatus === "REJECTED").length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? "مرفوضة" : "Rejected"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-muted">
                  <CardContent className="py-4 text-center">
                    <div className="text-3xl font-bold text-muted-foreground">
                      {stations.filter(s => s.isHidden).length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? "مخفية" : "Hidden"}
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Show PENDING stations first */}
              {stations
                .sort((a, b) => {
                  if (a.approvalStatus === "PENDING" && b.approvalStatus !== "PENDING") return -1;
                  if (a.approvalStatus !== "PENDING" && b.approvalStatus === "PENDING") return 1;
                  return 0;
                })
                .map((station) => (
                <Card 
                  key={station.id} 
                  className={`${station.isHidden || station.approvalStatus === "REJECTED" ? "opacity-60" : ""} ${station.approvalStatus === "PENDING" ? "border-yellow-500 border-2" : ""}`} 
                  data-testid={`card-station-${station.id}`}
                >
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">
                            {isArabic ? station.nameAr : station.name}
                          </span>
                          {/* Approval Status Badges */}
                          {station.approvalStatus === "PENDING" && (
                            <Badge className="bg-yellow-500 text-white flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {t("admin.pending")}
                            </Badge>
                          )}
                          {station.approvalStatus === "APPROVED" && (
                            <Badge className="bg-green-500 text-white flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {t("admin.approved")}
                            </Badge>
                          )}
                          {station.approvalStatus === "REJECTED" && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <X className="w-3 h-3" />
                              {t("admin.rejected")}
                            </Badge>
                          )}
                          {station.isHidden && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              {t("admin.hidden")}
                            </Badge>
                          )}
                          {station.trustLevel === "LOW" && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                              {t("station.underReview")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {isArabic ? station.cityAr : station.city} • {station.chargerType} • {station.status}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {/* Approval Actions - Show for PENDING stations */}
                        {station.approvalStatus === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              className="flex items-center gap-1 bg-green-600"
                              onClick={() => updateApprovalMutation.mutate({ id: station.id, approvalStatus: "APPROVED" })}
                              disabled={updateApprovalMutation.isPending}
                              data-testid={`button-approve-${station.id}`}
                            >
                              <Check className="w-4 h-4" />
                              {t("admin.approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex items-center gap-1"
                              onClick={() => updateApprovalMutation.mutate({ id: station.id, approvalStatus: "REJECTED" })}
                              disabled={updateApprovalMutation.isPending}
                              data-testid={`button-reject-${station.id}`}
                            >
                              <X className="w-4 h-4" />
                              {t("admin.rejectStation")}
                            </Button>
                          </>
                        )}
                        {/* Visibility Actions - Show for already approved/rejected */}
                        {station.approvalStatus !== "PENDING" && (
                          station.isHidden ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={() => updateVisibilityMutation.mutate({ id: station.id, isHidden: false })}
                              disabled={updateVisibilityMutation.isPending}
                              data-testid={`button-restore-${station.id}`}
                            >
                              <Eye className="w-4 h-4" />
                              {t("admin.restore")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-destructive hover:text-destructive"
                              onClick={() => updateVisibilityMutation.mutate({ id: station.id, isHidden: true })}
                              disabled={updateVisibilityMutation.isPending}
                              data-testid={`button-hide-${station.id}`}
                            >
                              <EyeOff className="w-4 h-4" />
                              {t("admin.hide")}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            </div>
          ) : !contactMessages || contactMessages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                {isArabic ? "لا توجد رسائل" : "No messages"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {contactMessages.map((msg) => (
                <Card key={msg.id} className={msg.status === "unread" ? "border-primary/50 bg-primary/5" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-lg">{msg.subject}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={msg.status === "unread" ? "destructive" : msg.status === "replied" ? "default" : "secondary"}>
                          {msg.status === "unread" ? (isArabic ? "جديد" : "New") : 
                           msg.status === "read" ? (isArabic ? "مقروء" : "Read") : 
                           (isArabic ? "تم الرد" : "Replied")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {msg.createdAt && new Date(msg.createdAt).toLocaleDateString(isArabic ? "ar-OM" : "en-US")}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {msg.userName && <span>{isArabic ? "الاسم:" : "Name:"} {msg.userName}</span>}
                        {msg.userEmail && <span>{isArabic ? "البريد:" : "Email:"} {msg.userEmail}</span>}
                        {msg.userPhone && <span>{isArabic ? "الهاتف:" : "Phone:"} <a href={`tel:${msg.userPhone}`} className="text-primary hover:underline" dir="ltr">{msg.userPhone}</a></span>}
                      </div>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex gap-2">
                        {msg.status === "unread" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMessageMutation.mutate({ id: msg.id, status: "read" })}
                            disabled={updateMessageMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {isArabic ? "تحديد كمقروء" : "Mark Read"}
                          </Button>
                        )}
                        {msg.status !== "replied" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateMessageMutation.mutate({ id: msg.id, status: "replied" })}
                            disabled={updateMessageMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {isArabic ? "تم الرد" : "Mark Replied"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          {sessionsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            </div>
          ) : !sessionsWithScreenshots || sessionsWithScreenshots.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                {isArabic ? "لا توجد جلسات شحن بها صور" : "No charging sessions with screenshots"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Users className="w-4 h-4" />
                {isArabic 
                  ? `${groupedScreenshots.length} مستخدم • ${sessionsWithScreenshots.length} صورة`
                  : `${groupedScreenshots.length} users • ${sessionsWithScreenshots.length} photos`}
              </div>
              <Accordion type="multiple" className="space-y-2">
                {groupedScreenshots.map((group) => (
                  <AccordionItem 
                    key={group.userId || "unknown"} 
                    value={group.userId || "unknown"}
                    className="border rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover-elevate" data-testid={`user-screenshots-${group.userId}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-start flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {group.userEmail || (isArabic ? "مستخدم غير معروف" : "Unknown user")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isArabic 
                              ? `${group.sessions.length} صورة`
                              : `${group.sessions.length} photo${group.sessions.length > 1 ? "s" : ""}`}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          <Camera className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          {group.sessions.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                        {group.sessions.map((session) => (
                          <Card 
                            key={session.id} 
                            className="overflow-hidden hover-elevate cursor-pointer"
                            onClick={() => session.screenshotPath && setSelectedScreenshot(session.screenshotPath)}
                            data-testid={`session-screenshot-card-${session.id}`}
                          >
                            {session.screenshotPath && (
                              <div className="aspect-video bg-muted relative">
                                <img
                                  src={session.screenshotPath.startsWith('/') ? session.screenshotPath : `/${session.screenshotPath}`}
                                  alt="Session screenshot"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2">
                                  <Badge className="bg-blue-500">
                                    <Camera className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                    {isArabic ? "صورة" : "Photo"}
                                  </Badge>
                                </div>
                              </div>
                            )}
                            <CardContent className="p-3">
                              <div className="font-medium text-sm mb-1">
                                {isArabic ? session.stationNameAr || session.stationName : session.stationName}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2">
                                  <BatteryCharging className="w-3 h-3" />
                                  {session.energyKwh ? `${session.energyKwh.toFixed(1)} kWh` : "-"}
                                </div>
                                <div>
                                  {session.startTime && new Date(session.startTime).toLocaleDateString(isArabic ? "ar-OM" : "en-US")}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </TabsContent>

        <TabsContent value="export" className="mt-4 space-y-6">
          {/* Header Section */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">
                    {isArabic ? "تصدير البيانات للبحث الأكاديمي" : "Academic Research Data Export"}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {isArabic 
                      ? "مجموعات بيانات شاملة بصيغة CSV للتحليل الأكاديمي والبحث العلمي. تتضمن بيانات المستخدمين للتحليل الارتباطي."
                      : "Comprehensive CSV datasets for academic analysis and scientific research. Includes user data for correlation analysis."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary Download */}
          <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">{isArabic ? "ملخص إحصائي سريع" : "Quick Summary Statistics"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? "نظرة عامة على جميع مقاييس المنصة" : "Overview of all platform metrics"}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => window.open("/api/admin/export/summary", "_blank")}
                  data-testid="button-export-summary"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isArabic ? "تحميل الملخص" : "Download Summary"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Primary Datasets */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              {isArabic ? "مجموعات البيانات الأساسية" : "Primary Datasets"}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Users Dataset */}
              <Card className="border-2 hover-elevate group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {isArabic ? "جديد" : "NEW"}
                    </Badge>
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-base mt-2">
                    {isArabic ? "بيانات المستخدمين" : "Users Dataset"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "ملفات المستخدمين مع تحليلات سلوك الشحن والمحطات المفضلة"
                      : "User profiles with charging behavior analytics and favorite stations"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["email", "trust_score", "total_sessions", "energy_kwh", "favorite_station"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/users", "_blank")}
                    data-testid="button-export-users"
                  >
                    <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {isArabic ? "تحميل CSV" : "Download CSV"}
                  </Button>
                </CardContent>
              </Card>

              {/* Stations Dataset */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {isArabic ? "محسّن" : "Enhanced"}
                    </Badge>
                    <MapPin className="w-5 h-5 text-green-500" />
                  </div>
                  <CardTitle className="text-base mt-2">
                    {isArabic ? "بيانات المحطات" : "Stations Dataset"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "محطات الشحن مع الموقع والمقاييس وإحصائيات التحقق والأصوات"
                      : "Charging stations with location, metrics, verification stats and votes"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["location", "power_kw", "trust_score", "sessions", "votes"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/stations", "_blank")}
                    data-testid="button-export-stations"
                  >
                    <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {isArabic ? "تحميل CSV" : "Download CSV"}
                  </Button>
                </CardContent>
              </Card>

              {/* Sessions Dataset */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {isArabic ? "محسّن" : "Enhanced"}
                    </Badge>
                    <Zap className="w-5 h-5 text-yellow-500" />
                  </div>
                  <CardTitle className="text-base mt-2">
                    {isArabic ? "جلسات الشحن" : "Charging Sessions"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "سجلات جلسات الشحن التفصيلية مع الطاقة ومستويات البطارية"
                      : "Detailed session records with energy and battery levels"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["user_email", "station", "energy_kwh", "duration", "battery"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/sessions", "_blank")}
                    data-testid="button-export-sessions"
                  >
                    <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {isArabic ? "تحميل CSV" : "Download CSV"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Secondary Datasets */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              {isArabic ? "مجموعات بيانات إضافية" : "Additional Datasets"}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Verifications Dataset */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {isArabic ? "جديد" : "NEW"}
                    </Badge>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <CardTitle className="text-base mt-2">
                    {isArabic ? "أصوات التحقق" : "Verification Votes"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "أصوات التحقق المجتمعية مع الأنماط الزمنية (يوم الأسبوع، الساعة)"
                      : "Community verification votes with temporal patterns (day, hour)"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["voter_email", "trust_level", "vote", "day_of_week", "hour"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/verifications", "_blank")}
                    data-testid="button-export-verifications"
                  >
                    <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {isArabic ? "تحميل CSV" : "Download CSV"}
                  </Button>
                </CardContent>
              </Card>

              {/* Reports Dataset */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {isArabic ? "محسّن" : "Enhanced"}
                    </Badge>
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <CardTitle className="text-base mt-2">
                    {isArabic ? "بلاغات المحطات" : "Station Reports"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "مشاكل المحطات المقدمة من المستخدمين مع حالة المراجعة"
                      : "User-submitted station issues with review status"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["reporter_email", "station", "reason", "review_status"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/reports", "_blank")}
                    data-testid="button-export-reports"
                  >
                    <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {isArabic ? "تحميل CSV" : "Download CSV"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Advanced Analytics */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {isArabic ? "تحليلات متقدمة لعلم البيانات" : "Advanced Analytics for Data Science"}
              <Badge variant="secondary" className="text-xs">{isArabic ? "جديد" : "NEW"}</Badge>
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Temporal Patterns */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                  </div>
                  <CardTitle className="text-sm mt-2">
                    {isArabic ? "الأنماط الزمنية" : "Temporal Patterns"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "مصفوفة 24 ساعة × 7 أيام للشحن والتحقق"
                      : "24-hour × 7-day matrix for charging and verification"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["hour", "day", "sessions", "energy", "votes"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    size="sm"
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/temporal", "_blank")}
                    data-testid="button-export-temporal"
                  >
                    <Download className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                    {isArabic ? "تحميل" : "Download"}
                  </Button>
                </CardContent>
              </Card>

              {/* Geographic Analysis */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-sm mt-2">
                    {isArabic ? "التحليل الجغرافي" : "Geographic Analysis"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "توزيع المحطات والاستخدام حسب المدينة"
                      : "Station distribution and usage by city"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["city", "stations", "sessions", "energy", "chargers"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    size="sm"
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/geographic", "_blank")}
                    data-testid="button-export-geographic"
                  >
                    <Download className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                    {isArabic ? "تحميل" : "Download"}
                  </Button>
                </CardContent>
              </Card>

              {/* User Behavior */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                  </div>
                  <CardTitle className="text-sm mt-2">
                    {isArabic ? "سلوك المستخدمين" : "User Behavior"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "أنماط التفاعل ومعدلات المشاركة"
                      : "Engagement patterns and activity rates"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["frequency", "accuracy", "preferred_time", "engagement"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    size="sm"
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/behavior", "_blank")}
                    data-testid="button-export-behavior"
                  >
                    <Download className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                    {isArabic ? "تحميل" : "Download"}
                  </Button>
                </CardContent>
              </Card>

              {/* Reliability Metrics */}
              <Card className="border-2 hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-sm mt-2">
                    {isArabic ? "مقاييس الموثوقية" : "Reliability Metrics"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isArabic
                      ? "درجات الموثوقية ومعدلات الحل للمحطات"
                      : "Station reliability scores and resolution rates"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["working_rate", "confidence", "resolution", "score"].map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    size="sm"
                    variant="outline"
                    onClick={() => window.open("/api/admin/export/reliability", "_blank")}
                    data-testid="button-export-reliability"
                  >
                    <Download className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                    {isArabic ? "تحميل" : "Download"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Research Notes */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">
                    {isArabic ? "ملاحظات للبحث الأكاديمي" : "Academic Research Notes"}
                  </h4>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      {isArabic ? "تتضمن بيانات البريد الإلكتروني للتحليل الارتباطي" : "Includes email data for correlation analysis"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      {isArabic ? "البيانات للقراءة فقط - لا يمكن تعديل قاعدة البيانات" : "Data is read-only - no database modifications"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      {isArabic ? "جميع الملفات بصيغة CSV متوافقة مع Excel و SPSS" : "All files in CSV format compatible with Excel & SPSS"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500" />
                      {isArabic ? "التصدير متاح للمدير فقط لأغراض البحث" : "Export available to admin only for research purposes"}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? "صورة شاشة الشاحن" : "Charger Screenshot"}
            </DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="relative">
              <img
                src={selectedScreenshot.startsWith('/') ? selectedScreenshot : `/${selectedScreenshot}`}
                alt="Charger screenshot"
                className="w-full rounded-lg"
                data-testid="admin-screenshot-image"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

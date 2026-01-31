import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, FileWarning, MapPin, Check, X, AlertTriangle, Eye, EyeOff, Download, Database, Camera, BatteryCharging, MessageCircle, Users, Zap, BarChart3, FileSpreadsheet, GraduationCap, ChevronRight, Inbox, Bell, Clock, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
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

type ActiveSection = "overview" | "reports" | "stations" | "messages" | "sessions" | "export" | null;

export default function AdminPanel() {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";
  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");

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

  const pendingReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.reviewStatus === "open" || r.reviewStatus === "pending" || !r.reviewStatus);
  }, [reports]);

  const pendingStations = useMemo(() => {
    if (!stations) return [];
    return stations.filter(s => s.approvalStatus === "PENDING");
  }, [stations]);

  const unreadMessages = useMemo(() => {
    if (!contactMessages) return [];
    return contactMessages.filter(m => m.status === "unread");
  }, [contactMessages]);

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

  const totalActionItems = pendingReports.length + pendingStations.length + unreadMessages.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      <SEO title={t("admin.title")} description={t("admin.description")} />
      
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8" />
              {t("admin.title")}
            </h1>
            <p className="text-slate-300">{t("admin.description")}</p>
          </div>
          {totalActionItems > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-lg">
              <Bell className="w-5 h-5 text-amber-400" />
              <span className="text-amber-100 font-medium">
                {totalActionItems} {isArabic ? "عنصر يحتاج انتباهك" : "items need attention"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Cards - Items Requiring Attention */}
      {totalActionItems > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            {isArabic ? "يتطلب إجراء" : "Requires Action"}
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Pending Stations */}
            {pendingStations.length > 0 && (
              <Card className="border-2 border-yellow-500/50 bg-yellow-500/5 hover-elevate cursor-pointer" onClick={() => setActiveSection("stations")} data-testid="card-pending-stations">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-500/20 rounded-xl">
                      <MapPin className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold">{isArabic ? "محطات جديدة" : "New Stations"}</h3>
                        <Badge className="bg-yellow-500">{pendingStations.length}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {isArabic ? "محطات تنتظر الموافقة" : "Stations awaiting approval"}
                      </p>
                      {pendingStations.slice(0, 2).map((station) => (
                        <div key={station.id} className="text-sm py-1 border-t border-yellow-500/20">
                          <span className="font-medium">{isArabic ? station.nameAr : station.name}</span>
                          <span className="text-muted-foreground mx-2">•</span>
                          <span className="text-muted-foreground">{isArabic ? station.cityAr : station.city}</span>
                        </div>
                      ))}
                      {pendingStations.length > 2 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{pendingStations.length - 2} {isArabic ? "أخرى" : "more"}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 rtl:rotate-180" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending Reports */}
            {pendingReports.length > 0 && (
              <Card className="border-2 border-orange-500/50 bg-orange-500/5 hover-elevate cursor-pointer" onClick={() => setActiveSection("reports")} data-testid="card-pending-reports">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <FileWarning className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold">{isArabic ? "بلاغات مفتوحة" : "Open Reports"}</h3>
                        <Badge className="bg-orange-500">{pendingReports.length}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {isArabic ? "بلاغات تحتاج مراجعة" : "Reports need review"}
                      </p>
                      {pendingReports.slice(0, 2).map((report) => (
                        <div key={report.id} className="text-sm py-1 border-t border-orange-500/20">
                          <span className="font-medium">{isArabic ? report.stationNameAr : report.stationName}</span>
                          <span className="text-muted-foreground mx-2">•</span>
                          <span className="text-muted-foreground">{report.reason || report.status}</span>
                        </div>
                      ))}
                      {pendingReports.length > 2 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{pendingReports.length - 2} {isArabic ? "أخرى" : "more"}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 rtl:rotate-180" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unread Messages */}
            {unreadMessages.length > 0 && (
              <Card className="border-2 border-purple-500/50 bg-purple-500/5 hover-elevate cursor-pointer" onClick={() => setActiveSection("messages")} data-testid="card-unread-messages">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <MessageCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold">{isArabic ? "رسائل جديدة" : "New Messages"}</h3>
                        <Badge className="bg-purple-500">{unreadMessages.length}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {isArabic ? "رسائل غير مقروءة" : "Unread messages"}
                      </p>
                      {unreadMessages.slice(0, 2).map((msg) => (
                        <div key={msg.id} className="text-sm py-1 border-t border-purple-500/20">
                          <span className="font-medium">{msg.subject}</span>
                          <span className="text-muted-foreground mx-2">•</span>
                          <span className="text-muted-foreground">{msg.userName || msg.userEmail}</span>
                        </div>
                      ))}
                      {unreadMessages.length > 2 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{unreadMessages.length - 2} {isArabic ? "أخرى" : "more"}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 rtl:rotate-180" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-elevate cursor-pointer" onClick={() => setActiveSection("stations")} data-testid="stat-total-stations">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي المحطات" : "Total Stations"}</p>
                <p className="text-2xl font-bold text-green-600">
                  {stationsLoading ? "..." : stations?.filter(s => s.approvalStatus === "APPROVED" && !s.isHidden).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => setActiveSection("sessions")} data-testid="stat-sessions">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "جلسات بصور" : "Sessions w/ Photos"}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {sessionsLoading ? "..." : sessionsWithScreenshots?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => setActiveSection("reports")} data-testid="stat-total-reports">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FileWarning className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي البلاغات" : "Total Reports"}</p>
                <p className="text-2xl font-bold text-amber-600">
                  {reportsLoading ? "..." : reports?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => setActiveSection("export")} data-testid="stat-export">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500/20 rounded-lg">
                <Database className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isArabic ? "تصدير البيانات" : "Export Data"}</p>
                <p className="text-sm font-medium text-slate-600">
                  {isArabic ? "CSV / JSON" : "CSV / JSON"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Content based on activeSection */}
      {activeSection === "stations" && (
        <SectionCard
          title={isArabic ? "إدارة المحطات" : "Manage Stations"}
          icon={<MapPin className="w-5 h-5" />}
          onClose={() => setActiveSection("overview")}
          isArabic={isArabic}
        >
          {stationsLoading ? (
            <LoadingState />
          ) : !stations || stations.length === 0 ? (
            <EmptyState icon={<MapPin />} text={t("admin.noStations")} />
          ) : (
            <div className="space-y-3">
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
                          <Link href={`/station/${station.id}`} className="font-semibold text-lg hover:text-primary flex items-center gap-1">
                            {isArabic ? station.nameAr : station.name}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          {station.approvalStatus === "PENDING" && (
                            <Badge className="bg-yellow-500 text-white">
                              <AlertTriangle className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("admin.pending")}
                            </Badge>
                          )}
                          {station.approvalStatus === "APPROVED" && (
                            <Badge className="bg-green-500 text-white">
                              <Check className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("admin.approved")}
                            </Badge>
                          )}
                          {station.approvalStatus === "REJECTED" && (
                            <Badge variant="destructive">
                              <X className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("admin.rejected")}
                            </Badge>
                          )}
                          {station.isHidden && (
                            <Badge variant="secondary">
                              <EyeOff className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("admin.hidden")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {isArabic ? station.cityAr : station.city} • {station.chargerType} • {station.status}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {station.approvalStatus === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600"
                              onClick={() => updateApprovalMutation.mutate({ id: station.id, approvalStatus: "APPROVED" })}
                              disabled={updateApprovalMutation.isPending}
                              data-testid={`button-approve-${station.id}`}
                            >
                              <Check className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("admin.approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateApprovalMutation.mutate({ id: station.id, approvalStatus: "REJECTED" })}
                              disabled={updateApprovalMutation.isPending}
                              data-testid={`button-reject-${station.id}`}
                            >
                              <X className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("admin.rejectStation")}
                            </Button>
                          </>
                        )}
                        {station.approvalStatus !== "PENDING" && (
                          station.isHidden ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateVisibilityMutation.mutate({ id: station.id, isHidden: false })}
                              disabled={updateVisibilityMutation.isPending}
                              data-testid={`button-restore-${station.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                              {t("admin.restore")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => updateVisibilityMutation.mutate({ id: station.id, isHidden: true })}
                              disabled={updateVisibilityMutation.isPending}
                              data-testid={`button-hide-${station.id}`}
                            >
                              <EyeOff className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
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
        </SectionCard>
      )}

      {activeSection === "reports" && (
        <SectionCard
          title={isArabic ? "إدارة البلاغات" : "Manage Reports"}
          icon={<FileWarning className="w-5 h-5" />}
          onClose={() => setActiveSection("overview")}
          isArabic={isArabic}
        >
          {reportsLoading ? (
            <LoadingState />
          ) : !reports || reports.length === 0 ? (
            <EmptyState icon={<FileWarning />} text={t("admin.noReports")} />
          ) : (
            <div className="space-y-3">
              {reports
                .sort((a, b) => {
                  const aOpen = a.reviewStatus === "open" || !a.reviewStatus;
                  const bOpen = b.reviewStatus === "open" || !b.reviewStatus;
                  if (aOpen && !bOpen) return -1;
                  if (!aOpen && bOpen) return 1;
                  return 0;
                })
                .map((report) => {
                  const isOpen = report.reviewStatus === "open" || !report.reviewStatus;
                  return (
                    <Card key={report.id} className={isOpen ? "border-orange-500/50" : "opacity-70"} data-testid={`card-report-${report.id}`}>
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Link href={`/station/${report.stationId}`} className="font-semibold hover:text-primary flex items-center gap-1">
                                {isArabic ? report.stationNameAr : report.stationName}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                              {isOpen ? (
                                <Badge className="bg-orange-500">{isArabic ? "مفتوح" : "Open"}</Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {report.reviewStatus === "confirmed_working" ? (isArabic ? "يعمل" : "Working") :
                                   report.reviewStatus === "confirmed_broken" ? (isArabic ? "لا يعمل" : "Broken") :
                                   report.reviewStatus === "rejected" ? (isArabic ? "مرفوض" : "Rejected") :
                                   report.reviewStatus}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm space-y-1">
                              <p><span className="text-muted-foreground">{isArabic ? "السبب:" : "Reason:"}</span> {report.reason || report.status}</p>
                              <p><span className="text-muted-foreground">{isArabic ? "من:" : "By:"}</span> {report.reporterEmail || (isArabic ? "مجهول" : "Anonymous")}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {report.createdAt ? new Date(report.createdAt).toLocaleDateString(isArabic ? "ar-OM" : "en-US") : "-"}
                              </p>
                            </div>
                          </div>
                          {isOpen && (
                            <div className="flex gap-2 flex-wrap shrink-0">
                              <Button
                                size="sm"
                                className="bg-green-500"
                                onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "confirmed_working" })}
                                disabled={updateReportMutation.isPending}
                                data-testid={`button-confirm-working-${report.id}`}
                              >
                                <Check className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                                {isArabic ? "يعمل" : "Working"}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-500"
                                onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "confirmed_broken" })}
                                disabled={updateReportMutation.isPending}
                                data-testid={`button-confirm-broken-${report.id}`}
                              >
                                <X className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                                {isArabic ? "لا يعمل" : "Broken"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "rejected" })}
                                disabled={updateReportMutation.isPending}
                                data-testid={`button-reject-${report.id}`}
                              >
                                <AlertTriangle className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                                {isArabic ? "رفض" : "Reject"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </SectionCard>
      )}

      {activeSection === "messages" && (
        <SectionCard
          title={isArabic ? "الرسائل" : "Messages"}
          icon={<MessageCircle className="w-5 h-5" />}
          onClose={() => setActiveSection("overview")}
          isArabic={isArabic}
        >
          {messagesLoading ? (
            <LoadingState />
          ) : !contactMessages || contactMessages.length === 0 ? (
            <EmptyState icon={<MessageCircle />} text={isArabic ? "لا توجد رسائل" : "No messages"} />
          ) : (
            <div className="space-y-3">
              {contactMessages
                .sort((a, b) => {
                  if (a.status === "unread" && b.status !== "unread") return -1;
                  if (a.status !== "unread" && b.status === "unread") return 1;
                  return 0;
                })
                .map((msg) => (
                <Card key={msg.id} className={msg.status === "unread" ? "border-primary/50 bg-primary/5" : ""}>
                  <CardContent className="py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{msg.subject}</h3>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-1">
                            {msg.userName && <span>{msg.userName}</span>}
                            {msg.userEmail && <span>{msg.userEmail}</span>}
                            {msg.userPhone && (
                              <a href={`tel:${msg.userPhone}`} className="text-primary hover:underline" dir="ltr">
                                {msg.userPhone}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={msg.status === "unread" ? "destructive" : msg.status === "replied" ? "default" : "secondary"}>
                            {msg.status === "unread" ? (isArabic ? "جديد" : "New") : 
                             msg.status === "read" ? (isArabic ? "مقروء" : "Read") : 
                             (isArabic ? "تم الرد" : "Replied")}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex gap-2 flex-wrap">
                        {msg.status === "unread" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMessageMutation.mutate({ id: msg.id, status: "read" })}
                            disabled={updateMessageMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                            {isArabic ? "تحديد كمقروء" : "Mark Read"}
                          </Button>
                        )}
                        {msg.status !== "replied" && (
                          <Button
                            size="sm"
                            onClick={() => updateMessageMutation.mutate({ id: msg.id, status: "replied" })}
                            disabled={updateMessageMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
                            {isArabic ? "تم الرد" : "Replied"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {activeSection === "sessions" && (
        <SectionCard
          title={isArabic ? "صور جلسات الشحن" : "Charging Session Photos"}
          icon={<Camera className="w-5 h-5" />}
          onClose={() => setActiveSection("overview")}
          isArabic={isArabic}
        >
          {sessionsLoading ? (
            <LoadingState />
          ) : !sessionsWithScreenshots || sessionsWithScreenshots.length === 0 ? (
            <EmptyState icon={<Camera />} text={isArabic ? "لا توجد صور" : "No photos"} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sessionsWithScreenshots.map((session) => (
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
                    </div>
                  )}
                  <CardContent className="p-3">
                    <div className="font-medium text-sm mb-1">
                      {isArabic ? session.stationNameAr || session.stationName : session.stationName}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        {session.userEmail || (isArabic ? "مجهول" : "Unknown")}
                      </div>
                      <div className="flex items-center gap-2">
                        <BatteryCharging className="w-3 h-3" />
                        {session.energyKwh ? `${session.energyKwh.toFixed(1)} kWh` : "-"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {session.startTime && new Date(session.startTime).toLocaleDateString(isArabic ? "ar-OM" : "en-US")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {activeSection === "export" && (
        <SectionCard
          title={isArabic ? "تصدير البيانات" : "Export Data"}
          icon={<Database className="w-5 h-5" />}
          onClose={() => setActiveSection("overview")}
          isArabic={isArabic}
        >
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/20 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">
                      {isArabic ? "تصدير البيانات للبحث الأكاديمي" : "Academic Research Data Export"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isArabic 
                        ? "مجموعات بيانات شاملة بصيغة CSV للتحليل الأكاديمي والبحث العلمي"
                        : "Comprehensive CSV datasets for academic analysis and scientific research"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ExportCard
                title={isArabic ? "ملخص إحصائي" : "Summary Statistics"}
                description={isArabic ? "نظرة عامة على جميع مقاييس المنصة" : "Overview of all platform metrics"}
                icon={<BarChart3 className="w-5 h-5 text-primary" />}
                onDownload={() => window.open("/api/admin/export/summary", "_blank")}
                isArabic={isArabic}
              />
              <ExportCard
                title={isArabic ? "بيانات المستخدمين" : "Users Dataset"}
                description={isArabic ? "ملفات المستخدمين مع تحليلات سلوك الشحن" : "User profiles with charging behavior analytics"}
                icon={<Users className="w-5 h-5 text-blue-500" />}
                onDownload={() => window.open("/api/admin/export/users", "_blank")}
                isArabic={isArabic}
              />
              <ExportCard
                title={isArabic ? "بيانات المحطات" : "Stations Dataset"}
                description={isArabic ? "محطات الشحن مع الموقع والمقاييس" : "Charging stations with location and metrics"}
                icon={<MapPin className="w-5 h-5 text-green-500" />}
                onDownload={() => window.open("/api/admin/export/stations", "_blank")}
                isArabic={isArabic}
              />
              <ExportCard
                title={isArabic ? "جلسات الشحن" : "Charging Sessions"}
                description={isArabic ? "سجلات جلسات الشحن التفصيلية" : "Detailed session records with energy data"}
                icon={<Zap className="w-5 h-5 text-yellow-500" />}
                onDownload={() => window.open("/api/admin/export/sessions", "_blank")}
                isArabic={isArabic}
              />
              <ExportCard
                title={isArabic ? "التحققات" : "Verifications"}
                description={isArabic ? "سجلات تحقق المجتمع من حالة المحطات" : "Community verification records"}
                icon={<Check className="w-5 h-5 text-emerald-500" />}
                onDownload={() => window.open("/api/admin/export/verifications", "_blank")}
                isArabic={isArabic}
              />
              <ExportCard
                title={isArabic ? "البلاغات" : "Reports"}
                description={isArabic ? "بلاغات المشاكل مع التفاصيل" : "Issue reports with details"}
                icon={<FileWarning className="w-5 h-5 text-orange-500" />}
                onDownload={() => window.open("/api/admin/export/reports", "_blank")}
                isArabic={isArabic}
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Screenshot Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{isArabic ? "صورة الشحن" : "Charging Screenshot"}</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <img
              src={selectedScreenshot.startsWith('/') ? selectedScreenshot : `/${selectedScreenshot}`}
              alt="Session screenshot"
              className="w-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionCard({ title, icon, children, onClose, isArabic }: { title: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void; isArabic: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
            {isArabic ? "إغلاق" : "Close"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ExportCard({ title, description, icon, onDownload, isArabic }: { title: string; description: string; icon: React.ReactNode; onDownload: () => void; isArabic: boolean }) {
  return (
    <Card className="hover-elevate">
      <CardContent className="py-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-muted rounded-lg shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button className="w-full" variant="outline" size="sm" onClick={onDownload}>
          <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {isArabic ? "تحميل CSV" : "Download CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-pulse h-8 w-32 bg-muted rounded" />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      <div className="w-12 h-12 mx-auto mb-4 opacity-50 flex items-center justify-center">
        {icon}
      </div>
      {text}
    </div>
  );
}

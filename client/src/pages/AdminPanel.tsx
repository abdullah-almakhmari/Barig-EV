import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileWarning, MapPin, Check, X, AlertTriangle, Eye, EyeOff, Download, Database } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { SEO } from "@/components/SEO";
import type { Station } from "@shared/schema";

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
        return <Badge className="bg-red-500">{t("admin.rejected")}</Badge>;
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

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full sm:w-[500px] grid-cols-3 rounded-xl">
          <TabsTrigger value="reports" className="rounded-lg flex items-center gap-2" data-testid="tab-reports">
            <FileWarning className="w-4 h-4" />
            {t("admin.reports")}
          </TabsTrigger>
          <TabsTrigger value="stations" className="rounded-lg flex items-center gap-2" data-testid="tab-stations">
            <MapPin className="w-4 h-4" />
            {t("admin.stations")}
          </TabsTrigger>
          <TabsTrigger value="export" className="rounded-lg flex items-center gap-2" data-testid="tab-export">
            <Database className="w-4 h-4" />
            {isArabic ? "تصدير البيانات" : "Data Export"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          {reportsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse h-8 w-32 bg-muted rounded" />
            </div>
          ) : !reports || reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t("admin.noReports")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} data-testid={`card-report-${report.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-lg">
                        {isArabic ? report.stationNameAr : report.stationName}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getReviewStatusBadge(report.reviewStatus, report.status)}
                        <Badge variant="outline" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {report.reportCount} {t("admin.totalReports")}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
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
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "resolved" })}
                            disabled={updateReportMutation.isPending}
                            data-testid={`button-resolve-${report.id}`}
                          >
                            <Check className="w-4 h-4" />
                            {t("admin.resolve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "rejected" })}
                            disabled={updateReportMutation.isPending}
                            data-testid={`button-reject-${report.id}`}
                          >
                            <X className="w-4 h-4" />
                            {t("admin.reject")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() => updateReportMutation.mutate({ id: report.id, reviewStatus: "confirmed" })}
                            disabled={updateReportMutation.isPending}
                            data-testid={`button-confirm-${report.id}`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            {t("admin.confirm")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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

        <TabsContent value="export" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                {isArabic ? "تصدير البيانات للبحث الأكاديمي" : "Data Export for Academic Research"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-sm">
                {isArabic 
                  ? "تصدير مجموعات البيانات بصيغة CSV للتحليل الأكاديمي. جميع الملفات لا تتضمن بيانات شخصية للمستخدمين."
                  : "Export datasets in CSV format for academic analysis. All exports exclude personally identifiable user information."}
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-2 hover-elevate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {isArabic ? "محطات الشحن" : "Stations Dataset"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {isArabic
                        ? "مواقع محطات الشحن مع درجات الثقة وإحصائيات النشاط"
                        : "EV charging station locations with trust scores and activity counts"}
                    </p>
                    <div className="text-xs text-muted-foreground/80 font-mono bg-muted p-2 rounded">
                      station_id, latitude, longitude, charger_type, power_kw, trust_score, total_reports, total_verifications, created_at
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

                <Card className="border-2 hover-elevate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      {isArabic ? "جلسات الشحن" : "Charging Sessions"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {isArabic
                        ? "سجلات جلسات الشحن مع حسابات المدة"
                        : "Charging session records with duration calculations"}
                    </p>
                    <div className="text-xs text-muted-foreground/80 font-mono bg-muted p-2 rounded">
                      session_id, station_id, start_time, end_time, duration_minutes, created_at
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

                <Card className="border-2 hover-elevate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileWarning className="w-4 h-4 text-orange-500" />
                      {isArabic ? "البلاغات" : "Reports Dataset"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {isArabic
                        ? "بلاغات المستخدمين عن حالة المحطات"
                        : "User-submitted station status reports"}
                    </p>
                    <div className="text-xs text-muted-foreground/80 font-mono bg-muted p-2 rounded">
                      report_id, station_id, report_reason, created_at, resolved
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

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {isArabic ? "ملاحظات الخصوصية" : "Privacy Notes"}
                </h4>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• {isArabic ? "لا تتضمن معرفات المستخدمين أو عناوين البريد الإلكتروني" : "User IDs and email addresses are excluded"}</li>
                  <li>• {isArabic ? "البيانات للقراءة فقط - لا يمكن تعديل قاعدة البيانات" : "Data is read-only - no database modifications"}</li>
                  <li>• {isArabic ? "مناسبة للتحليل الأكاديمي والبحث العلمي" : "Suitable for academic analysis and research"}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

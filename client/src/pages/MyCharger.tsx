import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Home, Zap, Users, Wallet, Clock, Car, Plus, Settings, Trash2, MapPin, TrendingUp, ChevronRight, BatteryCharging } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { SEO } from "@/components/SEO";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Station, ChargerRental, RentalSessionWithDetails } from "@shared/schema";

type ChargerRentalWithStation = ChargerRental & { station?: Station };

type DashboardData = {
  summary: {
    totalEarnings: number;
    totalSessions: number;
    totalEnergy: number;
    chargerCount: number;
  };
  chargers: (ChargerRentalWithStation & { recentSessions?: RentalSessionWithDetails[] })[];
};

export default function MyCharger() {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";
  
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [pricePerKwh, setPricePerKwh] = useState<string>("0.025");
  const [isAvailable, setIsAvailable] = useState(true);
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [editingRental, setEditingRental] = useState<ChargerRentalWithStation | null>(null);
  
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/charger-rentals/dashboard"],
    enabled: !!user,
  });
  
  const { data: myStations } = useQuery<Station[]>({
    queryKey: ["/api/stations/my-stations"],
    enabled: !!user,
  });
  
  const createRentalMutation = useMutation({
    mutationFn: async (data: { stationId: number; pricePerKwh: number; isAvailableForRent?: boolean; description?: string; descriptionAr?: string }) => {
      return apiRequest("POST", "/api/charger-rentals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charger-rentals/dashboard"] });
      setShowSetupDialog(false);
      setEditingRental(null);
      resetForm();
      toast({
        title: isArabic ? "تم الحفظ" : "Saved",
        description: isArabic ? "تم حفظ إعدادات التأجير بنجاح" : "Rental settings saved successfully",
      });
    },
    onError: () => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في حفظ الإعدادات" : "Failed to save settings",
        variant: "destructive",
      });
    },
  });
  
  const deleteRentalMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/charger-rentals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charger-rentals/dashboard"] });
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? "تم إيقاف التأجير" : "Rental stopped",
      });
    },
  });
  
  const resetForm = () => {
    setSelectedStationId("");
    setPricePerKwh("0.025");
    setIsAvailable(true);
    setDescription("");
    setDescriptionAr("");
  };
  
  const handleSetupRental = () => {
    if (!selectedStationId || !pricePerKwh) return;
    
    createRentalMutation.mutate({
      stationId: parseInt(selectedStationId),
      pricePerKwh: parseFloat(pricePerKwh),
      isAvailableForRent: isAvailable,
      description,
      descriptionAr,
    });
  };
  
  const handleEditRental = (rental: ChargerRentalWithStation) => {
    setEditingRental(rental);
    setSelectedStationId(String(rental.stationId));
    setPricePerKwh(String(rental.pricePerKwh));
    setIsAvailable(rental.isAvailableForRent ?? true);
    setDescription(rental.description || "");
    setDescriptionAr(rental.descriptionAr || "");
    setShowSetupDialog(true);
  };
  
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };
  
  const availableStationsForRent = myStations?.filter(s => 
    !dashboard?.chargers?.some(c => c.stationId === s.id) || editingRental?.stationId === s.id
  ) || [];
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <>
      <SEO 
        title={isArabic ? "شاحني المنزلي - بارق" : "My Charger - Bariq"}
        description={isArabic ? "إدارة تأجير شاحنك المنزلي" : "Manage your home charger rental"}
      />
      
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Home className="w-6 h-6 text-primary" />
                {isArabic ? "شاحني المنزلي" : "My Home Charger"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isArabic ? "أجّر شاحنك المنزلي واكسب المال" : "Rent out your charger and earn money"}
              </p>
            </div>
            
            {availableStationsForRent.length > 0 && (
              <Dialog open={showSetupDialog} onOpenChange={(open) => {
                setShowSetupDialog(open);
                if (!open) {
                  setEditingRental(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-add-rental">
                    <Plus className="w-4 h-4 me-2" />
                    {isArabic ? "إضافة شاحن" : "Add Charger"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRental 
                        ? (isArabic ? "تعديل إعدادات التأجير" : "Edit Rental Settings")
                        : (isArabic ? "إعداد تأجير الشاحن" : "Setup Charger Rental")
                      }
                    </DialogTitle>
                    <DialogDescription>
                      {isArabic 
                        ? "حدد السعر لكل كيلوواط ساعة لتأجير شاحنك"
                        : "Set your price per kWh to rent out your charger"
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? "اختر المحطة" : "Select Station"}</Label>
                      <Select value={selectedStationId} onValueChange={setSelectedStationId} disabled={!!editingRental}>
                        <SelectTrigger data-testid="select-station">
                          <SelectValue placeholder={isArabic ? "اختر محطة..." : "Choose a station..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStationsForRent.map(station => (
                            <SelectItem key={station.id} value={String(station.id)}>
                              {isArabic ? station.nameAr : station.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{isArabic ? "السعر لكل كيلوواط/ساعة (ر.ع)" : "Price per kWh (OMR)"}</Label>
                      <Input 
                        type="number"
                        step="0.001"
                        min="0"
                        value={pricePerKwh}
                        onChange={(e) => setPricePerKwh(e.target.value)}
                        placeholder="0.025"
                        data-testid="input-price"
                      />
                      <p className="text-xs text-muted-foreground">
                        {isArabic 
                          ? `مثال: إذا شحن شخص 50 kWh = ${(parseFloat(pricePerKwh || "0") * 50).toFixed(3)} ر.ع`
                          : `Example: If someone charges 50 kWh = ${(parseFloat(pricePerKwh || "0") * 50).toFixed(3)} OMR`
                        }
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>{isArabic ? "متاح للتأجير" : "Available for Rent"}</Label>
                      <Switch 
                        checked={isAvailable} 
                        onCheckedChange={setIsAvailable}
                        data-testid="switch-available"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{isArabic ? "وصف (اختياري)" : "Description (Optional)"}</Label>
                      <Input 
                        value={isArabic ? descriptionAr : description}
                        onChange={(e) => isArabic ? setDescriptionAr(e.target.value) : setDescription(e.target.value)}
                        placeholder={isArabic ? "معلومات إضافية للمستأجرين..." : "Additional info for renters..."}
                        data-testid="input-description"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      onClick={handleSetupRental}
                      disabled={!selectedStationId || !pricePerKwh || createRentalMutation.isPending}
                      data-testid="btn-save-rental"
                    >
                      {createRentalMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                      {isArabic ? "حفظ" : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          {dashboardLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : dashboard && dashboard.chargers.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Wallet className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                    <p className="text-2xl font-bold text-emerald-600">{dashboard.summary.totalEarnings.toFixed(3)}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي الأرباح (ر.ع)" : "Total Earnings (OMR)"}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold text-blue-600">{dashboard.summary.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "عدد الجلسات" : "Total Sessions"}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Zap className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                    <p className="text-2xl font-bold text-amber-600">{dashboard.summary.totalEnergy.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "الطاقة (kWh)" : "Energy (kWh)"}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Home className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold text-purple-600">{dashboard.summary.chargerCount}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "الشواحن" : "Chargers"}</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BatteryCharging className="w-5 h-5 text-primary" />
                    {isArabic ? "الشواحن المؤجرة" : "Your Rental Chargers"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible className="space-y-2">
                    {dashboard.chargers.map(charger => (
                      <AccordionItem key={charger.id} value={String(charger.id)} className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center justify-between w-full pe-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Home className="w-5 h-5 text-primary" />
                              </div>
                              <div className="text-start">
                                <p className="font-medium">{isArabic ? charger.station?.nameAr : charger.station?.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {isArabic ? charger.station?.cityAr : charger.station?.city}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={charger.isAvailableForRent ? "default" : "secondary"}>
                                {charger.isAvailableForRent 
                                  ? (isArabic ? "متاح" : "Available")
                                  : (isArabic ? "متوقف" : "Paused")
                                }
                              </Badge>
                              <div className="text-end">
                                <p className="text-sm font-bold text-emerald-600">{charger.pricePerKwh} {charger.currency}/kWh</p>
                                <p className="text-xs text-muted-foreground">
                                  {isArabic ? `${charger.totalSessionsCount || 0} جلسة` : `${charger.totalSessionsCount || 0} sessions`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3 py-3 border-b">
                              <div className="text-center">
                                <p className="text-lg font-bold text-emerald-600">{(charger.totalEarnings || 0).toFixed(3)}</p>
                                <p className="text-xs text-muted-foreground">{isArabic ? "الأرباح (ر.ع)" : "Earnings"}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-blue-600">{charger.totalSessionsCount || 0}</p>
                                <p className="text-xs text-muted-foreground">{isArabic ? "الجلسات" : "Sessions"}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-amber-600">{(charger.totalEnergyKwh || 0).toFixed(1)}</p>
                                <p className="text-xs text-muted-foreground">{isArabic ? "الطاقة (kWh)" : "Energy"}</p>
                              </div>
                            </div>
                            
                            {charger.recentSessions && charger.recentSessions.length > 0 ? (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4" />
                                  {isArabic ? "آخر الجلسات" : "Recent Sessions"}
                                </h4>
                                {charger.recentSessions.map(session => (
                                  <div 
                                    key={session.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    data-testid={`rental-session-${session.id}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                        <Car className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{session.renterName || (isArabic ? "مستخدم" : "User")}</p>
                                        {session.renterVehicle && (
                                          <p className="text-xs text-muted-foreground">
                                            {session.renterVehicle.evVehicle 
                                              ? `${session.renterVehicle.evVehicle.brand} ${session.renterVehicle.evVehicle.model}`
                                              : session.renterVehicle.nickname
                                            }
                                          </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                          {session.startTime && format(
                                            new Date(session.startTime),
                                            "PPp",
                                            { locale: isArabic ? ar : undefined }
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-end">
                                      <p className="text-sm font-bold text-emerald-600">
                                        +{(session.rentalTotalCost || 0).toFixed(3)} {charger.currency}
                                      </p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-2 justify-end">
                                        <span className="flex items-center gap-1">
                                          <Zap className="w-3 h-3" />
                                          {(session.energyKwh || 0).toFixed(2)} kWh
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatDuration(session.durationMinutes)}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">{isArabic ? "لا توجد جلسات تأجير بعد" : "No rental sessions yet"}</p>
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditRental(charger)}
                                data-testid={`btn-edit-rental-${charger.id}`}
                              >
                                <Settings className="w-4 h-4 me-1" />
                                {isArabic ? "تعديل" : "Edit"}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-destructive"
                                onClick={() => deleteRentalMutation.mutate(charger.id)}
                                data-testid={`btn-delete-rental-${charger.id}`}
                              >
                                <Trash2 className="w-4 h-4 me-1" />
                                {isArabic ? "إيقاف التأجير" : "Stop Rental"}
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">
                  {isArabic ? "لم تقم بإعداد تأجير الشاحن بعد" : "No charger rental setup yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isArabic 
                    ? "أضف محطة شحن خاصة بك أولاً ثم قم بإعداد التأجير"
                    : "Add your own charging station first, then set up rental"
                  }
                </p>
                {myStations && myStations.length > 0 ? (
                  <Button onClick={() => setShowSetupDialog(true)} data-testid="btn-setup-first-rental">
                    <Plus className="w-4 h-4 me-2" />
                    {isArabic ? "إعداد التأجير" : "Setup Rental"}
                  </Button>
                ) : (
                  <Link href="/add-station">
                    <Button data-testid="btn-add-station-first">
                      <Plus className="w-4 h-4 me-2" />
                      {isArabic ? "أضف محطة شحن" : "Add Charging Station"}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

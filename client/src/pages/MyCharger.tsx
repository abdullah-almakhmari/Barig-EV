import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Home, Zap, Users, Wallet, Clock, Plus, Settings, Trash2, MapPin, BatteryCharging, Wifi, WifiOff, Cable, ShieldCheck, ShieldAlert, Camera, Upload, CheckCircle2, XCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { SEO } from "@/components/SEO";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Station, ChargerRental, RentalSessionWithDetails, OwnershipVerification } from "@shared/schema";

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

type StationWithVerification = Station & {
  isVerified: boolean;
  verificationMethod: "ESP32" | "MANUAL" | null;
  verificationStatus: string | null;
  verificationCode: string | null;
};

export default function MyCharger() {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";
  
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationWithVerification | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [pricePerKwh, setPricePerKwh] = useState<string>("0.025");
  const [isAvailable, setIsAvailable] = useState(true);
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [editingRental, setEditingRental] = useState<ChargerRentalWithStation | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [currentVerification, setCurrentVerification] = useState<OwnershipVerification | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/charger-rentals/dashboard"],
    enabled: !!user,
  });
  
  const { data: homeStations, isLoading: stationsLoading } = useQuery<StationWithVerification[]>({
    queryKey: ["/api/ownership-verifications/my-home-stations"],
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
    onError: (error: any) => {
      const msg = error?.messageAr && isArabic ? error.messageAr : error?.message;
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: msg || (isArabic ? "فشل في حفظ الإعدادات" : "Failed to save settings"),
        variant: "destructive",
      });
    },
  });
  
  const startVerificationMutation = useMutation({
    mutationFn: async (stationId: number) => {
      const response = await apiRequest("POST", "/api/ownership-verifications", { stationId });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentVerification(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ownership-verifications/my-home-stations"] });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error?.message || (isArabic ? "فشل في بدء التحقق" : "Failed to start verification"),
        variant: "destructive",
      });
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ verificationId, photoUrls }: { verificationId: number; photoUrls: string[] }) => {
      return apiRequest("PATCH", `/api/ownership-verifications/${verificationId}/photos`, { photoUrls });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ownership-verifications/my-home-stations"] });
      setShowVerificationDialog(false);
      setUploadedPhotos([]);
      setCurrentVerification(null);
      setSelectedStation(null);
      toast({
        title: isArabic ? "تم الإرسال" : "Submitted",
        description: isArabic ? "تم إرسال طلب التحقق للمراجعة" : "Verification request submitted for review",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error?.message || (isArabic ? "فشل في رفع الصور" : "Failed to upload photos"),
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

  const handleStartVerification = async (station: StationWithVerification) => {
    setSelectedStation(station);
    if (station.verificationCode && station.verificationStatus === "PENDING") {
      setCurrentVerification({
        id: 0,
        stationId: station.id,
        userId: user?.id || "",
        verificationCode: station.verificationCode,
        status: "PENDING",
        photoUrls: null,
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as OwnershipVerification);
      setShowVerificationDialog(true);
    } else {
      const result = await startVerificationMutation.mutateAsync(station.id);
      setCurrentVerification(result);
      setShowVerificationDialog(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/uploads/upload", {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.objectPath) {
            newUrls.push(data.objectPath);
          }
        }
      }
      
      setUploadedPhotos(prev => [...prev, ...newUrls]);
    } catch (error) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في رفع الصور" : "Failed to upload photos",
        variant: "destructive",
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmitVerification = () => {
    if (!currentVerification || uploadedPhotos.length === 0) return;
    uploadPhotosMutation.mutate({
      verificationId: currentVerification.id,
      photoUrls: uploadedPhotos
    });
  };

  const copyVerificationCode = () => {
    if (currentVerification?.verificationCode) {
      navigator.clipboard.writeText(currentVerification.verificationCode);
      toast({
        title: isArabic ? "تم النسخ" : "Copied",
        description: isArabic ? "تم نسخ رمز التحقق" : "Verification code copied",
      });
    }
  };
  
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };
  
  const verifiedStations = homeStations?.filter(s => s.isVerified && s.approvalStatus === "APPROVED") || [];
  const unverifiedStations = homeStations?.filter(s => !s.isVerified && s.approvalStatus === "APPROVED") || [];
  const pendingVerificationStations = homeStations?.filter(s => s.verificationStatus === "PENDING") || [];
  
  const availableStationsForRent = verifiedStations.filter(s => 
    !dashboard?.chargers?.some(c => c.stationId === s.id) || editingRental?.stationId === s.id
  );
  
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
              <Button onClick={() => setShowSetupDialog(true)} data-testid="btn-add-rental">
                <Plus className="w-4 h-4 me-2" />
                {isArabic ? "إعداد تأجير" : "Setup Rental"}
              </Button>
            )}
          </div>

          {unverifiedStations.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                  {isArabic ? "شواحن تحتاج للتحقق" : "Chargers Need Verification"}
                </CardTitle>
                <CardDescription>
                  {isArabic 
                    ? "يجب التحقق من ملكية الشاحن قبل تأجيره"
                    : "Verify charger ownership before renting it out"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {unverifiedStations.map(station => (
                  <div key={station.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <Home className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{isArabic ? station.nameAr : station.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {isArabic ? station.cityAr : station.city}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleStartVerification(station)}
                      data-testid={`btn-verify-${station.id}`}
                    >
                      <ShieldCheck className="w-4 h-4 me-1" />
                      {isArabic ? "تحقق" : "Verify"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pendingVerificationStations.length > 0 && (
            <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Clock className="w-5 h-5" />
                  {isArabic ? "قيد المراجعة" : "Pending Review"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingVerificationStations.map(station => (
                  <div key={station.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Home className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{isArabic ? station.nameAr : station.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? "في انتظار مراجعة المسؤول" : "Waiting for admin review"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {isArabic ? "قيد المراجعة" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {verifiedStations.length > 0 && (
            <Card className="border-emerald-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  {isArabic ? "الشواحن المُتحقق منها" : "Verified Chargers"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {verifiedStations.map(station => (
                  <div key={station.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        {station.verificationMethod === "ESP32" ? (
                          <Wifi className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{isArabic ? station.nameAr : station.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {isArabic ? station.cityAr : station.city}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-emerald-600">
                      {station.verificationMethod === "ESP32" 
                        ? (isArabic ? "ESP32 متصل" : "ESP32 Connected")
                        : (isArabic ? "مُتحقق منه" : "Verified")
                      }
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          <Dialog open={showVerificationDialog} onOpenChange={(open) => {
            setShowVerificationDialog(open);
            if (!open) {
              setSelectedStation(null);
              setCurrentVerification(null);
              setUploadedPhotos([]);
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {isArabic ? "التحقق من ملكية الشاحن" : "Verify Charger Ownership"}
                </DialogTitle>
                <DialogDescription>
                  {isArabic 
                    ? "اتبع الخطوات التالية للتحقق من ملكيتك للشاحن"
                    : "Follow these steps to verify your charger ownership"
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-medium">
                    {isArabic ? "الخطوة 1: رمز التحقق" : "Step 1: Verification Code"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isArabic 
                      ? "اكتب هذا الرمز على ورقة وضعها بجانب الشاحن"
                      : "Write this code on paper and place it next to your charger"
                    }
                  </p>
                  <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                    <span className="text-3xl font-mono font-bold tracking-widest flex-1 text-center">
                      {currentVerification?.verificationCode || "------"}
                    </span>
                    <Button size="icon" variant="ghost" onClick={copyVerificationCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">
                    {isArabic ? "الخطوة 2: التقط صورة" : "Step 2: Take a Photo"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isArabic 
                      ? "التقط صورة للشاحن مع الورقة التي تحتوي على رمز التحقق"
                      : "Take a photo of your charger with the paper showing the verification code"
                    }
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhotos}
                  >
                    {uploadingPhotos ? (
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 me-2" />
                    )}
                    {isArabic ? "رفع صورة" : "Upload Photo"}
                  </Button>
                  
                  {uploadedPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {uploadedPhotos.map((url, index) => (
                        <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={`/objects/${url}`} 
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 end-1 w-5 h-5"
                            onClick={() => setUploadedPhotos(prev => prev.filter((_, i) => i !== index))}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={handleSubmitVerification}
                  disabled={uploadedPhotos.length === 0 || uploadPhotosMutation.isPending}
                  data-testid="btn-submit-verification"
                >
                  {uploadPhotosMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {isArabic ? "إرسال للمراجعة" : "Submit for Review"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showSetupDialog} onOpenChange={(open) => {
            setShowSetupDialog(open);
            if (!open) {
              setEditingRental(null);
              resetForm();
            }
          }}>
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
                  <Label>{isArabic ? "اختر الشاحن" : "Select Charger"}</Label>
                  <Select value={selectedStationId} onValueChange={setSelectedStationId} disabled={!!editingRental}>
                    <SelectTrigger data-testid="select-station">
                      <SelectValue placeholder={isArabic ? "اختر شاحن..." : "Choose a charger..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStationsForRent.map(station => (
                        <SelectItem key={station.id} value={String(station.id)}>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            {isArabic ? station.nameAr : station.name}
                          </div>
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
          
          {dashboardLoading || stationsLoading ? (
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BatteryCharging className="w-5 h-5 text-primary" />
                      {isArabic ? "الشواحن المؤجرة" : "Your Rental Chargers"}
                    </CardTitle>
                    {availableStationsForRent.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowSetupDialog(true)}
                        data-testid="btn-add-rental-header"
                      >
                        <Plus className="w-4 h-4 me-1" />
                        {isArabic ? "إعداد تأجير" : "Setup Rental"}
                      </Button>
                    )}
                  </div>
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
                            {charger.recentSessions && charger.recentSessions.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  {isArabic ? "آخر جلسات التأجير" : "Recent Rental Sessions"}
                                </p>
                                {charger.recentSessions.map(session => (
                                  <div 
                                    key={session.id} 
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-primary" />
                                      </div>
                                      <div>
                                        {session.renterVehicle && (
                                          <p className="text-sm font-medium">
                                            {session.renterVehicle.nickname}
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
          ) : homeStations && homeStations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">
                  {isArabic ? "لا يوجد شاحن منزلي" : "No Home Charger"}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  {isArabic 
                    ? "لم تقم بإضافة شاحن منزلي بعد. تواصل مع المسؤول لإضافة شاحنك"
                    : "You haven't added a home charger yet. Contact admin to add your charger"
                  }
                </p>
                <Link href="/contact">
                  <Button variant="outline" data-testid="btn-contact-admin">
                    {isArabic ? "تواصل معنا" : "Contact Us"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : verifiedStations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-amber-500/50" />
                <h3 className="text-lg font-medium mb-2">
                  {isArabic ? "يجب التحقق من الملكية أولاً" : "Verify Ownership First"}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  {isArabic 
                    ? "يجب التحقق من ملكية شاحنك قبل تأجيره. اضغط على 'تحقق' بجانب شاحنك أعلاه"
                    : "You need to verify your charger ownership before renting it out. Click 'Verify' next to your charger above"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BatteryCharging className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">
                  {isArabic ? "لم تقم بإعداد تأجير بعد" : "No Rental Setup Yet"}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  {isArabic 
                    ? "لديك شاحن مُتحقق منه! يمكنك الآن إعداد التأجير وتحديد السعر"
                    : "You have a verified charger! You can now set up rental and set your price"
                  }
                </p>
                <Button onClick={() => setShowSetupDialog(true)} data-testid="btn-setup-first-rental">
                  <Plus className="w-4 h-4 me-2" />
                  {isArabic ? "إعداد التأجير" : "Setup Rental"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

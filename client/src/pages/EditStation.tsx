import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowRight, ArrowLeft, Save, Zap, Plus, Trash2, Edit3, Building2, MapPin, Phone, Banknote, Settings, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import type { Station, StationCharger } from "@shared/schema";

type ChargerFormData = {
  id?: number;
  chargerType: "AC" | "DC";
  powerKw: number;
  count: number;
  connectorType: string;
  isNew?: boolean;
};

const GCC_COUNTRY_CODES = [
  { code: "+968", country: "عُمان", countryEn: "Oman" },
  { code: "+971", country: "الإمارات", countryEn: "UAE" },
  { code: "+966", country: "السعودية", countryEn: "Saudi" },
  { code: "+973", country: "البحرين", countryEn: "Bahrain" },
  { code: "+974", country: "قطر", countryEn: "Qatar" },
  { code: "+965", country: "الكويت", countryEn: "Kuwait" },
];

const editStationSchema = z.object({
  name: z.string().min(1, "Required"),
  nameAr: z.string().optional(),
  operator: z.string().optional(),
  chargerType: z.string(),
  powerKw: z.coerce.number().optional(),
  chargerCount: z.coerce.number().min(1).optional(),
  isFree: z.boolean(),
  priceText: z.string().optional(),
  city: z.string().min(1, "Required"),
  cityAr: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  contactPhone: z.string().optional(),
  contactWhatsapp: z.string().optional(),
});

type EditStationFormData = z.infer<typeof editStationSchema>;

export default function EditStation() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [phoneCountryCode, setPhoneCountryCode] = useState("+968");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+968");
  const [chargers, setChargers] = useState<ChargerFormData[]>([]);
  const [showAddCharger, setShowAddCharger] = useState(false);
  const [newCharger, setNewCharger] = useState<ChargerFormData>({
    chargerType: "DC",
    powerKw: 50,
    count: 1,
    connectorType: "CCS",
    isNew: true,
  });

  const { data: station, isLoading: stationLoading, error: stationError } = useQuery<Station>({
    queryKey: ["/api/stations", id],
    enabled: !!id,
  });
  
  // Check if user is the owner of this station
  const isOwner = station && user && station.addedByUserId === user.id;

  const { data: stationChargers } = useQuery<StationCharger[]>({
    queryKey: ["/api/stations", id, "chargers"],
    enabled: !!id,
  });

  const form = useForm<EditStationFormData>({
    resolver: zodResolver(editStationSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      operator: "",
      chargerType: "AC",
      powerKw: 22,
      chargerCount: 1,
      isFree: true,
      priceText: "",
      city: "",
      cityAr: "",
      address: "",
      description: "",
      descriptionAr: "",
      contactPhone: "",
      contactWhatsapp: "",
    },
  });

  useEffect(() => {
    if (station) {
      form.reset({
        name: station.name || "",
        nameAr: station.nameAr || "",
        operator: station.operator || "",
        chargerType: station.chargerType || "AC",
        powerKw: station.powerKw || 22,
        chargerCount: station.chargerCount || 1,
        isFree: station.isFree ?? true,
        priceText: station.priceText || "",
        city: station.city || "",
        cityAr: station.cityAr || "",
        address: station.address || "",
        description: station.description || "",
        descriptionAr: station.descriptionAr || "",
        contactPhone: station.contactPhone?.replace(/^\+\d{3}/, "") || "",
        contactWhatsapp: station.contactWhatsapp?.replace(/^\+\d{3}/, "") || "",
      });
      
      if (station.contactPhone) {
        const code = GCC_COUNTRY_CODES.find(c => station.contactPhone?.startsWith(c.code));
        if (code) setPhoneCountryCode(code.code);
      }
      if (station.contactWhatsapp) {
        const code = GCC_COUNTRY_CODES.find(c => station.contactWhatsapp?.startsWith(c.code));
        if (code) setWhatsappCountryCode(code.code);
      }
    }
  }, [station, form]);

  useEffect(() => {
    if (stationChargers) {
      setChargers(stationChargers.map(c => ({
        id: c.id,
        chargerType: c.chargerType as "AC" | "DC",
        powerKw: c.powerKw || 22,
        count: c.count || 1,
        connectorType: c.connectorType || "",
      })));
    }
  }, [stationChargers]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditStationFormData) => {
      const response = await apiRequest("PATCH", `/api/stations/${id}`, {
        ...data,
        contactPhone: data.contactPhone ? `${phoneCountryCode}${data.contactPhone}` : undefined,
        contactWhatsapp: data.contactWhatsapp ? `${whatsappCountryCode}${data.contactWhatsapp}` : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations"] });
      toast({
        title: isArabic ? "تم التحديث بنجاح" : "Updated successfully",
        description: isArabic ? "تم حفظ التغييرات" : "Changes saved",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Failed to update station",
      });
    },
  });

  const addChargerMutation = useMutation({
    mutationFn: async (charger: ChargerFormData) => {
      const response = await apiRequest("POST", `/api/stations/${id}/chargers`, charger);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations", id, "chargers"] });
      setShowAddCharger(false);
      setNewCharger({ chargerType: "DC", powerKw: 50, count: 1, connectorType: "CCS", isNew: true });
      toast({
        title: isArabic ? "تمت الإضافة" : "Charger added",
      });
    },
  });

  const deleteChargerMutation = useMutation({
    mutationFn: async (chargerId: number) => {
      await apiRequest("DELETE", `/api/stations/${id}/chargers/${chargerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations", id, "chargers"] });
      toast({
        title: isArabic ? "تم الحذف" : "Charger removed",
      });
    },
  });

  const isFree = form.watch("isFree");

  async function onSubmit(data: EditStationFormData) {
    await updateMutation.mutateAsync(data);
  }

  if (stationLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">{isArabic ? "المحطة غير موجودة" : "Station not found"}</h2>
        <p className="text-muted-foreground mb-4">{t("station.notFound")}</p>
        <Button variant="outline" onClick={() => setLocation("/")}>
          {isArabic ? "العودة للرئيسية" : "Back to Home"}
        </Button>
      </div>
    );
  }
  
  // Check if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">{isArabic ? "يجب تسجيل الدخول" : "Login Required"}</h2>
        <p className="text-muted-foreground mb-4">
          {isArabic ? "يجب تسجيل الدخول لتعديل المحطة" : "You must be logged in to edit a station"}
        </p>
        <Button onClick={() => setLocation("/login")}>
          {isArabic ? "تسجيل الدخول" : "Login"}
        </Button>
      </div>
    );
  }
  
  // Check if user is not the owner
  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">{isArabic ? "غير مسموح" : "Not Authorized"}</h2>
        <p className="text-muted-foreground mb-4">
          {isArabic ? "يمكنك تعديل المحطات التي أضفتها فقط" : "You can only edit stations you added"}
        </p>
        <Button variant="outline" onClick={() => setLocation(`/station/${id}`)}>
          {isArabic ? "العودة للمحطة" : "Back to Station"}
        </Button>
      </div>
    );
  }

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl pb-24">
      <SEO title={isArabic ? "تعديل المحطة" : "Edit Station"} />
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(`/stations/${id}`)}
          data-testid="button-back"
        >
          <BackIcon className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {isArabic ? "تعديل المحطة" : "Edit Station"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isArabic ? station.nameAr : station.name}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          <Edit3 className="w-3 h-3 me-1" />
          {isArabic ? "تعديل" : "Edit"}
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Basic Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-primary" />
                {isArabic ? "المعلومات الأساسية" : "Basic Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isArabic ? "اسم المحطة (إنجليزي)" : "Station Name (English)"}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-station-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isArabic ? "اسم المحطة (عربي)" : "Station Name (Arabic)"}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-station-name-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "المشغل" : "Operator"}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={isArabic ? "مثال: شركة الكهرباء" : "e.g., Power Company"} data-testid="input-operator" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-primary" />
                {isArabic ? "الموقع" : "Location"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isArabic ? "المدينة (إنجليزي)" : "City (English)"}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cityAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isArabic ? "المدينة (عربي)" : "City (Arabic)"}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-city-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "العنوان التفصيلي" : "Detailed Address"}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Unified Chargers Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-primary" />
                  {isArabic ? "الشواحن" : "Chargers"}
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCharger(true)}
                  data-testid="button-add-charger"
                >
                  <Plus className="w-4 h-4 me-1" />
                  {isArabic ? "إضافة شاحن" : "Add Charger"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isArabic ? "أضف جميع أنواع الشواحن المتوفرة في هذه المحطة" : "Add all charger types available at this station"}
              </p>
            </CardHeader>
            <CardContent>
              {chargers.length === 0 && !showAddCharger ? (
                <div className="text-center py-6 bg-muted/20 rounded-lg border-2 border-dashed">
                  <Zap className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "لا توجد شواحن - اضغط إضافة شاحن" : "No chargers - click Add Charger"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chargers.map((charger, index) => (
                    <div
                      key={charger.id || index}
                      className="p-3 border rounded-lg bg-background space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${charger.chargerType === 'DC' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          {isArabic ? "شاحن" : "Charger"} {index + 1}
                        </span>
                        {chargers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => charger.id && deleteChargerMutation.mutate(charger.id)}
                            disabled={deleteChargerMutation.isPending}
                            data-testid={`button-delete-charger-${charger.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                          charger.chargerType === 'DC' 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' 
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          <Zap className="w-4 h-4" />
                          <span>{charger.chargerType}</span>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-sm">
                          <span className="font-mono font-medium">{charger.powerKw} kW</span>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-sm">
                          <span>{charger.count} {isArabic ? "منفذ" : "port(s)"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {showAddCharger && (
                    <div className="p-4 border-2 border-primary/20 rounded-lg space-y-4 bg-primary/5">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Plus className="w-4 h-4" />
                        {isArabic ? "شاحن جديد" : "New Charger"}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">{isArabic ? "النوع" : "Type"}</label>
                          <Select
                            value={newCharger.chargerType}
                            onValueChange={(v) => setNewCharger({ ...newCharger, chargerType: v as "AC" | "DC" })}
                          >
                            <SelectTrigger className="mt-1" data-testid="select-new-charger-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AC">AC</SelectItem>
                              <SelectItem value="DC">DC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{isArabic ? "القوة (kW)" : "Power (kW)"}</label>
                          <Input
                            type="number"
                            value={newCharger.powerKw}
                            onChange={(e) => setNewCharger({ ...newCharger, powerKw: parseFloat(e.target.value) })}
                            className="mt-1"
                            data-testid="input-new-charger-power"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{isArabic ? "العدد" : "Count"}</label>
                          <Input
                            type="number"
                            min={1}
                            value={newCharger.count}
                            onChange={(e) => setNewCharger({ ...newCharger, count: parseInt(e.target.value) || 1 })}
                            className="mt-1"
                            data-testid="input-new-charger-count"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addChargerMutation.mutate(newCharger)}
                          disabled={addChargerMutation.isPending}
                          data-testid="button-save-new-charger"
                        >
                          {addChargerMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin me-1" />
                          ) : (
                            <Plus className="w-4 h-4 me-1" />
                          )}
                          {isArabic ? "إضافة" : "Add"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddCharger(false)}
                          data-testid="button-cancel-new-charger"
                        >
                          {isArabic ? "إلغاء" : "Cancel"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="w-4 h-4 text-primary" />
                {isArabic ? "التسعيرة" : "Pricing"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <FormLabel className="text-base font-medium">
                        {isArabic ? "شحن مجاني" : "Free Charging"}
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {isArabic ? "هل الشحن في هذه المحطة مجاني؟" : "Is charging free at this station?"}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-free"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {!isFree && (
                <FormField
                  control={form.control}
                  name="priceText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isArabic ? "تفاصيل التسعيرة" : "Pricing Details"}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={isArabic ? "مثال: 0.050 ر.ع./كيلوواط ساعة" : "e.g., 0.050 OMR/kWh"}
                          data-testid="input-price-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="w-4 h-4 text-primary" />
                {isArabic ? "معلومات الاتصال" : "Contact Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "رقم الهاتف" : "Phone Number"}</FormLabel>
                    <div className="flex gap-2">
                      <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                        <SelectTrigger className="w-24" data-testid="select-phone-country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GCC_COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormControl>
                        <Input {...field} type="tel" className="flex-1" data-testid="input-phone" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactWhatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "واتساب" : "WhatsApp"}</FormLabel>
                    <div className="flex gap-2">
                      <Select value={whatsappCountryCode} onValueChange={setWhatsappCountryCode}>
                        <SelectTrigger className="w-24" data-testid="select-whatsapp-country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GCC_COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormControl>
                        <Input {...field} type="tel" className="flex-1" data-testid="input-whatsapp" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Description Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Edit3 className="w-4 h-4 text-primary" />
                {isArabic ? "الوصف" : "Description"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "الوصف (إنجليزي)" : "Description (English)"}</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="descriptionAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "الوصف (عربي)" : "Description (Arabic)"}</FormLabel>
                    <FormControl>
                      <Textarea {...field} dir="rtl" data-testid="input-description-ar" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="fixed bottom-0 start-0 end-0 p-4 bg-background/95 backdrop-blur border-t">
            <div className="container mx-auto max-w-2xl">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={updateMutation.isPending}
                data-testid="button-save-changes"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin me-2" />
                ) : (
                  <Save className="w-5 h-5 me-2" />
                )}
                {isArabic ? "حفظ التغييرات" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useCreateStation } from "@/hooks/use-stations";
import { insertStationSchema, type InsertStation } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, MapPin, Navigation, Home, Building2, Phone, Check, Banknote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { MapPicker } from "@/components/MapPicker";
import { SEO } from "@/components/SEO";

// Extend schema for form validation if needed (e.g. string to number coercion happens in hook)
const formSchema = insertStationSchema.extend({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  powerKw: z.coerce.number().optional(),
  chargerCount: z.coerce.number().min(1).optional(),
  availableChargers: z.coerce.number().min(0).optional(),
});

export default function AddStation() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createStation = useCreateStation();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<InsertStation>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      city: "",
      cityAr: "",
      operator: "",
      lat: 23.5880,
      lng: 58.3829,
      chargerType: "AC",
      powerKw: 22,
      chargerCount: 1,
      availableChargers: 1,
      isFree: true,
      priceText: "",
      status: "OPERATIONAL",
      stationType: "PUBLIC",
      contactPhone: "",
      contactWhatsapp: "",
    },
  });

  const stationType = form.watch("stationType");
  const isFree = form.watch("isFree");

  function getMyLocation() {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("add.locationNotSupported"),
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("lat", position.coords.latitude);
        form.setValue("lng", position.coords.longitude);
        setIsGettingLocation(false);
        toast({
          title: t("add.locationSuccess"),
          description: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: t("add.locationError"),
        });
      },
      { enableHighAccuracy: true }
    );
  }

  async function onSubmit(data: InsertStation) {
    try {
      const submitData = {
        ...data,
        nameAr: data.nameAr || data.name,
        cityAr: data.cityAr || data.city,
      };
      await createStation.mutateAsync(submitData);
      toast({
        title: t("add.successTitle"),
        description: t("add.successPending"),
      });
      // Redirect to home since pending stations are not publicly visible
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: (error as Error).message,
      });
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <SEO title={t("add.title")} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("add.title")}</h1>
        <p className="text-muted-foreground">Contribute to the network by adding a new charging point.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Station Type Selection */}
            <FormField
              control={form.control}
              name="stationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("add.stationType")}</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => field.onChange("PUBLIC")}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        field.value === "PUBLIC" 
                          ? "border-primary bg-primary/5" 
                          : "border-muted hover:border-primary/50"
                      }`}
                      data-testid="button-station-type-public"
                    >
                      <Building2 className={`h-8 w-8 ${field.value === "PUBLIC" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium">{t("add.stationTypePublic")}</span>
                    </div>
                    <div
                      onClick={() => field.onChange("HOME")}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        field.value === "HOME" 
                          ? "border-primary bg-primary/5" 
                          : "border-muted hover:border-primary/50"
                      }`}
                      data-testid="button-station-type-home"
                    >
                      <Home className={`h-8 w-8 ${field.value === "HOME" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium">{t("add.stationTypeHome")}</span>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("add.stationName")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("add.stationNamePlaceholder")} 
                      {...field} 
                      data-testid="input-station-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("add.cityLabel")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("add.cityPlaceholder")} 
                      {...field}
                      data-testid="input-city"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <FormField
                control={form.control}
                name="chargerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AC">AC (Level 2)</SelectItem>
                        <SelectItem value="DC">DC (Fast)</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="powerKw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Power (kW)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chargerCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center block mb-2">{t("add.chargerCount")}</FormLabel>
                    <div className="flex items-center justify-center gap-3 p-3 rounded-xl border-2 border-muted">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => field.onChange(Math.max(1, (field.value || 1) - 1))}
                        data-testid="button-charger-count-minus"
                      >
                        <span className="text-xl">−</span>
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{field.value || 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => field.onChange((field.value || 1) + 1)}
                        data-testid="button-charger-count-plus"
                      >
                        <span className="text-xl">+</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableChargers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center block mb-2">{t("add.availableChargers")}</FormLabel>
                    <div className="flex items-center justify-center gap-3 p-3 rounded-xl border-2 border-muted">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => field.onChange(Math.max(0, (field.value || 1) - 1))}
                        data-testid="button-available-chargers-minus"
                      >
                        <span className="text-xl">−</span>
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{field.value || 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => {
                          const chargerCount = form.getValues("chargerCount") || 1;
                          field.onChange(Math.min(chargerCount, (field.value || 1) + 1));
                        }}
                        data-testid="button-available-chargers-plus"
                      >
                        <span className="text-xl">+</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isFree"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("add.pricingType")}</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => field.onChange(true)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        field.value === true 
                          ? "border-primary bg-primary/5" 
                          : "border-muted hover:border-primary/50"
                      }`}
                      data-testid="button-pricing-free"
                    >
                      <Check className={`h-5 w-5 ${field.value === true ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium">{t("add.freeCharging")}</span>
                    </div>
                    <div
                      onClick={() => field.onChange(false)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        field.value === false 
                          ? "border-primary bg-primary/5" 
                          : "border-muted hover:border-primary/50"
                      }`}
                      data-testid="button-pricing-paid"
                    >
                      <Banknote className={`h-5 w-5 ${field.value === false ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium">{t("add.paidCharging")}</span>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Price field - shown when not free */}
            {!isFree && (
              <FormField
                control={form.control}
                name="priceText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("add.priceText")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("add.pricePlaceholder")} {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Contact info - shown for home chargers */}
            {stationType === "HOME" && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-dashed">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{t("station.contact")}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("add.contactPhone")}</FormLabel>
                        <FormControl>
                          <Input placeholder="+968 9XXX XXXX" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactWhatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("add.contactWhatsapp")}</FormLabel>
                        <FormControl>
                          <Input placeholder="+968 9XXX XXXX" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <FormLabel className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("add.location")}
              </FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <MapPicker
                  initialLat={form.getValues("lat")}
                  initialLng={form.getValues("lng")}
                  onConfirm={(lat, lng) => {
                    form.setValue("lat", lat);
                    form.setValue("lng", lng);
                    toast({
                      title: t("add.locationSuccess"),
                      description: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    });
                  }}
                  renderTrigger={(onClick) => (
                    <div
                      onClick={onClick}
                      className="cursor-pointer p-4 rounded-xl border-2 border-muted hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2"
                      data-testid="button-pick-from-map"
                    >
                      <MapPin className="h-6 w-6 text-muted-foreground" />
                      <span className="font-medium text-sm">{t("add.pickFromMap")}</span>
                    </div>
                  )}
                />
                <div
                  onClick={getMyLocation}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    isGettingLocation 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-primary/50"
                  }`}
                  data-testid="button-use-my-location"
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <Navigation className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{t("add.useMyLocation")}</span>
                </div>
              </div>
              
              {(form.watch("lat") !== 23.5880 || form.watch("lng") !== 58.3829) && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary">
                    {t("add.locationSet")}: {form.watch("lat").toFixed(4)}, {form.watch("lng").toFixed(4)}
                  </span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("add.latitude")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("add.longitude")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg mt-4 bg-primary hover:bg-primary/90" 
              disabled={createStation.isPending}
            >
              {createStation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-5 w-5" />
              )}
              {t("add.submit")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

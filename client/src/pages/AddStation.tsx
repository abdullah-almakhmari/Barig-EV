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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PlusCircle, MapPin, Navigation, Home, Building2, Phone } from "lucide-react";
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
      const newStation = await createStation.mutateAsync(data);
      toast({
        title: "Success",
        description: "Station added successfully!",
      });
      setLocation(`/station/${newStation.id}`);
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("add.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mall of Oman Charger" {...field} />
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
                    <FormLabel>{t("add.nameAr")}</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: شاحن عمان مول" className="text-right" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("add.city")}</FormLabel>
                    <FormControl>
                      <Input placeholder="Muscat" {...field} />
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
                    <FormLabel>{t("add.cityAr")}</FormLabel>
                    <FormControl>
                      <Input placeholder="مسقط" className="text-right" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="chargerCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("add.chargerCount")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableChargers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("add.availableChargers")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Free Charging?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("add.location")}
                </FormLabel>
                <div className="flex gap-2 flex-wrap">
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
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getMyLocation}
                    disabled={isGettingLocation}
                    className="gap-2"
                    data-testid="button-use-my-location"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    {t("add.useMyLocation")}
                  </Button>
                </div>
              </div>
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

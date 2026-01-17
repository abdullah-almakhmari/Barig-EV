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
import { Loader2, PlusCircle } from "lucide-react";

// Extend schema for form validation if needed (e.g. string to number coercion happens in hook)
const formSchema = insertStationSchema.extend({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  powerKw: z.coerce.number().optional(),
});

export default function AddStation() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createStation = useCreateStation();

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
      isFree: true,
      status: "OPERATIONAL",
    },
  });

  async function onSubmit(data: InsertStation) {
    try {
      await createStation.mutateAsync(data);
      toast({
        title: "Success",
        description: "Station added successfully!",
      });
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("add.title")}</h1>
        <p className="text-muted-foreground">Contribute to the network by adding a new charging point.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
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
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

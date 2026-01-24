import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useUserVehicles, useVehicles, useCreateUserVehicle, useDeleteUserVehicle, useSetDefaultUserVehicle } from "@/hooks/use-stations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Car, Star, Trash2, Plus, Loader2, Check, Zap, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { SEO } from "@/components/SEO";
import { queryClient, apiRequest, getCsrfToken } from "@/lib/queryClient";
import type { EvVehicle } from "@shared/schema";

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";

  const { data: userVehicles, isLoading: vehiclesLoading } = useUserVehicles();
  const { data: catalogVehicles } = useVehicles();
  const createVehicle = useCreateUserVehicle();
  const deleteVehicle = useDeleteUserVehicle();
  const setDefaultVehicle = useSetDefaultUserVehicle();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [nickname, setNickname] = useState("");
  const [showCustomVehicle, setShowCustomVehicle] = useState(false);
  const [customVehicleName, setCustomVehicleName] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  const handleAddVehicle = async () => {
    try {
      if (showCustomVehicle && customVehicleName.trim()) {
        await createVehicle.mutateAsync({
          nickname: customVehicleName.trim(),
          isDefault: !userVehicles || userVehicles.length === 0,
        });
      } else if (selectedCatalogId) {
        const catalogVehicle = catalogVehicles?.find(v => v.id === Number(selectedCatalogId));
        await createVehicle.mutateAsync({
          evVehicleId: Number(selectedCatalogId),
          nickname: nickname.trim() || catalogVehicle?.model || undefined,
          isDefault: !userVehicles || userVehicles.length === 0,
        });
      } else {
        return;
      }
      
      toast({
        title: isArabic ? "تمت إضافة السيارة" : "Vehicle added",
        description: isArabic ? "تم حفظ سيارتك بنجاح" : "Your vehicle has been saved",
      });
      setAddDialogOpen(false);
      resetForm();
    } catch (e) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في إضافة السيارة" : "Failed to add vehicle",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (vehicleId: number) => {
    try {
      await setDefaultVehicle.mutateAsync(vehicleId);
      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تعيين السيارة الافتراضية" : "Default vehicle set",
      });
    } catch (e) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (vehicleId: number) => {
    try {
      await deleteVehicle.mutateAsync(vehicleId);
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? "تم حذف السيارة" : "Vehicle removed",
      });
    } catch (e) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedCatalogId("");
    setNickname("");
    setShowCustomVehicle(false);
    setCustomVehicleName("");
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "U";
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "يرجى اختيار صورة" : "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "الصورة كبيرة جداً (الحد الأقصى 5 ميجابايت)" : "Image is too large (max 5MB)",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      console.log("[Profile] Starting image upload...");
      const formData = new FormData();
      formData.append("file", file);

      console.log("[Profile] Getting CSRF token...");
      const csrfToken = await getCsrfToken();
      console.log("[Profile] CSRF token obtained, uploading file...");
      
      const uploadResponse = await fetch("/api/uploads/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });

      console.log("[Profile] Upload response status:", uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        console.error("[Profile] Upload failed:", uploadResponse.status, errorData);
        const errorMessage = errorData.error || errorData.message || `Upload failed with status ${uploadResponse.status}`;
        throw new Error(errorMessage);
      }

      const uploadData = await uploadResponse.json();
      const objectPath = uploadData.objectPath;
      console.log("[Profile] File uploaded successfully:", objectPath);

      console.log("[Profile] Updating profile image URL...");
      await apiRequest("PATCH", "/api/user/profile-image", { profileImageUrl: objectPath });
      console.log("[Profile] Profile image URL updated");

      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تحديث صورة الملف الشخصي" : "Profile image updated",
      });
    } catch (error: any) {
      console.error("[Profile] Error uploading profile image:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل رفع الصورة" : "Failed to upload image"),
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const groupedCatalog = catalogVehicles?.reduce((acc, vehicle) => {
    const brand = vehicle.brand || "Other";
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(vehicle);
    return acc;
  }, {} as Record<string, EvVehicle[]>) || {};

  const defaultVehicle = userVehicles?.find(v => v.isDefault);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SEO 
        title={isArabic ? "الملف الشخصي" : "Profile"} 
        description={isArabic ? "إدارة سياراتك الكهربائية" : "Manage your electric vehicles"} 
      />

      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-emerald-600/20 p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="w-16 h-16">
              <AvatarImage 
                src={user.profileImageUrl || undefined} 
              />
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              data-testid="button-upload-profile-image"
            >
              {isUploadingImage ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileImageUpload}
              className="hidden"
              data-testid="input-profile-image"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-muted-foreground text-sm truncate" dir="ltr">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isArabic ? "اضغط على الصورة لتغييرها" : "Click on the image to change it"}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                {isArabic ? "سياراتي الكهربائية" : "My Electric Vehicles"}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? "أضف سياراتك لتسهيل بدء جلسات الشحن" 
                  : "Add your vehicles for easier charging sessions"}
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-vehicle">
                  <Plus className="w-4 h-4 me-2" />
                  {isArabic ? "إضافة سيارة" : "Add Vehicle"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {isArabic ? "إضافة سيارة جديدة" : "Add New Vehicle"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!showCustomVehicle ? (
                    <>
                      <div className="space-y-2">
                        <Label>{isArabic ? "اختر من القائمة" : "Select from catalog"}</Label>
                        <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                          <SelectTrigger data-testid="select-catalog-vehicle">
                            <SelectValue placeholder={isArabic ? "اختر سيارة..." : "Select a vehicle..."} />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {Object.entries(groupedCatalog).map(([make, vehicles]) => (
                              <div key={make}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                  {make}
                                </div>
                                {vehicles.map(vehicle => (
                                  <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                    {vehicle.model}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedCatalogId && (
                        <div className="space-y-2">
                          <Label>{isArabic ? "اسم مختصر (اختياري)" : "Nickname (optional)"}</Label>
                          <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder={isArabic ? "مثال: سيارتي" : "e.g., My Car"}
                            data-testid="input-vehicle-nickname"
                          />
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowCustomVehicle(true)}
                        data-testid="button-custom-vehicle"
                      >
                        {isArabic ? "سيارتي غير موجودة في القائمة" : "My vehicle is not listed"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>{isArabic ? "اسم السيارة" : "Vehicle name"}</Label>
                        <Input
                          value={customVehicleName}
                          onChange={(e) => setCustomVehicleName(e.target.value)}
                          placeholder={isArabic ? "مثال: تيسلا موديل 3" : "e.g., Tesla Model 3"}
                          data-testid="input-custom-vehicle-name"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShowCustomVehicle(false);
                          setCustomVehicleName("");
                        }}
                      >
                        {isArabic ? "العودة للقائمة" : "Back to catalog"}
                      </Button>
                    </>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleAddVehicle}
                    disabled={createVehicle.isPending || (!selectedCatalogId && !customVehicleName.trim())}
                    data-testid="button-save-vehicle"
                  >
                    {createVehicle.isPending ? (
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 me-2" />
                    )}
                    {isArabic ? "حفظ" : "Save"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {vehiclesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !userVehicles || userVehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">
                {isArabic ? "لم تضف أي سيارة بعد" : "No vehicles added yet"}
              </p>
              <p className="text-sm">
                {isArabic 
                  ? "أضف سيارتك لتسريع بدء جلسات الشحن" 
                  : "Add your vehicle to speed up starting charging sessions"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userVehicles.map(vehicle => {
                const vehicleName = vehicle.nickname || vehicle.evVehicle?.model || (isArabic ? "سيارة" : "Vehicle");
                const vehicleBrand = vehicle.evVehicle?.brand;
                
                return (
                  <div
                    key={vehicle.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      vehicle.isDefault 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-border"
                    }`}
                    data-testid={`vehicle-item-${vehicle.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${vehicle.isDefault ? "bg-primary/20" : "bg-muted"}`}>
                        <Zap className={`w-5 h-5 ${vehicle.isDefault ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vehicleName}</span>
                          {vehicle.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 me-1 fill-current" />
                              {isArabic ? "الافتراضية" : "Default"}
                            </Badge>
                          )}
                        </div>
                        {vehicleBrand && (
                          <p className="text-sm text-muted-foreground">{vehicleBrand}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!vehicle.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(vehicle.id)}
                          disabled={setDefaultVehicle.isPending}
                          data-testid={`button-set-default-${vehicle.id}`}
                        >
                          <Star className="w-4 h-4 me-1" />
                          {isArabic ? "افتراضي" : "Set default"}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-vehicle-${vehicle.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {isArabic ? "حذف السيارة" : "Delete vehicle"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isArabic 
                                ? `هل أنت متأكد من حذف "${vehicleName}"؟` 
                                : `Are you sure you want to delete "${vehicleName}"?`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {isArabic ? "إلغاء" : "Cancel"}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(vehicle.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isArabic ? "حذف" : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {defaultVehicle && (
            <div className="mt-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <Check className="w-4 h-4 inline me-2" />
                {isArabic 
                  ? `عند بدء جلسة شحن، سيتم اختيار "${defaultVehicle.nickname || defaultVehicle.evVehicle?.model}" تلقائياً`
                  : `When starting a charging session, "${defaultVehicle.nickname || defaultVehicle.evVehicle?.model}" will be selected automatically`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

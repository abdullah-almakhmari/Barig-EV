import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, CheckCircle2 } from "lucide-react";

export default function Contact() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    userName: "",
    userEmail: "",
    subject: "",
    message: ""
  });
  const [isSuccess, setIsSuccess] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      setIsSuccess(true);
      setFormData({ userName: "", userEmail: "", subject: "", message: "" });
      toast({
        title: t("contact.success"),
        description: t("contact.successDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) return;
    submitMutation.mutate(formData);
  };

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t("contact.success")}</h2>
            <p className="text-muted-foreground mb-6">{t("contact.successDesc")}</p>
            <Button onClick={() => setIsSuccess(false)} variant="outline" data-testid="button-send-another">
              {t("contact.send")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-6 px-4" dir={isRTL ? "rtl" : "ltr"}>
      <Card>
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <CardTitle>{t("contact.title")}</CardTitle>
          <CardDescription>{t("contact.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("contact.name")}</Label>
              <Input
                id="name"
                value={formData.userName}
                onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                placeholder={t("contact.name")}
                data-testid="input-contact-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("contact.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.userEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                placeholder={t("contact.email")}
                data-testid="input-contact-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">{t("contact.subject")} *</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger data-testid="select-contact-subject">
                  <SelectValue placeholder={t("contact.subject")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("contact.subjects.general")}</SelectItem>
                  <SelectItem value="homeCharger">{t("contact.subjects.homeCharger")}</SelectItem>
                  <SelectItem value="stationIssue">{t("contact.subjects.stationIssue")}</SelectItem>
                  <SelectItem value="other">{t("contact.subjects.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t("contact.message")} *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder={t("contact.message")}
                rows={5}
                data-testid="textarea-contact-message"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!formData.subject || !formData.message || submitMutation.isPending}
              data-testid="button-contact-submit"
            >
              {submitMutation.isPending ? (
                t("common.loading")
              ) : (
                <>
                  <Send className="w-4 h-4 me-2" />
                  {t("contact.send")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

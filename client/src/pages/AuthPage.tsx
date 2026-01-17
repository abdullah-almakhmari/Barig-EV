import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/components/LanguageContext";

export default function AuthPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("auth.loginSuccess") });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: t("auth.loginError"), description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("auth.registerSuccess") });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: t("auth.registerError"), description: error.message, variant: "destructive" });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      email: registerEmail,
      password: registerPassword,
      firstName: registerFirstName || undefined,
      lastName: registerLastName || undefined,
    });
  };

  const seoTitle = language === "ar" ? "تسجيل الدخول" : "Login";
  const seoDescription = language === "ar" 
    ? "قم بتسجيل الدخول أو إنشاء حساب جديد"
    : "Sign in or create a new account";

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("auth.welcome")}</CardTitle>
            <CardDescription>{t("auth.signInDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">{t("auth.login")}</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">{t("auth.register")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="email@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="ps-10"
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="ps-10"
                        required
                        data-testid="input-login-password"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login-submit"
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("auth.login")
                    )}
                  </Button>
                </form>

              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">{t("auth.firstName")}</Label>
                      <div className="relative">
                        <User className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-firstname"
                          type="text"
                          value={registerFirstName}
                          onChange={(e) => setRegisterFirstName(e.target.value)}
                          className="ps-10"
                          data-testid="input-register-firstname"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">{t("auth.lastName")}</Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        data-testid="input-register-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="email@example.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="ps-10"
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="ps-10"
                        required
                        minLength={8}
                        data-testid="input-register-password"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register-submit"
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("auth.register")
                    )}
                  </Button>
                </form>

              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Trash2, Zap, DollarSign, Clock, Battery } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@shared/schema";

export default function Notifications() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/mark-all-read", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/notifications/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "rental_complete":
        return <Zap className="w-5 h-5 text-primary" />;
      case "rental_income":
        return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case "session_complete":
        return <Battery className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return isArabic ? "الآن" : "Just now";
    if (diffMins < 60) return isArabic ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return isArabic ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return isArabic ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    return date.toLocaleDateString(isArabic ? "ar-OM" : "en-OM");
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {isArabic ? "الإشعارات" : "Notifications"}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {isArabic ? `${unreadCount} غير مقروءة` : `${unreadCount} unread`}
              </p>
            )}
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4 me-2" />
            {isArabic ? "قراءة الكل" : "Mark all read"}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">
            {isArabic ? "لا توجد إشعارات" : "No notifications"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? "ستظهر إشعاراتك هنا عند حصول أي تحديث"
              : "Your notifications will appear here"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const data = notification.data ? JSON.parse(notification.data) : {};
            
            return (
              <Card
                key={notification.id}
                className={`p-4 transition-all ${
                  !notification.isRead 
                    ? "border-primary/30 bg-primary/5" 
                    : ""
                }`}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">
                        {isArabic ? notification.titleAr : notification.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {!notification.isRead && (
                          <Badge variant="default" className="text-xs h-5">
                            {isArabic ? "جديد" : "New"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {isArabic ? notification.messageAr : notification.message}
                    </p>
                    
                    {data.duration && data.energy && data.cost !== undefined && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          {data.duration} {isArabic ? "دقيقة" : "min"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Zap className="w-3 h-3" />
                          {data.energy} kWh
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <DollarSign className="w-3 h-3" />
                          {data.cost.toFixed(3)} {isArabic ? "ر.ع" : "OMR"}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {notification.createdAt && formatTime(notification.createdAt.toString())}
                      </span>
                      
                      <div className="flex gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="w-3 h-3 me-1" />
                            {isArabic ? "تم" : "Read"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(notification.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${notification.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TrustedUserBadgeProps {
  trustLevel?: string | null;
  className?: string;
}

export function TrustedUserBadge({ trustLevel, className = "" }: TrustedUserBadgeProps) {
  const { t } = useTranslation();

  if (trustLevel !== "TRUSTED") {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-normal gap-1 border-green-500/50 text-green-600 dark:text-green-400 ${className}`}
      data-testid="badge-trusted-user"
    >
      <Shield className="h-3 w-3" />
      {t("trust.trustedUser")}
    </Badge>
  );
}

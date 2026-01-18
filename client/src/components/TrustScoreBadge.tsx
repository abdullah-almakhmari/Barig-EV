import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/LanguageContext";

interface TrustScoreResponse {
  score: number;
  label: {
    en: string;
    ar: string;
  };
  components: {
    verificationScore: number;
    reportScore: number;
    recencyScore: number;
  };
}

interface TrustScoreBadgeProps {
  stationId: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  if (score >= 60) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  if (score >= 20) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

export function TrustScoreBadge({ stationId }: TrustScoreBadgeProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data: trustScore, isLoading, isError } = useQuery<TrustScoreResponse>({
    queryKey: ['/api/stations', stationId, 'trust-score'],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${stationId}/trust-score`);
      if (!res.ok) {
        throw new Error('Trust score not available');
      }
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't show anything if feature is disabled or error
  if (isLoading || isError || !trustScore) {
    return null;
  }

  const label = language === 'ar' ? trustScore.label.ar : trustScore.label.en;
  const titleLabel = language === 'ar' ? 'درجة الثقة' : 'Trust score';

  return (
    <div 
      className="flex items-center gap-2" 
      title={`${titleLabel}: ${trustScore.score}/100`}
      data-testid="trust-score-badge"
    >
      <Badge 
        variant="secondary" 
        className={`flex items-center gap-1.5 px-2.5 py-1 ${getScoreColor(trustScore.score)}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span className="font-medium">{trustScore.score}</span>
        <span className="text-xs opacity-80">/ 100</span>
      </Badge>
      <span className="text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

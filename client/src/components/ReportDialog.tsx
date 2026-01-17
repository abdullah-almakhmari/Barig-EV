import { useTranslation } from "react-i18next";
import { useCreateReport } from "@/hooks/use-stations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { Loader2, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportDialogProps {
  stationId: number;
  trigger?: React.ReactNode;
}

export function ReportDialog({ stationId, trigger }: ReportDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"WORKING" | "NOT_WORKING">("WORKING");
  const createReport = useCreateReport();

  const handleSubmit = async () => {
    try {
      await createReport.mutateAsync({
        stationId,
        status,
        reason: status === "WORKING" ? null : "BROKEN", // simplified for this demo
      });
      
      toast({
        title: t("station.report.title"),
        description: "Report submitted successfully!",
      });
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "Failed to submit report.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">{t("station.report.title")}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("station.report.title")}</DialogTitle>
          <DialogDescription>
            Help others by reporting the current status of this charger.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <RadioGroup 
            defaultValue="WORKING" 
            className="grid grid-cols-2 gap-4"
            onValueChange={(val) => setStatus(val as any)}
          >
            <div>
              <RadioGroupItem value="WORKING" id="working" className="peer sr-only" />
              <Label
                htmlFor="working"
                className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/5 peer-data-[state=checked]:border-emerald-500 [&:has([data-state=checked])]:border-emerald-500 cursor-pointer transition-all"
              >
                <ThumbsUp className="mb-3 h-8 w-8 text-muted-foreground peer-data-[state=checked]:text-emerald-500" />
                <span className="font-semibold text-foreground">{t("station.report.working")}</span>
                {status === "WORKING" && <Check className="absolute top-3 right-3 w-4 h-4 text-emerald-500" />}
              </Label>
            </div>
            
            <div>
              <RadioGroupItem value="NOT_WORKING" id="broken" className="peer sr-only" />
              <Label
                htmlFor="broken"
                className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/5 peer-data-[state=checked]:border-red-500 [&:has([data-state=checked])]:border-red-500 cursor-pointer transition-all"
              >
                <ThumbsDown className="mb-3 h-8 w-8 text-muted-foreground peer-data-[state=checked]:text-red-500" />
                <span className="font-semibold text-foreground">{t("station.report.broken")}</span>
                {status === "NOT_WORKING" && <Check className="absolute top-3 right-3 w-4 h-4 text-red-500" />}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createReport.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {createReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

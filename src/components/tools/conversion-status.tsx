import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OCR_LANGUAGES } from "@/lib/ocr/languages";
import { FREE_DAILY_CONVERSIONS, PRO_FEATURES, PRO_PRICE_USD, TRIAL_DAYS } from "@/lib/billing/plans";
import { useEntitlement } from "@/hooks/use-entitlement";

/** Small strip telling free users how many conversions they have left today. */
export function QuotaBanner({ remaining }: { remaining?: number | null }) {
  const { entitlement, isPro, loading } = useEntitlement();
  if (loading || isPro) return null;
  const left = remaining ?? entitlement?.remaining ?? FREE_DAILY_CONVERSIONS;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-sm">
        <span className="font-semibold">{left}</span> of {FREE_DAILY_CONVERSIONS} free conversions left
        today.
      </p>
      <Button asChild size="sm" variant="secondary">
        <Link to="/subscription">
          <Crown className="mr-2 h-4 w-4" />
          Go unlimited
        </Link>
      </Button>
    </div>
  );
}

/** Shown when the server refuses a conversion because the free tier is spent. */
export function UpgradeDialog({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(message)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Daily free limit reached
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {PRO_FEATURES.slice(0, 5).map((f) => (
            <li key={f} className="flex gap-2">
              <Crown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            Maybe later
          </Button>
          <Button asChild>
            <Link to="/subscription">
              Start {TRIAL_DAYS}-day free trial · ${PRO_PRICE_USD}/mo after
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OcrLanguageSelect({
  value,
  onChange,
  description,
}: {
  value: string;
  onChange: (v: string) => void;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="ocr-language">Recognition language (OCR)</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="ocr-language" className="w-full sm:w-72">
          <SelectValue placeholder="Choose a language" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {OCR_LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {description ?? "Used only when a page has no selectable text and must be read as an image."}
      </p>
    </div>
  );
}

/** Live job progress with the current stage label. */
export function JobProgress({
  busy,
  progress,
  stage,
}: {
  busy: boolean;
  progress: number;
  stage?: string;
}) {
  if (!busy && progress === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {stage || (busy ? "Working…" : "Complete")}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}

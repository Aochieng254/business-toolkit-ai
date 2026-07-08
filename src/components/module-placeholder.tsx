import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Construction className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is part of a future phase. The foundation is ready — features will
          ship here without changing the layout.
        </p>
        <Badge variant="secondary" className="mt-4">Phase 2+</Badge>
      </div>
    </div>
  );
}

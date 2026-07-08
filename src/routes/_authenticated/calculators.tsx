import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/calculators")({
  component: () => (
    <ModulePlaceholder
      icon={Calculator}
      title="Business Calculators"
      description="Tax, loan, margin, payroll — everything you need."
    />
  ),
});

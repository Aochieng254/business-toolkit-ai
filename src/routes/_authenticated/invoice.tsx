import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/invoice")({
  component: () => (
    <ModulePlaceholder
      icon={FileText}
      title="Invoice Generator"
      description="Create branded, tax-ready invoices with AI."
    />
  ),
});

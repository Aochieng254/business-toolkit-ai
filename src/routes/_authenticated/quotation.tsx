import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/quotation")({
  component: () => (
    <ModulePlaceholder
      icon={FileSpreadsheet}
      title="Quotation Generator"
      description="Send professional quotes your clients will love."
    />
  ),
});

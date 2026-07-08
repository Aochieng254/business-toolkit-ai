import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: () => (
    <ModulePlaceholder
      icon={CreditCard}
      title="Subscription"
      description="Manage your plan, billing and invoices."
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/payslip")({
  component: () => (
    <ModulePlaceholder
      icon={Wallet}
      title="Payslip Generator"
      description="Produce compliant payslips for your team."
    />
  ),
});

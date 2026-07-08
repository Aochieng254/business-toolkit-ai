import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <ModulePlaceholder
      icon={ShieldCheck}
      title="Admin Panel"
      description="Users, roles, analytics and configuration."
    />
  ),
});

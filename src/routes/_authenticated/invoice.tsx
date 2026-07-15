import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /invoice/* — child routes render inside <Outlet />. */
export const Route = createFileRoute("/_authenticated/invoice")({
  component: () => <Outlet />,
});

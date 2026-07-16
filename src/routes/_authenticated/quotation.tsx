import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /quotation/* — child routes render inside <Outlet />. */
export const Route = createFileRoute("/_authenticated/quotation")({
  component: () => <Outlet />,
});

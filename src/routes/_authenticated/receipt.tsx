import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /receipt/* — child routes render inside <Outlet />. */
export const Route = createFileRoute("/_authenticated/receipt")({
  component: () => <Outlet />,
});

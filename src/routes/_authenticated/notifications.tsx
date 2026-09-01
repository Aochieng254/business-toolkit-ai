import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications/service.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — Business Toolkit AI" },
      { name: "description", content: "Your Business Toolkit AI notification center." },
    ],
  }),
});

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle } as const;
const ICON_CLASSES = {
  info: "text-muted-foreground",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-destructive",
} as const;

function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => listNotifications({ data: { limit: 100 } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: invalidate,
  });
  const markAll = useMutation({ mutationFn: () => markAllNotificationsRead(), onSuccess: invalidate });
  const remove = useMutation({
    mutationFn: (id: string) => deleteNotification({ data: { id } }),
    onSuccess: invalidate,
  });

  const unread = items.filter((n) => !n.read_at).length;

  const openItem = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate({ to: n.link });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No notifications yet. Activity like completed conversions and billing changes will show up here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Info;
            return (
              <Card
                key={n.id}
                className={n.read_at ? "opacity-70" : "border-primary/30"}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_CLASSES[n.type] ?? ""}`} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => openItem(n)}>
                    <p className={`text-sm ${n.read_at ? "" : "font-medium"}`}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete notification"
                    onClick={() => remove.mutate(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

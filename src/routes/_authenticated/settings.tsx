import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setAvatarUrl(data?.avatar_url ?? "");
        setLoading(false);
      });
  }, [user]);

  const initial = (fullName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Profile & settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage how you appear in Business Toolkit AI.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-primary text-lg text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Signed in with email</p>
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            const parsed = z
              .object({
                full_name: z.string().trim().max(100),
                avatar_url: z.string().trim().max(500).optional().or(z.literal("")),
              })
              .safeParse({ full_name: fullName, avatar_url: avatarUrl });
            if (!parsed.success) return toast.error(parsed.error.issues[0].message);
            setSaving(true);
            const { error } = await supabase.from("profiles").upsert({
              id: user.id,
              email: user.email,
              full_name: parsed.data.full_name || null,
              avatar_url: parsed.data.avatar_url || null,
            });
            setSaving(false);
            if (error) return toast.error(error.message);
            toast.success("Profile updated");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar-url">Avatar URL</Label>
            <Input
              id="avatar-url"
              value={avatarUrl}
              placeholder="https://..."
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={saving || loading}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}

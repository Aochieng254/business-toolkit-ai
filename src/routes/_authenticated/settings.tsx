import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getAiUsage } from "@/lib/ai/service.functions";
import { DEFAULT_PREFERENCES, type AiPreferences } from "@/lib/ai/types";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<AiPreferences>(DEFAULT_PREFERENCES);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const fetchUsage = useServerFn(getAiUsage);
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof getAiUsage>> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setAvatarUrl(data?.avatar_url ?? "");
      });
    supabase
      .from("ai_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs({ ...DEFAULT_PREFERENCES, ...data } as AiPreferences);
      });
    fetchUsage().then(setUsage).catch(() => {});
  }, [user, fetchUsage]);

  const initial = (fullName || user?.email || "?").charAt(0).toUpperCase();

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      avatar_url: avatarUrl,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const savePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    const { error } = await supabase
      .from("ai_preferences")
      .upsert({ user_id: user.id, ...prefs });
    setSavingPrefs(false);
    if (error) toast.error(error.message);
    else toast.success("AI preferences saved");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how you appear in Business Toolkit AI.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-primary text-lg text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{fullName || user?.email}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Avatar URL</Label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" /> AI preferences
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          These settings shape every AI response across the app.
        </p>
        <div className="mt-5 grid gap-5">
          <div>
            <Label>Tone</Label>
            <Select value={prefs.tone} onValueChange={(v) => setPrefs((p) => ({ ...p, tone: v as any }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Response length</Label>
            <Select value={prefs.response_length} onValueChange={(v) => setPrefs((p) => ({ ...p, response_length: v as any }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language</Label>
            <Input value={prefs.language} onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))} className="mt-1" placeholder="en" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Creativity</Label>
              <span className="text-xs text-muted-foreground">{prefs.creativity.toFixed(2)}</span>
            </div>
            <Slider
              className="mt-2"
              value={[prefs.creativity]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([v]) => setPrefs((p) => ({ ...p, creativity: v }))}
            />
          </div>
          <div>
            <Button onClick={savePrefs} disabled={savingPrefs}>
              {savingPrefs ? "Saving…" : "Save AI preferences"}
            </Button>
          </div>
        </div>
      </div>

      {usage && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-sm font-medium">AI usage</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="text-lg font-semibold">
                {usage.dailyUsed}
                {usage.dailyLimit != null && <span className="text-sm text-muted-foreground"> / {usage.dailyLimit}</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">This month</div>
              <div className="text-lg font-semibold">{usage.monthlyRequests} requests</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tokens (month)</div>
              <div className="text-lg font-semibold">{usage.monthlyTokens.toLocaleString()}</div>
            </div>
          </div>
          {usage.isPremium && (
            <div className="mt-3 text-xs text-primary">Premium — unlimited usage</div>
          )}
        </div>
      )}
    </div>
  );
}

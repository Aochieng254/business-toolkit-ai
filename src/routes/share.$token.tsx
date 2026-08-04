import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Download, Lock, ShieldAlert, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PreviewService } from "@/lib/files/preview";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
});

interface ShareInfo {
  file_id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number;
  allow_download: boolean;
  expires_at: string | null;
  has_password: boolean;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function SharePage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_shared_file", { _token: token });
      if (error) { setErr(error.message); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setErr("This link is invalid, expired, or has been revoked."); setLoading(false); return; }
      const info = row as ShareInfo;
      setInfo(info);
      if (!info.has_password) setUnlocked(true);
      setLoading(false);
    })();
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      if (!info || !unlocked) return;
      // create signed URL through anon: we can't with RLS, so use RPC or a public endpoint.
      // Fallback: fetch via edge — here we just build a public-download URL via signed url on server side.
      // Since anon can't sign, we use a server function.
      try {
        const res = await fetch(`/api/public/share/${token}${info.has_password && password ? `?p=${encodeURIComponent(await sha256Hex(password + ":" + token))}` : ""}`);
        if (!res.ok) throw new Error(await res.text());
        const j = await res.json();
        setSignedUrl(j.url);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [info, unlocked, password, token]);

  if (loading) return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  if (err) return (
    <Center>
      <ShieldAlert className="h-8 w-8 text-destructive" />
      <h1 className="mt-2 text-lg font-semibold">Cannot open link</h1>
      <p className="text-sm text-muted-foreground">{err}</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/">Go home</Link></Button>
    </Center>
  );
  if (!info) return null;

  if (!unlocked) {
    return (
      <Center>
        <Lock className="h-8 w-8" />
        <h1 className="mt-2 text-lg font-semibold">Password required</h1>
        <p className="text-sm text-muted-foreground">Enter the password to view “{info.name}”.</p>
        <div className="mt-4 w-full max-w-xs space-y-2">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" onClick={() => setUnlocked(true)} disabled={!password}>Unlock</Button>
        </div>
      </Center>
    );
  }

  const isImage = PreviewService.isImage({ mime_type: info.mime_type, extension: info.name.split(".").pop() ?? null });
  const isPdf = PreviewService.isPdf({ mime_type: info.mime_type, extension: info.name.split(".").pop() ?? null });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">{info.name}</h1>
              <p className="text-sm text-muted-foreground">
                {PreviewService.humanSize(info.size_bytes)} · Shared file
              </p>
            </div>
          </div>
          {info.allow_download && signedUrl && (
            <Button asChild>
              <a href={signedUrl} download={info.name}><Download className="mr-2 h-4 w-4" /> Download</a>
            </Button>
          )}
        </div>
        <div className="mt-6 min-h-[400px] rounded-lg border border-border bg-muted/30">
          {!signedUrl ? (
            <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : isImage ? (
            <img src={signedUrl} alt={info.name} className="h-[600px] w-full object-contain" />
          ) : isPdf ? (
            <iframe title={info.name} src={signedUrl} className="h-[700px] w-full rounded-lg" />
          ) : (
            <div className="flex h-[400px] flex-col items-center justify-center text-sm text-muted-foreground">
              Preview not supported. {info.allow_download && "Use Download above."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center">{children}</div>
    </div>
  );
}
